// Scraper rch.yonzofficial.cloud (Yonz reaction).
//
// Login pakai akun yang sudah ada, lalu ambil data dashboard dari endpoint internal:
//   GET /api/auth/me
//   GET /api/reaction/history?limit=N
// plus semua respons JSON /api/* yang lewat saat halaman /home dimuat.
//
// Pakai:
//   node yonz-scraper.mjs --cookie "a=b; c=d"     # cookie dari DevTools (paling andal)
//   YONZ_IDENTIFIER=user YONZ_PASSWORD=pass xvfb-run -a node yonz-scraper.mjs
//   node yonz-scraper.mjs --reuse-session        # pakai cookie di yonz-session.json
//   node yonz-scraper.mjs --limit 100 --out data/hasil.json
//
// Hasil default: data/yonz-scrape-<timestamp>.json
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('rebrowser-puppeteer-core');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, 'yonz-session.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const opt = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (process.env.YONZ_BASE || 'https://rch.yonzofficial.cloud').replace(/\/$/, '');
const IDENTIFIER = process.env.YONZ_IDENTIFIER || process.env.YONZ_USERNAME || '';
const PASSWORD = process.env.YONZ_PASSWORD || '';
const LIMIT = Number(opt('limit', process.env.YONZ_LIMIT || 50));
const CHROME = process.env.CHROME_PATH || '/opt/chrome-unconfined/chrome';
const HEADLESS = process.env.YONZ_HEADLESS === '1' || flag('headless');
const TOKEN_TIMEOUT = Number(process.env.YONZ_TOKEN_TIMEOUT || 120000);
const REUSE_ONLY = flag('reuse-session');
const COOKIE_INPUT = opt('cookie', process.env.YONZ_COOKIE || '');
const OUT = path.resolve(
  __dirname,
  opt('out', path.join('data', `yonz-scrape-${new Date().toISOString().replace(/[:.]/g, '-')}.json`))
);

function fail(msg) {
  console.error('[error]', msg);
  process.exit(1);
}

function readSession() {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
  } catch {
    return null;
  }
}

/** Token Turnstile ada di input tersembunyi di dalam widget. */
function tokenLength(page, widgetId) {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    const input = el && el.querySelector('input[name="cf-turnstile-response"]');
    return input ? input.value.length : 0;
  }, widgetId);
}

/** Widget Turnstile dirender di shadow DOM, jadi checkbox-nya diklik pakai koordinat. */
async function waitTurnstile(page, widgetId, label) {
  const t0 = Date.now();
  let clicked = false;
  await page
    .evaluate((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'center' });
    }, widgetId)
    .catch(() => {});

  while (Date.now() - t0 < TOKEN_TIMEOUT) {
    if ((await tokenLength(page, widgetId)) > 10) {
      console.log(`[turnstile] ${label} OK`);
      return;
    }
    if (!clicked && Date.now() - t0 > 4000) {
      const box = await page.evaluate((id) => {
        const r = document.getElementById(id).getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }, widgetId);
      await page.mouse.click(box.x + 30, box.y + box.h / 2);
      clicked = true;
      console.log(`[turnstile] ${label} checkbox diklik`);
    }
    await sleep(1000);
  }
  throw new Error(`Turnstile ${label} tidak keluar dalam ${TOKEN_TIMEOUT}ms`);
}

async function apiFetch(page, endpoint) {
  return page.evaluate(async (p) => {
    const res = await fetch(p, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 2000);
    }
    return { status: res.status, ok: res.ok, body };
  }, endpoint);
}

async function saveCookies(page) {
  let cookies = [];
  try {
    const client = await page.createCDPSession();
    const { cookies: all } = await client.send('Network.getAllCookies');
    cookies = all.filter((c) => c.domain.includes('yonzofficial.cloud'));
  } catch {
    cookies = await page.cookies();
  }
  const prev = readSession() || {};
  const payload = {
    ...prev,
    savedAt: new Date().toISOString(),
    baseUrl: BASE,
    // Pertahankan kredensial hasil register (username/password/email), jangan ditimpa.
    account: { ...(prev.account || {}), ...(IDENTIFIER ? { identifier: IDENTIFIER } : {}) },
    cookies,
  };
  writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2));
  return cookies;
}

/**
 * Cookie dari DevTools ("a=b; c=d") atau dari file JSON/txt, supaya tidak perlu lewat Turnstile.
 * Ini jalur yang dipakai kalau login otomatis diblokir Cloudflare.
 */
function parseCookieInput(raw) {
  let value = raw;
  if (raw && existsSync(raw)) value = readFileSync(raw, 'utf8');
  value = value.trim();
  if (!value) return [];

  if (value.startsWith('{')) {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed.cookies)) return parsed.cookies;
    throw new Error('File cookie JSON harus berisi array "cookies" (format yonz-session.json).');
  }

  const host = new URL(BASE).hostname;
  return value
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.includes('='))
    .map((part) => {
      const i = part.indexOf('=');
      return {
        name: part.slice(0, i).trim(),
        value: part.slice(i + 1).trim(),
        domain: host,
        path: '/',
      };
    });
}

