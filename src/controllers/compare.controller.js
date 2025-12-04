import { Student } from "../models/student.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getCompareResult = asyncHandler(async (req, res) => {
    const { student1, student2 } = req.params;

    const s1 = student1?.trim();
    const s2 = student2?.trim();

    const students = await Student.aggregate([
        // 1. pick the two students
        { $match: { enrollment: { $in: [s1, s2] } } },

        // 2. normalize arrays so later operators never see null
        {
            $addFields: {
                subjects: { $ifNull: ["$subjects", []] },
                semesters: { $ifNull: ["$semesters", []] }
            }
        },

        // 3. normalize semesters: ensure each sem has subjects array and sgpa, totalMarks, maxMarks fallbacks
        {
            $addFields: {
                semestersNormalized: {
                    $map: {
                        input: "$semesters",
                        as: "sem",
                        in: {
                            sem: { $ifNull: ["$$sem.sem", null] },
                            subjects: { $ifNull: ["$$sem.subjects", []] },
                            semTotal: {
                                $ifNull: [
                                    "$$sem.totalMarks",
                                    {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$$sem.subjects", []] },
                                                as: "s",
                                                in: { $ifNull: ["$$s.total", 0] }
                                            }
                                        }
                                    }
                                ]
                            },
                            semMax: {
                                $ifNull: [
                                    "$$sem.maxMarks",
                                    {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$$sem.subjects", []] },
                                                as: "s",
                                                in: { $ifNull: ["$$s.maxMarks", 0] }
                                            }
                                        }
                                    }
                                ]
                            },
                            sgpa: { $ifNull: ["$$sem.sgpa", null] }
                        }
                    }
                }
            }
        },

        // 4. build flat allSubjects array = top-level subjects + every semester.subjects
        {
            $addFields: {
                allSubjects: {
                    $reduce: {
                        input: "$semestersNormalized",
                        initialValue: { $ifNull: ["$subjects", []] },
                        in: { $concatArrays: ["$$value", { $ifNull: ["$$this.subjects", []] }] }
                    }
                }
            }
        },

        // 5. compute totals / maxima / minima / counts / sgpa stats
        {
            $addFields: {
                totalMarks: {
                    $sum: {
                        $map: { input: { $ifNull: ["$semestersNormalized", []] }, as: "s", in: { $ifNull: ["$$s.semTotal", 0] } }
                    }
                },
                maxMarks: {
                    $sum: {
                        $map: { input: { $ifNull: ["$semestersNormalized", []] }, as: "s", in: { $ifNull: ["$$s.semMax", 0] } }
                    }
                },

                internalTotal: {
                    $sum: {
                        $map: { input: { $ifNull: ["$allSubjects", []] }, as: "sub", in: { $ifNull: ["$$sub.internal", 0] } }
                    }
                },
                externalTotal: {
                    $sum: {
                        $map: { input: { $ifNull: ["$allSubjects", []] }, as: "sub", in: { $ifNull: ["$$sub.external", 0] } }
                    }
                },

                highestSubjectTotal: {
                    $max: {
                        $map: { input: { $ifNull: ["$allSubjects", []] }, as: "sub", in: { $ifNull: ["$$sub.total", 0] } }
                    }
                },
                lowestSubjectTotal: {
                    $min: {
                        $map: { input: { $ifNull: ["$allSubjects", []] }, as: "sub", in: { $ifNull: ["$$sub.total", 999999] } }
                    }
                },

                // sgpa extremes across semesters
                highestSGPA: {
                    $max: {
                        $map: { input: { $ifNull: ["$semestersNormalized", []] }, as: "s", in: { $ifNull: ["$$s.sgpa", 0] } }
                    }
                },
                lowestSGPA: {
                    $min: {
                        $map: { input: { $ifNull: ["$semestersNormalized", []] }, as: "s", in: { $ifNull: ["$$s.sgpa", 999] } }
                    }
                },

                semestersCount: { $size: { $ifNull: ["$semestersNormalized", []] } },
                subjectsCount: { $size: { $ifNull: ["$allSubjects", []] } },

                // safe cgpa (use stored cgpa if present, else avg semester sgpa)
                cgpa: {
                    $ifNull: [
                        "$cgpa",
                        {
                            $avg: {
                                $filter: {
                                    input: { $map: { input: { $ifNull: ["$semestersNormalized", []] }, as: "s", in: "$$s.sgpa" } },
                                    as: "v",
                                    cond: { $ne: ["$$v", null] }
                                }
                            }
                        }
                    ]
                }
            }
        },

        // 6. percentage calculation (null-safe)
        {
            $addFields: {
                percentage: {
                    $cond: [
                        { $gt: ["$maxMarks", 0] },
                        { $multiply: [{ $divide: ["$totalMarks", "$maxMarks"] }, 100] },
                        null
                    ]
                }
            }
        },

        // 7. project final visible fields
        {
            $project: {
                _id: 0,
                name: 1,
                enrollment: 1,
                programme: 1,
                batch: 1,

                // requested fields
                totalMarks: 1,
                maxMarks: 1,
                internalTotal: 1,
                externalTotal: 1,
                percentage: 1,
                highestSubjectTotal: 1,
                lowestSubjectTotal: 1,
                semestersCount: 1,
                subjectsCount: 1,
                highestSGPA: 1,
                lowestSGPA: 1,
                cgpa: 1,

                // optional: keep semestersNormalized if you want per-sem breakdown in response
                //   semesters: "$semestersNormalized"
            }
        }
    ]);
    if (students.length !== 2) {
        throw new ApiError(404, 'One or both students not found');
    }
    res.status(200).json(new ApiResponse(200, 'Compare result fetched successfully', { students }));

});

export const getEnrollments =  asyncHandler(async (req, res) => {
    const {prgCode, batch} = req.params;
    const enrollments = await Student.find({prgCode, batch}).sort('enrollment').select('enrollment name -_id');
    return res.status(200).json(
        new ApiResponse(
            200, enrollments, "Fetched enrollments successfully"))
})

