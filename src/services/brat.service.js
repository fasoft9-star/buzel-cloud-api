import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import fsPromises from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { DATA_DIR } from '../utils/url.util.js';
import { HttpError } from '../middlewares/error.middleware.js';

export const BRAT_CACHE_DIR = '/tmp/express-brat-cache';
const ASSETS_DIR = join(DATA_DIR, 'brat-assets');
const FONT_URL = 'https://cdn.jsdelivr.net/gh/Napoleon-Fibonacci/assets@main/font/impact.ttf';
const FONT_FILE = join(ASSETS_DIR, 'impact.ttf');
const EMOJI_SRC =
  process.env.EMOJI_URL ??
  'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/{code}.png';
const EMOJI_DIR = join(ASSETS_DIR, 'emoji-cache');
const CACHE_TTL_MS = 15 * 60 * 1000;

export const DEFAULTS = {
  text: 'YANG INI ANAK BAIK😭🤩',
  theme: 'white',
  blur: 0,
  format: 'mp4',
  hold: 1.5,
  fast: true,
};

/** @type {Record<string, [string, string]>} */
const PALETTE = {
  black: ['#000000', '#ffffff'],
  white: ['#ffffff', '#000000'],
  green: ['#8ace00', '#000000'],
};

const SHEEN = '0:0 .1:.35 .25:.95 .38:.35 .45:.05 .52:.05 .6:.35 .75:.95 .88:.35 1:0'
  .split(' ')
  .map((s) => s.split(':').map(Number));

const S = 1000;
const M = 70;
const P = 40;
const BOX = S - 2 * M;
const GAP = 15;
const FPS = 60;
const LEAD = 0.15;
const STAGGER = 5;
const POP = 28;
const SWEEP = 38;
const WINDOW = 6;

let fontRegistered = false;

/**
 * @param {string} url
 * @param {string} file
 * @returns {Promise<void>}
 */
async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

/**
 * @param {string} e
 * @returns {Promise<import('@napi-rs/canvas').Image | null>}
 */
