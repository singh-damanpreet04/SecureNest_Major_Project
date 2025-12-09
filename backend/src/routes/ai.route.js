// ai.route.js
import express from 'express';
import { sendAIMessage, getAIHistory } from '../controllers/ai.controller.js';
const router = express.Router();

// POST /api/ai/message
router.post('/message', sendAIMessage);

// GET /api/ai/history
router.get('/history', getAIHistory);

export default router;
