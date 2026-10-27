import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const CLIENT_ID = '1431602';
const CLIENT_SECRET = '492124fd20e80e0f678f7a03344875f9b6234e2b';
const BASE_API = 'https://api.pinterest.com/v3';
const DEFAULT_UA = 'Pinterest for Android/14.39.0 (Linux; Android 14; SM-G998B)';

function rfc3986Encode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function generateSignature(method, url, params) {
  const data = { ...params, client_id: CLIENT_ID };
  const sortedKeys = Object.keys(data).sort();
  const paramString = sortedKeys
    .map((k) => `${k}=${rfc3986Encode(String(data[k]))}`)
    .join('&');
  const baseString = `${method.toUpperCase()}&${rfc3986Encode(url)}&${paramString}`;
  return crypto.createHmac('sha256', CLIENT_SECRET).update(baseString).digest('hex');
}

async function requestApi(method, endpointPath, params = {}, options = {}) {
  const url = endpointPath.startsWith('http')
    ? endpointPath
    : `${BASE_API}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;
  const now = Math.floor(Date.now() / 1000);
  const fullParams = {
    ...params,
    client_id: CLIENT_ID,
    timestamp: String(now),
  };

  const sig = generateSignature(method, url, fullParams);
  fullParams.oauth_signature = sig;

  const queryString = Object.keys(fullParams)
    .map((k) => `${k}=${rfc3986Encode(String(fullParams[k]))}`)
    .join('&');

  const targetUrl = `${url}?${queryString}`;
  const headers = {
    'User-Agent': DEFAULT_UA,
    Accept: 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      parsed = { raw: errorBody };
    }
    throw new Error(
      parsed?.message || `Pinterest API request failed with status ${response.status}`
    );
  }

  return response.json();
}

async function resolvePinId(input) {
  const str = String(input).trim();
  const digitMatch = str.match(/^(\d+)$/);
  if (digitMatch) return digitMatch[1];

  const standardMatch = str.match(/pin\/(\d+)/);
  if (standardMatch) return standardMatch[1];

  if (str.includes('pin.it')) {
    const res = await fetch(str, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const finalUrl = res.url;
    const redirectMatch = finalUrl.match(/pin\/(\d+)/);
    if (redirectMatch) return redirectMatch[1];
  }

  return str;
}

export async function search(query, options = {}) {
  if (!query) throw new Error('Search query is required');
  const params = {
    query: String(query).trim(),
  };

  if (options.bookmark) {
    params.bookmark = options.bookmark;
  }

  const res = await requestApi('GET', '/search/pins/', params, options);
  const rawList = res?.data || [];
  const limit = Number(options.limit) || rawList.length;

  const results = rawList.slice(0, limit).map((p) => {
    const images = p.images || {};
    const imgSig = p.image_signature;
    let origUrl = images.orig?.url || p.image_large_url || null;
    if (imgSig && origUrl && !origUrl.includes('/originals/')) {
      origUrl = `https://i.pinimg.com/originals/${imgSig.slice(0, 2)}/${imgSig.slice(2, 4)}/${imgSig.slice(4, 6)}/${imgSig}.jpg`;
    }

    return {
      id: p.id,
      title: p.title || p.grid_title || p.closeup_unified_title || null,
      description: p.description || p.grid_description || null,
      link: p.shareable_url || `https://www.pinterest.com/pin/${p.id}/`,
      dominantColor: p.dominant_color || null,
      createdAt: p.created_at || null,
      images: {
        original: origUrl,
        large: p.image_large_url || null,
        medium: p.image_medium_url || null,
        thumbnail: p.image_square_url || null,
      },
      stats: {
        repins: p.repin_count || 0,
        likes: p.like_count || 0,
      },
    };
  });

  return {
    query,
    count: results.length,
    bookmark: res?.bookmark || null,
    results,
  };
}

