import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";
import { cleanTempFolder } from "../utils/clearTemp.js";
import { runPythonScript } from "../utils/runPythonScript.js";
import mongoose from "mongoose";




// Calculate percentage based on total marks and maximum marks.
const calPercentage = (totalMarks, maxMarks) => {
    if (maxMarks === 0) return 0;
    return ((totalMarks / maxMarks) * 100).toFixed(3);
};


// Grade points mapping used for SGPA calculation.
const gradePoints = {
    O: 10,
    "A+": 9,
    A: 8,
    "B+": 7,
    B: 6,
    C: 5,
    P: 4,
    F: 0,
};


// Calculate SGPA (Semester Grade Point Average) for given subjects.
const calSGPA = (subjects, maxCredits) => {
    let totalPoints = 0;
    

    for (const subject of subjects) {
        const point = gradePoints[subject.grade] || 0;
        const credit = subject.credits || 0;
        totalPoints += point * credit;
    }

    if (totalPoints == 0) return 0.000;
    return (totalPoints / maxCredits).toFixed(3);
};



// ****** Process students results. ******

/*
 * Process uploaded student result file, extract data, and save to DB in a transaction.
 
  Steps:
  1️⃣ Parse uploaded file using Python script
  2️⃣ Map each student’s semester and subject details
  3️⃣ Save or update student records inside a MongoDB transaction
  4️⃣ Clean up temporary files afterwards
 
 */

const processResults = asyncHandler(async (req, res) => {

        // ✅ Check if file uploaded
        const filePath = req.file?.path;

        if (!filePath) {
            throw new ApiError(400, "File not found");
        }
        console.log("File uploaded successfully:", filePath);


        // ✅ Run Python script to extract result and scheme data
        const [resultData, schemeData] = await runPythonScript(filePath);

        

        // ✅ Get subject details mapping
        const subjectDetails = schemeData[0].subjects;


        // ✅ Start MongoDB session & transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            // ✅ Process each student from extracted data
            for (const student of resultData) {
                const semester = {
                    sem: student.resultHeader.sem,
                    subjects: [],
                };


                // Initialize semester-level aggregates
                let totalMarks = 0;
                let maxMarks = 0;
                let subjectCount = 0;
                let totalCredits = 0;
                let maxCredits = 0;
                let totalCreditMarks = 0;


                // ✅ Process each subject for this student
                for (let key in student.subjects) {
                    const subjectData = student.subjects[key];
                    let paperCode = key.trim();

                    const detail = subjectDetails[paperCode];

                    // Handle missing subject details
                    if (!detail) {
                        for (const code in subjectDetails) {
                            if (paperCode == subjectDetails[code].paperID)
                                paperCode = code;
                        }
                    }

                    // Calculate subject-level marks and credits

                    totalMarks += Number(subjectData.total) || 0;
                    maxMarks += Number(subjectDetails[paperCode].maxMarks) || 100;

                    const total = Number(subjectData.total) || 0;
                    const isBacklog = !(total > 39);

                    const credits =
                        total > 39 ? Number(subjectDetails[paperCode].credits) : 0;
                    totalCredits += credits;
                    maxCredits += Number(subjectDetails[paperCode].credits);

                    totalCreditMarks += credits * Number(subjectData?.total) || 0;
                    subjectCount += 1;


                    // Push subject details into semester
                    semester.subjects.push({
                        paperId: subjectDetails[paperCode].paperID,
                        paperCode: paperCode,
                        paperName: subjectDetails[paperCode].paperName,
                        credits: credits,
                        type: subjectDetails[paperCode].type,
                        internal: Number(subjectData.internal) || 0,
                        external: Number(subjectData.external) || 0,
                        total: total,
                        grade: isBacklog ? "F" : subjectData.totalGrade,
                        backlog: isBacklog,
                    });

                }


                // ✅ Calculate semester-level aggregates
                semester.subjectCount = subjectCount;
                semester.totalMarks = totalMarks;
                semester.maxMarks = maxMarks;
                semester.totalCredits = totalCredits;
                semester.maxCredits = maxCredits;
                semester.totalCreditMarks = totalCreditMarks;
                semester.maxCreditMarks = maxCredits * 100;
                semester.percentage = calPercentage(totalMarks, maxMarks);
                semester.creditPercentage = calPercentage(
                    totalCreditMarks,
                    maxCredits * 100
                );
                semester.sgpa = calSGPA(semester.subjects, maxCredits);


                // ✅ Check if student exists
                const studentExists = await Student.findOne(
                    { enrollment: student.enrollment },
                    null,
                    { session }
                );

                if (studentExists) {

                    // If student exists, append semester to existing semesters array
                    await Student.findOneAndUpdate(
                        { _id: studentExists._id },
                        {
                            $set: {
                                semesters: [...studentExists.semesters, semester],
                            },
                        },
                        { session }
                    );
                } else {

                    // Create new student document
                    await Student.create([
                        {
                            enrollment: student.enrollment,
                            name: student.name,
                            sid: student.sid,
                            schemeID: student.schemeID,
                            instCode: student.institute.instCode,
                            batch: student.batch,
                            prgCode: student.prgCode,
                            programme: student.programme,
                            semesters: [semester],
                        }],
                        { session }
                    );
                }
            }


            // ✅ Commit transaction after all students processed
            await session.commitTransaction();

            // give response
            res.json(
                new ApiResponse(
                    200,
                    resultData,
                    "Result data processed and saved successfully"
                )
            );
        } catch (error) {

            // Rollback transaction on error
            await session.abortTransaction();

            console.error("Transaction error:", error);
            throw new ApiError(500, "Transaction failed");

        } finally {

            // ✅ Always clean temporary folder and end session
            await cleanTempFolder("public/temp");

            session.endSession();

        }
});






