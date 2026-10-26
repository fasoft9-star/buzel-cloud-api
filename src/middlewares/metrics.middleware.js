import os from 'node:os';
import { listCdnFiles } from '../services/cdn.service.js';
import { resolveBaseUrl } from '../utils/url.util.js';

/**
 * @typedef {Object} RequestLogEntry
 * @property {string} id
 * @property {string} method
 * @property {string} path
 * @property {number} status
 * @property {number} durationMs
 * @property {number} timestamp
 */

const MAX_LOGS = 60;
const startedAt = Date.now();

let totalRequests = 0;
let successRequests = 0;
let errorRequests = 0;
let totalDurationMs = 0;

/** @type {Record<string, { count: number, avgMs: number, errors: number }>} */
const endpointStats = {
  '/tiktok': { count: 0, avgMs: 0, errors: 0 },
  '/play': { count: 0, avgMs: 0, errors: 0 },
  '/upload': { count: 0, avgMs: 0, errors: 0 },
  '/f': { count: 0, avgMs: 0, errors: 0 },
  '/ai': { count: 0, avgMs: 0, errors: 0 },
  '/turnstile': { count: 0, avgMs: 0, errors: 0 },
};

/** @type {RequestLogEntry[]} */
const recentLogs = [];

/**
 * @param {string} rawPath
 * @returns {string | null}
 */
function matchTrackedEndpoint(rawPath) {
  if (rawPath.startsWith('/tiktok')) return '/tiktok';
  if (rawPath.startsWith('/play')) return '/play';
  if (rawPath.startsWith('/upload')) return '/upload';
  if (rawPath.startsWith('/f/') || rawPath.startsWith('/file/')) return '/f';
  if (rawPath.startsWith('/ai') || rawPath.startsWith('/gemini')) return '/ai';
  if (rawPath.startsWith('/turnstile')) return '/turnstile';
  return null;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function metricsMiddleware(req, res, next) {
  const start = performance.now();

  res.on('finish', () => {
    const cleanPath = (req.originalUrl || req.url || '/').split('?')[0];
    if (
      cleanPath.startsWith('/assets') ||
      cleanPath === '/api/metrics' ||
      cleanPath === '/api/status' ||
      cleanPath === '/favicon.ico'
    ) {
      return;
    }

    const durationMs = Math.round(performance.now() - start);
    const status = res.statusCode;

    totalRequests += 1;
    totalDurationMs += durationMs;
    if (status >= 200 && status < 400) {
      successRequests += 1;
    } else {
      errorRequests += 1;
    }

    const key = matchTrackedEndpoint(cleanPath);
    if (key && endpointStats[key]) {
      const prev = endpointStats[key];
      const nextCount = prev.count + 1;
      prev.avgMs = Math.round((prev.avgMs * prev.count + durationMs) / nextCount);
      prev.count = nextCount;
      if (status >= 400) prev.errors += 1;
    }

    recentLogs.unshift({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      durationMs,
      timestamp: Date.now(),
    });

    if (recentLogs.length > MAX_LOGS) {
      recentLogs.length = MAX_LOGS;
    }
  });

  next();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getMetricsHandler(req, res) {
  const baseUrl = resolveBaseUrl(req);
  const cdnSummary = await listCdnFiles(baseUrl, 5).catch(() => ({
    totalFiles: 0,
    totalSize: 0,
    files: [],
  }));

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memProcess = process.memoryUsage().rss;
  const loadAvg = os.loadavg()[0] || 0;
  const cpuCount = os.cpus().length || 1;

  res.status(200).json({
    success: true,
    publicUrl: baseUrl,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    system: {
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()}`,
      cpuCores: cpuCount,
      cpuLoadPercent: Math.min(100, Math.round((loadAvg / cpuCount) * 100)),
      ramUsedMb: Math.round(usedMem / 1024 / 1024),
      ramTotalMb: Math.round(totalMem / 1024 / 1024),
      apiRssMb: Math.round(memProcess / 1024 / 1024),
    },
    traffic: {
      totalRequests,
      successRequests,
      errorRequests,
      avgLatencyMs: totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0,
      endpoints: endpointStats,
    },
    storage: {
      totalFiles: cdnSummary.totalFiles,
      totalSize: cdnSummary.totalSize,
      recentFiles: cdnSummary.files,
    },
    recentLogs: recentLogs.slice(0, 35),
  });
}
