import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";



/**
 * @function getStudentByEnrollment
 * @description
 *   Fetches and aggregates a single student’s performance data by enrollment number.
 *   - Validates the `enrollment` route parameter
 *   - Aggregates the `semesters` array to compute total marks, credits, SGPA, and overall GPA
 *   - Projects a clean payload of selected fields
 *
 * @route   GET /:enrollment
 * @param   {Object}   req.params
 * @param   {string}   req.params.enrollment  11‑digit enrollment number
 *
 * @returns {ApiResponse}
 *   - 200 with the student result object
 *   - 400 if the enrollment parameter is invalid
 *   - 404 if no student is found
 */
const getStudentByEnrollment = asyncHandler(async (req, res) => {

    // Extract and validate enrollment parameter
    const { enrollment } = req.params;
    if (!enrollment?.trim() || enrollment.trim().length !== 11) {
        throw new ApiError(400, `Invalid enrollment number: '${enrollment}'`);
    }

    // Build aggregation pipeline
    const pipeline = [
        {
            // Match exactly on enrollment
            $match: { enrollment: enrollment.trim() },
        },
        {

            $addFields: {
                semestersCount: { $size: { $ifNull: ["$semesters", []] } },
                totalMarks: { $sum: "$semesters.totalMarks" },
                maxMarks: { $sum: "$semesters.maxMarks" },
                totalCreditMarks: { $sum: "$semesters.totalCreditMarks" },
                maxCreditMarks: { $sum: "$semesters.maxCreditMarks" },
                totalCredits: { $sum: "$semesters.totalCredits" },
                maxCredits: { $sum: "$semesters.maxCredits" },
                totalWeightedSGPA: {
                    $sum: {
                        $map: {
                            input: "$semesters",
                            as: "sem",
                            in: {
                                $multiply: ["$$sem.sgpa", "$$sem.maxCredits"]
                            }
                        }
                    }
                }
            },
        },
        {
            $addFields: {
                cgpa: {
                    $cond: [
                        { $gt: ["$semestersCount", 0] },
                        {
                            $round: [
                                { $divide: ["$totalWeightedSGPA", "$maxCredits"] },
                                3
                            ]
                        },
                        0
                    ]
                },
                percentage: {
                    $round: [
                        {
                            $multiply: [
                                { $divide: ["$totalMarks", "$maxMarks"] },
                                100
                            ]
                        },
                        3
                    ]
                },

                creditPrecentage: {
                    $round: [{
                        $multiply: [
                            { $divide: ["$totalCreditMarks", "$maxCreditMarks"] },
                            100
                        ]
                    }, 3]
                }
            }
        },
        {
            $addFields: {
                semesters: {
                    $sortArray: {
                        input: "$semesters",
                        sortBy: { sem: 1 }  // Ascending by semester number
                    }
                }
            }
        },



        {
            // Project only the desired fields
            $project: {
                enrollment: 1,
                name: 1,
                sid: 1,
                schemeID: 1,
                instCode: 1,
                batch: 1,
                prgCode: 1,
                programme: 1,
                totalSGPA: 1,
                totalMarks: 1,
                maxMarks: 1,
                totalCreditMarks: 1,
                maxCreditMarks: 1,
                semestersCount: 1,
                totalCredits: 1,
                maxCredits: 1,
                cgpa: 1,
                percentage: 1,
                creditPrecentage: 1,
                semesters: 1,

            },
        },
    ];

    // Execute aggregation
    const result = await Student.aggregate(pipeline);

    // Handle not found
    if (result.length === 0) {
        throw new ApiError(
            404,
            `No student found with enrollment number '${enrollment.trim()}'`,
            {},
        )

    }

    // Return the single student object
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result[0],
                `Fetched data for student with enrollment '${enrollment.trim()}'`
            )
        );
});




/**
 * @function getStudentsByName
 * @description
 *   Searches for students by name (partial, case‑insensitive) and, if provided,
 *   filters by programme code.
 *
 * @route   GET /search-by-name   eg: /search-by-name?name=jojo&programme=bca
 * @query   {string} name       - Required: substring to search in student names.
 * @query   {string} programme  - Optional: one of 'bca', 'bba', 'bcom'.
 *
 * @returns {ApiResponse}
 *   - 200 with array of matching students
 *   - 400 if `name` is missing or `programme` is invalid
 *   - 404 if no students are found
 */
