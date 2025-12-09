import express from 'express';
import { protectRoute } from '../middlewares/protectRoute.js';
import { blockUser, unblockUser, getBlockedUsers, checkIfBlocked } from '../controllers/user.controller.js';

const router = express.Router();

// Block a user
router.post('/block/:userId', protectRoute, blockUser);

// Unblock a user
router.post('/unblock/:userId', protectRoute, unblockUser);

// Get list of blocked users
router.get('/blocked', protectRoute, getBlockedUsers);

// Check if a user is blocked
router.get('/is-blocked/:userId', protectRoute, checkIfBlocked);

export default router;
