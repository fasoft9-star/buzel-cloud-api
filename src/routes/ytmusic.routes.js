import { Router } from 'express';
import { handleYtMusic } from '../controllers/ytmusic.controller.js';

const router = Router();

router.get('/ytmusic', handleYtMusic);
router.post('/ytmusic', handleYtMusic);
router.get('/ytmusic/:action', handleYtMusic);
router.post('/ytmusic/:action', handleYtMusic);

router.get('/ytm', handleYtMusic);
router.post('/ytm', handleYtMusic);
router.get('/ytm/:action', handleYtMusic);
router.post('/ytm/:action', handleYtMusic);

export default router;
