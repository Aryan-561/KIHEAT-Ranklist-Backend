import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors(
    {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific HTTP methods
    }
));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


import resultUploadRouter from './routes/resultUpload.route.js';
import programmeRouter from './routes/programme.route.js'
import studentRouter from './routes/student.route.js'

app.use('/api/v1/result', resultUploadRouter);
app.use('/api/v1/programme', programmeRouter);
app.use('/api/v1/student', studentRouter); 

export default app;