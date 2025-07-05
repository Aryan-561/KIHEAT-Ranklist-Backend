import express from 'express';
import { getProgrammeBatches, getProgrammeResult } from '../controllers/programme.controller.js';

const router = express.Router()

// route used for find students' marks list with specific programme and bacth

// GET /:programme/:batch  eg: /bca/2023 
router.route('/:programme').get(getProgrammeBatches)
router.route('/:programme/:batch').get(getProgrammeResult)



export default router;