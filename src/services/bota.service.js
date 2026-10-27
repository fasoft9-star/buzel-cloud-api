import { HttpError } from '../middlewares/error.middleware.js';

/** Bota.chat scraper service — anonymous chat via the Framesuite frame API. */
const BASE = 'https://bota.chat';
const FRAME_ID = 'x8OA7Azs4hBy';
const SITE_ID = 53;
const UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
/** Cap on guest rotations per request so the public API can never spin on paywall-rotate loops. */
const MAX_ROTATE = 5;

// ─── HTTP + helper ─────────────────────────────────────────
function headers(token = null, extra = {}) {
  const h = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: BASE,
    Referer: `${BASE}/`,
    'User-Agent': UA,
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    ...extra,
  };
  if (token) h['x-anon-token'] = token;
  return h;
}

/**
 * @param {string} method
 * @param {string} urlPath
 * @param {{ body?: object, token?: string | null, locale?: string }} [opts]
 */
async function req(method, urlPath, { body, token, locale = 'en' } = {}) {
  const url = `${BASE}${urlPath}`;
  const opts = { method, headers: headers(token) };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';

  if (ct.includes('event-stream') || url.includes('/frame/stream')) {
    return { ok: res.ok, status: res.status, stream: res.body };
  }

  const text = await res.text();
  /** @type {unknown} */
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

// ─── SSE parser ────────────────────────────────────────────
/**
 * @param {ReadableStream<Uint8Array>} readableStream
 * @param {(event: object) => void} [onEvent]
 * @returns {Promise<object[]>}
 */
async function parseSSE(readableStream, onEvent) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try {
        const event = JSON.parse(line.slice(6));
        events.push(event);
        if (onEvent) onEvent(event);
      } catch {
        // skip malformed SSE frames
      }
    }
  }
  return events;
}

// ─── Client (in-memory singleton) ──────────────────────────
class BotaClient {
  constructor() {
    this.token = null;
    this.publicId = null;
    this.chatId = null;
    this.rotateCount = 0;
  }

  reset() {
    this.token = null;
    this.publicId = null;
    this.chatId = null;
  }

  /** Paywall / auth / rate-limit failures → rotate to a fresh anonymous guest. */
  isLimitError(errMsg = '', data = null) {
    const s = `${errMsg} ${JSON.stringify(data || {})}`.toLowerCase();
    return (
      s.includes('credit') ||
      s.includes('paywall') ||
      s.includes('limit') ||
      s.includes('quota') ||
      s.includes('balance') ||
      s.includes('unauthorized') ||
      s.includes('401') ||
      s.includes('402') ||
      s.includes('403') ||
      s.includes('429') ||
      s.includes('forbidden') ||
      s.includes('rate')
    );
  }

  async ensureAuth() {
    if (!this.token) return this.anonLogin();
    const me = await req('GET', `/__fs/f/${FRAME_ID}/me?fs_locale=en`, { token: this.token });
    if (me.status === 401 || me.data?.success === false) {
      this.reset();
      return this.anonLogin();
    }
    return me.data;
  }

  async rotateGuest() {
    this.rotateCount++;
    if (this.rotateCount > MAX_ROTATE) {
      throw new HttpError(503, `Bota guest rotate limit reached (${MAX_ROTATE})`);
    }
    const backoff = Math.min(8000, 300 + this.rotateCount * 200 + Math.random() * 500);
    await sleep(backoff);
    this.reset();
    return this.anonLogin();
  }

  async anonLogin() {
    const screens = ['360x812', '390x844', '412x915', '375x812', '414x896'];
    const langs = ['id-ID', 'en-US', 'id', 'en'];
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const { ok, data, status } = await req(
      'POST',
      `/__fs/f/${FRAME_ID}/anon?fs_locale=en`,
      {
        body: {
          screen: random(screens),
          timezone: 'Asia/Jakarta',
          navigator_language: random(langs),
          ui_locale: 'en',
        },
      }
    );

    if (!ok || !data?.success) {
      throw new HttpError(502, `Bota anonymous login failed (${status})`);
    }
    this.token = data.anonymous_token;
    this.publicId = data.public_id;
    return data;
  }

  async ensureChat(chatId) {
    if (chatId) {
      this.chatId = chatId;
      return { hash_id: chatId };
    }
    if (this.chatId) return { hash_id: this.chatId };

    const { ok, data, status } = await req(
      'POST',
      `/__fs/f/${FRAME_ID}/chat?fs_locale=en`,
      { token: this.token, body: { site_id: SITE_ID, agent_open: false } }
    );
    if (!ok || !data?.success) {
      if (status === 401 || status === 402 || status === 429 || status === 403) {
        await this.rotateGuest();
        return this.ensureChat(chatId);
      }
      throw new HttpError(502, `Bota create chat failed (${status})`);
    }
    this.chatId = data.chat.hash_id;
    return data.chat;
  }

