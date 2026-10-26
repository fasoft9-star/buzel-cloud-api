import { Router } from 'express';
import { tiktokDownloader, playDownloader } from '../controllers/downloader.controller.js';

const router = Router();

router.get('/tiktok', tiktokDownloader);
router.post('/tiktok', tiktokDownloader);

router.get('/play', playDownloader);
router.post('/play', playDownloader);

export default router;