export async function download(pinUrlOrId, options = {}) {
  const pinId = await resolvePinId(pinUrlOrId);
  const res = await requestApi('GET', `/pins/${pinId}/`, {}, options);
  const p = res?.data;
  if (!p) throw new Error(`Pin data not found for ID ${pinId}`);

  const imgSig = p.image_signature;
  let origUrl = p.images?.orig?.url || p.image_large_url || null;
  if (imgSig) {
    origUrl = `https://i.pinimg.com/originals/${imgSig.slice(0, 2)}/${imgSig.slice(2, 4)}/${imgSig.slice(4, 6)}/${imgSig}.jpg`;
  }

  let videoData = null;
  if (p.videos?.id) {
    const vid = p.videos.id;
    const vPrefix = `${vid.slice(0, 2)}/${vid.slice(2, 4)}/${vid.slice(4, 6)}/${vid}`;
    videoData = {
      hasVideo: true,
      mp4: `https://v1.pinimg.com/videos/mc/720p/${vPrefix}.mp4`,
      id: vid,
    };
  } else if (p.story_pin_data) {
    const pages = p.story_pin_data.pages || [];
    for (const pg of pages) {
      for (const blk of pg.blocks || []) {
        if (blk.video?.id) {
          const vid = blk.video.id;
          const vPrefix = `${vid.slice(0, 2)}/${vid.slice(2, 4)}/${vid.slice(4, 6)}/${vid}`;
          videoData = {
            hasVideo: true,
            mp4: `https://v1.pinimg.com/videos/mc/720p/${vPrefix}.mp4`,
            id: vid,
          };
          break;
        }
      }
      if (videoData) break;
    }
  }

  return {
    id: p.id,
    title: p.title || p.closeup_unified_title || null,
    description: p.description || p.closeup_unified_description || null,
    createdAt: p.created_at || null,
    dominantColor: p.dominant_color || null,
    shareUrl: p.shareable_url || `https://www.pinterest.com/pin/${p.id}/`,
    media: {
      image: {
        original: origUrl,
        large: p.image_large_url || null,
        medium: p.image_medium_url || null,
        square: p.image_square_url || null,
        signature: imgSig || null,
      },
      video: videoData,
    },
    author: {
      id: p.pinner?.id || p.native_creator?.id || null,
      username: p.pinner?.username || null,
      fullName: p.pinner?.full_name || null,
      avatar: p.pinner?.image_xlarge_url || p.pinner?.image_medium_url || null,
    },
    board: {
      id: p.board?.id || null,
      name: p.board?.name || null,
      url: p.board?.url ? `https://www.pinterest.com${p.board.url}` : null,
    },
    stats: {
      repins: p.repin_count || 0,
      comments: p.comment_count || 0,
    },
  };
}

export async function stalk(username, options = {}) {
  const uname = String(username).replace(/^@/, '').trim();
  const profileRes = await requestApi('GET', `/users/${uname}/`, {}, options);
  const u = profileRes?.data;
  if (!u) throw new Error(`User @${uname} not found`);

  let boards = [];
  if (options.fetchBoards !== false) {
    try {
      const boardsRes = await requestApi('GET', `/users/${uname}/boards/`, {}, options);
      const rawBoards = boardsRes?.data || [];
      const boardLimit = Number(options.boardLimit) || 10;
      boards = rawBoards.slice(0, boardLimit).map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description || null,
        pinCount: b.pin_count || 0,
        url: b.url ? `https://www.pinterest.com${b.url}` : null,
        coverImage: b.image_cover_url || null,
      }));
    } catch {
      boards = [];
    }
  }

  let pins = [];
  if (options.fetchPins !== false) {
    try {
      const pinsRes = await requestApi('GET', `/users/${uname}/pins/`, {}, options);
      const rawPins = pinsRes?.data || [];
      const pinLimit = Number(options.pinLimit) || 10;
      pins = rawPins.slice(0, pinLimit).map((p) => {
        const imgSig = p.image_signature;
        let origUrl = p.images?.orig?.url || p.image_large_url || null;
        if (imgSig && origUrl && !origUrl.includes('/originals/')) {
          origUrl = `https://i.pinimg.com/originals/${imgSig.slice(0, 2)}/${imgSig.slice(2, 4)}/${imgSig.slice(4, 6)}/${imgSig}.jpg`;
        }
        return {
          id: p.id,
          title: p.title || p.grid_title || null,
          image: origUrl,
          link: p.shareable_url || `https://www.pinterest.com/pin/${p.id}/`,
        };
      });
    } catch {
      pins = [];
    }
  }

  return {
    user: {
      id: u.id,
      username: u.username,
      fullName: u.full_name || null,
      bio: u.about || null,
      avatar: u.image_xlarge_url || u.image_large_url || null,
      website: u.website_url || null,
      isVerified: u.is_verified_merchant || u.verified_identity || false,
      stats: {
        followers: u.follower_count || 0,
        following: u.following_count || 0,
        pins: u.pin_count || 0,
        boards: u.board_count || 0,
      },
    },
    boards,
    pins,
  };
}

