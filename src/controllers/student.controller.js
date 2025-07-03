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
            // Count semesters and sum their SGPA values
            $addFields: {
                semestersCount: { $size: { $ifNull: ["$semesters", []] } },
                totalSGPA: { $sum: "$semesters.sgpa" },
            },
        },
        {
            // Compute overall GPA, avoid division by zero
            $addFields: {
                gpa: {
                    $cond: [
                        { $gt: ["$semestersCount", 0] },
                        { $divide: ["$totalSGPA", "$semestersCount"] },
                        0,
                    ],
                },
            },
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
                totalMarks: { $sum: "$semesters.totalMarks" },
                maxMarks: { $sum: "$semesters.maxMarks" },
                totalCreditMarks: { $sum: "$semesters.totalCreditMarks" },
                maxCreditMarks: { $sum: "$semesters.maxCreditMarks" },
                totalCredits: { $sum: "$semesters.totalCredits" },
                maxCredits: { $sum: "$semesters.maxCredits" },
                semestersCount: 1,
                gpa: 1,
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
            $project: {
                enrollment: 1,
                name: 1,
                sid: 1,
                schemeID: 1,
                instCode: 1,
                batch: 1,
                prgCode: 1,
                programme: 1,
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
        ? `Found ${
              students.length
          } student(s) matching '${name.trim()}' in programme '${programme.trim()}'.`
        : `Found ${students.length} student(s) matching '${name.trim()}'.`;
        
    return res.status(200).json(new ApiResponse(200, students, successMsg));
});

export { getStudentByEnrollment, getStudentsByName };
