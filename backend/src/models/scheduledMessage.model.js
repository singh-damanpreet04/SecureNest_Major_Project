import mongoose from 'mongoose';

const scheduledMessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverUsername: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    message: {
        type: String,
        required: true
    },
    scheduledTime: {
        type: Date,
        required: true,
        index: true // For faster querying of messages to be sent
    },
    status: {
        type: String,
        enum: ['scheduled', 'sending', 'sent', 'failed', 'cancelled'],
        default: 'scheduled'
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'pdf', 'audio'],
        default: 'text'
    },
    fileUrl: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    filePublicId: {
        type: String,
        default: ''
    },
    error: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for finding messages that need to be sent
scheduledMessageSchema.index({ 
    status: 1, 
    scheduledTime: 1 
});

const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledMessageSchema);

export default ScheduledMessage;
