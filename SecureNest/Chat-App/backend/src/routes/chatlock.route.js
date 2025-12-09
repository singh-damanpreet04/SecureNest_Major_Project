import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { getLockStatus, lockChat, unlockChat, verifyChatPin, listLockedChats } from '../controllers/chatlock.controller.js';

const router = express.Router();

router.get('/status/:peerId', protectRoute, getLockStatus);
router.get('/list', protectRoute, listLockedChats);
router.post('/lock', protectRoute, lockChat);
router.post('/unlock', protectRoute, unlockChat);
router.post('/verify', protectRoute, verifyChatPin);

export default router;
