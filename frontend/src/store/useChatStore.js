import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
// Removed unused imports to satisfy ESLint

// In-memory dedupe for socket events (not persisted)
const __seenMessageIds = new Set();

export const useChatStore = create((set, get) => ({
  messages: [],
  scheduledMessages: [],
  users: [],
  // Unread counts per peerId (frontend-only badge like WhatsApp)
  unreadCounts: {}, // { [peerId]: number }
  // Pinned chats - store pinned user IDs in order of pinning
  pinnedChats: [], // Array of user IDs in pin order (first pinned = top)
  // Keep a reference to the currently bound socket listener to avoid duplicates
  messageListener: null,
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isScheduling: false,
  lockedInfo: {}, // { [peerId]: { locked: boolean, cooldownRemaining: number } }

  // Lock status helpers
  checkLockStatus: async (peerId) => {
    try {
      const res = await axiosInstance.get(`/chatlock/status/${peerId}`);
      set(state => ({ lockedInfo: { ...state.lockedInfo, [peerId]: res.data || { locked: false } } }));
      return res.data;
    } catch {
      // If endpoint not reachable, assume unlocked to avoid blocking existing flows
      const data = { locked: false };
      set(state => ({ lockedInfo: { ...state.lockedInfo, [peerId]: data } }));
      return data;
    }
  },
  verifyPinForChat: async (peerId, pin) => {
    try {
      await axiosInstance.post('/chatlock/verify', { peerId, pin }, {
        // Don't trigger auth refresh on 401
        _skipAuthRefresh: true
      });
      // On success, update lockedInfo to unlocked
      set(state => ({ lockedInfo: { ...state.lockedInfo, [peerId]: { locked: false, cooldownRemaining: 0 } } }));
      return { success: true };
    } catch (e) {
      const status = e.response?.status;
      const cooldownRemaining = e.response?.data?.cooldownRemaining || 0;
      const message = e.response?.data?.message || 'Invalid PIN';
      
      if (status === 429) {
        set(state => ({ lockedInfo: { ...state.lockedInfo, [peerId]: { locked: true, cooldownRemaining } } }));
        return { success: false, rateLimited: true, cooldownRemaining };
      }
      
      // Don't show error for 401 - let the login flow handle it
      if (status === 401) {
        return { success: false, message: 'Session expired. Please log in again.' };
      }
      
      // For 400 (bad request) or other errors, show the error message
      return { 
        success: false, 
        message: status === 400 ? 'Invalid PIN' : message 
      };
    }
  },
  lockChat: async (peerId, pin) => {
    try { 
      await axiosInstance.post('/chatlock/lock', { peerId, pin }); 
      toast.success('Chat locked');
    }
    catch (err) { 
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      if (code === 'NO_PIN') toast.error('Set a PIN first in Settings > PIN Management');
      else if (status === 400) toast.error('Invalid PIN');
      else toast.error(err?.response?.data?.message || 'Failed to lock chat');
    }
    finally { get().checkLockStatus(peerId); }
  },
  unlockChat: async (peerId, pin) => {
    try { 
      await axiosInstance.post('/chatlock/unlock', { peerId, pin }); 
      toast.success('Chat unlocked');
    }
    catch (err) { 
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      if (code === 'NO_PIN') toast.error('Set a PIN first in Settings > PIN Management');
      else if (status === 400) toast.error('Invalid PIN');
      else toast.error(err?.response?.data?.message || 'Failed to unlock chat');
    }
    finally { get().checkLockStatus(peerId); }
  },

  listLockedChats: async () => {
    try {
      const res = await axiosInstance.get('/chatlock/list');
      return res.data?.locked || [];
    } catch (e) {
      console.error('Failed to fetch locked chats', e);
      toast.error(e.response?.data?.message || 'Failed to load locked chats');
      return [];
    }
  },

  lockChatByUsername: async (username, pin) => {
    // Ensure users list available
    if (!get().users?.length) {
      await get().getUsers();
    }
    const user = get().users.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase());
    if (!user) {
      toast.error('User not found');
      return { success: false };
    }
    await get().lockChat(user._id, pin);
    return { success: true, peerId: user._id };
  },

  unlockChatByUsername: async (username, pin) => {
    if (!get().users?.length) {
      await get().getUsers();
    }
    const user = get().users.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase());
    if (!user) {
      toast.error('User not found');
      return { success: false };
    }
    await get().unlockChat(user._id, pin);
    return { success: true, peerId: user._id };
  },

  // Get all scheduled messages for the current user
  getScheduledMessages: async () => {
    try {
      const res = await axiosInstance.get('/scheduled-messages');
      // Update the store state with the fetched messages
      set({ scheduledMessages: res.data });
      return res.data;
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load scheduled messages');
      throw error;
    }
  },

  // Schedule a new message
  scheduleMessage: async (messageData) => {
    try {
      const res = await axiosInstance.post('/scheduled-messages', messageData);
      return res.data;
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule message');
      throw error;
    }
  },

  // Cancel a scheduled message
  cancelScheduledMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/scheduled-messages/${messageId}`);
      return res.data;
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel scheduled message');
      throw error;
    }
  },

  // Format time remaining for display with smooth updates
  formatTimeRemaining: (scheduledTime) => {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffInSeconds = Math.max(0, Math.floor((scheduled - now) / 1000));
    
    if (diffInSeconds <= 0) return 'Now';
    
    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  },

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

  getPinnedChats: async () => {
    try {
      console.log('Fetching pinned chats from server...');
      const res = await axiosInstance.get("/messages/pinned");
      console.log('Pinned chats response:', res.data);
      set({ pinnedChats: res.data || [] });
    } catch (error) {
      console.error('Error fetching pinned chats:', error);
      // Don't show error toast for this, it's not critical
    }
  },

  pinChat: async (userId) => {
    try {
      console.log('Pinning chat for user:', userId);
      await axiosInstance.post(`/messages/pin/${userId}`);
      console.log('Pin request successful, updating local state...');
      // Refresh pinned chats from server to ensure sync
      await get().getPinnedChats();
      toast.success('Chat pinned');
      return { success: true };
    } catch (error) {
      console.error('Error pinning chat:', error);
      toast.error(error.response?.data?.message || 'Failed to pin chat');
      return { success: false, message: error.response?.data?.message || 'Failed to pin chat' };
    }
  },

  unpinChat: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/pin/${userId}`);
      // Refresh pinned chats from server to ensure sync
      await get().getPinnedChats();
      toast.success('Chat unpinned');
      return { success: true };
    } catch (error) {
      console.error('Error unpinning chat:', error);
      toast.error(error.response?.data?.message || 'Failed to unpin chat');
      return { success: false, message: error.response?.data?.message || 'Failed to unpin chat' };
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      
      // Process messages from the server
      const processedMessages = res.data.map(message => ({
        ...message,
        // Ensure we have the text field
        text: message.text || '',
        // Handle file URLs consistently
        file: message.file?.url || message.fileUrl || message.file,
        // Determine file type
        fileType: message.fileType || 
                 (message.file?.type || '').split('/')[1] || 
                 (message.fileName?.endsWith('.pdf') ? 'pdf' : 'video'),
        // Get file name
        fileName: message.fileName || 
                 (message.file?.name || (typeof message.file === 'string' ? message.file : message.file?.url || '').split('/').pop() || '')
      }));
      
      // Filter out messages from blocked users (support authUser or user)
      const authState = useAuthStore.getState();
      const currentUserForFilter = authState?.authUser || authState?.user || {};
      const filteredMessages = processedMessages.filter(message => {
        const senderId = (message.senderId?._id || message.senderId)?.toString();
        return !currentUserForFilter?.blockedUsers?.includes?.(senderId);
      });
      
      set({ messages: filteredMessages });
      // Reset unread counter for this chat since user just viewed messages
      set(state => ({ unreadCounts: { ...state.unreadCounts, [userId]: 0 } }));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 423) {
        // Chat is locked; do not toast as error. Let UI prompt for PIN.
        set({ messages: [] });
        toast('This chat is locked. Enter your PIN to view messages.', { icon: '🔒' });
        return { locked: true };
      }
      console.error('Error fetching messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load messages');
      set({ messages: [] });
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      console.log('Sending message with data:', {
        text: messageData.text ? 'text present' : 'no text',
        hasImage: !!messageData.image,
        hasAudio: !!messageData.audio,
        audioDuration: messageData.audioDuration
      });

      // Send the message data as-is, the backend will handle encryption
      const response = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`, 
        messageData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Do NOT update state here! Wait for socket event (newMessage) to update chat state.
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send message';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Setup socket listeners function - defined first
  setupSocketListeners: (socket, selectedUser) => {
    console.log('Setting up socket listeners for user:', selectedUser?._id);
    
    // Remove only our store's previous listeners to prevent duplicates
    const prevListener = get().messageListener;
    if (prevListener) {
      try {
        socket.off('newMessage', prevListener);
        console.log('Removed previous store message listener');
      } catch (e) {
        console.warn('Could not remove previous store listener:', e?.message);
      }
    }
    socket.off('error');
    
    // Get fresh auth state (authUser preferred)
    const authStore = useAuthStore.getState();
    let currentUser = authStore?.authUser || authStore?.user || null;
    
    if (!currentUser) {
      console.error('Cannot setup socket listeners: No authenticated user');
      return () => {}; // Return empty cleanup function
    }
    
    // Register the message deleted handler
    if (authStore.setMessageDeletedHandler) {
      authStore.setMessageDeletedHandler(useChatStore.getState().handleMessageDeleted);
    }

    const handleNewMessage = (newMessage) => {
      // Dedupe by message _id to avoid triple notifications from multiple bindings or retries
      const mid = (newMessage && (newMessage._id || newMessage.id))?.toString?.();
      if (mid && __seenMessageIds.has(mid)) {
        return;
      }
      if (mid) {
        __seenMessageIds.add(mid);
        // Keep set from growing unbounded
        if (__seenMessageIds.size > 1000) {
          // crude trim: clear half
          let i = 0;
          for (const v of __seenMessageIds) { __seenMessageIds.delete(v); if (++i > 500) break; }
        }
      }
      console.log('=== NEW MESSAGE RECEIVED ===');
      console.log('Raw message:', JSON.parse(JSON.stringify(newMessage)));
      
      // Get current state and user (authUser preferred)
      const currentState = get();
      const authState = useAuthStore.getState();
      let currentUser = authState?.authUser || authState?.user;
      if (!currentUser) {
        console.warn('Auth user not ready during message handling, skipping this event');
        return;
      }
      
      // Convert IDs to strings for consistent comparison
      const currentUserId = currentUser._id?.toString();
      const messageSenderId = (newMessage.senderId?._id || newMessage.senderId)?.toString();
      const messageReceiverId = (newMessage.receiverId?._id || newMessage.receiverId)?.toString();
      const selectedUserId = currentState.selectedUser?._id?.toString();

      console.log('Message participants:', {
        currentUserId,
        messageSenderId,
        messageReceiverId,
        selectedUserId,
        isCurrentUserSender: messageSenderId === currentUserId,
        isCurrentUserReceiver: messageReceiverId === currentUserId,
        isForSelectedUser: messageSenderId === selectedUserId || messageReceiverId === selectedUserId
      });

      // Check if the message is relevant to the current user
      const isMessageForCurrentUser = 
        (messageReceiverId === currentUserId) || // I'm the receiver
        (messageSenderId === currentUserId);    // I'm the sender
        
      // Check if the message is for the currently selected chat
      const isForSelectedChat = 
        !selectedUserId || // If no user is selected, show all messages
        (messageSenderId === selectedUserId ||  // From selected user
         messageReceiverId === selectedUserId); // To selected user

      const isMessageForSelectedUser = isMessageForCurrentUser && isForSelectedChat;
      
      console.log('Message handling decision:', {
        isMessageForCurrentUser,
        isForSelectedChat,
        isMessageForSelectedUser,
        currentRoute: window.location.pathname // Log current route for context
      });
      
      // Handle messages NOT in the current chat (receiver side)
      if (!isMessageForSelectedUser && messageReceiverId === currentUserId && messageSenderId !== currentUserId) {
        console.log('🔔 Message not for current chat - triggering notification');
        // Increment unread count for the sender
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [messageSenderId]: (state.unreadCounts[messageSenderId] || 0) + 1
          }
        }));
        
        // Get notification handler from auth store
        const authState = useAuthStore.getState();
        if (authState.getNotificationHandler) {
          const notificationHandler = authState.getNotificationHandler();
          if (notificationHandler && typeof notificationHandler === 'function') {
            console.log('🔔 Calling notification handler directly');
            
            const notificationData = {
              senderId: messageSenderId,
              text: newMessage.text,
              _id: newMessage._id,
              createdAt: newMessage.createdAt
            };
            
            try {
              notificationHandler(notificationData);
              console.log('🔔 Notification handler called successfully');
            } catch (error) {
              console.error('🔔 Error calling notification handler:', error);
            }
          } else {
            console.log('🔔 No notification handler available');
          }
        }
        return;
      }
      
      if (!isMessageForSelectedUser) {
        console.log('Message not for current chat, ignoring');
        return;
      }
      
      // Check if the message is from a blocked user
      const authForBlock = useAuthStore.getState();
      const blockUser = authForBlock?.authUser || authForBlock?.user;
      if (blockUser?.blockedUsers?.includes?.(messageSenderId)) {
        console.log('Message from blocked user, ignoring');
        return;
      }

      // Ensure createdAt is always a string for frontend rendering
      if (newMessage.createdAt instanceof Date) {
        newMessage.createdAt = newMessage.createdAt.toISOString();
      } else if (typeof newMessage.createdAt !== 'string') {
        newMessage.createdAt = String(newMessage.createdAt);
      }

      // Ensure we have the text field
      if (newMessage.text === undefined) {
        newMessage.text = '';
      }

      // Ensure file-related fields are properly set
      const processedMessage = {
        ...newMessage,
        file: newMessage.file?.url || newMessage.fileUrl || newMessage.file, // Handle both object, fileUrl, or plain string
        fileType: newMessage.fileType || 
                 (newMessage.file?.type || '').split('/')[1] || 
                 (newMessage.fileName?.endsWith('.pdf') ? 'pdf' : 'video'),
        fileName: newMessage.fileName || 
                 (newMessage.file?.name || (typeof newMessage.file === 'string' ? newMessage.file : newMessage.file?.split('/').pop()) || '')
      };
      
      set(state => {
        // Check if message already exists to prevent duplicates
        const messageExists = state.messages.some(msg => 
          msg._id === processedMessage._id || 
          (msg.createdAt === processedMessage.createdAt && 
           msg.senderId === processedMessage.senderId)
        );
        
        if (messageExists) {
          console.log('Message already exists, skipping');
          return state;
        }
        
        console.log('Adding new message to state:', processedMessage);
        
        // Create a new array with the new message
        const updatedMessages = [...state.messages, processedMessage];
        
        // Sort messages by createdAt to maintain order
        updatedMessages.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        return {
          messages: updatedMessages,
        };
      });
    };

    // Add error handler for socket
    const handleError = (error) => {
      console.error('Socket error in message subscription:', error);
      toast.error(`Socket error: ${error.message || 'Connection error'}`);
    };
    
    // Add connection status handler
    const handleConnect = () => {
      console.log('Socket connected');
    };

    // Add disconnect handler
    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };

    // Set up all socket listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('newMessage', handleNewMessage);
    // Remember our listener so future setups can remove it
    set({ messageListener: handleNewMessage });
    socket.on('error', handleError);
    
    // No extra setup emit here; useAuthStore.connectSocket handles identifying the user via "addUser"
    
    console.log('Successfully subscribed to messages with socket ID:', socket.id);
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up message subscription');
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('newMessage', handleNewMessage);
        socket.off('error', handleError);
      }
    };
  },
  
  // Subscribe to messages function - defined after setupSocketListeners
  subscribeToMessages: () => {
    try {
      const { selectedUser } = get();
      if (!selectedUser) {
        console.log('No selected user for message subscription');
        return () => {};
      }
      
      // Ensure we have a valid user (authUser preferred); otherwise retry shortly
      let authStore = useAuthStore.getState();
      let currentUser = authStore?.authUser || authStore?.user;
      if (!currentUser) {
        console.warn('Auth user not ready; will retry subscription shortly');
        const retryId = setTimeout(() => {
          useChatStore.getState().subscribeToMessages();
        }, 500);
        return () => clearTimeout(retryId);
      }

      // Holder for cleanup function
      let cleanup = () => {};
      let connectTimeoutId;
    
      // Refresh authStore in case it changed above
      authStore = useAuthStore.getState();

      // Connect to socket if not already connected
      if (!authStore.socket) {
        console.log('Connecting socket...');
        if (typeof authStore.connectSocket === 'function') {
          authStore.connectSocket();
        } else {
          console.error('connectSocket is not available on authStore');
          return () => {};
        }
        // Wait a bit for the socket to connect before proceeding
        connectTimeoutId = setTimeout(() => {
          const { socket: newSocket } = useAuthStore.getState();
          if (newSocket) {
            console.log('Socket connected, setting up listeners');
            cleanup = useChatStore.getState().setupSocketListeners(newSocket, selectedUser) || (() => {});
          } else {
            console.error('Failed to connect socket');
          }
        }, 1000);

        // Return cleanup that clears timeout and removes listeners if set later
        return () => {
          if (connectTimeoutId) clearTimeout(connectTimeoutId);
          try { cleanup(); } catch { /* noop */ }
        };
      }
    
      console.log('Socket already connected, setting up listeners');
      cleanup = useChatStore.getState().setupSocketListeners(authStore.socket, selectedUser) || (() => {});
      return () => {
        try { cleanup(); } catch { /* noop */ }
      };
    } catch (error) {
      console.error('Error in subscribeToMessages:', error);
      return () => {};
    }
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      // Only remove our store's message listener, not others (like notification listener)
      const prevListener = useChatStore.getState().messageListener;
      if (prevListener) {
        try {
          socket.off('newMessage', prevListener);
          console.log('Unsubscribed store message listener');
        } catch (e) {
          console.warn('Could not unsubscribe store listener:', e?.message);
        }
      }
    }
  },

  setSelectedUser: async (user) => {
    if (!user) {
      set({ selectedUser: null });
      return;
    }
    
    try {
      // First set the user immediately to open the chat
      set(state => ({ selectedUser: user, unreadCounts: { ...state.unreadCounts, [user._id]: 0 } }));
      
      // Then check if the current user has blocked the selected user
      try {
        const response = await axiosInstance.get(`/users/is-blocked/${user._id}`);
        if (response.data?.data) {
          set({ 
            selectedUser: {
              ...user,
              isBlockedByCurrentUser: response.data.data.isBlocked
            } 
          });
        }
      } catch (blockError) {
        console.warn('Could not check block status, continuing without it:', blockError);
        // Continue with the user even if block check fails
      }
    } catch (error) {
      console.error('Error in setSelectedUser:', error);
      // Set the user even if there's an error
      set({ selectedUser: user });
    }
  },
  
  deleteMessage: async (messageId, forEveryone = false) => {
    console.log('deleteMessage called with:', { messageId, forEveryone });
    let currentMessages;
    let lastError;
    try {
      const currentUser = useAuthStore.getState().authUser;
      if (!currentUser) {
        throw new Error('Please log in to delete messages');
      }

      // Save current messages for potential rollback
      currentMessages = [...useChatStore.getState().messages];
      
      // Optimistic update
      set(state => {
        // If deleting for everyone, remove the message completely
        if (forEveryone) {
          return {
            ...state,
            messages: state.messages.filter(msg => msg._id !== messageId)
          };
        }
        
        // If deleting for self, just hide the message for the current user
        const updatedMessages = state.messages.map(msg => {
          if (msg._id === messageId) {
            const deletedBy = Array.isArray(msg.deletedBy) ? [...msg.deletedBy] : [];
            if (!deletedBy.some(id => id.toString() === currentUser._id)) {
              deletedBy.push(currentUser._id);
            }
            return { 
              ...msg, 
              deleted: true, 
              deletedBy 
            };
          }
          return msg;
        });
        
        return { messages: updatedMessages };
      });

      // Make the API call
      console.log('Making delete request with forEveryone:', forEveryone);
      const response = await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone: forEveryone },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete message response:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to delete message');
      }
      
      // If delete for everyone, we don't need to do anything else as the socket event will handle it
      if (forEveryone) {
        return response.data;
      }
      
      // For delete for me, ensure the message is marked as deleted
      set(state => ({
        messages: state.messages.map(msg => 
          msg._id === messageId
            ? { 
                ...msg, 
                deleted: true,
                deletedBy: [...new Set([
                  ...(Array.isArray(msg.deletedBy) ? msg.deletedBy : []), 
                  currentUser._id
                ])]
              }
            : msg
        )
      }));
      
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      lastError = error;
      
      // Revert optimistic update on error if we have the original messages
      if (currentMessages) {
        set(state => ({
          ...state,
          messages: currentMessages
        }));
      }
      
    }
    // Rethrow the stored error to caller
    throw (lastError || new Error('Failed to delete message'));
  },
  
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