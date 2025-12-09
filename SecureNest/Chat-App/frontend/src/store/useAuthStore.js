import { create } from "zustand";
import axios from "axios";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

// Note: We'll pass the message deletion handler as a callback to avoid circular dependencies

const BASE_URL = "http://localhost:5003";
export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigninUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,
    setNotificationHandler: () => console.log('🚀 setNotificationHandler called before socket connection'), // Initialize as no-op function
    setMessageDeletedHandler: () => console.log('🚀 setMessageDeletedHandler called before socket connection'), // Initialize as no-op function
    getNotificationHandler: () => null, // Initialize as no-op function
    
    checkAuth: async() => {
        try {
            set({ isCheckingAuth: true });
            
            // First, try to get the current user
            const response = await axios.get('http://localhost:5003/api/auth/check', {
                withCredentials: true,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.data?.success) {
                // Update the token if we got a new one
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                
                // Set the user data
                set({ 
                    authUser: response.data.user,
                    isCheckingAuth: false 
                });
                
                // Connect socket after successful auth
                setTimeout(() => get().connectSocket(), 0);
            } else {
                // No valid session
                localStorage.removeItem('token');
                set({ 
                    authUser: null, 
                    isCheckingAuth: false 
                });
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
            }
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },
    
    login: async (credentials) => {
        try {
            set({ isLoggingIn: true });
            
            // Clear any existing tokens
            localStorage.removeItem('token');
            
            // Make the login request
            const response = await axios.post(
                'http://localhost:5003/api/auth/login', 
                credentials, 
                { 
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // The server should return the user data and token
            if (response.data.success && response.data.user) {
                // The token is now in an HTTP-only cookie, but we also store it in localStorage for the frontend
                // The server will handle refreshing it via the cookie
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                
                // Ensure createdAt exists, if not add current timestamp
                const userData = response.data.user;
                if (!userData.createdAt) {
                    userData.createdAt = new Date().toISOString();
                }
                
                // Set the user data
                set({ 
                    authUser: userData,
                    isLoggingIn: false 
                });
                
                // Connect socket after successful login
                setTimeout(() => get().connectSocket(), 0);
                
                return { success: true };
            }
            
            // If we get here, login failed
            return { 
                success: false, 
                message: response.data?.message || 'Login failed' 
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            set({ isLoggingIn: false });
        }
    },
    
    signup: async (data) => {
        try {
            console.log('Starting signup with data:', { ...data, password: '***' });
            set({ isSigninUp: true });
            const response = await axiosInstance.post("/auth/signup", data, {
                withCredentials: true // Ensure cookies are sent/received
            });
            console.log('Signup successful, response:', response.data);
            
            // Save token if it's in the response
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
            
            // Set the authUser with the created user data including createdAt
            if (response.data.user) {
                const userData = response.data.user;
                // Only set createdAt if it doesn't exist in the response
                if (!userData.createdAt) {
                    userData.createdAt = new Date().toISOString();
                }
                set({ authUser: userData });
                get().connectSocket();
            }
            
            return { 
                success: true, 
                data: response.data,
                message: 'Signup successful!'
            };
        } catch (error) {
            console.error('Signup error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            // Throw a more descriptive error
            const errorMessage = error.response?.data?.message || 'Failed to create account';
            throw new Error(errorMessage);
        } finally {
            set({ isSigninUp: false });
        }
    },
    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const response = await axiosInstance.put("/auth/update-profile", data);
            const updatedUser = response.data.user;
            
            // Update the authUser in the store
            set((state) => ({
                authUser: {
                    ...state.authUser,
                    ...updatedUser
                }
            }));
            
            toast.success(response.data.message || "Profile updated successfully!");
            return { success: true, user: updatedUser };
        } catch (error) {
            console.error('Update profile error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to update profile';
            toast.error(errorMessage);
            throw error;
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser) return;
        
        // Disconnect existing socket if any
        const currentSocket = get().socket;
        if (currentSocket) {
            console.log('Disconnecting existing socket...');
            currentSocket.disconnect();
        }
        
        const socket = io(BASE_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket'],
            upgrade: false
        });
        
        // Connection established
        socket.on("connect", () => {
            console.log("Socket connected, adding user:", authUser._id);
            socket.emit("addUser", authUser._id);
        });
        
        // Handle online users list
        socket.on("getOnlineUsers", (users) => {
            console.log('Online users updated:', users);
            set({ onlineUsers: users });
        });
        
        // Handle disconnection
        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected, reason:", reason);
            if (reason === 'io server disconnect') {
                // Reconnect if server disconnects us
                console.log('Server disconnected, attempting to reconnect...');
                socket.connect();
            }
        });
        
        // Handle connection errors
        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error.message);
            // Try to reconnect after delay
            setTimeout(() => {
                console.log('Attempting to reconnect socket...');
                socket.connect();
            }, 5000);
        });
        
        // Handle successful reconnection
        socket.io.on("reconnect", (attempt) => {
            console.log(`Socket reconnected after ${attempt} attempts`);
            if (authUser?._id) {
                console.log('Re-adding user after reconnection:', authUser._id);
                socket.emit("addUser", authUser._id);
            }
        });
        
        socket.io.on("reconnect_attempt", () => {
            console.log('Attempting to reconnect socket...');
        });

        // Listen for message deletion events
        // The actual handler will be set by the Chat component
        // using the setMessageDeletedHandler function
        let messageDeletedHandler = null;
        let notificationHandler = null;
        
        // Store handlers in the store state for access from other stores
        const storeHandlers = {
            messageDeletedHandler: null,
            notificationHandler: null
        };
        
        socket.on("messageDeleted", (data) => {
            console.log('Received messageDeleted event:', data);
            if (messageDeletedHandler && typeof messageDeletedHandler === 'function') {
                messageDeletedHandler(data);
            } else {
                console.warn('No message deleted handler registered');
            }
        });

        // Listen for new messages for notifications
        socket.on("newMessage", (data) => {
            console.log('🚀 ===== SOCKET EVENT RECEIVED =====');
            console.log('🚀 Received newMessage event for notification:', data);
            console.log('🚀 Notification handler exists:', !!notificationHandler);
            console.log('🚀 Notification handler type:', typeof notificationHandler);
            console.log('🚀 Socket ID:', socket.id);
            console.log('🚀 Event timestamp:', new Date().toISOString());
            
            if (notificationHandler && typeof notificationHandler === 'function') {
                console.log('🚀 Calling notification handler...');
                try {
                    notificationHandler(data);
                    console.log('🚀 Notification handler called successfully');
                } catch (error) {
                    console.error('🚀 Error in notification handler:', error);
                }
            } else {
                console.warn('🚀 No notification handler registered - this is the problem!');
                console.warn('🚀 Handler value:', notificationHandler);
            }
        });
        
        // Add methods to set handlers
        set({ 
            setMessageDeletedHandler: (handler) => {
                if (typeof handler === 'function') {
                    messageDeletedHandler = handler;
                    console.log('Message deleted handler registered');
                }
            },
            setNotificationHandler: (handler) => {
                console.log('🚀 setNotificationHandler called with:', typeof handler);
                if (typeof handler === 'function') {
                    notificationHandler = handler;
                    storeHandlers.notificationHandler = handler;
                    console.log('🚀 Notification handler registered successfully');
                } else if (handler === null) {
                    notificationHandler = null;
                    storeHandlers.notificationHandler = null;
                    console.log('🚀 Notification handler cleared');
                } else {
                    console.warn('🚀 Invalid notification handler type:', typeof handler);
                }
            },
            getNotificationHandler: () => storeHandlers.notificationHandler
        });
        
        set({ socket });
        return socket;
    },
    disconnectSocket: () => {
        const { socket, authUser } = get();
        if (socket) {
            console.log('Disconnecting socket...');
            // Notify server about manual disconnection
            if (authUser?._id) {
                console.log('Emitting disconnectUser for user:', authUser._id);
                socket.emit('disconnectUser', authUser._id);
            }
            // Clean up all event listeners
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('getOnlineUsers');
            // Disconnect the socket
            socket.disconnect();
            // Clear socket and online users
            set({ socket: null, onlineUsers: [] });
        }
    },
    
    logout: async () => {
        try {
            // Clear the auth state first
            set({ 
                authUser: null,
                isAuthenticated: false,
                onlineUsers: []
            });
            
            // Clear local storage
            localStorage.removeItem('token');
            
            // Call the logout endpoint to clear server-side session
            try {
                await axios.post(
                    'http://localhost:5003/api/auth/logout',
                    {},
                    { 
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } catch (error) {
                console.error('Logout error:', error);
                // Continue with client-side cleanup even if server logout fails
            }
            
            // Clear any remaining cookies
            document.cookie = 'jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            
            // Disconnect socket if connected
            if (get().socket) {
                get().disconnectSocket();
            }
            
            // Redirect to login page
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            // Even if there's an error, we still want to clear the user
            set({ authUser: null, isAuthenticated: false });
            throw error;
        }
    },

    // Request account deletion (send OTP)
    requestAccountDeletion: async (password) => {
        try {
            const response = await axiosInstance.post('/auth/request-account-deletion', { password });
            toast.success(response.data.message || 'OTP sent to your email');
            return { success: true };
        } catch (error) {
            console.error('Error requesting account deletion:', error);
            toast.error(error.response?.data?.error || 'Failed to request account deletion');
            return { success: false, error: error.response?.data?.error };
        }
    },

    // Confirm account deletion with OTP
    confirmAccountDeletion: async (otp) => {
        try {
            const response = await axiosInstance.post('/auth/confirm-account-deletion', { otp });
            toast.success(response.data.message || 'Account deleted successfully');
            
            // Clear auth state and redirect to login with deletion message
            set({ authUser: null, isAuthenticated: false });
            localStorage.removeItem('authUser');
            
            // Redirect to login with deletion message
            window.location.href = '/login?accountDeleted=true';
            
            return { success: true };
        } catch (error) {
            console.error('Error confirming account deletion:', error);
            toast.error(error.response?.data?.error || 'Failed to delete account');
            return { success: false, error: error.response?.data?.error };
        }
    }
}));
