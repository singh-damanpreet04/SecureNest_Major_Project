import { motion } from 'framer-motion';
import { X, MessageCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationPopup = ({ notification, onClose, onClick }) => {
    const { senderName, messageText, timestamp, senderId } = notification;

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) {
            onClick(notification);
        }
    };

    const handleClose = (e) => {
        e.stopPropagation();
        if (onClose) {
            onClose(notification.id);
        }
    };

    return (
        <motion.div
            initial={{ x: 400, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 400, opacity: 0, scale: 0.8 }}
            transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.3
            }}
            className="bg-secondary backdrop-blur-md border border-secondary rounded-xl shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-200 overflow-hidden group"
            onClick={handleClick}
            style={{ width: '320px' }}
        >
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-xl p-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                 style={{ background: `linear-gradient(135deg, var(--accent), transparent)` }}>
                <div className="w-full h-full rounded-xl bg-secondary" />
            </div>
            
            <div className="relative z-10 p-4">
                <div className="flex items-start gap-3">
                    {/* Avatar or Icon */}
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                             style={{ backgroundColor: 'var(--accent)' }}>
                            <User className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-primary font-semibold text-sm truncate">
                                {senderName}
                            </h4>
                            <button
                                onClick={handleClose}
                                className="flex-shrink-0 p-1 hover:bg-primary hover:bg-opacity-10 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-primary opacity-60 hover:opacity-100" />
                            </button>
                        </div>
                        
                        <p className="text-primary opacity-80 text-sm leading-relaxed mb-2 line-clamp-2">
                            {messageText}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-primary opacity-50">
                            <MessageCircle className="w-3 h-3" />
                            <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                        </div>
                    </div>
                </div>
                
                {/* Subtle pulse animation */}
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" 
                     style={{ backgroundColor: 'var(--accent)' }} />
            </div>
            
            {/* Bottom accent line */}
            <div className="h-1 w-full" style={{ backgroundColor: 'var(--accent)', opacity: 0.3 }} />
        </motion.div>
    );
};

export default NotificationPopup;
