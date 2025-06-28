import mongoose, { Schema } from "mongoose";

const semesterSchema = new Schema({
    sem: {
        type: Number,
        required: true,
    },
    subjectCount: Number,
    subjects: [
        new Schema(
        {
            paperId: {
                type: String,
                required: true,
            },

            paperCode:{
                type: String,
                required: true,
            },

            paperName: {
                type: String,
                required: true,
            },

            type:{type: String},
            credits: Number,
            internal: {
                type: Number,
                default: 0,
            },

            external: {
                type: Number,
                default: 0,
            },

            total: {
                type: Number,
                default: 0,
            },

            reappear:{
                type: Boolean,
                default: false,
            },

            backlog: {
                type: Boolean, 
                default: false,
            },
            
            grade: {
                type: String,
                default: "",
            },
        },{_id:false})
    ],
    totalMarks: Number,
    maxMarks: Number,
    totalCredits: Number,
    maxCredits: Number,
    totalCreditMarks: Number,
    maxCreditMarks: Number,
    percentage: Number,
    creditPercentage: Number,
    sgpa:Number,
    
},{_id:false});

const studentSchema = new Schema({
    enrollment: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    name: {
        type: String,
        required: true,
        index: true,
    },

    sid: String,
    schemeID: String,
    instCode: Number,
    batch: {
        type: String,
        required: true,
        index: true,
    },
    prgCode: String,
    programme: {
        type: String,
        required: true,
        index: true,    
    },
    semesters: [semesterSchema],
});

export const Student = mongoose.model("Student", studentSchema);
