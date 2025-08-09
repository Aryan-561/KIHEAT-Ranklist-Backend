import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors(
    {
        origin: ["https://kiheatranklist.vercel.app","http://localhost:5173","https://kiheat-ranklist-frontend-git-local-aryan-561s-projects.vercel.app/"],
        methods: ['GET', 'POST','PUT', 'DELETE'], // Allow specific HTTP methods
    }
));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


import resultUploadRouter from './routes/resultUpload.route.js';
import programmeRouter from './routes/programme.route.js'
import studentRouter from './routes/student.route.js'
import healthCheckRouter from './routes/healthCheck.route.js'
app.use('/api/v1/result', resultUploadRouter);
app.use('/api/v1/programme', programmeRouter);
app.use('/api/v1/student', studentRouter); 
app.use('/api/v1/health', healthCheckRouter)

export default app;