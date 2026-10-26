import { geminiChat } from '../services/ai.service.js';
import { HttpError } from '../middlewares/error.middleware.js';

/**
 * @typedef {Object} GeminiRequestPayload
 * @property {string} [message]
 * @property {string} [prompt]
 * @property {string} [q]
 * @property {string} [text]
 * @property {string} [sessionId]
 */

/**
 * @param {import('express').Request<{}, {}, GeminiRequestPayload, GeminiRequestPayload>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function geminiHandler(req, res, next) {
  try {
    const message = (
      req.body?.message ||
      req.body?.prompt ||
      req.body?.q ||
      req.body?.text ||
      req.query.message ||
      req.query.prompt ||
      req.query.q ||
      req.query.text ||
      ''
    ).trim();

    if (!message) {
      throw new HttpError(400, 'Parameter message is required');
    }

    const sessionId = req.body?.sessionId || req.query.sessionId;
    const result = await geminiChat(message, sessionId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
