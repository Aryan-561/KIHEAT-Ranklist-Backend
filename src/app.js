import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(cors(
    {
        origin: ["https://kiheatranklist.vercel.app","http://localhost:5173","https://kiheat-ranklist-frontend-git-local-aryan-561s-projects.vercel.app/","https://www.kiheat-ranklist.me"],
        methods: ['GET', 'POST','PUT', 'DELETE'], // Allow specific HTTP methods
    }
));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// rate limiter
const limiter = rateLimit({
    windowMs: 5*60*1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again after 5 minutes"
})

app.use(limiter);

import resultUploadRouter from './routes/resultUpload.route.js';
import programmeRouter from './routes/programme.route.js'
import studentRouter from './routes/student.route.js'
import healthCheckRouter from './routes/healthCheck.route.js'
import compareRouter from './routes/compare.route.js'
app.use('/api/v1/result', resultUploadRouter);
app.use('/api/v1/programme', programmeRouter);
app.use('/api/v1/student', studentRouter); 
app.use('/api/v1/health', healthCheckRouter)
app.use('/api/v1/compare',  compareRouter)

export default app;