async function applyCookies(page, cookies) {
  if (!cookies?.length) return;
  await page.setCookie(
    ...cookies.map(({ name, value, domain, path: p, expires, httpOnly, secure, sameSite }) => ({
      name,
      value,
      domain,
      path: p || '/',
      expires,
      httpOnly,
      secure,
      sameSite,
    }))
  );
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#loginIdentifier', { timeout: 20000 });
  await page.type('#loginIdentifier', IDENTIFIER);
  await page.type('#loginPassword', PASSWORD);
  await waitTurnstile(page, 'turnstileLogin', 'login');

  await page.evaluate(() => document.getElementById('loginForm').scrollIntoView({ block: 'center' }));
  await page.click('#loginSubmitBtn');

  // Tiga kemungkinan: langsung ke /home, modal sidik jari, atau pesan error.
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if (page.url().includes('/home')) break;

    const state = await page.evaluate(() => {
      const fp = document.getElementById('fingerprintOverlay');
      const msg = document.getElementById('loginMsg');
      return {
        fingerprint: !!fp && getComputedStyle(fp).display !== 'none',
        error: msg && msg.textContent.trim() && msg.className.includes('err') ? msg.textContent.trim() : '',
      };
    });

    if (state.error) throw new Error('Login ditolak: ' + state.error);

    if (state.fingerprint) {
      console.log('[sidik jari] tahan tombol 4 detik...');
      const btn = await page.$('#fingerprintBtn');
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await sleep(4000);
      await page.mouse.up();
      break;
    }
    await sleep(1000);
  }

  for (let i = 0; i < 30 && !page.url().includes('/home'); i++) await sleep(1000);
  if (!page.url().includes('/home')) throw new Error('Tidak sampai ke /home. URL akhir: ' + page.url());
  console.log('[login] berhasil, URL =', page.url());
}

async function scrape(page) {
  // Semua respons JSON /api/* saat /home dimuat ikut direkam.
  const apiSnapshots = {};
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/') || res.status() !== 200) return;
    if (!(res.headers()['content-type'] || '').includes('json')) return;
    try {
      apiSnapshots[url.replace(BASE, '').split('?')[0]] = await res.json();
    } catch {}
  });

  await page.goto(BASE + '/home', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await sleep(2000);

  const [me, history] = await Promise.all([
    apiFetch(page, '/api/auth/me'),
    apiFetch(page, `/api/reaction/history?limit=${encodeURIComponent(LIMIT)}`),
  ]);

  if (me.status === 401) throw new Error('Cookie sesi tidak valid (401). Login ulang tanpa --reuse-session.');

  const dom = await page.evaluate(() => {
    const texts = (sel) =>
      [...document.querySelectorAll(sel)].map((el) => (el.innerText || '').trim()).filter(Boolean);
    return {
      title: document.title,
      url: location.href,
      headings: texts('h1, h2, h3').slice(0, 50),
      listItems: texts('.list-item').slice(0, 200),
      emptyStates: texts('.empty').slice(0, 20),
    };
  });

  return {
    scrapedAt: new Date().toISOString(),
    baseUrl: BASE,
    profile: me.body,
    history: history.body,
    apiSnapshots,
    dom,
  };
}

const session = readSession();
const cliCookies = COOKIE_INPUT ? parseCookieInput(COOKIE_INPUT) : [];
if (REUSE_ONLY && !cliCookies.length && !session?.cookies?.length) {
  fail('yonz-session.json belum ada / tanpa cookie. Jalankan tanpa --reuse-session untuk login.');
}
if (!cliCookies.length && !session?.cookies?.length && (!IDENTIFIER || !PASSWORD)) {
  fail(
    'Kredensial belum diisi. Set YONZ_IDENTIFIER dan YONZ_PASSWORD, contoh:\n' +
      '  YONZ_IDENTIFIER=user YONZ_PASSWORD=pass xvfb-run -a node yonz-scraper.mjs\n' +
      'Atau pakai cookie yang sudah tersimpan: node yonz-scraper.mjs --reuse-session'
  );
}
if (!HEADLESS && !process.env.DISPLAY) {
  fail('BUTUH DISPLAY untuk browser non-headless. Jalankan dengan: xvfb-run -a node yonz-scraper.mjs ...');
}

const browser = await puppeteer.launch({
  headless: HEADLESS,
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  // Sembunyikan sinyal otomasi (dipakai juga oleh script debug di repo ini).
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined });
    if (!window.chrome) window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
  });

  let loggedIn = false;
  const cookies = cliCookies.length ? cliCookies : session?.cookies || [];

  if (cookies.length) {
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await applyCookies(page, cookies);
    const check = await apiFetch(page, '/api/auth/me');
    if (check.ok) {
      console.log('[sesi] cookie tersimpan masih valid');
      loggedIn = true;
    } else if (REUSE_ONLY) {
      fail('Cookie sesi tidak valid (401). Ambil cookie baru dari browser yang sudah login.');
    } else if (cliCookies.length) {
      fail('Cookie dari --cookie ditolak server (401). Pastikan sudah login dan cookie belum kadaluarsa.');
    } else {
      console.log('[sesi] cookie kadaluarsa, login ulang');
    }
  } else if (REUSE_ONLY) {
    fail('yonz-session.json belum ada / tanpa cookie. Jalankan tanpa --reuse-session untuk login.');
  }

  if (!loggedIn) await login(page);

  const data = await scrape(page);
  const savedCookies = await saveCookies(page);

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ ...data, cookieCount: savedCookies.length }, null, 2));

  const rows = Array.isArray(data.history?.data) ? data.history.data : [];
  console.log('[hasil]', OUT);
  console.log('[ringkas] profil:', data.profile?.success === false ? 'gagal' : 'ok');
  console.log('[ringkas] riwayat reaction:', rows.length, 'baris');
  console.log('[ringkas] endpoint /api terekam:', Object.keys(data.apiSnapshots).join(', ') || '(tidak ada)');
} finally {
  await browser.close();
}
