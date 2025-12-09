import express from 'express';
import { getHashtagSuggestions } from '../controllers/hashtag.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/hashtag/suggestions?q=keyword
router.get('/suggestions', protectRoute, getHashtagSuggestions);

export default router;
