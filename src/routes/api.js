import express from 'express';
const router = express.Router();

router.get('/', (req, res) => res.json({ message: 'API Route Working' }));

export default router;