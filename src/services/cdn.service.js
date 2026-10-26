import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from '../utils/url.util.js';
import { HttpError } from '../middlewares/error.middleware.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const DB_FILE_PATH = path.join(DATA_DIR, 'cdn-files.json');
const FILE_PATH_CACHE_TTL_MS = 45 * 60 * 1000;

/**
 * @typedef {Object} CdnFileRecord
 * @property {string} id
 * @property {string} telegramFileId
 * @property {number} messageId
 * @property {string} fileName
 * @property {string} mimeType
 * @property {number} size
 * @property {number} createdAt
 */

/**
 * @typedef {Object} CdnUploadResponse
 * @property {boolean} success
 * @property {string} url
 * @property {string} downloadUrl
 * @property {string} fileName
 * @property {string} fileId
 * @property {number} size
 * @property {string} mimeType
 */

/** @type {Map<string, CdnFileRecord>} */
const fileIndex = new Map();

/** @type {Map<string, { filePath: string, expiresAt: number }>} */
const telegramPathCache = new Map();

let indexInitialized = false;

/**
 * @returns {Promise<void>}
 */
async function ensureIndexLoaded() {
  if (indexInitialized) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item?.id && item?.telegramFileId) {
          fileIndex.set(item.id, item);
        }
      }
    }
  } catch {
    await saveIndex();
  }
  indexInitialized = true;
}

/**
 * @returns {Promise<void>}
 */
async function saveIndex() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const records = Array.from(fileIndex.values());
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * @param {string} originalName
 * @param {string} mimeType
 * @returns {string}
 */
function resolveExtension(originalName, mimeType) {
  const extFromName = path.extname(originalName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (extFromName && extFromName.length <= 10) {
    return extFromName;
  }

  /** @type {Record<string, string>} */
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/json': '.json',
    'text/plain': '.txt',
  };

  return mimeMap[mimeType] || '.bin';
}

/**
 * @param {string} ext
 * @returns {string}
 */
function generateShortId(ext) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code}${ext}`;
}

/**
 * @param {Record<string, any>} message
 * @returns {string | null}
 */
function extractTelegramFileId(message) {
  if (!message) return null;
  if (message.document?.file_id) return message.document.file_id;
  if (message.audio?.file_id) return message.audio.file_id;
  if (message.video?.file_id) return message.video.file_id;
  if (message.animation?.file_id) return message.animation.file_id;
  if (message.sticker?.file_id) return message.sticker.file_id;
  if (message.voice?.file_id) return message.voice.file_id;
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    return message.photo[message.photo.length - 1].file_id;
  }
  return null;
}

/**
 * @param {Express.Multer.File} file
 * @param {string} baseUrl
 * @returns {Promise<CdnUploadResponse>}
 */
export async function uploadToCdn(file, baseUrl) {
  await ensureIndexLoaded();

  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new HttpError(400, 'File buffer is empty');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(413, 'Ukuran file melebihi batas maksimal 20 MB untuk Telegram Storage');
  }

  const mimeType = file.mimetype || 'application/octet-stream';
  const originalName = file.originalname || `file_${Date.now()}`;
  const ext = resolveExtension(originalName, mimeType);

  let shortId = generateShortId(ext);
  while (fileIndex.has(shortId)) {
    shortId = generateShortId(ext);
  }

  const sizeKB = (file.size / 1024).toFixed(1);
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('disable_content_type_detection', 'true');
  formData.append('caption', `📦 ${shortId}\n📄 ${originalName}\n🏷 ${mimeType} (${sizeKB} KB)`);

  const blob = new Blob([file.buffer], { type: mimeType });
  formData.append('document', blob, originalName);

  const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
  const response = await fetch(tgUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.ok || !data.result) {
    throw new HttpError(
      response.status || 502,
      data.description || 'Gagal mengunggah file ke Telegram Storage'
    );
  }

  const telegramFileId = extractTelegramFileId(data.result);
  if (!telegramFileId) {
    throw new HttpError(502, 'Telegram tidak mengembalikan file_id');
  }

  /** @type {CdnFileRecord} */
  const record = {
    id: shortId,
    telegramFileId,
    messageId: data.result.message_id,
    fileName: originalName,
    mimeType,
    size: file.size,
    createdAt: Date.now(),
  };

  fileIndex.set(shortId, record);
  await saveIndex();

  const cleanBase = (process.env.CDN_BASE_URL || baseUrl || '').replace(/\/+$/, '');
  const fileUrl = `${cleanBase}/f/${shortId}`;

  return {
    success: true,
    url: fileUrl,
    downloadUrl: `${fileUrl}?dl=1`,
    fileName: originalName,
    fileId: shortId,
    size: file.size,
    mimeType,
  };
}

/**
 * @param {string} id
 * @returns {Promise<CdnFileRecord>}
 */
export async function findCdnRecord(id) {
  await ensureIndexLoaded();
  const direct = fileIndex.get(id);
  if (direct) return direct;

  for (const [key, record] of fileIndex.entries()) {
    if (key.startsWith(`${id}.`)) {
      return record;
    }
  }

  throw new HttpError(404, 'File tidak ditemukan di CDN');
}

/**
 * @param {string} telegramFileId
 * @returns {Promise<string>}
 */
async function resolveTelegramFilePath(telegramFileId) {
  const cached = telegramPathCache.get(telegramFileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.filePath;
  }

  const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(telegramFileId)}`;
  const response = await fetch(tgUrl);
  const data = await response.json();

  if (!response.ok || !data.ok || !data.result?.file_path) {
    throw new HttpError(404, data.description || 'File tidak tersedia di server Telegram');
  }

  const filePath = data.result.file_path;
  telegramPathCache.set(telegramFileId, {
    filePath,
    expiresAt: Date.now() + FILE_PATH_CACHE_TTL_MS,
  });

  return filePath;
}

