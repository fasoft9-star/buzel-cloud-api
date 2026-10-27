import { makeBrat } from '../services/brat.service.js';
import { resolveBaseUrl } from '../utils/url.util.js';
import { HttpError } from '../middlewares/error.middleware.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function bratHandler(req, res, next) {
  try {
    const text = String(
      req.body?.text ||
        req.body?.q ||
        req.body?.prompt ||
        req.query.text ||
        req.query.q ||
        req.query.prompt ||
        ''
    ).trim();

    if (!text) {
      throw new HttpError(400, 'Parameter text is required');
    }

    const theme = String(
      req.body?.theme || req.body?.color || req.body?.c || req.query.theme || req.query.color || req.query.c || 'white'
    ).toLowerCase();

    const blurRaw = req.body?.blur ?? req.body?.b ?? req.query.blur ?? req.query.b ?? 0;
    const format = String(
      req.body?.format || req.body?.f || req.query.format || req.query.f || 'mp4'
    ).toLowerCase();
    const holdRaw = req.body?.hold ?? req.body?.d ?? req.query.hold ?? req.query.d ?? 1.5;

    const baseUrl = resolveBaseUrl(req);
    const result = await makeBrat({
      text,
      theme,
      blur: Number(blurRaw) || 0,
      format,
      hold: Number(holdRaw) || 1.5,
      baseUrl,
    });

    if (req.query.raw === '1' || req.body?.raw === true) {
      res.sendFile(result.filePath);
      return;
    }

    res.status(200).json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      text: result.text,
      theme: result.theme,
      blur: result.blur,
      format: result.format,
      hold: result.hold,
    });
  } catch (err) {
    next(err);
  }
}
