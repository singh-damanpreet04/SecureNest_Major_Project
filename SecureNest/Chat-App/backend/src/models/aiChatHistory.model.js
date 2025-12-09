import mongoose from 'mongoose';

const AIChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true }, // encrypted
  timestamp: { type: Date, default: Date.now }
});

const AIChatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages: [AIChatMessageSchema]
});

export default mongoose.model('AIChatHistory', AIChatHistorySchema);
