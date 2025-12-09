import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { formatDistanceToNow } from "date-fns";

export const useChatStore = create((set, get) => ({
  messages: [],
  scheduledMessages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isScheduling: false,

  // Existing methods...
  getUsers: async () => {
    console.log('Fetching users...');
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      console.log('Users response:', res.data);
      set({ users: res.data });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      
      // Filter out messages from blocked users
      const { user } = useAuthStore.getState();
      const filteredMessages = res.data.filter(message => {
        return !user?.blockedUsers?.includes(message.senderId);
      });
      
      set({ messages: filteredMessages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load messages');
      set({ messages: [] });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Schedule a message
  scheduleMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      set({ isScheduling: true });
      const res = await axiosInstance.post('/scheduled-messages', {
        ...messageData,
        receiverUsername: selectedUser?.username
      });
      
      // Update scheduled messages list
      const newScheduledMessage = res.data;
      set(state => ({
        scheduledMessages: [...state.scheduledMessages, newScheduledMessage]
      }));
      
      toast.success('Message scheduled successfully');
      return newScheduledMessage;
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule message');
      throw error;
    } finally {
      set({ isScheduling: false });
    }
  },
  
  // Get scheduled messages
  getScheduledMessages: async () => {
    try {
      const res = await axiosInstance.get('/scheduled-messages');
      set({ scheduledMessages: res.data });
      return res.data;
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load scheduled messages');
      throw error;
    }
  },
  
  // Cancel a scheduled message
  cancelScheduledMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/scheduled-messages/${messageId}`);
      set(state => ({
        scheduledMessages: state.scheduledMessages.filter(msg => msg._id !== messageId)
      }));
      toast.success('Scheduled message cancelled');
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel scheduled message');
      throw error;
    }
  },
  
  // Format time remaining for scheduled messages
  formatTimeRemaining: (scheduledTime) => {
    try {
      return formatDistanceToNow(new Date(scheduledTime), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Scheduled';
    }
  },
  
  // Other existing methods...
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      console.log('Sending message with data:', {
        text: messageData.text ? 'text present' : 'no text',
        hasImage: !!messageData.image,
        hasAudio: !!messageData.audio,
        audioDuration: messageData.audioDuration
      });

      const response = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`, 
        messageData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send message';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
  
  // ... (other existing methods like subscribeToMessages, unsubscribeFromMessages, etc.)
  
  handleMessageDeleted: (data) => {
    try {
      const { messageId, deletedForEveryone } = data || {};
      console.log('Handling message deleted event:', { messageId, deletedForEveryone });
      
      if (!messageId) {
        console.error('Invalid messageDeleted event data:', data);
        return;
      }
      
      set(state => {
        // If the message was deleted for everyone, remove it completely
        if (deletedForEveryone) {
          console.log('Removing message for everyone:', messageId);
          return {
            ...state,
            messages: state.messages.filter(msg => msg._id !== messageId)
          };
        }
        
        // For delete for me, we don't update the UI here as the sender's delete
        // should not affect the receiver's UI. The receiver will only see the message
        // marked as deleted if it's their own delete action.
        console.log('Message deleted by other user, no UI update needed');
        return state;
      });
    } catch (error) {
      console.error('Error in handleMessageDeleted:', error);
    }
  }
}));