async function loadEmoji(e) {
  mkdirSync(EMOJI_DIR, { recursive: true });
  const base = Array.from(e, (ch) => (ch.codePointAt(0) || 0).toString(16).padStart(4, '0')).join(
    '-'
  );
  for (const code of new Set([base, base.replaceAll('-fe0f', '')])) {
    const file = join(EMOJI_DIR, `${code}.png`);
    try {
      if (!existsSync(file)) await download(EMOJI_SRC.replace('{code}', code), file);
      return await loadImage(file);
    } catch {
      // try next variant
    }
  }
  return null;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
/**
 * @param {string} s
 * @returns {boolean}
 */
const isEmoji = (s) => /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(s);

/**
 * @param {string} word
 * @returns {Array<{ s: string, em: boolean }>}
 */
function toRuns(word) {
  /** @type {Array<{ s: string, em: boolean }>} */
  const out = [];
  for (const { segment: s } of graphemes.segment(word)) {
    const em = isEmoji(s);
    const tail = out.at(-1);
    if (!em && tail && !tail.em) tail.s += s;
    else out.push({ s, em });
  }
  return out;
}

/**
 * @param {import('@napi-rs/canvas').SKRSContext2D} g
 * @param {Array<{ s: string, em: boolean }>} runs
 * @param {number} fs
 * @returns {number}
 */
const runWidth = (g, runs, fs) => {
  g.font = `${fs}px Impact`;
  return runs.reduce((sum, r) => sum + (r.em ? fs : g.measureText(r.s).width), 0);
};

/**
 * @param {number} lo
 * @param {number} hi
 * @param {(mid: number) => boolean} ok
 * @returns {number}
 */
function largest(lo, hi, ok) {
  let best = lo;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ok(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * @param {import('@napi-rs/canvas').SKRSContext2D} g
 * @param {string} text
 */
function arrange(g, text) {
  const raw = text.split(' ').map(toRuns);
  const maxW = BOX - 2 * P;
  const measure = (/** @type {number} */ fs) => raw.map((r) => runWidth(g, r, fs));
  const spaceW = (/** @type {number} */ fs) => {
    g.font = `${fs}px Impact`;
    return g.measureText(' ').width;
  };

  const breakRows = (/** @type {number[]} */ ws, /** @type {number} */ fs) => {
    const sp = spaceW(fs);
    /** @type {number[][]} */
    const rows = [[]];
    let used = 0;
    ws.forEach((w, i) => {
      const row = rows.at(-1);
      if (row && row.length && used + sp + w > maxW) {
        rows.push([i]);
        used = w;
      } else if (row) {
        used = row.length ? used + sp + w : w;
        row.push(i);
      }
    });
    return rows;
  };

  const fs = largest(10, 700, (size) => {
    const ws = measure(size);
    return Math.max(...ws) <= maxW && breakRows(ws, size).length * (size + GAP) - GAP <= maxW;
  });

  const ws = measure(fs);
  const rows = breakRows(ws, fs);
  const sp = spaceW(fs);
  let y = M + (BOX - (rows.length * (fs + GAP) - GAP)) / 2;
  /** @type {Array<{ runs: Array<{ s: string, em: boolean }>, w: number, x: number, y: number }>} */
  const words = [];
  rows.forEach((row, ri) => {
    const stretch = ri < rows.length - 1 && row.length > 1;
    const gap = stretch ? (maxW - row.reduce((a, i) => a + ws[i], 0)) / (row.length - 1) : sp;
    let x = M + P;
    for (const i of row) {
      words.push({ runs: raw[i], w: ws[i], x, y });
      x += ws[i] + gap;
    }
    y += fs + GAP;
  });
  return { fs, words };
}

const back = (/** @type {number} */ t, k = 1.4) => {
  const u = t - 1;
  return 1 + u * u * ((k + 1) * u + k);
};
const HIDE = { on: false, scale: 0, alpha: 0 };
const FULL = { on: true, scale: 1, alpha: 1 };

/**
 * @param {number} k
 */
function popPose(k) {
  if (k < 0) return HIDE;
  if (k >= POP) return FULL;
  const p = k / (POP - 1);
  return { on: true, scale: 0.2 + 0.8 * back(p), alpha: Math.min(1, p * 1.8) };
}

/**
 * @param {number} count
 * @param {number} holdSec
 */
function* timeline(count, holdSec) {
  yield { pose: () => HIDE, sheen: 0, repeat: Math.round(LEAD * FPS) };
  const pops = (count - 1) * STAGGER + POP;
  for (let f = 0; f < pops; f++) {
    yield { pose: (/** @type {number} */ i) => popPose(f - i * STAGGER), sheen: (f + 1) / pops, repeat: 1 };
  }
  for (let k = 1; k <= SWEEP; k++) {
    yield { pose: () => FULL, sheen: k / SWEEP, repeat: 1 };
  }
  yield { pose: () => FULL, sheen: 0, repeat: Math.round(holdSec * FPS) };
}

/**
 * @param {{ fs: number, words: Array<{ runs: Array<{ s: string, em: boolean }>, w: number, x: number, y: number }> }} plan
 * @param {Map<string, import('@napi-rs/canvas').Image | null>} pics
 * @param {{ theme: string, blur: number, gif: boolean }} cfg
 * @param {{ pose: (i: number) => { on: boolean, scale: number, alpha: number }, sheen: number }} step
 */
function drawFrame({ fs, words }, pics, { theme, blur, gif }, { pose, sheen }) {
  const [bg, fg] = PALETTE[theme] ?? PALETTE.white;
  const cv = createCanvas(S, S);
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  if (gif) g.fillRect(M, M, BOX, BOX);
  else g.fillRect(0, 0, S, S);

  g.beginPath();
  g.rect(M, M, BOX, BOX);
  g.clip();
  g.fillStyle = fg;
  g.font = `${fs}px Impact`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  if (blur > 0) g.filter = `blur(${blur}px)`;

  words.forEach((w, i) => {
    const { on, scale, alpha } = pose(i);
    if (!on) return;
    const cx = w.x + w.w / 2;
    const cy = w.y + fs / 2;
    g.globalAlpha = Math.max(0, Math.min(1, alpha));
    g.setTransform(scale, 0, 0, scale, cx * (1 - scale), cy * (1 - scale));
    let x = w.x;
    for (const r of w.runs) {
      const img = r.em && pics.get(r.s);
      if (img) g.drawImage(img, x, w.y, fs, fs);
      else g.fillText(r.s, x, w.y);
      x += r.em ? fs : g.measureText(r.s).width;
    }
  });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;

  if (sheen > 0 && sheen <= 1) {
    const a = M + BOX * (2.8 * sheen - 1);
    const grad = g.createLinearGradient(a, a, a + BOX * 0.95, a + BOX * 0.95);
    for (const [pos, op] of SHEEN) grad.addColorStop(pos, `rgba(255,255,255,${op})`);
    g.fillStyle = grad;
    g.fillRect(M, M, BOX, BOX);
  }
  return cv;
}

/**
 * @template T, R
 * @param {Iterable<T>} items
 * @param {(item: T) => Promise<R>} work
 * @param {number} width
 */
async function* inOrder(items, work, width) {
  /** @type {Array<Promise<R>>} */
  const queue = [];
  for (const it of items) {
    queue.push(work(it));
    if (queue.length >= width) {
      const next = queue.shift();
      if (next) yield await next;
    }
  }
  while (queue.length) {
    const next = queue.shift();
    if (next) yield await next;
  }
}

/**
 * @param {string} out
 * @param {boolean} gif
 */
function openEncoder(out, gif) {
  const vf = gif
    ? 'fps=60,scale=1000:1000:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer'
    : 'fps=60,scale=1000:1000';
  const tail = gif
    ? ['-loop', '0']
    : [
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
      ];
  const bin = ffmpegPath || 'ffmpeg';
  const proc = spawn(
    bin,
    [
      '-y',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-framerate',
      String(FPS),
      '-i',
      '-',
      '-vf',
      vf,
      ...tail,
      out,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] }
  );
  let log = '';
  proc.stderr.on('data', (d) => {
    log += d;
  });
  proc.stdin.on('error', () => {});
  const done = new Promise((ok, fail) => {
    proc.on('error', fail);
    proc.on('close', (code) =>
      code === 0 ? ok(undefined) : fail(new Error(`ffmpeg gagal (${code}): ${log.slice(-300)}`))
    );
  });
  const push = (/** @type {Buffer} */ buf) =>
    new Promise((ok) => proc.stdin.write(buf, () => ok(undefined)));
  return {
    push,
    finish: () => {
      proc.stdin.end();
      return done;
    },
  };
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.text]
 * @param {string} [opts.theme]
 * @param {number} [opts.blur]
 * @param {string} [opts.format]
 * @param {number} [opts.hold]
 * @param {boolean} [opts.fast]
 * @param {string} [opts.baseUrl]
 */
export async function makeBrat(opts = {}) {
  const c = {
    ...DEFAULTS,
    ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v != null)),
  };
  const theme = ['white', 'black', 'green'].includes(String(c.theme)) ? String(c.theme) : 'white';
  const blurNum = Number(c.blur);
  const blur = [0, 1, 2, 3].includes(blurNum) ? blurNum : 0;
  const gif = String(c.format).toLowerCase() === 'gif';
  const cfg = { theme, blur, gif };

  const text = String(c.text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
  if (!text) {
    throw new HttpError(400, 'Parameter text is required');
  }
  if (text.length > 250) {
    throw new HttpError(400, 'Text maksimal 250 karakter');
  }

  mkdirSync(ASSETS_DIR, { recursive: true });
  mkdirSync(BRAT_CACHE_DIR, { recursive: true });

  if (!existsSync(FONT_FILE)) await download(FONT_URL, FONT_FILE);
  if (!fontRegistered) {
    GlobalFonts.registerFromPath(FONT_FILE, 'Impact');
    fontRegistered = true;
  }

  const plan = arrange(createCanvas(S, S).getContext('2d'), text);
  const emojis = new Set(plan.words.flatMap((w) => w.runs.filter((r) => r.em).map((r) => r.s)));
  const pics = new Map(await Promise.all([...emojis].map(async (e) => [e, await loadEmoji(e)])));

  const hold = Math.min(5, Math.max(0.2, Number(c.hold) || 1.5));
  const ext = cfg.gif ? 'gif' : 'mp4';
  const fileName = `brat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const out = join(BRAT_CACHE_DIR, fileName);
  const enc = openEncoder(out, cfg.gif);

  const job = async (/** @type {any} */ step) => [
    await drawFrame(plan, pics, cfg, step).encode('png'),
    step.repeat,
  ];
  try {
    for await (const [png, repeat] of inOrder(
      timeline(plan.words.length, hold),
      job,
      c.fast ? WINDOW : 1
    )) {
      for (let n = 0; n < repeat; n++) await enc.push(png);
    }
  } catch (e) {
    await enc.finish().catch(() => {});
    throw e;
  }
  await enc.finish();

  setTimeout(() => {
    fsPromises.unlink(out).catch(() => null);
  }, CACHE_TTL_MS).unref();

  const cleanBase = String(opts.baseUrl || '').replace(/\/+$/, '');
  const url = `${cleanBase}/brat-media/${fileName}`;

  return {
    success: true,
    url,
    filePath: out,
    fileName,
    text,
    theme,
    blur,
    format: ext,
    hold,
  };
}
