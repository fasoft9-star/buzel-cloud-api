import { Router } from 'express';
import { bratHandler } from '../controllers/brat.controller.js';

const router = Router();

router.get('/bratvid', bratHandler);
router.post('/bratvid', bratHandler);
router.get('/brat', bratHandler);
router.post('/brat', bratHandler);

export default router;
