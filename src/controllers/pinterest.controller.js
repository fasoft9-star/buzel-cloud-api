import pinterest from '../services/pinterest.service.js';

/**
 * Unified Pinterest controller supporting:
 * - search: searches Pinterest pins (`?q=anime&limit=12`)
 * - download: extracts HD image & 720p video from a Pin URL or Pin ID (`?url=https://pin.it/...`)
 * - stalk: fetches user profile, boards, and recent pins (`?username=pinterest`)
 * - lens: visual semantic search from Pin URL, Pin ID, or Image URL (`?action=lens&q=...`)
 *
 * Auto-detects action if not explicitly provided.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function handlePinterest(req, res, next) {
  try {
    const src = { ...req.query, ...req.body };
    const rawAction = req.params.action || src.action || '';
    const input =
      src.q || src.query || src.url || src.id || src.username || src.user || '';
    const limit = Number(src.limit) || 12;
    const bookmark = src.bookmark || undefined;

    if (!input || !String(input).trim()) {
      return res.status(400).json({
        success: false,
        error:
          'Parameter "q" (search query), "url" (Pin URL/ID), or "username" is required.',
      });
    }

    const str = String(input).trim();
    let action = String(rawAction).toLowerCase();

    if (!action) {
      if (src.username || src.user || str.startsWith('@')) {
        action = 'stalk';
      } else if (
        str.includes('pin.it') ||
        str.includes('pinterest.com/pin/') ||
        /^\d{10,25}$/.test(str)
      ) {
        action = 'download';
      } else {
        action = 'search';
      }
    }

    if (action === 'download' || action === 'dl' || action === 'pin') {
      const data = await pinterest.download(str);
      return res.json({
        success: true,
        action: 'download',
        ...data,
      });
    }

    if (action === 'stalk' || action === 'user' || action === 'profile') {
      const data = await pinterest.stalk(str, {
        boardLimit: Number(src.boardLimit) || 10,
        pinLimit: Number(src.pinLimit) || 10,
      });
      return res.json({
        success: true,
        action: 'stalk',
        ...data,
      });
    }

    if (action === 'lens' || action === 'visual') {
      const data = await pinterest.lens(str, {
        limit,
        keywords: src.keywords || undefined,
      });
      return res.json({
        success: true,
        action: 'lens',
        ...data,
      });
    }

    // Default: search
    const data = await pinterest.search(str, { limit, bookmark });
    return res.json({
      success: true,
      action: 'search',
      ...data,
    });
  } catch (err) {
    next(err);
  }
}
