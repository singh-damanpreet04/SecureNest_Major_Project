// ai.controller.js
// Controller for handling AI chat requests
import axios from 'axios';
import AIChatHistory from '../models/aiChatHistory.model.js';
import { encrypt, decrypt } from '../lib/aiCrypto.js';

const OLLAMA_API_URL = 'http://localhost:11434/api/chat';

// POST /api/ai/message
export async function sendAIMessage(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Use Gemini API instead of Ollama
    // Call Ollama's local Llama 3 model
    // Optimized system prompt for clarity, bullet/numbered lists, and formatting
    const systemPrompt = `You are a helpful assistant. Always answer in a clear, concise, and friendly way. If the answer has multiple points, use bullet points or numbered lists, and put each point on a new line. Make your response attractive and easy to read for a chat interface. Use simple language.`;

    // Use streaming from Ollama
    // Use last 4 chat turns for context (user+assistant)
    let contextMessages = [];
    if (Array.isArray(req.body.history) && req.body.history.length > 0) {
      // Only keep the last 4 messages
      contextMessages = req.body.history.slice(-4);
    }
    const ollamaRes = await axios({
      method: 'post',
      url: OLLAMA_API_URL,
      data: {
        model: "dolphin-mistral",
        messages: [
          { role: "system", content: systemPrompt },
          ...contextMessages,
          { role: "user", content: message },
        ],
        stream: true
      },
      responseType: 'stream',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Stream response to frontend, collecting for history
    let aiReply = '';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    ollamaRes.data.on('data', (chunk) => {
      const str = chunk.toString();
      try {
        // Ollama streams JSON objects per chunk
        const data = JSON.parse(str);
        if (data.message && data.message.content) {
          aiReply += data.message.content;
          res.write(data.message.content);
        }
      } catch (e) {
        // Ignore parse errors for incomplete chunks
      }
    });
    ollamaRes.data.on('end', async () => {
      // Save user and AI message to encrypted history
      const userId = req.user?._id || req.body.userId;
      if (userId && aiReply) {
        const encryptedUserMsg = encrypt(message);
        const encryptedAIReply = encrypt(aiReply);
        let history = await AIChatHistory.findOne({ userId });
        if (!history) {
          history = new AIChatHistory({ userId, messages: [] });
        }
        history.messages.push({ role: 'user', content: encryptedUserMsg });
        history.messages.push({ role: 'assistant', content: encryptedAIReply });
        await history.save();
      }
      res.end();
    });
    ollamaRes.data.on('error', (err) => {
      res.write('Sorry, I could not process your request.');
      res.end();
    });
  } catch (error) {
    console.error('AI API error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to get AI response.' });
  }
}

// GET /api/ai/history
export async function getAIHistory(req, res) {
  try {
    // Try to get userId from req.user, then from query param
    const userId = req.user?._id || req.query.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated (userId missing).' });
    }
    const history = await AIChatHistory.findOne({ userId });
    if (!history || !history.messages.length) {
      return res.json({ messages: [] });
    }
    // Decrypt all messages
    const decryptedMessages = history.messages.map(msg => ({
      role: msg.role,
      content: decrypt(msg.content),
      timestamp: msg.timestamp
    }));
    return res.json({ messages: decryptedMessages });
  } catch (error) {
    console.error('AI History error:', error);
    return res.status(500).json({ error: 'Failed to fetch AI chat history.' });
  }
}
