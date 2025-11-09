import express from 'express';
import { getCompareResult } from '../controllers/compare.controller.js';
const router = express.Router()

router.route('/:student1/:student2').get(getCompareResult)
export default router;