import express from 'express';
import { getCompareResult, getEnrollments } from '../controllers/compare.controller.js';
import { authenticatedUser, currentSession } from '../middleware/auth.middleware.js';
const router = express.Router()

router.use(currentSession, authenticatedUser)

router.route('/:student1/:student2').get(getCompareResult);
router.route('/enrollments/:prgCode/:batch').get(getEnrollments);
export default router;