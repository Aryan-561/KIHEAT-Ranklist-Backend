import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

export const conf = {
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT
};
