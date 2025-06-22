import mongoose from 'mongoose';
import { conf } from '../conf/conf.js';

const connectDB = async () => {
  try {
    const host =await mongoose.connect(conf.MONGO_URI);

    console.log('✅ MongoDB Connected', host.connection.host);
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

export default connectDB;