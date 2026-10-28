// Penyimpanan multi-akun yonz (username/password/email/cookie + kuota harian).
// Kuota dianggap reset setiap ganti tanggal: akun yang hari ini habis otomatis
// punya jatah penuh lagi besok.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const POOL_FILE = process.env.YONZ_POOL || path.join(__dirname, 'yonz-accounts.json');
export const DEFAULT_DAILY_LIMIT = 2;

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function loadPool() {
  if (!existsSync(POOL_FILE)) return { accounts: [] };
  try {
    const raw = JSON.parse(readFileSync(POOL_FILE, 'utf8'));
    const accounts = Array.isArray(raw) ? raw : raw.accounts;
    return { accounts: Array.isArray(accounts) ? accounts : [] };
  } catch {
    return { accounts: [] };
  }
}

export function savePool(pool) {
  writeFileSync(
    POOL_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), accounts: pool.accounts }, null, 2)
  );
}

/** Reset kuota kalau tanggal tersimpan bukan hari ini. */
export function refreshQuota(account, now = new Date()) {
  const key = todayKey(now);
  const prev = account.quota || {};
  const dailyLimit = Number(prev.dailyLimit) || DEFAULT_DAILY_LIMIT;
  if (prev.date !== key) {
    account.quota = { date: key, usedToday: 0, dailyLimit, remainingToday: dailyLimit };
  } else {
    account.quota = {
      date: key,
      dailyLimit,
      usedToday: Number(prev.usedToday) || 0,
      remainingToday: prev.remainingToday === undefined ? dailyLimit : Number(prev.remainingToday),
    };
  }
  return account;
}

/** Tambah/update akun (dicocokkan lewat username, lalu email). */
export function upsertAccount(account) {
  const pool = loadPool();
  const i = pool.accounts.findIndex(
    (a) => (account.username && a.username === account.username) || (account.email && a.email === account.email)
  );
  const merged = i === -1 ? { ...account } : { ...pool.accounts[i], ...account };
  if (!merged.createdAt) merged.createdAt = new Date().toISOString();
  refreshQuota(merged);
  if (i === -1) pool.accounts.push(merged);
  else pool.accounts[i] = merged;
  savePool(pool);
  return merged;
}

/** Akun dengan sisa kuota hari ini; yang paling lama dibuat dipakai lebih dulu. */
export function pickAccount(pool = loadPool()) {
  pool.accounts.forEach((a) => refreshQuota(a));
  const usable = pool.accounts.filter((a) => Number(a.quota?.remainingToday) > 0);
  usable.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return usable[0] || null;
}

/** Simpan hasil pemakaian kuota dari respons /api/reaction. */
export function setQuota(account, limit) {
  const dailyLimit = Number(limit?.dailyLimit) || Number(account.quota?.dailyLimit) || DEFAULT_DAILY_LIMIT;
  const usedToday = Number(limit?.usedToday);
  const remainingToday = Number(limit?.remainingToday);
  account.quota = {
    date: todayKey(),
    dailyLimit,
    usedToday: Number.isFinite(usedToday) ? usedToday : 0,
    remainingToday: Number.isFinite(remainingToday)
      ? remainingToday
      : Math.max(0, dailyLimit - (Number.isFinite(usedToday) ? usedToday : 0)),
  };
  return upsertAccount(account);
}

/** Tandai kuota akun habis untuk hari ini. */
export function exhaust(account) {
  const dailyLimit = Number(account.quota?.dailyLimit) || DEFAULT_DAILY_LIMIT;
  account.quota = { date: todayKey(), usedToday: dailyLimit, dailyLimit, remainingToday: 0 };
  return upsertAccount(account);
}

export function poolSummary(pool = loadPool()) {
  pool.accounts.forEach((a) => refreshQuota(a));
  return pool.accounts.map((a) => {
    const q = a.quota || {};
    return `${a.username || a.email}: ${q.usedToday ?? 0}/${q.dailyLimit ?? DEFAULT_DAILY_LIMIT} (sisa ${q.remainingToday ?? 0})`;
  });
}
