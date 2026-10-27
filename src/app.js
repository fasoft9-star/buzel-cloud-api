import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import downloaderRoutes from './routes/downloader.routes.js';
import cdnRoutes from './routes/cdn.routes.js';
import aiRoutes from './routes/ai.routes.js';
import botaRoutes from './routes/bota.routes.js';
import turnstileRoutes from './routes/turnstile.routes.js';
import { AUDIO_CACHE_DIR } from './services/downloader.service.js';
import { resolveBaseUrl } from './utils/url.util.js';
import { metricsMiddleware, getMetricsHandler } from './middlewares/metrics.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.resolve(__dirname, '../public');

/**
 * @returns {import('express').Application}
 */
export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(metricsMiddleware);

  app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets')));
  app.use('/audio', express.static(AUDIO_CACHE_DIR));

  app.get('/api/status', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.status(200).json({
      success: true,
      publicUrl: baseUrl,
      cdnDashboard: `${baseUrl}/cdn`,        endpoints: ['/tiktok', '/play', '/upload', '/cdn', '/f/:id', '/gemini', '/ai', '/bota', '/turnstile'],
      });
    });

  app.get('/api/metrics', getMetricsHandler);

  app.get('/', (req, res) => {
    const accept = req.headers.accept || '';
    if (accept.includes('application/json') && !accept.includes('text/html')) {
      const baseUrl = resolveBaseUrl(req);
      res.status(200).json({
        success: true,
        publicUrl: baseUrl,
        cdnDashboard: `${baseUrl}/cdn`,
        endpoints: ['/tiktok', '/play', '/upload', '/cdn', '/f/:id', '/gemini', '/ai', '/bota', '/turnstile'],
      });
      return;
    }
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use('/', downloaderRoutes);
  app.use('/', cdnRoutes);
  app.use('/', aiRoutes);
  app.use('/', botaRoutes);
  app.use('/', turnstileRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
