import express from "express";
import { getMessages, sendMessage, getUsersForSidebar, deleteMessage, forwardMessage, pinChat, unpinChat, getPinnedChats } from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import cloudinary from "../lib/cloudinary.js";
import Message from "../models/message.model.js";
import axios from 'axios';

const router = express.Router();

// Get all users for sidebar
export const getUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.log("Error in getUsers controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get all users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);
// Get pinned chats (must come before /:id route)
router.get("/pinned", protectRoute, getPinnedChats);
// Get messages for a specific user
router.get("/:id", protectRoute, getMessages);
// Send a message
router.post("/send/:id", protectRoute, sendMessage);
// Delete a message
router.delete("/:messageId", protectRoute, deleteMessage);
// Forward a message
router.post("/forward/:messageId", protectRoute, forwardMessage);

// Chat pin routes
router.post("/pin/:userId", protectRoute, pinChat);
router.delete("/pin/:userId", protectRoute, unpinChat);

// Secure proxy to stream encrypted image ciphertext to authorized users only
router.get('/image/:messageId', protectRoute, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id.toString();
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        const isParticipant = [message.senderId.toString(), message.receiverId.toString()].includes(userId);
        if (!isParticipant) return res.status(403).json({ message: 'Forbidden' });
        if (!message.imagePublicId) return res.status(400).json({ message: 'No encrypted image for this message' });

        // Generate signed URL for private raw asset
        const signedUrl = cloudinary.utils.private_download_url(
            message.imagePublicId,
            null,
            {
                resource_type: 'raw',
                type: 'private',
                expires_at: Math.floor(Date.now() / 1000) + 60,
                attachment: false,
            }
        );

        // Fetch the ciphertext server-side to avoid CORS and stream to client
        const response = await axios.get(signedUrl, { responseType: 'stream' });
        // Cloudinary might return text/plain for .txt; force binary for browser
        res.setHeader('Content-Type', 'application/octet-stream');
        if (message.imageMimeType) {
            res.setHeader('X-Original-MimeType', message.imageMimeType);
        }
        response.data.pipe(res);
        return;
    } catch (err) {
        console.error('Error in encrypted image proxy:', err);
        return res.status(500).json({ message: 'Failed to fetch encrypted image' });
    }
});

export default router;