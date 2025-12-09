import ScheduledMessage from '../models/scheduledMessage.model.js';
import User from '../models/user.models.js';
import { sendMessage } from './message.controller.js';
import { getReceiverSocketId, io } from '../lib/socket.js';

// Schedule a new message
export const scheduleMessage = async (req, res) => {
    try {
        const { receiverUsername, message, scheduledTime, messageType = 'text', fileUrl = '', fileName = '', filePublicId = '' } = req.body;
        const senderId = req.user._id;

        // Validate scheduled time (must be in future)
        const scheduledDateTime = new Date(scheduledTime);
        if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime <= new Date()) {
            return res.status(400).json({ message: 'Please provide a valid future date and time' });
        }

        // Check if receiver exists
        const receiver = await User.findOne({ username: receiverUsername.toLowerCase() });
        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        // Create scheduled message
        const scheduledMessage = new ScheduledMessage({
            senderId,
            receiverUsername: receiverUsername.toLowerCase(),
            message,
            scheduledTime: scheduledDateTime,
            messageType,
            fileUrl,
            fileName,
            filePublicId
        });

        await scheduledMessage.save();

        res.status(201).json({
            message: 'Message scheduled successfully',
            scheduledMessage
        });

    } catch (error) {
        console.error('Error scheduling message:', error);
        res.status(500).json({ message: 'Error scheduling message', error: error.message });
    }
};

// Get user's scheduled messages
export const getScheduledMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const messages = await ScheduledMessage.find({
            senderId: userId,
            status: { $in: ['scheduled', 'sending'] },
            scheduledTime: { $gte: new Date() }
        }).sort({ scheduledTime: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching scheduled messages:', error);
        res.status(500).json({ message: 'Error fetching scheduled messages', error: error.message });
    }
};

// Cancel a scheduled message
export const cancelScheduledMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const message = await ScheduledMessage.findOneAndUpdate(
            { _id: id, senderId: userId, status: 'scheduled' },
            { status: 'cancelled' },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ message: 'Scheduled message not found or already processed' });
        }

        res.status(200).json({ message: 'Scheduled message cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling scheduled message:', error);
        res.status(500).json({ message: 'Error cancelling scheduled message', error: error.message });
    }
};

// Worker function to process due messages
export const processScheduledMessages = async () => {
    try {
        const now = new Date();
        
        // Find messages that are due and not yet processed
        const messages = await ScheduledMessage.find({
            status: 'scheduled',
            scheduledTime: { $lte: now }
        });

        for (const message of messages) {
            try {
                // Mark as sending
                await ScheduledMessage.findByIdAndUpdate(message._id, { status: 'sending' });

                // Get receiver user
                const receiver = await User.findOne({ username: message.receiverUsername });
                if (!receiver) {
                    throw new Error('Receiver not found');
                }

                // Create a proper request-like object for sendMessage
                const req = {
                    params: { id: receiver._id.toString() }, // receiverId in URL params
                    body: {
                        text: message.message, // Using 'text' instead of 'message' to match the controller
                        messageType: message.messageType,
                        fileUrl: message.fileUrl,
                        fileName: message.fileName,
                        filePublicId: message.filePublicId
                    },
                    user: { _id: message.senderId.toString() }
                };

                // Create a mock response object
                const res = {
                    status: (code) => ({
                        json: (data) => {
                            if (code >= 400) {
                                throw new Error(data.message || 'Failed to send message');
                            }
                            return data;
                        }
                    })
                };

                // Call sendMessage with the proper request and response objects
                await sendMessage(req, res);

                // Mark as sent
                await ScheduledMessage.findByIdAndUpdate(message._id, { 
                    status: 'sent',
                    sentAt: new Date()
                });

            } catch (error) {
                console.error(`Error processing scheduled message ${message._id}:`, error);
                await ScheduledMessage.findByIdAndUpdate(message._id, { 
                    status: 'failed',
                    error: error.message
                });
            }
        }
    } catch (error) {
        console.error('Error in scheduled messages worker:', error);
    }
};

// Start the worker to check for due messages every minute
let workerInterval;

export const startScheduledMessagesWorker = () => {
    // Run immediately on start
    processScheduledMessages();
    
    // Then run every minute
    workerInterval = setInterval(processScheduledMessages, 60 * 1000);
    console.log('Scheduled messages worker started');
};

export const stopScheduledMessagesWorker = () => {
    if (workerInterval) {
        clearInterval(workerInterval);
        console.log('Scheduled messages worker stopped');
    }
};
