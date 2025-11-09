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
    const { prgCode, batch } = req.params;

    if (!prgCode?.trim() || !batch?.trim()) {
        throw new ApiError(400, "Programme code and batch parameters cannot be empty");
    }

    if (!["020", "017", "888"].includes(prgCode.trim())) {
        throw new ApiError(400, "Invalid programme code");
    }

    if (isNaN(Number(batch)) || Number(batch) < 2022) {
        throw new ApiError(400, "Invalid batch");
    }



    // Aggregation pipeline to compute totals and GPA
    const students = await Student.aggregate([
        {
            // Filter by programme code and batch
            $match: { prgCode: prgCode, batch: batch },
        },
        {

            $addFields: {
                semestersCount: { $size: { $ifNull: ["$semesters", []] } },
                totalMarks: { $sum: "$semesters.totalMarks" },
                maxMarks: { $sum: "$semesters.maxMarks" },
                // totalCreditMarks: { $sum: "$semesters.totalCreditMarks" },
                // maxCreditMarks: { $sum: "$semesters.maxCreditMarks" },
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

                // creditPrecentage: {
                //     $round: [{
                //         $multiply: [
                //             { $divide: ["$totalCreditMarks", "$maxCreditMarks"] },
                //             100
                //         ]
                //     }, 3]
                // }
            }
        },
        // {
        //     $addFields: {
        //         semesters: {
        //             $sortArray: {
        //                 input: "$semesters",
        //                 sortBy: { sem: 1 }  // Ascending by semester number
        //             }
        //         }
        //     }
        // },

        {
            $sort: { cgpa: -1 }
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
                // totalSGPA: 1,
                totalMarks: 1,
                maxMarks: 1,
                // totalCreditMarks: 1,
                // maxCreditMarks: 1,
                semestersCount: 1,
                totalCredits: 1,
                maxCredits: 1,
                cgpa: 1,
                percentage: 1,
                // creditPrecentage: 1,
                // semesters: 1,

            },
        },
    ]);



    // Handle case where no students matched
    if (students.length === 0) {
        throw new ApiError(
            404,
            `No students found for programme ${prgCode} in batch ${batch}`,
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
                `Fetched ${students.length} student(s) for programme "${prgCode}" in batch ${batch}`
            )
        );
});


const getProgrammeResultBySemester = asyncHandler(async (req, res) => {

    const { prgCode, batch, semester } = req.params;

    if (!prgCode?.trim() || !batch?.trim() || !semester?.trim()) {
        throw new ApiError(400, "Programme code, batch and semester parameters cannot be empty");
    }

    if (!["020", "017", "888"].includes(prgCode.trim())) {
        throw new ApiError(400, "Invalid programme code");
    }

    if (isNaN(Number(batch)) || Number(batch) < 2022) {
        throw new ApiError(400, "Invalid batch");
    }

    if (isNaN(Number(semester)) || Number(semester) < 1) {
        throw new ApiError(400, "Invalid semester");
    }


    const students = await Student.aggregate([

        {
            $match: { prgCode: prgCode, batch: batch },
        },

        {
            $addFields: {
                semester: {
                    $filter: {
                        input: "$semesters",
                        as: "sem",
                        cond: { $eq: ["$$sem.sem", Number(semester)] }
                    }
                }
            }
        },

        {
            $unwind: "$semester"
        },

        {
            $sort: { "semester.sgpa": -1 }
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
                totalMarks: "$semester.totalMarks",
                maxMarks: "$semester.maxMarks",
                totalCredits: "$semester.totalCredits",
                maxCredits: "$semester.maxCredits",
                percentage: "$semester.percentage",
                sem: "$semester.sem",
                // subjectCount: "$semester.subjectsCount",
                sgpa: "$semester.sgpa",
            }
        }


    ]);

    console.log(students);

    if (students.length === 0) {
        throw new ApiError(
            404,
            `No students found for programme ${prgCode} in batch ${batch} for semester ${semester}`,
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
                `Fetched ${students.length} student(s) for programme "${prgCode}" in batch ${batch} for semester ${semester}`
            )
        );

})

const getEnrollment = asyncHandler(async (req, res) => {
    const { prgCode, batch } = req.params;
    const enrollments = await Student.find({ prgCode, batch }).sort('enrollment').select('enrollment name -_id');
    return res.status(200).json(
        new ApiResponse(
            200, enrollments, "Fetched enrollments successfully"))
})

export { getAllProgrammes, getProgrammeBatches, getProgrammeSemesters, getProgrammeResult, getProgrammeResultBySemester, getEnrollment };
