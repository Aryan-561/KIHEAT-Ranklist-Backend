import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/db/connect.js';

dotenv.config({
  path:"./.env"
});
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => res.send('API is running...'));

app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running on port ${PORT}`);
});