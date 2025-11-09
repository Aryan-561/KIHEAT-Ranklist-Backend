import express from 'express';
import { getAllProgrammes, getProgrammeBatches, getProgrammeSemesters, getProgrammeResult, getProgrammeResultBySemester, getEnrollment } from '../controllers/programme.controller.js';
const router = express.Router()

// GET /:programme/:batch  eg: /bca/2023 
router.route('/').get(getAllProgrammes)
router.route('/:programme').get(getProgrammeBatches)
// router.route('/temp/:programme/:batch').get(getProgrammeResult)
router.route('/result/:prgCode/:batch').get(getProgrammeResult)
router.route('/result/:prgCode/:batch/:semester').get(getProgrammeResultBySemester)
router.route('/semester/:prgCode/:batch').get(getProgrammeSemesters)
router.route('/:prgCode/:batch').get(getEnrollment)



export default router;