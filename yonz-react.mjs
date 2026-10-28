// Kirim reaction ke satu postingan saluran lewat rch.yonzofficial.cloud, memakai pool akun.
//
// - Akun disimpan di yonz-accounts.json (username/password/email/cookie + kuota harian).
// - Akun dipilih yang masih punya sisa kuota hari ini; kalau semua habis -> daftar akun baru
//   lewat register-tempmail.mjs (email temp).
// - Kuota yang habis otomatis penuh lagi besok (reset per tanggal), jadi akun lama dipakai ulang.
// - Cookie akun yang kadaluarsa -> login ulang pakai username/password tersimpan.
//
// Pakai:
//   xvfb-run -a node yonz-react.mjs <url-postingan> <emoji> [--max-accounts 3]
//   xvfb-run -a node yonz-react.mjs https://whatsapp.com/channel/0029VbE2cjz4inolNz25b13J/101 "🔥"
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exhaust, loadPool, pickAccount, poolSummary, setQuota, upsertAccount } from './yonz-pool.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('rebrowser-puppeteer-core');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, 'yonz-session.json');
const REGISTER_SCRIPT = path.join(__dirname, 'register-tempmail.mjs');
const BASE = 'https://rch.yonzofficial.cloud';
const CHROME = process.env.CHROME_PATH || '/opt/chrome-unconfined/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const POST_URL = positional[0];
const EMOJI = positional[1] || '🔥';
const MAX_NEW_ACCOUNTS = Number(opt('max-accounts', process.env.YONZ_MAX_ACCOUNTS || 3));

if (!POST_URL) {
  console.error('Pakai: xvfb-run -a node yonz-react.mjs <url-postingan> <emoji> [--max-accounts N]');
  process.exit(1);
}
if (!process.env.DISPLAY) {
  console.error('BUTUH DISPLAY. Jalankan dengan: xvfb-run -a node yonz-react.mjs ...');
  process.exit(1);
}

function writeActiveSession(account) {
  writeFileSync(
    SESSION_FILE,
    JSON.stringify(
      {
        savedAt: new Date().toISOString(),
        baseUrl: BASE,
        account: { username: account.username, password: account.password, email: account.email },
        cookies: account.cookies || [],
        apiRoutesSeen: account.apiRoutesSeen || [],
      },
      null,
      2
    )
  );
}

function readActiveSession() {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
  } catch {
    return null;
  }
}

let newAccounts = 0;
/** Jalankan register-tempmail.mjs; akun hasilnya otomatis masuk pool. */
function registerNewAccount() {
  if (newAccounts >= MAX_NEW_ACCOUNTS) {
    throw new Error(`Sudah daftar ${newAccounts} akun baru, batas --max-accounts ${MAX_NEW_ACCOUNTS}`);
  }
  console.log(`\n[akun] semua akun habis -> daftar akun baru (${newAccounts + 1}/${MAX_NEW_ACCOUNTS})...`);
  const res = spawnSync(process.execPath, [REGISTER_SCRIPT], { cwd: __dirname, stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`Daftar akun baru gagal (exit ${res.status})`);
  newAccounts++;

  const fresh = readActiveSession();
  const pool = loadPool();
  const account =
    pool.accounts.find((a) => a.username === fresh?.account?.username) || pickAccount(pool);
  if (!account) throw new Error('Akun baru tidak ditemukan di yonz-accounts.json');
  console.log('[akun] dipakai:', account.username, '|', account.email, '| sisa kuota:', account.quota?.remainingToday);
  return account;
}

/** Klik checkbox Turnstile ala manusia (klik lompat langsung tidak menghasilkan token). */
async function solveTurnstile(page, widgetId, timeoutMs = 90000) {
  const len = () =>
    page.evaluate((id) => {
      const el = document.querySelector(`#${id} input[name="cf-turnstile-response"]`);
      return el ? el.value.length : 0;
    }, widgetId);

  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), widgetId).catch(() => {});
  const t0 = Date.now();
  let lastClick = 0;
  while (Date.now() - t0 < timeoutMs) {
    if ((await len()) > 10) return true;
    if (Date.now() - t0 > 3000 && Date.now() - lastClick > 12000) {
      const box = await page.evaluate((id) => {
        const r = document.getElementById(id).getBoundingClientRect();
        return { x: r.x, y: r.y, h: r.height };
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
  return false;
}

async function cookiesOf(page) {
  try {
    const client = await page.createCDPSession();
    const { cookies } = await client.send('Network.getAllCookies');
    return cookies.filter((c) => c.domain.includes('yonzofficial.cloud'));
  } catch {
    return page.cookies();
  }
}

/** Login ulang pakai username/password akun (dipakai kalau cookie kadaluarsa). */
async function loginWithPassword(account) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined });
      if (!window.chrome) window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
    });

    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#loginIdentifier', { timeout: 20000 });
    await page.type('#loginIdentifier', account.username || account.email);
    await page.type('#loginPassword', account.password);
    if (!(await solveTurnstile(page, 'turnstileLogin'))) {
      console.log('[login] token Turnstile tidak keluar');
      return null;
    }
    await page.evaluate(() => document.getElementById('loginSubmitBtn').scrollIntoView({ block: 'center' }));
    await page.click('#loginSubmitBtn');

    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      if (page.url().includes('/home')) break;
      const state = await page.evaluate(() => {
        const fp = document.getElementById('fingerprintOverlay');
        const msg = document.getElementById('loginMsg');
        return {
          fp: !!fp && getComputedStyle(fp).display !== 'none',
          error: msg && msg.className.includes('err') ? msg.innerText.trim() : '',
        };
      });
      if (state.error) {
        console.log('[login] ditolak:', state.error);
        return null;
      }
      if (state.fp) {
        console.log('[login] verifikasi sidik jari, tahan 4 detik...');
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
    if (!page.url().includes('/home')) {
      console.log('[login] tidak sampai /home, URL:', page.url());
      return null;
    }
    const cookies = await cookiesOf(page);
    console.log('[login] berhasil, cookie:', cookies.length);
    return cookies;
  } finally {
    await browser.close();
  }
}