const getStudentsByName = asyncHandler(async (req, res) => {
    // 1) Extract and validate `name`
    const { name = "", programme = "" } = req.query;
    if (!name.trim()) {
        throw new ApiError(400, "`name` query parameter is required");
    }

    // 2) Build base match stage (case‑insensitive name search)
    const matchStage = {
        name: { $regex: name.trim(), $options: "i" },
    };

    // 3) If `programme` was provided, map it to a code and validate
    const codeMap = { bca: "020", bba: "017", bcom: "888" };
    if (programme.trim()) {
        const key = programme.trim().toLowerCase();
        if (!codeMap[key]) {
            throw new ApiError(
                400,
                `Invalid programme '${programme}'. Valid options: bca, bba, bcom`
            );
        }
        matchStage.prgCode = codeMap[key];
    }

    // 4) Run aggregation
    const students = await Student.aggregate([
        { $match: matchStage },
        {
            $addFields: {
                semestersCount: { $size: { $ifNull: ["$semesters", []] } },
                maxCredits: { $sum: "$semesters.maxCredits" },
                totalWeightedSGPA: {
                    $sum: {
                        $map: {
                            input: "$semesters",
                            as: "sem",
                            in: {
                                $multiply: ["$$sem.sgpa", "$$sem.maxCredits"]
                            }
                        }
                    }
                }
            },
        },
        {
            $addFields: {
                cgpa: {
                    $cond: [
                        { $gt: ["$semestersCount", 0] },
                        {
                            $round: [
                                { $divide: ["$totalWeightedSGPA", "$maxCredits"] },
                                3
                            ]
                        },
                        0
                    ]
                },
            }
        },
        {
            $sort: { name: 1 }
        },
        {
            $project: {
                enrollment: 1,
                name: 1,
                sid: 1,
                schemeID: 1,
                instCode: 1,
                batch: 1,
                prgCode: 1,
                programme: 1,
                cgpa: 1,
            },
        },
    ]);

    // 5) Handle no-results
    if (students.length === 0) {
        const msg = programme
            ? `No students found matching '${name.trim()}' in programme '${programme.trim()}'.`
            : `No students found matching '${name.trim()}'.`;
        throw new ApiError(404, msg, []);
    }
    // 6) Success
    const successMsg = programme
        ? `Found ${students.length
        } student(s) matching '${name.trim()}' in programme '${programme.trim()}'.`
        : `Found ${students.length} student(s) matching '${name.trim()}'.`;

    return res.status(200).json(new ApiResponse(200, students, successMsg));
});


const getTopStudents = asyncHandler(async (req, res) => {

    const programs = await Student.distinct("programme");

    if (!programs || programs.length === 0) {
        throw new ApiError(404, "No programs found", []);
    }



    const topStudents = await Student.aggregate([
            // Filter only students with 6 or 8 semesters
            {
                $match: {
                $expr: {
                    $or: [
                    { $eq: [{$size: "$semesters"}, 6] },
                    { $eq: [{$size: "$semesters"}, 8] }
                    ]
                }
                }
            },
            // Unwind semesters array for CGPA calculation
            { $unwind: "$semesters" },
            // Calculate weighted sgpa and credits per semester
            {
                $addFields: {
                weightedSgpa: { $multiply: [{$ifNull: ["$semesters.sgpa", 0]}, {$ifNull: ["$semesters.totalCredits", 0]}] },
                credits: { $ifNull: ["$semesters.totalCredits", 0] }
                }
            },
            // Group back per student to sum up sgpa*credits and total credits
            {
                $group: {
                _id: "$_id",
                enrollment: { $first: "$enrollment" },
                name: { $first: "$name" },
                instCode: { $first: "$instCode" },
                batch: { $first: "$batch" },
                prgCode: { $first: "$prgCode" },
                programme: { $first: "$programme" },
                totalWeightedSgpa: { $sum: "$weightedSgpa" },
                totalCredits: { $sum: "$credits" }
                }
            },
            // Calculate CGPA
            {
                $addFields: {
                cgpa: {
                    $cond: [
                    { $gt: ["$totalCredits", 0] },
                    { $round: [{ $divide: ["$totalWeightedSgpa", "$totalCredits"] }, 3] },
                    0
                    ]
                }
                }
            },
            // Group by program and get student with highest CGPA
            {
                $sort: { "programme": 1, "cgpa": -1 }
            },
            {
                $group: {
                _id: "$programme",
                topStudent: { $first: "$$ROOT" }
                }
            },
            // Format output
            {
                $project: {
                _id: 0,
                programme: "$_id",
                topStudent: {
                    enrollment: "$topStudent.enrollment",
                    name: "$topStudent.name",
                    instCode: "$topStudent.instCode",
                    batch: "$topStudent.batch",
                    prgCode: "$topStudent.prgCode",
                    programme: "$topStudent.programme",
                    cgpa: "$topStudent.cgpa"
                }
                }
            }
]);


    if (topStudents.length === 0) {
        throw new ApiError(404, "No top students found", []);
    }

    return res.status(200).json(
        new ApiResponse(200, topStudents, "Top students fetched successfully")
    );

});


const getStudentMarksheet = asyncHandler(async (req, res) => {

    const { enrollment } = req.params;
    if (!enrollment?.trim() || enrollment.trim().length !== 11) {
        throw new ApiError(400, `Invalid enrollment number: '${enrollment}'`);
    }
    
    const {semester} = req.query;

    const student = await Student.findOne({ enrollment });

    if (!student) {
        throw new ApiError("Student not found", 404);
    }


    

    if(!semester){
        
        const data = student.semesters.map(semester => {
            return {
                semester: semester.sem,
                totalMarks: semester.totalMarks,
                maxMarks: semester.maxMarks,
                percentage: semester.percentage,
                sgpa: semester.sgpa
            };
        });
        res.status(200).json(new ApiResponse(200, data, "Marksheet fetched successfully"));

    } else {

        const semNumber = parseInt(semester, 10);
        if (isNaN(semNumber) || semNumber < 1) {
            throw new ApiError(400, `Invalid semester number: '${semester}'`);
        }

        const semesterData = student.semesters.find(sem => sem.sem === semNumber);


        if (!semesterData) {
            throw new ApiError(404, `No data found for semester '${semester}'`);
        }

        const data = {
            sem: semesterData.sem,
            subjectCount: semesterData.subjectCount,
            subjects: semesterData.subjects

        }
        res.status(200).json(new ApiResponse(200, data, "Marksheet fetched successfully"));

    }
        
})



export { getStudentByEnrollment, getStudentsByName, getTopStudents, getStudentMarksheet };
