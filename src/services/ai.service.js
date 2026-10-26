import crypto from 'node:crypto';
import { HttpError } from '../middlewares/error.middleware.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0';
const HOME = 'https://gemini.google.com/app';
const ENDPOINT =
  'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate';

/**
 * @typedef {Object} GeminiSession
 * @property {string} cookie
 * @property {string} bl
 * @property {string} fsid
 * @property {string} uid
 * @property {(string | null)[]} [resume]
 */

/**
 * @typedef {Object} GeminiResponse
 * @property {boolean} success
 * @property {string} response
 * @property {string | null} sessionId
 */

/**
 * @param {number} n
 * @returns {string}
 */
const hex = (n) => crypto.randomBytes(n).toString('hex');

/**
 * @returns {string}
 */
const uuid = () => crypto.randomUUID().toUpperCase();

/**
 * @returns {number}
 */
const reqid = () => Math.floor(Math.random() * 900000) + 100000;

/**
 * @param {GeminiSession} obj
 * @returns {string}
 */
const pack = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

/**
 * @param {string} s
 * @returns {GeminiSession | null}
 */
const unpack = (s) => {
  try {
    return JSON.parse(Buffer.from(s, 'base64').toString());
  } catch {
    return null;
  }
};

/**
 * @returns {Promise<GeminiSession>}
 */
async function bootstrap() {
  let url = HOME;
  /** @type {Map<string, string>} */
  const cookies = new Map();
  let res;

  for (let i = 0; i < 6; i++) {
    const cookieHeader = Array.from(cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    res = await fetch(url, {
      redirect: 'manual',
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });

    const setc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of setc) {
      const [pair] = c.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) {
        cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    }

    const loc = res.headers.get('location');
    if (loc && res.status >= 300 && res.status < 400) {
      url = new URL(loc, url).href;
      continue;
    }
    break;
  }

  if (!res) {
    throw new HttpError(502, 'Failed to bootstrap Gemini session');
  }

  const cookie = Array.from(cookies.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  const html = await res.text();

  return {
    cookie,
    bl: (html.match(/"cfb2h":"(.*?)"/) || [])[1] || '',
    fsid: (html.match(/"FdrFJe":"(.*?)"/) || [])[1] || '',
    uid: uuid(),
  };
}

/**
 * @param {string} message
 * @param {(string | null)[]} resume
 * @param {string} uid
 * @returns {string}
 */
function buildBody(message, resume, uid) {
  const inner = [
    [message, 0, null, null, null, null, 0],
    ['en-US'],
    resume,
    '',
    hex(16),
    null,
    [1],
    1,
    null,
    null,
    1,
    0,
    null,
    null,
    null,
    null,
    null,
    [[0]],
    0,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    1,
    null,
    null,
    [4],
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    [2],
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    0,
    null,
    null,
    null,
    null,
    null,
    uid,
    null,
    [],
    null,
    null,
    null,
    null,
    null,
    null,
    2,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    1,
  ];
  return 'f.req=' + encodeURIComponent(JSON.stringify([null, JSON.stringify(inner)])) + '&';
}

/**
 * @param {string} raw
 * @returns {{ text: string, conversationId: string | null, responseId: string | null, replyId: string | null }}
 */
function parseReply(raw) {
  const out = { text: '', conversationId: null, responseId: null, replyId: null };
  let best = '';

  for (const line of (raw || '').split('\n')) {
    const s = line.trim();
    if (!s.startsWith('[["wrb.fr"')) continue;

    let outer;
    try {
      outer = JSON.parse(s);
    } catch {
      continue;
    }

    for (const row of outer) {
      if (!Array.isArray(row) || row[0] !== 'wrb.fr' || typeof row[2] !== 'string') continue;

      let body;
      try {
        body = JSON.parse(row[2]);
      } catch {
        continue;
      }

      const ids = body[1];
      if (Array.isArray(ids)) {
        if (typeof ids[0] === 'string' && ids[0].startsWith('c_')) out.conversationId = ids[0];
        if (typeof ids[1] === 'string' && ids[1].startsWith('r_')) out.responseId = ids[1];
      }

      const seg = Array.isArray(body[4]) ? body[4][0] : null;
      if (seg) {
        if (seg[0]) out.replyId = seg[0];
        if (Array.isArray(seg[1])) {
          const piece = seg[1].join('');
          if (piece.length > best.length) best = piece;
        }
      }
    }
  }

  out.text = best.trim();
  return out;
}

/**
 * @param {string} message
 * @param {string} [sessionId]
 * @returns {Promise<GeminiResponse>}
 */
export async function geminiChat(message, sessionId) {
  const sess = sessionId ? unpack(sessionId) : null;
  const ctx = sess && sess.cookie ? sess : await bootstrap();
  const resume =
    sess && sess.resume
      ? [sess.resume[0] || '', sess.resume[1] || '', sess.resume[2] || '', null, null, null, null, null, null, '']
      : ['', '', '', null, null, null, null, null, null, ''];

  const url = `${ENDPOINT}?bl=${encodeURIComponent(ctx.bl)}&f.sid=${encodeURIComponent(ctx.fsid)}&hl=en-US&_reqid=${reqid()}&rt=c`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'user-agent': UA,
      origin: 'https://gemini.google.com',
      referer: 'https://gemini.google.com/',
      'x-same-domain': '1',
      'x-goog-ext-525001261-jspb': JSON.stringify([
        1,
        null,
        null,
        null,
        hex(8),
        null,
        null,
        0,
        [4, 6],
        null,
        null,
        1,
        null,
        null,
        1,
        null,
        uuid(),
      ]),
      'x-goog-ext-525005358-jspb': JSON.stringify([ctx.uid, 1]),
      'x-goog-ext-73010990-jspb': '[0,0,0]',
      'x-goog-ext-73010989-jspb': '[0]',
      cookie: ctx.cookie,
    },
    body: buildBody(String(message), resume, ctx.uid),
  });

  if (!res.ok) {
    throw new HttpError(res.status, 'Failed to get response from Gemini');
  }

  const raw = await res.text();
  const reply = parseReply(raw);

  if (!reply.text) {
    throw new HttpError(502, 'Empty response from Gemini');
  }

  return {
    success: true,
    response: reply.text,
    sessionId: pack({
      cookie: ctx.cookie,
      bl: ctx.bl,
      fsid: ctx.fsid,
      uid: ctx.uid,
      resume: [reply.conversationId, reply.responseId, reply.replyId],
    }),
  };
}
