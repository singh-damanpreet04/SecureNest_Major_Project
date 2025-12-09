import { Server } from "socket.io";
import http from "http";
import express from "express";
import { create } from "domain";

const app = express();
const server = http.createServer(app);

const io = new Server(server,{
    cors: {
        origin: ["http://localhost:5173"],
    },
});

// to store online users
const userSocketMap = {}
export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  
  // Listen for addUser event
  socket.on("addUser", (userId) => {
        if (userId) {
            console.log(`User ${userId} connected with socket ${socket.id}`);
            userSocketMap[userId] = socket.id;
            // Emit to all clients when a new user connects
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });

    // Handle manual disconnection
  socket.on("disconnectUser", (userId) => {
        console.log(`Manual disconnection for user ${userId}`);
        if (userId && userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });

    // Join a chat room for per-chat events (typing, etc.)
    // payload: { roomId, userId }
    socket.on("join", ({ roomId, userId }) => {
        try {
            if (!roomId) return;
            socket.join(roomId);
            socket.data.userId = userId || socket.data.userId;
            // Optionally notify others in room that user joined
            // socket.to(roomId).emit("roomUserJoined", { roomId, userId: socket.data.userId });
        } catch (e) {
            console.error('Error joining room:', e);
        }
    });

    // Leave room
    socket.on("leave", ({ roomId }) => {
        try {
            if (!roomId) return;
            socket.leave(roomId);
        } catch (e) {
            console.error('Error leaving room:', e);
        }
    });

    // Typing indicator events (per room)
    // payload: { roomId, senderId }
    socket.on("typing", ({ roomId, senderId }) => {
        if (!roomId) return;
        socket.to(roomId).emit("typing", { roomId, senderId });
    });

    socket.on("stopTyping", ({ roomId, senderId }) => {
        if (!roomId) return;
        socket.to(roomId).emit("stopTyping", { roomId, senderId });
    });
});
export { io, app, server};