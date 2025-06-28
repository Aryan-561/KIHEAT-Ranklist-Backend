import express from 'express';
import {upload} from '../middlewares/multer.middleware.js';
import { processReappearResults, processResults } from '../controllers/resultUpload.controller.js';
import {cleanTempFolderMiddleware} from '../middlewares/cleanTemp.middleware.js';
const router = express.Router();

router.route('/upload').post(cleanTempFolderMiddleware, upload.single('file'), processResults);

router.route('/reappear/upload').patch(cleanTempFolderMiddleware, upload.single('file'), processReappearResults)

export default router;

