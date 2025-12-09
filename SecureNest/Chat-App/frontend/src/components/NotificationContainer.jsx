import { AnimatePresence } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import NotificationPopup from './NotificationPopup';
import { useChatStore } from '../store/useChatStore';

const NotificationContainer = () => {
    const { notifications, removeNotification } = useNotification();
    const { setSelectedUser, users } = useChatStore();

    const handleClick = (notification) => {
        // Find the user who sent the message
        const sender = users.find(user => user._id === notification.senderId);
        if (sender) {
            setSelectedUser(sender);
        }
        
        // Remove the notification
        removeNotification(notification.id);
        
        // Call custom onClick if provided
        if (notification.onClick) {
            notification.onClick(notification);
        }
    };

    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-50 space-y-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {notifications.map((notification, index) => (
                    <div 
                        key={notification.id}
                        className="pointer-events-auto"
                        style={{ 
                            zIndex: 1000 - index // Stack notifications properly
                        }}
                    >
                        <NotificationPopup
                            notification={notification}
                            onClose={removeNotification}
                            onClick={handleClick}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NotificationContainer;
