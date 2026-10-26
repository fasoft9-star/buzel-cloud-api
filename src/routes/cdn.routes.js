import { Router } from 'express';
import multer from 'multer';
import {
  uploadFile,
  serveCdnFile,
  getCdnFiles,
  removeCdnFile,
  renderCdnDashboard,
} from '../controllers/cdn.controller.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.get('/cdn', renderCdnDashboard);
router.get('/uploader', renderCdnDashboard);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/f/:id', serveCdnFile);
router.get('/file/:id', serveCdnFile);
router.get('/cdn/files', getCdnFiles);
router.delete('/cdn/files/:id', removeCdnFile);

export default router;
