import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";

/**
 * @description Fetch all programmes with their code and name
 * @route GET /programmes
 */
const getAllProgrammes = asyncHandler(async (req, res) => {
    const programmes = await Student.aggregate([
        {
            $group: {
                _id: "$prgCode",
                name: { $first: "$programme" },
            },
        },
        {
            $project: {
                _id: 0,
                prgCode: "$_id",
                name: 1,
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            programmes,
            `Fetched ${programmes.length} programme(s)`
        )
    );
});

/**
 * @description Fetch all batches for a given programme
 * @route GET /programme/:programme/batches
 */
const getProgrammeBatches = asyncHandler(async (req, res) => {
    const { programme } = req.params;

    if (!programme?.trim()) {
        throw new ApiError(400, "Programme parameter cannot be empty");
    }

    const prgCodeMap = {
        bca: "020",
        bba: "017",
        bcom: "888",
    };

    const prgCode = prgCodeMap[programme.trim().toLowerCase()];
    if (!prgCode) {
        throw new ApiError(
            400,
            `Invalid programme '${programme}'. Valid options: ${Object.keys(prgCodeMap).join(", ")}`
        );
    }

    const batches = await Student.distinct("batch", { prgCode });

    return res.status(200).json(
        new ApiResponse(
            200,
            batches,
            `Fetched ${batches.length} batch(es) for programme '${programme}'`
        )
    );
});

/**
 * @description Fetch all semesters for a specific programme and batch
 * @route GET /programme/:prgCode/:batch/semesters
 */
const getProgrammeSemesters = asyncHandler(async (req, res) => {
    const { prgCode, batch } = req.params;

    const semesters = await Student.aggregate([
        { $match: { prgCode, batch } },
        { $unwind: "$semesters" },
        { $group: { _id: "$semesters.sem" } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, semester: "$_id" } } // returns flat array with key 'semester'
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            semesters.map(s => s.semester),
            `Fetched ${semesters.length} semester(s) for programme code '${prgCode}' and batch '${batch}'`
        )
    );
});

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
        throw new ApiError(
            404,
            `No result data available for batch ${batch}`,
            []
        );
    }

    // Aggregation pipeline to compute totals and GPA
    const students = await Student.aggregate([
        {
            // Filter by programme code and batch
            $match: { prgCode, batch },
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
    ]);

    // Handle case where no students matched
    if (students.length === 0) {
        throw new ApiError(
            404,
            `No students found for programme ${programme} in batch ${batch}`,
            []
        );
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
export { getAllProgrammes, getProgrammeBatches, getProgrammeSemesters, getProgrammeResult };
