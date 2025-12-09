import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { axiosInstance } from '../lib/axios';

const ForwardModal = ({ isOpen, onClose, messageId }) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isForwarding, setIsForwarding] = useState(false);
    const { users, getUsers } = useChatStore();
    const { authUser } = useAuthStore();

    useEffect(() => {
        if (isOpen) {
            getUsers();
        }
    }, [isOpen, getUsers]);

    // Filter users based on search query
    const filteredUsers = users.filter(user => 
        user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleForward = async () => {
        if (selectedUsers.length === 0) {
            toast.error('Please select at least one recipient');
            return;
        }

        setIsForwarding(true);
        try {
            const response = await axiosInstance.post('/messages/forward', {
                messageId,
                recipients: selectedUsers
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setSelectedUsers([]);
                onClose();
            }
        } catch (error) {
            console.error('Error forwarding message:', error);
            toast.error(error.response?.data?.error || 'Failed to forward message');
        } finally {
            setIsForwarding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                            Forward Message
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No contacts found
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <motion.div
                                    key={user._id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleUserSelection(user._id)}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                                        selectedUsers.includes(user._id)
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                    }`}
                                >
                                    <div className="relative">
                                        {user.profilePic ? (
                                            <img
                                                src={user.profilePic}
                                                alt={user.fullName}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                <User size={24} className="text-white" />
                                            </div>
                                        )}
                                        {selectedUsers.includes(user._id) && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="font-medium text-gray-800 dark:text-white">
                                            {user.fullName}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            @{user.username}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedUsers.length} selected
                            </span>
                        </div>
                        <button
                            onClick={handleForward}
                            disabled={selectedUsers.length === 0 || isForwarding}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                        >
                            {isForwarding ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Forwarding...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Forward Message
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ForwardModal;
