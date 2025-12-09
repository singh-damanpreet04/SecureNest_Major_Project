import Message from "../models/message.model.js";
import User from "../models/user.models.js";
import CryptoJS from "crypto-js";
import crypto from 'crypto';
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { Readable } from 'stream';
import { saveBase64File, deleteFile } from '../lib/fileUtils.js';
import { deriveImageKey, encryptImageAesGcm, generateRandomBytes } from '../lib/imageCrypto.js';
import { requireUnlockedOrAllowed } from './chatlock.controller.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-secure-key-here";
const IV = process.env.IV || "your-initialization-vector";

export const getMessages = async (req, res) => {
    try {
        const userToChatId = req.params.id;
        const userId = req.user._id;

        // Enforce chat lock: current user must have unlocked this peer chat
        try {
            await requireUnlockedOrAllowed(req, userId, userToChatId);
        } catch (e) {
            const status = e.status || 423;
            return res.status(status).json({ message: e.message || 'Chat locked' });
        }

        // Check if either user has blocked the other
        const currentUser = await User.findById(userId);
        const otherUser = await User.findById(userToChatId);

        if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userToChatId)) {
            // If current user has blocked the other user, return empty array
            return res.status(200).json([]);
        }

        if (otherUser.blockedUsers && otherUser.blockedUsers.includes(userId)) {
            // If other user has blocked current user, return empty array
            return res.status(200).json([]);
        }

        // Find messages where:
        // 1. The user is either sender or receiver
        // 2. The message is either:
        //    - Not marked as deleted
        //    - Not in the user's deletedBy array
        const messages = await Message.find({
            $and: [
                {
                    $or: [
                        { senderId: userId, receiverId: userToChatId },
                        { senderId: userToChatId, receiverId: userId },
                    ]
                },
                {
                    $and: [
                        // Message is not marked as deleted
                        { $or: [
                            { deleted: { $exists: false } },
                            { deleted: false }
                        ]},
                        // And user hasn't deleted it
                        { $or: [
                            { deletedBy: { $exists: false } },
                            { deletedBy: { $ne: userId } }
                        ]}
                    ]
                }
            ]
        }).sort({ createdAt: 1 });

        const decryptedMessages = messages.map((msg) => {
            try {
                // Skip decryption if message is deleted for the current user
                if (msg.deleted && msg.deletedBy?.includes(userId.toString())) {
                    return null; // Will be filtered out
                }
                
                const decryptedText = CryptoJS.AES.decrypt(
                    msg.text,
                    CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY),
                    { iv: CryptoJS.enc.Utf8.parse(IV) }
                ).toString(CryptoJS.enc.Utf8);
                const baseObj = { ...msg.toObject(), text: decryptedText };
                // If encrypted image metadata exists, compute key and attach imageEncryption
                if (msg.imagePublicId && msg.imageIv && msg.imageSalt && msg.imageMimeType && msg.imageAuthTag) {
                    try {
                        const masterKeyEnv = process.env.ENCRYPTION_KEY || ENCRYPTION_KEY;
                        if (!masterKeyEnv) throw new Error('Missing server encryption key');
                        const masterKey = Buffer.from(masterKeyEnv);
                        const context = Buffer.from(`${msg.senderId.toString()}|${msg.receiverId.toString()}|image`);
                        const key = crypto.hkdfSync('sha256', masterKey, Buffer.from(msg.imageSalt, 'base64'), context, 32);
                        baseObj.imageEncryption = {
                            algo: 'AES-GCM',
                            key: Buffer.from(key).toString('base64'),
                            iv: msg.imageIv,
                            authTag: msg.imageAuthTag,
                            mimeType: msg.imageMimeType,
                            downloadUrl: `/messages/image/${msg._id.toString()}`
                        };
                    } catch (e) {
                        // If anything fails, skip attaching encryption info
                        console.error('Failed to derive image key for message', msg._id?.toString(), e?.message);
                    }
                }
                return baseObj;
            } catch (error) {
                console.log("Error decrypting message:", error.message);
                return { ...msg.toObject(), text: "Decryption Failed" };
            }
        }).filter(msg => msg !== null); // Filter out null messages

        res.status(200).json(decryptedMessages);
    } catch (error) {
        console.log("Error in getMessages controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        // Initialize request parameters
        const receiverId = req.params.id;
        const senderId = req.user?._id;
        // Enforce chat lock before sending
        try {
            await requireUnlockedOrAllowed(req, senderId, receiverId);
        } catch (e) {
            const status = e.status || 423;
            return res.status(status).json({ success: false, message: e.message || 'Chat locked' });
        }
        
        // Validate required fields first
        if (!senderId || !receiverId) {
            console.error('Missing required fields:', { senderId, receiverId });
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required user IDs' 
            });
        }
        
        // Destructure request body
        const { 
            text, 
            image, 
            audio, 
            audioDuration, 
            file, 
            fileType, 
            fileName 
        } = req.body || {};
        
        // Initialize media variables
        let imagePublicId, imageIv, imageSalt, imageAuthTag, imageUrl = null;
        let audioPublicId, audioIv, audioSalt, audioAuthTag, audioUrl = null;
        let filePublicId, fileIv, fileSalt, fileAuthTag, fileUrl = null, fileMetaData;

        // Check if receiver has blocked the sender
        const receiver = await User.findById(receiverId);
        if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
            return res.status(403).json({
                success: false,
                message: 'You are blocked by this user and cannot send messages to them.'
            });
        }

        // Check if sender has blocked the receiver
        const sender = await User.findById(senderId);
        if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
            return res.status(403).json({
                success: false,
                message: 'You have blocked this user. Unblock them to send messages.'
            });
        }

        // Logging incoming data for debugging
        console.log('sendMessage received:', { 
            senderId, 
            receiverId, 
            hasText: !!text,
            hasImage: !!image,
            hasAudio: !!audio,
            audioDuration,
            hasFile: !!file,
            fileType,
            fileName
        });

        if (!text && !image && !audio && !file) {
            console.log("No content provided for message");
            return res.status(400).json({ 
                success: false,
                message: "Message text, image, audio, or file is required" 
            });
        }

        // Will be set during image processing
        let imageMimeType = null;

        // Handle image upload without encryption
        if (image) {
            try {
                // Expect a data URL like data:image/png;base64,....
                if (typeof image !== 'string' || !image.startsWith('data:image/')) {
                    return res.status(400).json({ 
                        success: false,
                        message: 'Invalid image format. Expected data URL starting with data:image/' 
                    });
                }

                const [meta, base64Data] = image.split(',');
                if (!meta || !base64Data) {
                    return res.status(400).json({ 
                        success: false,
                        message: 'Malformed image data' 
                    });
                }
                
                const mimeMatch = /^data:(.*?);base64$/.exec(meta);
                imageMimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

                // Upload the image to Cloudinary using base64 upload
                console.log('Starting image upload to Cloudinary...');
                const uploadResult = await new Promise((resolve, reject) => {
                    const timestamp = Date.now();
                    const uploadOptions = {
                        resource_type: 'image',
                        folder: 'chat-app/images',
                        public_id: `img_${timestamp}`,
                        overwrite: false,
                        invalidate: true,
                        format: 'jpg',
                        timeout: 120000, // 2 minutes timeout
                        chunk_size: 6000000, // 6MB chunks
                        quality: 'auto:good',
                        fetch_format: 'auto',
                        transformation: [
                            { width: 2000, crop: 'limit', quality: 'auto:good' }
                        ]
                    };
                    
                    console.log('Upload options:', JSON.stringify(uploadOptions, null, 2));

                    // Upload the base64 data directly
                    cloudinary.uploader.upload(
                        `data:${imageMimeType};base64,${base64Data}`,
                        uploadOptions,
                        (error, result) => {
                            if (error) {
                                console.error('❌ Cloudinary upload error details:', {
                                    error: error.message,
                                    name: error.name,
                                    http_code: error.http_code,
                                    code: error.code,
                                    stack: error.stack
                                });
                                return reject(new Error(`Failed to upload image: ${error.message}`));
                            }
                            if (!result || !result.public_id) {
                                console.error('❌ Invalid Cloudinary response:', result);
                                return reject(new Error('Received invalid response from Cloudinary'));
                            }
                            console.log('✅ Cloudinary upload successful:', {
                                public_id: result.public_id,
                                format: result.format,
                                bytes: result.bytes,
                                secure_url: result.secure_url ? 'URL available' : 'No URL'
                            });
                            resolve(result);
                        }
                    );
                });

                if (!uploadResult || !uploadResult.public_id) {
                    throw new Error('Invalid upload response from Cloudinary');
                }

                imagePublicId = uploadResult.public_id;
                imageUrl = uploadResult.secure_url; // Store the secure URL
                console.log('✅ Image uploaded successfully to Cloudinary');
                console.log(`ℹ️ Public ID: ${imagePublicId}`);
                console.log(`ℹ️ Secure URL: ${imageUrl || 'Not available'}`);
            } catch (uploadError) {
                console.error('❌ Error uploading image:', uploadError);
                console.error('Error details:', {
                    name: uploadError.name,
                    message: uploadError.message,
                    stack: uploadError.stack,
                    code: uploadError.code,
                    http_code: uploadError.http_code
                });
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to upload image',
                    error: uploadError.message || 'Unknown error',
                    code: uploadError.http_code || 500
                });
            }
        }

        // Handle audio upload (no encryption)
        if (audio) {
            console.log('Audio data received, starting upload...');
            
            try {
                // Check if audio is a base64 string
                if (typeof audio === 'string' && audio.startsWith('data:audio')) {
                    console.log('Uploading audio to Cloudinary...');

                    // Parse MIME from data URL (e.g., data:audio/wav;base64,...)
                    const mimeMatch = /^data:(audio\/[^;]+);base64,.*/.exec(audio);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mpeg';
                    const base64Data = audio.split(';base64,').pop();

                    // Decide output format based on input MIME
                    let format = 'mp3';
                    if (mimeType.includes('wav')) format = 'wav';
                    else if (mimeType.includes('ogg')) format = 'ogg';
                    else if (mimeType.includes('webm')) format = 'webm';
                    else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) format = 'mp3';

                    const uploadOptions = {
                        resource_type: 'video', // Cloudinary handles audio as 'video'
                        folder: 'chat-app/audios',
                        public_id: `audio_${Date.now()}`,
                        overwrite: false,
                        invalidate: true,
                        timeout: 120000,
                        chunk_size: 10000000,
                        format, // keep same container when possible
                        eager_async: false
                    };

                    const dataUri = `data:${mimeType};base64,${base64Data}`;

                    const result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload(
                            dataUri,
                            uploadOptions,
                            (error, result) => {
                                if (error) {
                                    console.error('Cloudinary audio upload error:', error);
                                    return reject(new Error(`Audio upload failed: ${error.message}`));
                                }
                                if (!result || !result.secure_url) {
                                    return reject(new Error('Invalid response from Cloudinary'));
                                }
                                resolve(result);
                            }
                        );
                    });

                    if (!result || !result.secure_url) {
                        throw new Error('Failed to get secure URL from Cloudinary');
                    }
                    
                    audioUrl = result.secure_url;
                    audioPublicId = result.public_id;
                    console.log('Audio upload successful:', { url: audioUrl, format, mimeType });
                } else {
                    console.log('Audio is not in expected format:', typeof audio, audio?.substring?.(0, 100));
                    throw new Error('Invalid audio format: Expected base64 data URL starting with data:audio');
                }
            } catch (uploadError) {
                console.error('Error in audio upload process:', uploadError?.message);
                console.error('Upload error details:', uploadError);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process audio upload',
                    error: uploadError?.message,
                    code: uploadError?.code,
                    http_code: uploadError?.http_code
                });
            }
        }

        // Handle file upload (video or PDF) - no encryption
        if (file && fileType) {
            console.log(`Processing ${fileType} file upload...`);
            
            try {
                if (typeof file === 'string' && file.startsWith('data:')) {
                    // For PDFs, save directly to server
                    if (fileType === 'pdf') {
                        console.log('Saving PDF directly to server...');
                        const fileInfo = await saveBase64File(file, fileName || `document_${Date.now()}.pdf`);
                        fileUrl = fileInfo.filePath;
                        console.log('PDF saved successfully:', fileUrl);
                    } 
                    // For videos, upload to Cloudinary
                    else if (fileType === 'video') {
                        console.log('Uploading video to Cloudinary...');
                        const base64Data = file.split(';base64,').pop();
                        const uploadOptions = {
                            resource_type: 'video',
                            folder: 'chat-app/videos',
                            public_id: fileName ? fileName.split('.')[0] : `video_${Date.now()}`,
                            overwrite: false,
                            invalidate: true,
                            timeout: 300000, // 5 minutes timeout
                            chunk_size: 10000000, // 10MB chunks
                            format: 'mp4',
                            eager_async: false
                        };

                        const result = await new Promise((resolve, reject) => {
                            cloudinary.uploader.upload(
                                `data:video/mp4;base64,${base64Data}`,
                                uploadOptions,
                                (error, result) => {
                                    if (error) {
                                        console.error('Cloudinary video upload error:', error);
                                        return reject(new Error(`Video upload failed: ${error.message}`));
                                    }
                                    if (!result || !result.secure_url) {
                                        return reject(new Error('Invalid response from Cloudinary'));
                                    }
                                    resolve(result);
                                }
                            );
                        });

                        fileUrl = result.secure_url;
                        filePublicId = result.public_id;
                        console.log('Video upload successful:', fileUrl);
                    }
                } else {
                    throw new Error(`Invalid ${fileType} format: Expected base64 data URL`);
                }
            } catch (fileError) {
                console.error(`Error in ${fileType} upload process:`, fileError);
                console.error("Stack trace:", fileError.stack);
                
                return res.status(500).json({ 
                    message: `Failed to process ${fileType} upload`,
                    error: fileError.message,
                    details: fileError.response?.data?.error || 'No additional error details',
                    code: fileError.code,
                    http_code: fileError.http_code
                });
            }
        }

        // Encrypt text 
        let encryptedText = text ? CryptoJS.AES.encrypt(
            text,
            CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY),
            { iv: CryptoJS.enc.Utf8.parse(IV) }
        ).toString() : "";

        // Create the message with non-encrypted media (schema expects strings)
        const newMessage = new Message({
            senderId,
            receiverId,
            text: text ? CryptoJS.AES.encrypt(
                text,
                CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY),
                { iv: CryptoJS.enc.Utf8.parse(IV) }
            ).toString() : '',
            image: imageUrl || null,
            imagePublicId: imagePublicId || undefined,
            imageMimeType: imageMimeType || undefined,
            audio: audioUrl || null,
            audioDuration: audioDuration || 0,
            file: fileUrl || null,
            fileType: fileType || null,
            fileName: fileName || undefined,
            filePublicId: filePublicId || undefined
        });

        // Save the message to the database
        await newMessage.save();

        // Populate sender details for the response
        await newMessage.populate('senderId', 'fullName username profilePic');
        await newMessage.populate('receiverId', 'fullName username profilePic');

        // Get socket IDs for real-time messaging
        const receiverSocketId = getReceiverSocketId(receiverId);
        const senderSocketId = getReceiverSocketId(senderId);

        console.log('Socket IDs:', {
            receiverId,
            receiverSocketId,
            senderId,
            senderSocketId,
            connectedSockets: Object.keys(io.sockets.sockets || {})
        });

        // Prepare the message to emit via socket with decrypted text
        const messageToEmit = {
            ...newMessage.toObject(),
            // Include the original (unencrypted) text for the client
            text: text || '',
            // Ensure proper population of sender/receiver
            senderId: {
                _id: senderId,
                fullName: newMessage.senderId?.fullName,
                username: newMessage.senderId?.username,
                profilePic: newMessage.senderId?.profilePic
            },
            receiverId: {
                _id: receiverId,
                fullName: newMessage.receiverId?.fullName,
                username: newMessage.receiverId?.username,
                profilePic: newMessage.receiverId?.profilePic
            }
        };

        // Log the prepared message
        console.log('Prepared message to emit:', JSON.stringify({
            _id: messageToEmit._id,
            senderId: messageToEmit.senderId?._id,
            receiverId: messageToEmit.receiverId?._id,
            text: messageToEmit.text,
            hasImage: !!messageToEmit.image,
            hasAudio: !!messageToEmit.audio,
            hasFile: !!messageToEmit.file
        }, null, 2));

        // Emit the message to the receiver if they're online
        if (receiverSocketId) {
            console.log(`Emitting to receiver ${receiverId} on socket ${receiverSocketId}`);
            io.to(receiverSocketId).emit("newMessage", messageToEmit);
        } else {
            console.log(`Receiver ${receiverId} is not connected via socket`);
        }

        // Also emit to sender's other devices/tabs
        if (senderSocketId) {
            console.log(`Emitting to sender ${senderId} on socket ${senderSocketId}`);
            io.to(senderSocketId).emit("newMessage", messageToEmit);
        }

        res.status(200).json({ message: "Message sent successfully" });
    } catch (error) {
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const paramId = req.params.id;

        if (paramId) {
            const user = await User.findById(paramId).select("-password");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(200).json(user);
        }

        // Build last interaction map using messages
        const convAgg = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: loggedInUserId },
                        { receiverId: loggedInUserId }
                    ]
                }
            },
            {
                $project: {
                    otherUser: {
                        $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"]
                    },
                    createdAt: 1
                }
            },
            {
                $group: {
                    _id: "$otherUser",
                    lastMessageAt: { $max: "$createdAt" }
                }
            },
            { $sort: { lastMessageAt: -1 } }
        ]);

        const lastMap = new Map(convAgg.map(c => [c._id.toString(), c.lastMessageAt]));

        // Fetch all other users
        const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

        // Attach lastMessageAt and sort (users without chats go last)
        const enriched = users.map(u => ({
            ...u.toObject(),
            lastMessageAt: lastMap.get(u._id.toString()) || null
        }))
        .sort((a, b) => {
            const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bt - at;
        });

        res.status(200).json(enriched);
    } catch (error) {
        console.log("Error in getUsersForSidebar controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteForEveryone } = req.body || {};
        const userId = req.user._id;

        console.log(`Delete request for message ${messageId} from user ${userId}, forEveryone: ${deleteForEveryone}`);

        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
            console.log('Message not found');
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        // Convert to string for comparison
        const userIdStr = userId.toString();
        const senderIdStr = message.senderId.toString();
        const receiverIdStr = message.receiverId.toString();

        // Check if user is either sender or receiver
        if (userIdStr !== senderIdStr && userIdStr !== receiverIdStr) {
            console.log('Not authorized to delete this message');
            return res.status(403).json({ success: false, message: "Not authorized to delete this message" });
        }

        // If delete for everyone is requested and user is either participant
        if (deleteForEveryone && (userIdStr === senderIdStr || userIdStr === receiverIdStr)) {
            console.log('Deleting message for everyone (DB + assets)');

            // Best-effort delete of Cloudinary assets
            try {
                if (message.imagePublicId) {
                    try {
                        await cloudinary.uploader.destroy(message.imagePublicId, { resource_type: 'image' });
                        console.log('Deleted Cloudinary image:', message.imagePublicId);
                    } catch (e) { console.warn('Cloudinary image delete failed:', e?.message); }
                }
                if (message.audioPublicId || (message.audio && message.audio.includes('/upload/'))) {
                    const publicId = message.audioPublicId || (message.audio?.split('/upload/')[1]?.split('.')[0]);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }); // audio is under video type
                            console.log('Deleted Cloudinary audio:', publicId);
                        } catch (e) { console.warn('Cloudinary audio delete failed:', e?.message); }
                    }
                }
                if (message.filePublicId) {
                    try {
                        await cloudinary.uploader.destroy(message.filePublicId, { resource_type: 'video' });
                        console.log('Deleted Cloudinary file(video):', message.filePublicId);
                    } catch (e) { console.warn('Cloudinary file delete failed:', e?.message); }
                }
            } catch (assetErr) {
                console.warn('Asset cleanup encountered issues:', assetErr?.message);
            }

            // Delete local files if any
            if (message.file && message.file.startsWith('/uploads/')) {
                try {
                    await deleteFile(message.file);
                    console.log('Deleted local file:', message.file);
                } catch (fileError) {
                    console.warn('Local file delete failed:', fileError?.message);
                }
            }

            // Remove the message completely from DB
            await Message.findByIdAndDelete(messageId);

            // Notify the other participant(s)
            const otherUserSocketId1 = getReceiverSocketId(receiverIdStr);
            const otherUserSocketId2 = getReceiverSocketId(senderIdStr);
            if (otherUserSocketId1) {
                io.to(otherUserSocketId1).emit("messageDeleted", {
                    messageId: message._id.toString(),
                    deletedForEveryone: true
                });
            }
            if (otherUserSocketId2) {
                io.to(otherUserSocketId2).emit("messageDeleted", {
                    messageId: message._id.toString(),
                    deletedForEveryone: true
                });
            }

            console.log('Message deleted for everyone (DB)');
            return res.status(200).json({ 
                success: true,
                message: "Message deleted for everyone",
                deletedForEveryone: true
            });
        }

        // For delete for me or if not the sender
        // If the other user has already deleted the message, remove it completely
        if (message.deleted && !message.deletedBy.some(id => id.toString() === userIdStr)) {
            console.log('Both users deleted the message, removing completely');
            await Message.findByIdAndDelete(messageId);
            
            // Notify the other user
            const otherUserId = userIdStr === senderIdStr ? receiverIdStr : senderIdStr;
            const otherUserSocketId = getReceiverSocketId(otherUserId);
            if (otherUserSocketId) {
                io.to(otherUserSocketId).emit("messageDeleted", {
                    messageId: message._id.toString(),
                    deletedForEveryone: true
                });
            }
            
            return res.status(200).json({ 
                success: true,
                message: "Message deleted successfully",
                deletedForEveryone: true
            });
        }

        // For delete for me, just add user to deletedBy array
        console.log('Adding user to deletedBy array');
        
        // Ensure deletedBy is an array
        if (!message.deletedBy) {
            message.deletedBy = [];
        }
        
        // Add user to deletedBy if not already present
        if (!message.deletedBy.some(id => id.toString() === userIdStr)) {
            message.deletedBy.push(userId);
            await message.save();
        }
        
        // Only mark as deleted if all participants have deleted it
        if (message.deletedBy.length >= 2) {
            console.log('All participants have deleted the message, marking as deleted');
            message.deleted = true;
            await message.save();
        }

        // Emit socket event to notify the other user if they're online
        const otherUserId = userIdStr === senderIdStr ? receiverIdStr : senderIdStr;
        const receiverSocketId = getReceiverSocketId(otherUserId);
        console.log(`Notifying other user ${otherUserId} with socket ${receiverSocketId}`);
        
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageDeleted", {
                messageId: message._id.toString(),
                deletedForEveryone: false
            });
        }

        console.log('Message deleted for user');
        res.status(200).json({ 
            success: true,
            message: "Message deleted successfully",
            deletedForEveryone: false
        });
    } catch (error) {
        console.log("Error in deleteMessage controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const forwardMessage = async (req, res) => {
    try {
        const { messageId, recipients } = req.body;
        const userId = req.user._id;

        if (!messageId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: "Invalid request. Message ID and recipients are required." });
        }

        // Find the original message
        const originalMessage = await Message.findById(messageId);
        if (!originalMessage) {
            return res.status(404).json({ error: "Original message not found" });
        }

        // Verify user has access to this message
        if (originalMessage.senderId.toString() !== userId.toString() && 
            originalMessage.receiverId.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Unauthorized to forward this message" });
        }

        const forwardedMessages = [];

        // Create forwarded message for each recipient
        for (const recipientId of recipients) {
            // Verify recipient exists
            const recipient = await User.findById(recipientId);
            if (!recipient) {
                console.log(`Recipient ${recipientId} not found, skipping...`);
                continue;
            }

            // Check if current user has blocked recipient or vice versa
            const currentUser = await User.findById(userId);
            if (currentUser.blockedUsers && currentUser.blockedUsers.includes(recipientId)) {
                console.log(`User has blocked ${recipientId}, skipping...`);
                continue;
            }
            if (recipient.blockedUsers && recipient.blockedUsers.includes(userId.toString())) {
                console.log(`User is blocked by ${recipientId}, skipping...`);
                continue;
            }

            // Create new message document
            const newMessage = new Message({
                senderId: userId,
                receiverId: recipientId,
                text: originalMessage.text, // Already encrypted
                image: originalMessage.image,
                imagePublicId: originalMessage.imagePublicId,
                imageIv: originalMessage.imageIv,
                imageSalt: originalMessage.imageSalt,
                imageMimeType: originalMessage.imageMimeType,
                imageAuthTag: originalMessage.imageAuthTag,
                audio: originalMessage.audio,
                audioDuration: originalMessage.audioDuration,
                file: originalMessage.file,
                fileType: originalMessage.fileType,
                fileName: originalMessage.fileName,
                filePublicId: originalMessage.filePublicId,
                isForwarded: true,
                originalSender: originalMessage.isForwarded ? originalMessage.originalSender : originalMessage.senderId
            });

            await newMessage.save();
            forwardedMessages.push(newMessage);

            // Emit socket event to recipient
            const receiverSocketId = getReceiverSocketId(recipientId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
        }

        res.status(200).json({
            success: true,
            message: `Message forwarded to ${forwardedMessages.length} recipient(s)`,
            forwardedMessages
        });

    } catch (error) {
        console.log("Error in forwardMessage controller:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Chat pin functions
export const pinChat = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        // Validate that the user to pin exists
        const userToPin = await User.findById(userId);
        if (!userToPin) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Don't allow pinning yourself
        if (userId === currentUserId.toString()) {
            return res.status(400).json({ message: 'Cannot pin yourself' });
        }

        // Add user to pinned chats array if not already pinned
        const currentUser = await User.findById(currentUserId);
        if (!currentUser.pinnedChats.includes(userId)) {
            currentUser.pinnedChats.push(userId);
            await currentUser.save();
        }

        res.status(200).json({ message: 'Chat pinned successfully' });
    } catch (error) {
        console.error('Error pinning chat:', error);
        res.status(500).json({ message: 'Failed to pin chat' });
    }
};

export const unpinChat = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        // Remove user from pinned chats array
        const currentUser = await User.findById(currentUserId);
        currentUser.pinnedChats = currentUser.pinnedChats.filter(
            pinnedId => pinnedId.toString() !== userId
        );
        await currentUser.save();

        res.status(200).json({ message: 'Chat unpinned successfully' });
    } catch (error) {
        console.error('Error unpinning chat:', error);
        res.status(500).json({ message: 'Failed to unpin chat' });
    }
};

export const getPinnedChats = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        
        // Get user with pinned chats populated
        const currentUser = await User.findById(currentUserId).populate('pinnedChats', 'fullName username profilePic avatar');
        
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return just the array of pinned user IDs
        const pinnedChatIds = currentUser.pinnedChats.map(user => user._id.toString());
        res.status(200).json(pinnedChatIds);
    } catch (error) {
        console.error('Error getting pinned chats:', error);
        res.status(500).json({ message: 'Failed to get pinned chats' });
    }
};