/** Satu kali kirim. Return { status, body } dari POST /api/reaction (status 0 = tanpa respons). */
async function sendOnce(cookies, url, emoji) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined });
      if (!window.chrome) window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
    });

    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.setCookie(...cookies);
    await page.goto(BASE + '/home', { waitUntil: 'networkidle2', timeout: 60000 });

    if (!page.url().includes('/home')) return { status: 401, body: { message: 'Sesi tidak valid (dilempar ke login)' } };
    await page.waitForSelector('#reactionUrl', { timeout: 20000 });
    await sleep(1500);

    await page.$eval('#reactionUrl', (el) => el.scrollIntoView({ block: 'center' }));
    await page.click('#reactionUrl', { clickCount: 3 });
    await page.type('#reactionUrl', url);
    await page.$eval(
      '#reactionEmoji',
      (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      emoji
    );

    if (!(await solveTurnstile(page, 'turnstileReaction'))) {
      return { status: 0, body: { message: 'Token Turnstile tidak keluar' } };
    }

    const waitResponse = page
      .waitForResponse((res) => res.url().includes('/api/reaction') && res.request().method() === 'POST', {
        timeout: 90000,
      })
      .catch(() => null);

    await page.evaluate(() => document.getElementById('reactionSubmitBtn').scrollIntoView({ block: 'center' }));
    await page.click('#reactionSubmitBtn');

    const res = await waitResponse;
    if (!res) {
      const msg = await page.$eval('#reactionMsg', (e) => e.innerText.trim()).catch(() => '');
      return { status: 0, body: { message: msg || 'Tidak ada respons dari /api/reaction' } };
    }
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 300) };
    }
    return { status: res.status(), body };
  } finally {
    await browser.close();
  }
}

function isQuotaError(status, body) {
  if (status === 402 || status === 429) return true;
  if (body?.success === true) return false;
  if (status === 401 || status === 0) return false;
  const blob = JSON.stringify(body || '').toLowerCase();
  return /kuota|quota|limit|habis|batas harian|too many/.test(blob);
}

/** Pastikan akun punya cookie valid, login ulang kalau perlu. */
async function ensureCookies(account) {
  if (account.cookies?.length) return true;
  console.log('[sesi] akun belum punya cookie, login pakai password...');
  const cookies = await loginWithPassword(account);
  if (!cookies?.length) return false;
  account.cookies = cookies;
  upsertAccount(account);
  writeActiveSession(account);
  return true;
}

try {
  let account = pickAccount();
  if (!account) {
    account = registerNewAccount();
  } else {
    console.log('[pool] akun dipakai:', account.username, '| sisa kuota:', account.quota?.remainingToday);
  }
  console.log('[pool] status:', poolSummary().join(' | '));

  for (let round = 0; round < 20; round++) {
    if (!(await ensureCookies(account))) {
      console.log('[akun] tidak bisa login, akun dilewati');
      exhaust(account);
    } else {
      console.log(`\n[kirim] ${POST_URL} ${EMOJI} | akun ${account.username}`);
      let res = await sendOnce(account.cookies, POST_URL, EMOJI);

      if (res.status === 401) {
        console.log('[sesi] cookie kadaluarsa, login ulang pakai password...');
        account.cookies = [];
        upsertAccount(account);
        if (!(await ensureCookies(account))) {
          console.log('[akun] login ulang gagal, akun dilewati');
          exhaust(account);
          res = null;
        } else {
          res = await sendOnce(account.cookies, POST_URL, EMOJI);
        }
      }

      if (res?.body?.success) {
        setQuota(account, res.body.limit);
        writeActiveSession(account);
        const task = res.body.task || {};
        const limit = res.body.limit || {};
        console.log('\n[selesai] status task :', task.status, '| key_id:', task.key_id);
        console.log('[selesai] reaction   :', task.reaction_code, '->', task.saluranURL);
        console.log('[selesai] kuota akun :', `${limit.usedToday}/${limit.dailyLimit}`, '| sisa hari ini:', limit.remainingToday);
        console.log('[selesai] akun       :', account.username, '|', account.email);
        console.log('[pool] status:', poolSummary().join(' | '));
        break;
      }

      if (res && isQuotaError(res.status, res.body)) {
        console.log('[kuota]', res.status, res.body?.message || JSON.stringify(res.body).slice(0, 200));
        exhaust(account);
      } else if (res) {
        console.error('[gagal]', res.status, res.body?.message || JSON.stringify(res.body).slice(0, 300));
        process.exitCode = 1;
        break;
      }
    }

    account = pickAccount();
    if (!account) {
      account = registerNewAccount();
    } else {
      console.log('[pool] lanjut ke akun:', account.username, '| sisa kuota:', account.quota?.remainingToday);
    }
  }
} catch (err) {
  console.error('[gagal]', err.message);
  process.exitCode = 1;
}
