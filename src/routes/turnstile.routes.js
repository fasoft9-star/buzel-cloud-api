import { Router } from 'express';
import { turnstileHandler } from '../controllers/turnstile.controller.js';

const router = Router();

router.get('/turnstile', turnstileHandler);
router.post('/turnstile', turnstileHandler);

router.get('/turnstile-min', turnstileHandler);
router.post('/turnstile-min', turnstileHandler);

export default router;