/**
 * @param {string} id
 * @returns {Promise<{ record: CdnFileRecord, upstreamResponse: Response }>}
 */
export async function fetchCdnFileUpstream(id) {
  const record = await findCdnRecord(id);
  const filePath = await resolveTelegramFilePath(record.telegramFileId);
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

  const upstreamResponse = await fetch(downloadUrl);
  if (!upstreamResponse.ok || !upstreamResponse.body) {
    telegramPathCache.delete(record.telegramFileId);
    throw new HttpError(502, 'Gagal mengambil stream file dari Telegram Storage');
  }

  return { record, upstreamResponse };
}

/**
 * @param {string} baseUrl
 * @param {number} [limit=50]
 * @returns {Promise<{ totalFiles: number, totalSize: number, files: Array<CdnFileRecord & { url: string, downloadUrl: string }> }>}
 */
export async function listCdnFiles(baseUrl, limit = 50) {
  await ensureIndexLoaded();
  const cleanBase = (process.env.CDN_BASE_URL || baseUrl || '').replace(/\/+$/, '');
  const all = Array.from(fileIndex.values()).sort((a, b) => b.createdAt - a.createdAt);
  const totalSize = all.reduce((acc, item) => acc + (item.size || 0), 0);

  const files = all.slice(0, limit).map((item) => ({
    ...item,
    url: `${cleanBase}/f/${item.id}`,
    downloadUrl: `${cleanBase}/f/${item.id}?dl=1`,
  }));

  return {
    totalFiles: all.length,
    totalSize,
    files,
  };
}

/**
 * @param {string} id
 * @returns {Promise<{ id: string }>}
 */
export async function deleteCdnFile(id) {
  const record = await findCdnRecord(id);

  if (record.messageId) {
    const deleteUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`;
    await fetch(deleteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: record.messageId,
      }),
    }).catch(() => null);
  }

  fileIndex.delete(record.id);
  telegramPathCache.delete(record.telegramFileId);
  await saveIndex();

  return { id: record.id };
}
