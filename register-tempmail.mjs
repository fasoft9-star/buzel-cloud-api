// One-off: daftar akun rch.yonzofficial.cloud pakai email temporary (api.theresav.eu).
// Jalankan: xvfb-run -a node register-tempmail.mjs
// Opsi:     --domain acqq.dev
// Hasil: yonz-session.json (cookie + kredensial akun + route /api yang dipakai /home)
//
// Alur situs yonz: form daftar -> Turnstile -> modal "Verifikasi Email" (4 digit) -> sidik jari 4 detik -> /home
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { loadPool, todayKey, upsertAccount } from './yonz-pool.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('rebrowser-puppeteer-core');

// Muat .env lokal (Node 20.6+), kalau ada — supaya THERESAV_APIKEY tidak perlu di-export manual.
try {
  process.loadEnvFile(new URL('./.env', import.meta.url));
} catch {}

const BASE = 'https://rch.yonzofficial.cloud';
const MAIL_API = (process.env.THERESAV_BASE || 'https://api.theresav.eu').replace(/\/$/, '');
const MAIL_KEY = process.env.THERESAV_APIKEY || '';
if (!MAIL_KEY) {
  console.error(
    'THERESAV_APIKEY belum diisi. Tambahkan ke .env (THERESAV_APIKEY=...), atau jalankan:\n' +
      '  THERESAV_APIKEY=xxx xvfb-run -a node register-tempmail.mjs'
  );
  process.exit(1);
}
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || 'acqq.dev';
const OUT = new URL('./yonz-session.json', import.meta.url).pathname;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const DOMAIN = opt('domain', MAIL_DOMAIN);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mailJson(path) {
  const res = await fetch(MAIL_API + path, { headers: { 'x-apikey': MAIL_KEY } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok || body?.status === false) {
    throw new Error(`MAIL API ${res.status} ${path}: ${typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

// ---------- 1. email temporary ----------
const created = await mailJson(`/api/tools/generator/email/create?domain=${encodeURIComponent(DOMAIN)}`);
const address = created?.result?.email;
if (!address) throw new Error('Gagal buat email temporary: ' + JSON.stringify(created).slice(0, 300));
console.log('[mail] address =', address);

/** Ambil semua string dari respons inbox, buang field id/date supaya angka acak tidak ikut jadi kode. */
function flatten(value, key = '', out = []) {
  if (typeof value === 'string') {
    if (!/^(id|_id|date|time|createdAt|timestamp|token|sender)$/i.test(key)) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => flatten(v, key, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, k, out);
  }
  return out;
}

function pickCode(messages) {
  for (const msg of messages) {
    const blob = flatten(msg).join('\n').replace(/<[^>]+>/g, ' ');
    const named = blob.match(/(?:kode|code|otp|verifikasi|verification)[^\d]{0,60}(\d{4})(?!\d)/i);
    if (named) return named[1];
    const candidates = (blob.match(/(?<!\d)\d{4}(?!\d)/g) || []).filter((c) => !/^(19|20)\d\d$/.test(c));
    if (candidates.length) return candidates[0];
  }
  return null;
}

async function waitOtp(label, timeoutMs = 180000) {
  const t0 = Date.now();
  let firstShapeLogged = false;
  while (Date.now() - t0 < timeoutMs) {
    let messages = [];
    try {
      const inbox = await mailJson(`/api/tools/generator/email/inbox?email=${encodeURIComponent(address)}`);
      messages = inbox?.result?.messages || [];
    } catch (err) {
      console.log('[mail] cek inbox gagal:', err.message);
    }
    if (messages.length && !firstShapeLogged) {
      console.log('[mail] contoh message:', JSON.stringify(messages[0]).slice(0, 600));
      firstShapeLogged = true;
    }
    const code = pickCode(messages);
    if (code) {
      console.log(`[otp] ${label} kode = ${code} (${messages.length} pesan)`);
      return code;
    }
    await sleep(3000);
  }
  throw new Error(`OTP ${label} tidak masuk dalam ${Math.round(timeoutMs / 1000)}s`);
}

// ---------- 2. daftar lewat browser sungguhan (Turnstile) ----------
const username = 'yo' + randomBytes(3).toString('hex');
const password = 'Yz!' + randomBytes(9).toString('hex');
console.log('[akun] username =', username, '| password =', password);

const browser = await puppeteer.launch({
  headless: false,
  executablePath: '/opt/chrome-unconfined/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 900 });

await page.evaluateOnNewDocument(() => {
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined });
  if (!window.chrome) window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
});

const apiHits = new Set();
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('/api/')) apiHits.add(u.replace(BASE, '').split('?')[0]);
});

const tokenLen = () =>
  page.evaluate(() => {
    const el = document.querySelector('#turnstileRegister input[name="cf-turnstile-response"]');
    return el ? el.value.length : 0;
  });

/**
 * Klik checkbox Turnstile ala manusia: gerakan mouse bertahap dulu, baru klik.
 * Klik langsung (lompat sekali) terbukti tidak menghasilkan token di sini.
 */
async function waitTurnstile(widgetId, timeoutMs = 120000) {
  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), widgetId);
  const t0 = Date.now();
  let lastClick = 0;
  while (Date.now() - t0 < timeoutMs) {
    if ((await tokenLen()) > 10) {
      console.log('[turnstile] token OK');
      return;
    }
    if (Date.now() - t0 > 3000 && Date.now() - lastClick > 12000) {
      const box = await page.evaluate((id) => {
        const r = document.getElementById(id).getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }, widgetId);
      const tx = box.x + 30;
      const ty = box.y + box.h / 2;
      await page.mouse.move(box.x - 200, ty + 120, { steps: 15 });
      await page.mouse.move(tx - 60, ty + 10, { steps: 10 });
      await page.mouse.move(tx, ty, { steps: 8 });
      await sleep(300);
      await page.mouse.click(tx, ty);
      lastClick = Date.now();
      console.log('[turnstile] checkbox diklik');
    }
    await sleep(1000);
  }
  throw new Error('Turnstile token tidak keluar');
}

try {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.click('.alip-tab-btn[data-target="registerPanel"]');
  await page.waitForSelector('#registerUsername', { timeout: 20000 });
  await page.type('#registerUsername', username);
  await page.type('#registerEmail', address);
  await page.type('#registerPassword', password);

  await waitTurnstile('turnstileRegister');

  await page.evaluate(() => document.getElementById('registerForm').scrollIntoView({ block: 'center' }));
  await page.click('#registerSubmitBtn');

  // Modal OTP ATAU pesan error (email domain ditolak, username dipakai, dll).
  const t0 = Date.now();
  let otpShown = false;
  while (Date.now() - t0 < 45000) {
    const state = await page.evaluate(() => {
      const o = document.getElementById('registerOtpOverlay');
      const msg = document.getElementById('registerMsg');
      return {
        visible: !!o && getComputedStyle(o).display !== 'none',
        msg: msg ? msg.innerText.trim() : '',
      };
    });
    if (state.visible) {
      otpShown = true;
      break;
    }
    if (state.msg) throw new Error('Daftar ditolak: ' + state.msg);
    await sleep(1000);
  }
  if (!otpShown) {
    const shot = '/tmp/yonz-register-fail.png';
    await page.screenshot({ path: shot }).catch(() => {});
    throw new Error('Modal OTP tidak muncul. Screenshot: ' + shot);
  }
  console.log('[otp] modal muncul, menunggu email...');

  const code = await waitOtp('daftar');
  await page.type('#registerOtpInput', code);
  await page.click('#registerOtpSubmitBtn');

  // Hasil: sidik jari, atau pesan salah kode.
  const t1 = Date.now();
  let fpShown = false;
  while (Date.now() - t1 < 40000) {
    const state = await page.evaluate(() => {
      const fp = document.getElementById('fingerprintOverlay');
      const msg = document.getElementById('registerOtpMsg');
      return {
        fp: !!fp && getComputedStyle(fp).display !== 'none',
        msg: msg ? msg.innerText.trim() : '',
      };
    });
    if (state.fp) {
      fpShown = true;
      break;
    }
    if (state.msg) throw new Error('Kode OTP ditolak: ' + state.msg);
    await sleep(1000);
  }
  if (!fpShown) throw new Error('Overlay sidik jari tidak muncul setelah verifikasi');

  console.log('[sidik jari] tahan 4 detik...');
  const btn = await page.$('#fingerprintBtn');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(4000);
  await page.mouse.up();

  for (let i = 0; i < 30 && !page.url().includes('/home'); i++) await sleep(1000);
  await sleep(3000);
  console.log('[selesai] URL =', page.url());
  if (!page.url().includes('/home')) {
    const msg = await page.$eval('#fingerprintMsg, #registerOtpMsg, #registerMsg', (e) => e.textContent).catch(() => '');
    throw new Error('Gagal masuk /home. Pesan UI: ' + msg.trim());
  }

  // ---------- 3. simpan cookie + route API ----------
  let cookies;
  try {
    const client = await page.createCDPSession();
    const { cookies: all } = await client.send('Network.getAllCookies');
    cookies = all.filter((c) => c.domain.includes('yonzofficial.cloud'));
  } catch {
    cookies = await page.cookies();
  }

  const payload = {
    savedAt: new Date().toISOString(),
    baseUrl: BASE,
    account: { username, password, email: address },
    cookies,
    apiRoutesSeen: [...apiHits].sort(),
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log('[simpan] ->', OUT);

  upsertAccount({
    username,
    password,
    email: address,
    createdAt: new Date().toISOString(),
    cookies,
    apiRoutesSeen: payload.apiRoutesSeen,
    quota: { date: todayKey(), usedToday: 0, dailyLimit: 2, remainingToday: 2 },
  });
  console.log('[pool] akun tercatat:', username, '| total akun:', loadPool().accounts.length);
  console.log('[route API terlihat]:', payload.apiRoutesSeen.join(', ') || '(belum ada)');
} catch (err) {
  await page.screenshot({ path: '/tmp/yonz-register-error.png' }).catch(() => {});
  console.error('[gagal]', err.message);
  console.error('[screenshot] /tmp/yonz-register-error.png | email dipakai:', address);
  process.exitCode = 1;
} finally {
  await browser.close();
}
