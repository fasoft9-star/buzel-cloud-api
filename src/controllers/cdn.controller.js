import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import {
  uploadToCdn,
  fetchCdnFileUpstream,
  listCdnFiles,
  deleteCdnFile,
} from '../services/cdn.service.js';
import { resolveBaseUrl } from '../utils/url.util.js';
import { HttpError } from '../middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      throw new HttpError(400, 'File is required (field name: "file")');
    }

    const baseUrl = resolveBaseUrl(req);
    const result = await uploadToCdn(req.file, baseUrl);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request<{ id: string }>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function serveCdnFile(req, res, next) {
  try {
    const { id } = req.params;
    const { record, upstreamResponse } = await fetchCdnFileUpstream(id);

    const safeFileName = (record.fileName || record.id).replace(/["\r\n]/g, '_');
    const dispositionType = req.query.dl === '1' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    if (record.size) {
      res.setHeader('Content-Length', String(record.size));
    }
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!upstreamResponse.body) {
      throw new HttpError(502, 'Empty stream from storage');
    }

    const nodeStream = Readable.fromWeb(
      /** @type {import('node:stream/web').ReadableStream} */ (upstreamResponse.body)
    );
    nodeStream.on('error', (err) => {
      if (!res.headersSent) {
        next(err);
      } else {
        res.destroy();
      }
    });
    nodeStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getCdnFiles(req, res, next) {
  try {
    const baseUrl = resolveBaseUrl(req);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const data = await listCdnFiles(baseUrl, limit);
    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request<{ id: string }>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function removeCdnFile(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await deleteCdnFile(id);
    res.status(200).json({
      success: true,
      ...deleted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderCdnDashboard(_req, res) {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
}