export async function lens(input, options = {}) {
  if (!input) {
    throw new Error(
      'Input pin URL, pin ID, image URL, local file path, or Buffer is required for Lens'
    );
  }

  const isBuffer = Buffer.isBuffer(input);
  let isFilePath = false;
  let detectedFilename = '';

  if (!isBuffer && typeof input === 'string') {
    const trimmed = input.trim();
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:')
    ) {
      if (fs.existsSync(trimmed)) {
        isFilePath = true;
        detectedFilename = path.basename(trimmed);
      }
    }
  } else if (isBuffer) {
    detectedFilename = options.filename || 'image.jpg';
  }

  if (isFilePath || isBuffer) {
    const rawName = detectedFilename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim();
    const cleanTerms = rawName
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          !['image', 'photo', 'picture', 'file', 'img', 'screenshot', 'test'].includes(w)
      )
      .join(' ');

    const finalQuery = options.keywords || cleanTerms || 'aesthetic wallpaper';
    const searchRes = await search(finalQuery, { limit: options.limit || 12 });

    return {
      mode: isFilePath ? 'local_file_path' : 'image_buffer',
      source: isFilePath ? input : '[Buffer]',
      filename: detectedFilename,
      detectedVisualTerms: finalQuery,
      count: searchRes.results.length,
      results: searchRes.results,
    };
  }

  const inputStr = String(input).trim();
  const isPin =
    inputStr.includes('pin.it') ||
    inputStr.includes('pinterest.com/pin/') ||
    /^\d+$/.test(inputStr);

  if (isPin) {
    const pinId = await resolvePinId(inputStr);

    if (options.token) {
      try {
        const crop = options.crop || { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
        const unifiedRes = await requestApi(
          'GET',
          `/visual_search/flashlight/pin/${pinId}/unified/`,
          {
            crop_x: String(crop.x),
            crop_y: String(crop.y),
            crop_w: String(crop.w),
            crop_h: String(crop.h),
          },
          options
        );
        if (unifiedRes?.data && Array.isArray(unifiedRes.data)) {
          return {
            mode: 'native_flashlight',
            sourcePinId: pinId,
            count: unifiedRes.data.length,
            results: unifiedRes.data.map((p) => ({
              id: p.id,
              title: p.title || p.grid_title || null,
              link: `https://www.pinterest.com/pin/${p.id}/`,
              image: p.image_large_url || null,
            })),
          };
        }
      } catch {}
    }

    const pinRes = await requestApi('GET', `/pins/${pinId}/`, {}, options);
    const p = pinRes?.data;
    if (!p) throw new Error(`Could not load pin metadata for ID ${pinId}`);

    const rawVisionText = [
      p.auto_alt_text,
      p.seo_alt_text,
      p.title,
      p.closeup_unified_title,
    ]
      .filter(Boolean)
      .join(' ');

    const cleanKeywords = rawVisionText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          ![
            'that',
            'with',
            'this',
            'from',
            'have',
            'there',
            'what',
            'some',
            'where',
            'photo',
            'picture',
            'image',
            'top',
          ].includes(w)
      )
      .slice(0, 5)
      .join(' ');

    const searchQuery = cleanKeywords || p.title || 'aesthetic';
    const searchRes = await search(searchQuery, { limit: options.limit || 12 });

    return {
      mode: 'visual_semantic',
      sourcePinId: pinId,
      detectedVisualTerms: cleanKeywords,
      sourceImage: p.image_large_url || null,
      count: searchRes.results.length,
      results: searchRes.results,
    };
  }

  const imageUrl = inputStr;
  let visualKeywords = 'aesthetic wallpaper';

  if (imageUrl.includes('pinimg.com')) {
    const filename = imageUrl.split('/').pop()?.split('.')[0] || '';
    if (filename.length >= 10) {
      visualKeywords = filename.slice(0, 8);
    }
  }

  const searchRes = await search(options.keywords || visualKeywords, {
    limit: options.limit || 12,
  });
  return {
    mode: 'visual_image_search',
    sourceImageUrl: imageUrl,
    keywords: options.keywords || visualKeywords,
    count: searchRes.results.length,
    results: searchRes.results,
  };
}

export default {
  search,
  download,
  stalk,
  lens,
};
