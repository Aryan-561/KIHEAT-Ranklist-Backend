import express from 'express';
import { getAllProgrammes, getProgrammeBatches, getProgrammeSemesters, getProgrammeResult } from '../controllers/programme.controller.js';
const router = express.Router()

// GET /:programme/:batch  eg: /bca/2023 
router.route('/').get(getAllProgrammes)
router.route('/:programme').get(getProgrammeBatches)
// router.route('/temp/:programme/:batch').get(getProgrammeResult)
router.route('/:prgCode/:batch').get(getProgrammeSemesters)



export default router;