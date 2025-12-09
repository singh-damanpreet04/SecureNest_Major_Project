import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text:{
        type: String,
    },
    image: {
        type: String,
    },
    // Encrypted image fields (new flow)
    imagePublicId: {
        type: String,
    },
    imageIv: {
        type: String,
    },
    imageSalt: {
        type: String,
    },
    imageMimeType: {
        type: String,
    },
    imageAuthTag: {
        type: String,
    },
    audio: {
        type: String,
    },
    audioDuration: {
        type: Number,
        default: 0
    },
    file: {
        type: String,
    },
    fileType: {
        type: String,
        enum: [null, 'video', 'pdf'],
        default: null
    },
    fileName: {
        type: String,
    },
    filePublicId: {
        type: String,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    deletedBy: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        default: []
    },
    isForwarded: {
        type: Boolean,
        default: false
    },
    originalSender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
},{ timestamps: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;