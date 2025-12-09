import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotification } from '../contexts/NotificationContext';
import { useChatStore } from '../store/useChatStore';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-secure-key-here";

// Decrypt message text for notification display
const decryptMessage = (encryptedText) => {
    try {
        if (!encryptedText) return '';
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8) || encryptedText;
    } catch (error) {
        console.warn('Failed to decrypt message for notification:', error);
        return 'New message'; // Fallback text
    }
};

export const useNotificationHandler = () => {
    const { setNotificationHandler, authUser } = useAuthStore();
    const { showNotification } = useNotification();
    const { selectedUser, users, getMessages, getUsers } = useChatStore();

    useEffect(() => {
        if (!authUser) {
            console.log('🔔 No auth user, skipping notification handler setup');
            return;
        }

        if (!setNotificationHandler) {
            console.log('🔔 setNotificationHandler not available yet, skipping...');
            return;
        }

        // Check if users are loaded (but don't fetch to avoid sidebar refresh)
        if (!users || users.length === 0) {
            console.log('🔔 Users not loaded, will handle notifications without user list');
        }

        const handleNewMessage = (data) => {
            console.log('🔔 ===== NEW MESSAGE RECEIVED =====');
            console.log('🔔 Processing new message for notification:', data);
            console.log('🔔 Auth user ID:', authUser._id);
            console.log('🔔 Message sender ID:', data.senderId);
            console.log('🔔 Message text:', data.text);
            
            // Get current selected user from store (fresh value)
            let currentStore, currentSelectedUser;
            try {
                currentStore = useChatStore.getState();
                currentSelectedUser = currentStore.selectedUser;
                console.log('🔔 Currently selected user (fresh):', currentSelectedUser?._id);
                console.log('🔔 Current store state keys:', Object.keys(currentStore));
            } catch (error) {
                console.error('🔔 Error getting store state:', error);
                currentSelectedUser = selectedUser; // fallback to hook value
            }
            
            // Don't show notification for own messages
            if (data.senderId === authUser._id) {
                console.log('🔔 Ignoring own message');
                return;
            }

            // Don't show notification if currently chatting with the sender
            console.log('🔔 Checking if currently chatting with sender...');
            console.log('🔔 Selected user (fresh):', currentSelectedUser);
            console.log('🔔 Selected user ID (fresh):', currentSelectedUser?._id);
            console.log('🔔 Message sender ID:', data.senderId);
            
            if (currentSelectedUser && currentSelectedUser._id === data.senderId) {
                console.log('🔔 Currently chatting with sender, skipping notification');
                // Still refresh messages to show the new message in chat
                getMessages(currentSelectedUser._id);
                return;
            }
            
            console.log('🔔 Not currently chatting with sender, will show notification');

            console.log('🔔 Should show notification - proceeding...');

            // Find sender information - get fresh users from store
            const currentUsers = currentStore?.users || users || [];
            let sender = currentUsers.find(user => user._id === data.senderId);
            console.log('🔔 Looking for sender in users array:', currentUsers.length, 'users');
            console.log('🔔 All user IDs:', currentUsers.map(u => u._id));
            
            // If not found in users array, try to get from the message data itself
            if (!sender && data.senderId) {
                console.log('🔔 Sender not found in users array, checking message data...');
                // Sometimes the sender info might be in the message data
                if (data.senderName || data.senderFullName || data.senderUsername) {
                    sender = {
                        _id: data.senderId,
                        fullName: data.senderFullName || data.senderName,
                        username: data.senderUsername || data.senderName
                    };
                }
            }
            
            // If still not found, use fallback name without refreshing users
            if (!sender) {
                console.log('🔔 Sender still not found, using fallback name');
            }
            
            const senderName = sender?.fullName || sender?.username || `User ${data.senderId?.slice(-4) || 'Unknown'}`;
            console.log('🔔 Sender found:', sender);
            console.log('🔔 Sender name:', senderName);

            // Decrypt message text for notification
            const decryptedText = decryptMessage(data.text);
            console.log('🔔 Decrypted text:', decryptedText);
            
            // Show notification
            console.log('🔔 Calling showNotification...');
            showNotification({
                id: `msg-${data._id || Date.now()}`,
                senderName,
                messageText: decryptedText || 'New message',
                senderId: data.senderId,
                timestamp: new Date(data.createdAt || Date.now()),
                onClick: (notification) => {
                    console.log('🔔 Notification clicked:', notification);
                    // The NotificationContainer will handle opening the chat
                }
            });
            console.log('🔔 showNotification called successfully');
        };

        // Register the notification handler
        console.log('🔔 Registering notification handler for user:', authUser._id);
        try {
            setNotificationHandler(handleNewMessage);
            console.log('🔔 Notification handler registered successfully');
        } catch (error) {
            console.error('🔔 Error registering notification handler:', error);
        }

        // Cleanup function
        return () => {
            console.log('🔔 Cleaning up notification handler');
            try {
                if (setNotificationHandler) {
                    setNotificationHandler(null);
                }
            } catch (error) {
                console.error('🔔 Error cleaning up notification handler:', error);
            }
        };
    }, [authUser, setNotificationHandler, showNotification, getMessages, getUsers]); // Removed selectedUser and users from deps to avoid re-registration
};

export default useNotificationHandler;
