import { botaChat } from '../services/bota.service.js';
import { HttpError } from '../middlewares/error.middleware.js';

/**
 * @typedef {Object} BotaRequestPayload
 * @property {string} [message]
 * @property {string} [prompt]
 * @property {string} [q]
 * @property {string} [text]
 * @property {string} [model]
 * @property {string | boolean} [webSearch]
 * @property {string | boolean} [web_search]
 * @property {string} [chatId]
 * @property {string} [chat_id]
 */

/**
 * @param {boolean | string | undefined} v
 * @returns {boolean}
 */
const asBool = (v) => v === true || v === 'true' || v === '1' || v === 1;

/**
 * @param {import('express').Request<{}, {}, BotaRequestPayload, BotaRequestPayload>} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function botaHandler(req, res, next) {
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
    ).toString().trim();

    if (!message) {
      throw new HttpError(400, 'Parameter message is required');
    }

    const opts = {
      model:
        String(req.body?.model || req.query.model || 'default-model').trim() || 'default-model',
      webSearch: asBool(
        req.body?.webSearch ?? req.body?.web_search ?? req.query.web_search ?? req.query.webSearch
      ),
      chatId: String(
        req.body?.chatId || req.body?.chat_id || req.query.chatId || req.query.chat_id || ''
      ).trim(),
    };

    const result = await botaChat(message, opts);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
