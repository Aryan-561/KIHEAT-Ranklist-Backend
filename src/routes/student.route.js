import express  from 'express'
import { getStudentByEnrollment, getStudentsByName, getTopStudents, getStudentMarksheet } from '../controllers/student.controller.js';

const router =  express.Router();


// find students with name and programme

// GET student/search-by-name   eg: student/search-by-name?name=jojo&programme=bca
router.route('/search-by-name').get(getStudentsByName)


router.route('/top-students').get(getTopStudents)

// get student's result data with enrollment

// GET student/:enrollment     eg: student/:01196702023
router.route('/:enrollment').get(getStudentByEnrollment);

// GET student/marksheet/:enrollment?semester=1     eg: student/marksheet/01196702023?semester=1
router.route('/marksheet/:enrollment').get(getStudentMarksheet);



export default router;