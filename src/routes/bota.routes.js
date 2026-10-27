import { Router } from 'express';
import { botaHandler } from '../controllers/bota.controller.js';

const router = Router();

router.get('/bota', botaHandler);
router.post('/bota', botaHandler);

export default router;
