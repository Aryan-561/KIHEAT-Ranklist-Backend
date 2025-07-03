import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";

/**
 * @function getProgrammeResult
 * @description
 *   Fetches and aggregates student performance data for a given programme and batch.
 *   - Validates `programme` and `batch` route parameters
 *   - Maps programme short-code to internal prgCode
 *   - Filters out batches before data is available
 *   - Aggregates semesters array to compute total marks, credits, SGPA and overall GPA
 *   - Projects a clean payload of selected fields
 *
 * @route   GET /programme/:programme/:batch
 * @param   {Object}   req.params
 * @param   {string}   req.params.programme  One of "bca", "bba", "bcom"
 * @param   {string}   req.params.batch      Academic batch year (e.g. "2023")
 *
 * @returns {ApiResponse}
 *   
 */


const getProgrammeResult = asyncHandler(async (req, res) => {
    // Destructure and trim inputs
    let { programme, batch } = req.params;

    // Validate presence of parameters
    if (!programme?.trim()) {
        throw new ApiError(400, "Programme parameter cannot be empty");
    }
    if (!batch?.trim()) {
        throw new ApiError(400, "Batch parameter cannot be empty");
    }

    programme = programme.trim().toLowerCase();
    batch = batch.trim();

    // Map of valid programmes to their internal codes
    const prgCodeMap = {
        bca: "020",
        bba: "017",
        bcom: "888",
    };

    const prgCode = prgCodeMap[programme];
    if (!prgCode) {
        throw new ApiError(
            400,
            `Invalid programme ${programme}. Valid options are: ${Object.keys(
                prgCodeMap
            ).join(", ")}`
        );
    }

    // No data exists before 2022
    const batchYear = Number(batch);
    if (isNaN(batchYear) || batchYear < 2022) {
        throw new ApiError(404,`No result data available for batch ${batch}`,[])
    }

    // Aggregation pipeline to compute totals and GPA
    const students = await Student.aggregate([
        {
            // Filter by programme code and batch
            $match: { prgCode, batch },
        },
        {
            // Count semesters and sum their SGPA
            $addFields: {
                semestersCount: { $size: { $ifNull: ["$semesters", []] } },
                totalSGPA: { $sum: "$semesters.sgpa" },
            },
        },
        {
            // Compute overall GPA, guarding against division by zero
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
            // Select only the fields we want to expose
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
    ]);

    // Handle case where no students matched
    if (students.length === 0) {
         throw new ApiError(404,`No students found for programme ${programme} in batch ${batch}`, []);
            
    }

    // Success response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                students,
                `Fetched ${students.length} student(s) for programme "${programme}" in batch ${batch}`
            )
        );
});

export { getProgrammeResult };
