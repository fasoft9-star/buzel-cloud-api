import path from 'node:path';
import { existsSync } from 'node:fs';
import ytmusic from '../services/ytmusic.service.js';
import { resolveBaseUrl } from '../utils/url.util.js';

const DOWNLOAD_DIR = path.resolve(process.cwd(), 'public', 'downloads');

/**
 * Unified YouTube Music controller supporting:
 * - track (default): metadata + audio stream + lyrics + related queue
 * - search: full or filtered search (songs, videos, albums, artists, playlists)
 * - download: downloads audio stream & optionally converts to MP3 hosted on CDN
 * - lyrics: song lyrics + source
 * - queue: radio/up-next tracks
 * - album / artist / playlist / charts / explore / thumbnail
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function handleYtMusic(req, res, next) {
  try {
    const src = { ...req.query, ...req.body };
    const action = String(req.params.action || src.action || 'track').toLowerCase();
    const q = src.q || src.query || src.url || src.id || '';
    const filter = src.filter || 'all';
    const format = src.format || (src.mp3 === 'true' || src.mp3 === '1' || src.mp3 === true ? 'mp3' : 'm4a');
    const includeLyrics = src.lyrics !== 'false' && src.lyrics !== '0' && src.lyrics !== false;
    const includeQueue = src.queue === 'true' || src.queue === '1' || src.queue === true;
    const country = src.country || 'US';
    const quality = src.quality || 'ultra_hd';

    if (action === 'charts') {
      const data = await ytmusic.getCharts(country);
      return res.json({ success: true, action: 'charts', ...data });
    }

    if (action === 'explore') {
      const data = await ytmusic.getExplore();
      return res.json({ success: true, action: 'explore', ...data });
    }

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Parameter "q" (query, URL, videoId, or browseId) is required.',
      });
    }

    if (action === 'search') {
      const results = await ytmusic.search(String(q), { filter });
      return res.json({
        success: true,
        action: 'search',
        filter,
        ...(Array.isArray(results) ? { query: String(q).trim(), items: results } : results),
      });
    }

    if (action === 'lyrics') {
      const data = await ytmusic.getLyrics(String(q));
      return res.json({ success: true, action: 'lyrics', ...data });
    }

    if (action === 'queue') {
      const data = await ytmusic.getQueue(String(q));
      return res.json({ success: true, action: 'queue', ...data });
    }

    if (action === 'album') {
      const data = await ytmusic.getAlbum(String(q));
      return res.json({ success: true, action: 'album', ...data });
    }

    if (action === 'artist') {
      const data = await ytmusic.getArtist(String(q));
      return res.json({ success: true, action: 'artist', ...data });
    }

    if (action === 'playlist') {
      const data = await ytmusic.getPlaylist(String(q));
      return res.json({ success: true, action: 'playlist', ...data });
    }

    if (action === 'thumbnail') {
      const data = await ytmusic.getThumbnail(String(q), { quality });
      return res.json({ success: true, action: 'thumbnail', ...data });
    }

    if (action === 'download') {
      const baseUrl = resolveBaseUrl(req);
      const trackInfo = await ytmusic.getTrack(String(q), {
        lyrics: includeLyrics,
        queue: includeQueue,
      });
      const vid = trackInfo.videoId;
      const ext = format.toLowerCase() === 'mp3' ? 'mp3' : 'm4a';
      const fileName = `ytm-${vid}.${ext}`;
      const outputPath = path.join(DOWNLOAD_DIR, fileName);

      let dlResult;
      if (existsSync(outputPath)) {
        dlResult = {
          videoId: vid,
          title: trackInfo.title,
          artist: trackInfo.author,
          duration: trackInfo.duration,
          durationSeconds: trackInfo.durationSeconds,
          thumbnail: trackInfo.thumbnail,
          filename: `${trackInfo.author || 'YouTube Music'} - ${trackInfo.title || vid}.${ext}`,
          format: ext,
          mimeType: ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4',
        };
      } else {
        dlResult = await ytmusic.download(vid, {
          format: ext,
          outputPath,
        });
      }

      const hostedUrl = `${baseUrl}/downloads/${fileName}`;
      return res.json({
        success: true,
        action: 'download',
        ...dlResult,
        audioUrl: hostedUrl,
        directStreamUrl: trackInfo.audio?.url || dlResult.downloadUrl || null,
        lyrics: trackInfo.lyrics || null,
        lyricsSource: trackInfo.lyricsSource || null,
      });
    }

    // Default action: 'track'
    const track = await ytmusic.getTrack(String(q), {
      lyrics: includeLyrics,
      queue: includeQueue,
    });

    return res.json({
      success: true,
      action: 'track',
      ...track,
      audioUrl: track.audio?.url || null,
    });
  } catch (err) {
    next(err);
  }
}
