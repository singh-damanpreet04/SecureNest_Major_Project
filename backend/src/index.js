import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import scheduledMessageRoutes from './routes/scheduledMessage.route.js';
import aiRoutes from './routes/ai.route.js';
import fakecheckRoutes from './routes/fakecheck.route.js';
import userRoutes from './routes/user.routes.js';
import hashtagRoutes from './routes/hashtag.route.js';
import chatLockRoutes from './routes/chatlock.route.js';
import { startScheduledMessagesWorker, stopScheduledMessagesWorker } from './controllers/scheduledMessage.controller.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer } from 'http';
import { io, app, server } from './lib/socket.js';

// Initialize environment variables and database
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5003;

// Serve static files from the uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('Serving static files from:', uploadsPath);

app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
        // Set proper content-type for PDF files
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filePath) + '"');
        } else {
            // Force download for other file types
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// Increase JSON and URL-encoded payload size limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/scheduled-messages', scheduledMessageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/fakecheck', fakecheckRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hashtag', hashtagRoutes);
app.use('/api/chatlock', chatLockRoutes);

// Start the server
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        
        // Start the server
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            
            // Start the scheduled messages worker
            startScheduledMessagesWorker();
            
            // Handle graceful shutdown
            process.on('SIGTERM', () => {
                console.log('SIGTERM received. Shutting down gracefully...');
                stopScheduledMessagesWorker();
                server.close(() => {
                    console.log('Server closed');
                    process.exit(0);
                });
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();