import { Router } from 'express';
import {
  tiktokDownloader,
  playDownloader,
  instagramDownloader,
} from '../controllers/downloader.controller.js';

const router = Router();

router.get('/tiktok', tiktokDownloader);
router.post('/tiktok', tiktokDownloader);

router.get('/play', playDownloader);
router.post('/play', playDownloader);

router.get('/ig', instagramDownloader);
router.post('/ig', instagramDownloader);
router.get('/instagram', instagramDownloader);
router.post('/instagram', instagramDownloader);

export default router;