// ****** Process Reapper students results. ******

/*
 * Process uploaded reappear student result file, extract data, and save to DB in a transaction.
 
  Steps:
  1️⃣ Parse uploaded file using Python script
  2️⃣ Map each student’s semester and subject details
  3️⃣ update student subject data records inside a MongoDB transaction
  4️⃣ Clean up temporary files afterwards
 
 */

const processReappearResults = asyncHandler(async (req, res) => {
        const filePath = req.file?.path;
        if (!filePath) {
            throw new ApiError(400, "File not found");
        }

        console.log("File uploaded successfully:", filePath);

        // Run Python script to extract result data and scheme data
        const [resultData, schemeData] = await runPythonScript(filePath);
        console.log("Scheme data:", schemeData);

        // Extract subject details mapping
        const subjectDetails = schemeData[0].subjects;

        // Start DB session and transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Iterate over each student in result data
            for (const student of resultData) {
                const semester = {
                    sem: student.resultHeader.sem,
                    subjects: [],
                };

                // Process each subject for this student
                for (const key in student.subjects) {
                    const subjectData = student.subjects[key];
                    let paperCode = key.trim();
                    const detail = subjectDetails[paperCode];

                    // Handle cases where subject detail not directly found
                    if (!detail) {
                        
                        for (const code in subjectDetails) {
                            if (paperCode === subjectDetails[code].paperID)
                                paperCode = code;
                        }
                    }

                    const total = Number(subjectData.total) || 0;
                    const isBacklog = !(total > 39);
                    const credits = total > 39 ? Number(subjectDetails[paperCode].credits) : 0;

                    semester.subjects.push({
                        paperId: subjectDetails[paperCode].paperID,
                        paperCode: paperCode,
                        paperName: subjectDetails[paperCode].paperName,
                        type: subjectDetails[paperCode].type,
                        credits: credits,
                        internal: Number(subjectData.internal) || 0,
                        external: Number(subjectData.external) || 0,
                        total: total,
                        grade: isBacklog? "F": subjectData.totalGrade,
                        backlog: isBacklog,
                        reappear: true,
                    });
                }

                // Check if student exists
                const studentExists = await Student.findOne(
                    { enrollment: student.enrollment },
                    null,
                    { session }
                );

                if (studentExists) {
                    // Update semester subjects
                    studentExists.semesters.forEach((sem) => {
                        if (sem.sem === semester.sem) {
                            sem.subjects.forEach((sub) => {
                                const updatedSubject = semester.subjects.find(
                                    (s) => s.paperCode === sub.paperCode
                                );
                                if (updatedSubject) {
                                    // Recalculate totalsMarks, totalCreditMarks, etc 
                                    const totalMarks =
                                        sem.totalMarks - sub.total + updatedSubject.total;

                                    sem.totalMarks = totalMarks;
                                    sem.totalCreditMarks += updatedSubject.credits * updatedSubject.total;

                                    sem.percentage = calPercentage(totalMarks, sem.maxMarks);
                                    sem.creditPercentage = calPercentage(sem.totalCreditMarks, sem.maxCreditMarks);

                                    // Update subject details
                                    sub.internal = updatedSubject.internal;
                                    sub.external = updatedSubject.external;
                                    sub.total = updatedSubject.total;
                                    sub.grade = updatedSubject.grade;
                                    sub.credits = updatedSubject.credits;
                                    sub.backlog = updatedSubject.backlog;
                                    sub.reappear = updatedSubject.reappear;

                                    // Recalculate total credit and sgpa
                                    sem.totalCredits += updatedSubject.credits;
                                    sem.sgpa = calSGPA(sem.subjects, sem.maxCredits);
                                }
                            });
                        }
                    });

                    // Save changes with transaction session
                    await studentExists.save({ session });
                }
            }

            // Commit DB transaction
            await session.commitTransaction();

            
            // give response
            return res.json(
                new ApiResponse(200, resultData, "Result data processed and updated successfully")
            );
        } catch (error) {
            // Rollback transaction on error
            await session.abortTransaction();
            console.error("Transaction failed:", error);
            throw new ApiError(500, "Transaction failed");

        } finally {

          // Clean up public/temp folder
            await cleanTempFolder();
            session.endSession();

        }
});


export { processResults, processReappearResults };

