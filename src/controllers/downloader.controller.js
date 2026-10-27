import { downloadTikTok, isValidTikTokUrl, playMusic } from '../services/downloader.service.js';
import { downloadInstagram } from '../services/instagram.service.js';
import { resolveBaseUrl } from '../utils/url.util.js';
import { HttpError } from '../middlewares/error.middleware.js';

/**
 * @param {import('express').Request<{}, {}, { url?: string }, { url?: string }>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function tiktokDownloader(req, res, next) {
  try {
    const url = req.body?.url || req.query.url;

    if (!url || typeof url !== 'string') {
      throw new HttpError(400, 'Parameter url is required');
    }

    if (!isValidTikTokUrl(url)) {
      throw new HttpError(400, 'Invalid TikTok URL');
    }

    const result = await downloadTikTok(url);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request<{}, {}, { query?: string, q?: string }, { query?: string, q?: string }>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function playDownloader(req, res, next) {
  try {
    const query = (req.body?.query || req.body?.q || req.query.query || req.query.q || '').trim();

    if (!query) {
      throw new HttpError(400, 'Parameter query is required');
    }

    const baseUrl = resolveBaseUrl(req);
    const result = await playMusic(query, baseUrl);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request<{}, {}, { url?: string }, { url?: string }>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function instagramDownloader(req, res, next) {
  try {
    const url = (req.body?.url || req.query.url || '').toString().trim();

    if (!url) {
      throw new HttpError(400, 'Parameter url is required');
    }

    const result = await downloadInstagram(url);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
