import { Router } from 'express';
import { handlePinterest } from '../controllers/pinterest.controller.js';

const router = Router();

router.get('/pinterest', handlePinterest);
router.post('/pinterest', handlePinterest);
router.get('/pinterest/:action', handlePinterest);
router.post('/pinterest/:action', handlePinterest);

router.get('/pin', handlePinterest);
router.post('/pin', handlePinterest);
router.get('/pin/:action', handlePinterest);
router.post('/pin/:action', handlePinterest);

export default router;
