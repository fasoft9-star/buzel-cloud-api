import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { HttpError } from '../middlewares/error.middleware.js';

const execFileAsync = promisify(execFile);

const TIKTOK_REGEX = /(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|t\.tiktok\.com)\/[^\s]+/i;
export const AUDIO_CACHE_DIR = '/tmp/express-audio-cache';

/**
 * @typedef {Object} TikTokResponse
 * @property {boolean} success
 * @property {string} id
 * @property {string} title
 * @property {'video' | 'image'} type
 * @property {string} [url]
 * @property {string} [hdUrl]
 * @property {string[]} [images]
 * @property {string} [musicUrl]
 * @property {string} author
 */

/**
 * @typedef {Object} PlayMusicResponse
 * @property {boolean} success
 * @property {string} id
 * @property {string} title
 * @property {string} author
 * @property {number} duration
 * @property {string} thumbnail
 * @property {string} sourceUrl
 * @property {string} audioUrl
 * @property {'youtube' | 'soundcloud'} provider
 */

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isValidTikTokUrl(url) {
  return TIKTOK_REGEX.test(url);
}

/**
 * @param {string} url
 * @returns {Promise<TikTokResponse>}
 */
export async function downloadTikTok(url) {
  const encodedParams = new URLSearchParams();
  encodedParams.set('url', url);
  encodedParams.set('hd', '1');

  const response = await fetch('https://tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': 'current_language=en',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    },
    body: encodedParams.toString(),
  });

  if (!response.ok) {
    throw new HttpError(502, 'Failed to connect to TikTok provider');
  }

  const json = await response.json();
  const data = json?.data;

  if (!data) {
    throw new HttpError(400, json?.msg || 'Failed to fetch TikTok content');
  }

  const isSlide = Array.isArray(data.images) && data.images.length > 0;

  return {
    success: true,
    id: data.id,
    title: data.title || '',
    type: isSlide ? 'image' : 'video',
    ...(isSlide
      ? { images: data.images }
      : { url: data.play, hdUrl: data.hdplay || data.play }),
    musicUrl: data.music,
    author: data.author?.nickname || data.author?.unique_id || '',
  };
}

/**
 * @param {string} target
 * @param {'youtube' | 'soundcloud'} provider
 * @param {string} baseUrl
 * @returns {Promise<PlayMusicResponse>}
 */
async function runYtDlpAudio(target, provider, baseUrl) {
  await fs.mkdir(AUDIO_CACHE_DIR, { recursive: true });

  const outputTemplate = path.join(AUDIO_CACHE_DIR, '%(id)s.%(ext)s');
  const args = [
    '--js-runtimes',
    'node',
    '--no-playlist',
    '--no-warnings',
    '--max-filesize',
    '50M',
    '-f',
    'ba[ext=m4a]/ba/b',
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '128K',
    ...(ffmpegPath ? ['--ffmpeg-location', ffmpegPath] : []),
    '-o',
    outputTemplate,
    '--print-json',
    target,
  ];

  const { stdout } = await execFileAsync('yt-dlp', args, {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const lastLine = stdout.trim().split('\n').pop() || '{}';
  const info = JSON.parse(lastLine);

  if (!info.id) {
    throw new HttpError(404, 'Music not found');
  }

  const safeId = String(info.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `${safeId}.mp3`;
  const filePath = path.join(AUDIO_CACHE_DIR, fileName);

  setTimeout(() => {
    fs.unlink(filePath).catch(() => {});
  }, 15 * 60 * 1000).unref();

  return {
    success: true,
    id: safeId,
    title: info.title || info.track || 'Unknown Title',
    author: info.uploader || info.channel || info.artist || 'Unknown Artist',
    duration: Number(info.duration) || 0,
    thumbnail: info.thumbnail || '',
    sourceUrl: info.webpage_url || info.original_url || '',
    audioUrl: `${baseUrl}/audio/${fileName}`,
    provider,
  };
}

/**
 * @param {string} query
 * @param {string} baseUrl
 * @returns {Promise<PlayMusicResponse>}
 */
export async function playMusic(query, baseUrl) {
  const isUrl = /^https?:\/\/[^\s]+$/i.test(query);

  if (isUrl) {
    const provider = /soundcloud\.com/i.test(query) ? 'soundcloud' : 'youtube';
    return runYtDlpAudio(query, provider, baseUrl);
  }

  try {
    return await runYtDlpAudio(`ytsearch1:${query}`, 'youtube', baseUrl);
  } catch {
    return await runYtDlpAudio(`scsearch1:${query}`, 'soundcloud', baseUrl);
  }
}
