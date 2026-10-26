import { solveTurnstile } from '../services/turnstile.service.js';
import { HttpError } from '../middlewares/error.middleware.js';

/**
 * @typedef {Object} TurnstileRequestPayload
 * @property {string} [url]
 * @property {string} [sitekey]
 * @property {string} [siteKey]
 */

/**
 * @param {import('express').Request<{}, {}, TurnstileRequestPayload, TurnstileRequestPayload>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function turnstileHandler(req, res, next) {
  try {
    const url = (req.body?.url || req.query.url || '').trim();
    const sitekey = (
      req.body?.sitekey ||
      req.body?.siteKey ||
      req.query.sitekey ||
      req.query.siteKey ||
      ''
    ).trim();

    if (!url || !/^https?:\/\/[^\s]+$/i.test(url)) {
      throw new HttpError(400, 'Valid parameter url is required');
    }

    if (!sitekey) {
      throw new HttpError(400, 'Parameter sitekey is required');
    }

    const result = await solveTurnstile(url, sitekey);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
