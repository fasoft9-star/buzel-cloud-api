import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const PUBLIC_URL_FILE = path.join(DATA_DIR, 'public-url.txt');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const DEFAULT_PUBLIC_URL = 'https://buzzel.duckdns.org';

try {
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // ignore env read error
}

/**
 * @returns {string}
 */
export function getSavedPublicUrl() {
  if (process.env.CDN_BASE_URL) {
    return process.env.CDN_BASE_URL.replace(/\/+$/, '');
  }
  try {
    const url = fs.readFileSync(PUBLIC_URL_FILE, 'utf8').trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace(/\/+$/, '');
    }
  } catch {
    return DEFAULT_PUBLIC_URL;
  }
  return DEFAULT_PUBLIC_URL;
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
export function resolveBaseUrl(req) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host =
    (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : req.get('host')) ||
    '127.0.0.1:3000';

  const isLocalHost =
    host.startsWith('127.0.0.1') ||
    host.startsWith('localhost') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.');

  if (isLocalHost) {
    return getSavedPublicUrl();
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  let proto =
    (typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol) ||
    'http';

  if (host.endsWith('.duckdns.org') || host.endsWith('.trycloudflare.com')) {
    proto = 'https';
  }

  return `${proto}://${host}`;
}
