import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/connect.js';
import { conf } from './conf/conf.js';

dotenv.config({
  path: "./.env"
});
const app = express();
const PORT = conf.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => res.send('API is running...'));

app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running on port ${PORT}`);
});