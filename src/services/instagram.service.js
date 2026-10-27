/**
 * instagram.service.js — Instagram Scraper & Downloader (ESM Adaptation)
 *
 * @author  Shann
 * @version 1.0.0
 *
 * Hits Instagram's internal API directly — no browser required.
 * Supports photo, video, carousel, and reels.
 *
 * DO NOT REMOVE THIS HEADER — keep credit intact when forking or modifying.
 */

import { HttpError } from '../middlewares/error.middleware.js';

const _AUTHOR = 'Shann';
const _REPO = 'code.vyrgo.cyou/shanmolvyr/instagram';
const UA_WEB =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * @param {string} input
 * @returns {string | null}
 */
export function extractShortcode(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  if (!trimmed.includes('/')) {
    return /^[A-Za-z0-9_-]{5,30}$/.test(trimmed) ? trimmed : null;
  }
  const m = trimmed.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

/**
 * @param {string} url
 * @param {Record<string, string>} headers
 * @param {number} [maxRedirects=10]
 * @returns {Promise<{ status: number, html: string }>}
 */
async function fetchWithCookies(url, headers, maxRedirects = 10) {
  /** @type {Map<string, string>} */
  const cookies = new Map();
  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const cookieHeader = Array.from(cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: {
        ...headers,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      redirect: 'manual',
    });

    const setCookies =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const pair = raw.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq > 0) {
        cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) break;
      currentUrl = new URL(loc, currentUrl).toString();
      continue;
    }

    const html = await res.text();
    return { status: res.status, html };
  }

  throw new HttpError(502, 'Too many redirects from Instagram');
}

/**
 * @param {string} shortcode
 * @returns {Promise<{ item: Record<string, any>, source: string }>}
 */
async function fetchViaHtml(shortcode) {
  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { status, html } = await fetchWithCookies(
        `https://www.instagram.com/p/${shortcode}/`,
        {
          'User-Agent': UA_WEB,
          Accept: 'text/html,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        }
      );

      if (status === 429 || status >= 500) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }

      const blocks = [
        ...html.matchAll(/<script[^>]*data-sjs[^>]*>(\{"require":\[\[.+?)<\/script>/gs),
      ].map((m) => m[1]);

      for (const block of blocks) {
        if (!block.includes('RelayPrefetchedStreamCache')) continue;
        if (!block.includes('xig_polaris')) continue;

        try {
          const json = JSON.parse(block);
          const bbox = json?.require?.[0]?.[3]?.[0]?.__bbox;
          if (!bbox?.require) continue;

          for (const req of bbox.require) {
            if (req[0] !== 'RelayPrefetchedStreamCache') continue;

            const inner = req[3]?.[1]?.__bbox;
            if (!inner) continue;

            const media =
              inner?.result?.data?.xig_polaris_media || inner?.data?.xig_polaris_media;
            if (!media) continue;

            const item = media.if_not_gated_logged_out || media;
            if (!item.pk && !item.code) continue;

            return { item, source: 'html' };
          }
        } catch {
          // ignore malformed script block
        }
      }
      break;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }

  throw new HttpError(
    404,
    lastErr instanceof Error
      ? lastErr.message
      : 'Tidak ada data media ditemukan pada URL Instagram tersebut'
  );
}

/**
 * @param {Record<string, any>} item
 */
function extractMedia(item) {
  const isVideo = item.is_video || item.media_type === 2 || item.__typename === 'GraphVideo';

  if (isVideo) {
    const versions = Array.isArray(item.video_versions) ? [...item.video_versions] : [];
    const best = versions.sort((a, b) => (a.type || 0) - (b.type || 0))[0];
    const videoUrl = best?.url || item.video_url || null;
    const imgCandidates = Array.isArray(item.image_versions2?.candidates)
      ? [...item.image_versions2.candidates]
      : [];
    const bestThumb = imgCandidates.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    const thumbnail = bestThumb?.url || item.display_url || item.thumbnail_url || null;
    return {
      type: 'video',
      url: videoUrl,
      thumbnail,
      width: item.original_width || item.dimensions?.width || null,
      height: item.original_height || item.dimensions?.height || null,
      duration: item.video_duration || null,
    };
  }

  const candidates = Array.isArray(item.image_versions2?.candidates)
    ? [...item.image_versions2.candidates]
    : [];
  const best = candidates.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  const imageUrl = best?.url || item.display_url || item.thumbnail_url || null;
  return {
    type: 'photo',
    url: imageUrl,
    width: best?.width || item.original_width || item.dimensions?.width || null,
    height: best?.height || item.original_height || item.dimensions?.height || null,
  };
}

/**
 * @param {Record<string, any>} item
 */
function normalizeItem(item) {
  const isVideo =
    item.is_video ||
    item.media_type === 2 ||
    item.__typename === 'GraphVideo' ||
    item.__typename === 'XIGPolarisVideoMedia';
  const isCarousel =
    item.media_type === 8 ||
    item.__typename === 'GraphSidecar' ||
    item.__typename === 'XIGPolarisCarouselMedia' ||
    !!item.carousel_media ||
    !!item.edge_sidecar_to_children;

  const owner = item.owner || item.user || {};
  const caption =
    item.edge_media_to_caption?.edges?.[0]?.node?.text ||
    item.caption?.text ||
    item.caption ||
    item.accessibility_caption ||
    '';

  const takenAt = item.taken_at || item.taken_at_timestamp || null;
  const likeCount = item.like_count ?? item.edge_media_preview_like?.count ?? null;
  const commentCount = item.comment_count ?? item.edge_media_to_comment?.count ?? null;
  const viewCount =
    item.view_count ?? item.video_view_count ?? item.clips_metadata?.views_count ?? null;

  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const postedAt = takenAt
    ? (() => {
        const d = new Date(Number(takenAt) * 1000);
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
          d.getHours()
        )}.${pad(d.getMinutes())}`;
      })()
    : null;

  const media = [];
  if (isCarousel) {
    const children =
      item.carousel_media ||
      item.edge_sidecar_to_children?.edges?.map((/** @type {any} */ e) => e.node) ||
      [];
    for (const child of children) media.push(extractMedia(child));
  } else {
    media.push(extractMedia(item));
  }

  return {
    success: true,
    id: item.pk || item.id || null,
    shortcode: item.code || item.shortcode || null,
    type: isCarousel ? 'carousel' : isVideo ? 'video' : 'photo',
    caption: typeof caption === 'string' ? caption : '',
    postedAt,
    owner: {
      id: owner.pk || owner.id || null,
      username: owner.username || null,
      fullName: owner.full_name || null,
      avatar: owner.profile_pic_url || null,
      verified: !!(
        owner.is_verified ||
        owner.verified ||
        owner.is_verified_by_mv4b ||
        owner.transparency_product_enabled
      ),
    },
    stats: { likeCount, commentCount, viewCount },
    media,
    location: item.location
      ? {
          name: item.location.name || null,
          id: item.location.pk || item.location.id || null,
        }
      : null,
    _author: `${_AUTHOR} — ${_REPO}`,
  };
}

/**
 * @param {string} inputUrl
 */
export async function downloadInstagram(inputUrl) {
  const shortcode = extractShortcode(inputUrl);
  if (!shortcode) {
    throw new HttpError(400, 'Invalid Instagram URL or shortcode');
  }
  const { item } = await fetchViaHtml(shortcode);
  return normalizeItem(item);
}
