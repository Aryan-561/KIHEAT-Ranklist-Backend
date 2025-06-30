import express  from 'express'
import { getStudentByEnrollment, getStudentsByName } from '../controllers/student.controller.js';

const router =  express.Router();


// find students with name and programme

// GET student/search-by-name   eg: student/search-by-name?name=jojo&programme=bca
router.route('/search-by-name').get(getStudentsByName)



// get student's result data with enrollment

// GET student/:enrollment     eg: student/:01196702023
router.route('/:enrollment').get(getStudentByEnrollment)


export default router;