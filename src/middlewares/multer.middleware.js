import multer from "multer";


const storage = multer.diskStorage({
    destination:(rq, file, cb)=>{
        cb(null, './public/temp')
    },
    filename:(req, file, cb)=>{
        
        cb(null, `result.pdf`);
    }
})

export const upload = multer({storage,})