import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { 
    scheduleMessage, 
    getScheduledMessages, 
    cancelScheduledMessage 
} from '../controllers/scheduledMessage.controller.js';

const router = express.Router();

// Schedule a new message
router.post('/', protectRoute, scheduleMessage);

// Get user's scheduled messages
router.get('/', protectRoute, getScheduledMessages);

// Cancel a scheduled message
router.delete('/:id', protectRoute, cancelScheduledMessage);

export default router;
