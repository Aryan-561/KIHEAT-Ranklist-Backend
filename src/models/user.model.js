import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({

    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
    },

    role:{
        type:[String],
        enum:['student','admin','teacher'],
        default:['student'],
        required: true,
    },

    enrollment:{
        type:String,
    },

    isAdmin:{
        type:Boolean,
        default:false,
        immutable: true,
    }

}, { timestamps: true });


export const User = mongoose.model('User',userSchema);