  /**
   * Send one message and collect the full SSE response.
   * @param {string} message
   * @returns {Promise<import('./bota.service.js').BotaChatResult>}
   */
  async chatOnce(message, opts = {}) {
    await this.ensureAuth();
    await this.ensureChat(opts.chatId);

    const payload = {
      chat_id: this.chatId,
      locale: 'en',
      paywall_currency: 'USD',
      message,
      model: opts.model || 'default-model',
      image_mode: !!opts.imageMode,
      video_mode: !!opts.videoMode,
      diagram_mode: !!opts.diagramMode,
      plot_mode: !!opts.plotMode,
      web_search: !!opts.webSearch,
      voice_mode: !!opts.voiceMode,
      hidden: false,
      attachments: opts.attachments || [],
      vision_capable: opts.visionCapable !== false,
      tools_capable: opts.toolsCapable !== false,
      image_gen_capable: !!opts.imageGenCapable,
      from_suggestion: false,
      agent_open: false,
    };

    const res = await req('POST', '/__fs/api/frame/stream?fs_locale=en', {
      token: this.token,
      body: payload,
    });

    if (!res.ok && res.status !== 200) {
      if (this.isLimitError('', res.data)) {
        await this.rotateGuest();
        return this.chatOnce(message, { ...opts, chatId: null });
      }
      throw new HttpError(502, `Bota stream failed (HTTP ${res.status})`);
    }

    const result = {
      success: true,
      chat_id: this.chatId,
      public_id: this.publicId,
      message: '',
      message_id: null,
      model: null,
      sources: [],
      tools: [],
      timing: null,
      billing: null,
      new_balance: null,
      suggestions: [],
      error: null,
    };

    let streamError = null;
    let currentTool = null;

    await parseSSE(res.stream, (ev) => {
      if (ev.error || ev.paywall || ev.limit_reached) {
        streamError = ev;
        return;
      }
      if (ev.tool_step) {
        const t = ev.tool_step;
        if (t.status === 'running') currentTool = t;
        if (t.status === 'done') {
          result.tools.push({
            name: t.name,
            query: t.args?.query ?? null,
            duration_ms: t.duration_ms ?? null,
          });
          for (const s of t.sources || []) {
            result.sources.push({ url: s.url, title: s.title });
          }
          currentTool = null;
        }
      }
      if (ev.chunk) result.message += ev.chunk;
      if (ev.agent_reasoning) result.reasoning = ev.agent_reasoning;
      if (ev.done) {
        result.message_id = ev.message_id ?? null;
        result.suggestions = ev.suggestions || result.suggestions;
        result.timing = ev.timing || null;
        result.billing = ev.billing || null;
        result.model = ev.timing?.model || null;
        result.new_balance = ev.new_balance ?? null;
        if (ev.sources?.length) {
          result.sources = ev.sources.map((s) => ({ url: s.url, title: s.title }));
        }
      }
    });

    if (streamError) {
      if (this.isLimitError('', streamError)) {
        await this.rotateGuest();
        return this.chatOnce(message, { ...opts, chatId: null });
      }
      throw new HttpError(502, streamError.error || 'Bota stream error');
    }

    if (!result.message && !result.message_id) {
      throw new HttpError(502, 'Bota returned an empty response');
    }

    // dedupe sources by url
    const seen = new Set();
    result.sources = result.sources.filter((s) => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    return result;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new BotaClient();
// Serialize calls — anon auth / chat creation / rotation must not interleave
// across concurrent requests.
let queue = Promise.resolve();
/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

/**
 * Chat with Bota.chat (anonymous guest, auto-session, auto-rotate).
 * @param {string} message
 * @param {{ model?: string, webSearch?: boolean, imageMode?: boolean, videoMode?: boolean,
 *          diagramMode?: boolean, plotMode?: boolean, voiceMode?: boolean, chatId?: string }} [opts]
 * @returns {Promise<import('./bota.service.js').BotaChatResult>}
 */
export async function botaChat(message, opts = {}) {
  client.rotateCount = 0;
  try {
    return await enqueue(() => client.chatOnce(message, opts));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, `Bota request failed: ${err?.message || 'unknown error'}`);
  }
}
