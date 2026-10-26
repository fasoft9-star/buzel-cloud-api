import { Router } from 'express';
import { geminiHandler } from '../controllers/ai.controller.js';

const router = Router();

router.get('/gemini', geminiHandler);
router.post('/gemini', geminiHandler);

router.get('/ai', geminiHandler);
router.post('/ai', geminiHandler);

export default router;
