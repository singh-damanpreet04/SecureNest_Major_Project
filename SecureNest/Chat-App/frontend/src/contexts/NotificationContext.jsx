import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const audioRef = useRef(null);
    const lastPlayTime = useRef(0);

    // Initialize audio
    const initializeAudio = useCallback(() => {
        if (!audioRef.current) {
            // Try to load the notification sound, with fallback
            audioRef.current = new Audio('/sounds/notification.mp3');
            audioRef.current.volume = 0.6;
            audioRef.current.preload = 'auto';
            
            // Handle audio load errors
            audioRef.current.onerror = () => {
                console.warn('🔊 Could not load notification.mp3, creating fallback beep sound');
                // Create a simple beep sound using Web Audio API as fallback
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                } catch (fallbackError) {
                    console.warn('🔊 Could not create fallback sound:', fallbackError);
                }
            };
        }
    }, []);

    // Play notification sound with throttling to prevent spam
    const playNotificationSound = useCallback(() => {
        const now = Date.now();
        console.log('🔊 playNotificationSound called');
        console.log('🔊 Time since last play:', now - lastPlayTime.current);
        
        // Throttle sound to prevent overlapping (minimum 500ms between sounds)
        if (now - lastPlayTime.current < 500) {
            console.log('🔊 Sound throttled - too soon since last play');
            return;
        }
        
        try {
            console.log('🔊 Attempting to play sound...');
            
            // Create a simple beep sound using Web Audio API since MP3 might not exist
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Create a pleasant notification sound (two-tone beep)
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            lastPlayTime.current = now;
            console.log('🔊 Beep sound played successfully!');
            
        } catch (error) {
            console.warn('🔊 Could not create beep sound:', error);
            
            // Final fallback - try to play MP3 if it exists
            try {
                initializeAudio();
                if (audioRef.current) {
                    console.log('🔊 Trying MP3 fallback...');
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().then(() => {
                        console.log('🔊 MP3 sound played successfully!');
                    }).catch(mp3Error => {
                        console.warn('🔊 MP3 also failed:', mp3Error);
                    });
                    lastPlayTime.current = now;
                }
            } catch (fallbackError) {
                console.warn('🔊 All sound methods failed:', fallbackError);
            }
        }
    }, [initializeAudio]);

    // Show notification
    const showNotification = useCallback(({ 
        id, 
        senderName, 
        messageText, 
        senderId, 
        timestamp = new Date(),
        onClick 
    }) => {
        console.log('🎵 showNotification called with:', { id, senderName, messageText, senderId });
        
        const notificationId = id || `notification-${Date.now()}-${Math.random()}`;
        
        const notification = {
            id: notificationId,
            senderName,
            messageText: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
            senderId,
            timestamp,
            onClick: onClick || (() => {}),
            createdAt: Date.now()
        };

        console.log('🎵 Creating notification:', notification);

        setNotifications(prev => {
            // Limit to 3 notifications max
            const updated = [notification, ...prev].slice(0, 3);
            console.log('🎵 Updated notifications list:', updated);
            return updated;
        });

        // Play sound
        console.log('🎵 Playing notification sound...');
        playNotificationSound();

        // Request browser notification permission if not granted
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            } else if (Notification.permission === 'granted') {
                try {
                    new Notification(`Message from ${senderName}`, {
                        body: messageText,
                        icon: '/favicon.ico',
                        tag: `message-${senderId}`, // Prevent duplicate notifications
                        requireInteraction: false,
                        silent: true // We handle sound ourselves
                    });
                } catch (error) {
                    console.warn('Browser notification error:', error);
                }
            }
        }

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            removeNotification(notificationId);
        }, 5000);

        return notificationId;
    }, [playNotificationSound]);

    // Remove notification
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    // Clear all notifications
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Handle notification click
    const handleNotificationClick = useCallback((notification) => {
        if (notification.onClick) {
            notification.onClick(notification);
        }
        removeNotification(notification.id);
    }, [removeNotification]);

    const value = {
        notifications,
        showNotification,
        removeNotification,
        clearAllNotifications,
        handleNotificationClick
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
