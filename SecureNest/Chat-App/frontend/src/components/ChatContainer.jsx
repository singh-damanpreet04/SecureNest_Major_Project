import { useChatStore } from "../store/useChatStore.js";
import ChatHeader from "./ChatHeader.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import { 
    formatMessageTime, 
    formatMessageDate, 
    formatDuration, 
    getCloudinaryUrl, 
    getCloudinaryDownloadUrl 
} from "../lib/utils.js";
import { Play, Pause, Forward, X, Mail, User, Calendar } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAuthStore } from "../store/useAuthStore";
import toast from 'react-hot-toast';
import { Trash2, Trash, UserX } from "lucide-react";
import EncryptedImage from "./EncryptedImage.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import ForwardModal from "./ForwardModal.jsx";

const ChatContainer = () => {
    const { 
        messages, 
        getMessages, 
        isMessagesLoading, 
        selectedUser, 
        subscribeToMessages, 
        unsubscribeFromMessages,
        checkLockStatus,
        verifyPinForChat,
        lockedInfo,
        setupSocketListeners
    } = useChatStore();
    
    const [groupedMessages, setGroupedMessages] = useState({});
    const [contextMenu, setContextMenu] = useState({
        x: 0,
        y: 0,
        messageId: null,
        senderId: null
    });
    const [deletingMessageId, setDeletingMessageId] = useState(null);
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    const contextMenuRef = useRef(null);
    const { authUser, socket, onlineUsers } = useAuthStore();
    const { deleteMessage } = useChatStore();
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const [justOpened, setJustOpened] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [pin, setPin] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [cooldownMs, setCooldownMs] = useState(0);
    const [showProfileModal, setShowProfileModal] = useState(false);
    
    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
                setContextMenu({ x: 0, y: 0, messageId: null });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Group messages by date
    useEffect(() => {
        if (!messages.length) return;
        
        const grouped = {};
        messages.forEach(message => {
            const date = formatMessageDate(message.createdAt);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(message);
        });
        setGroupedMessages(grouped);
    }, [messages]);

    // Mark newly opened chat so first scroll is immediate
    useEffect(() => {
        if (selectedUser?._id) setJustOpened(true);
    }, [selectedUser?._id]);

    // Scroll to bottom on open and when latest message changes
    const lastMessageId = useMemo(() => (messages.length ? messages[messages.length - 1]?._id : null), [messages]);
    useEffect(() => {
        if (!messagesEndRef.current) return;
        // Wait for DOM paint
        const t = setTimeout(() => {
            try {
                messagesEndRef.current.scrollIntoView({ behavior: justOpened ? 'auto' : 'smooth', block: 'end' });
            } catch {}
            if (justOpened) setJustOpened(false);
        }, 0);
        return () => clearTimeout(t);
    }, [lastMessageId, selectedUser?._id]);

    // Show/hide scroll-to-bottom button based on scroll position
    useEffect(() => {
        const el = messagesContainerRef.current;
        if (!el) return;
        const THRESHOLD = 24; // px from bottom
        const update = () => {
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            const atBottom = distanceFromBottom <= THRESHOLD;
            setShowScrollDown(!atBottom);
        };
        // initial check and listeners
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, [selectedUser?._id, messages.length]);

    const scrollToBottom = () => {
        // Instant jump to bottom like WhatsApp
        const el = messagesContainerRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight; // immediate
        } else {
            try { messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); } catch {}
        }
    };

    // context menu handler removed (unused)

    const handleDeleteMessage = async (messageId, forEveryone = false) => {
        try {
            setDeletingMessageId(messageId);
            const response = await deleteMessage(messageId, forEveryone);
            
            if (response?.success) {
                toast.success(`Message ${forEveryone ? 'deleted for everyone' : 'deleted for you'}`);
            } else {
                throw new Error(response?.message || 'Failed to delete message');
            }
            return response;
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error(error.message || 'Failed to delete message');
            
            // Re-fetch messages to ensure consistency
            if (selectedUser?._id) {
                try {
                    await getMessages(selectedUser._id);
                } catch (fetchError) {
                    console.error('Error refreshing messages:', fetchError);
                }
            }
            throw error;
        } finally {
            setDeletingMessageId(null);
            setContextMenu(prev => ({ ...prev, messageId: null, senderId: null }));
        }
    };

    useEffect(() => {
        let cleanup;
        (async () => {
            if (!selectedUser?._id) {
                return;
            }
            // Check lock once per selected peer change
            const status = await checkLockStatus(selectedUser._id);
            setCooldownMs(status?.cooldownRemaining || 0);
            if (status?.locked) {
                // Do not fetch/subscribe while locked
                return;
            }
            await getMessages(selectedUser._id);
            cleanup = subscribeToMessages();
        })();
        return () => {
            if (cleanup && typeof cleanup === 'function') cleanup();
            unsubscribeFromMessages();
        };
    }, [selectedUser?._id, checkLockStatus, getMessages, subscribeToMessages, unsubscribeFromMessages]);

    // Note: socket listeners are managed through subscribeToMessages() to avoid duplicate bindings

    // === Typing Indicator: per-room join and listeners ===
    const roomId = useMemo(() => {
        if (!authUser?._id || !selectedUser?._id) return null;
        return [authUser._id.toString(), selectedUser._id.toString()].sort().join(":");
    }, [authUser?._id, selectedUser?._id]);

    const [typingFromPeers, setTypingFromPeers] = useState(() => new Set());

    useEffect(() => {
        // Reset when switching rooms
        setTypingFromPeers(new Set());
        if (!socket || !roomId) return;

        // Join room for typing events
        socket.emit('join', { roomId, userId: authUser?._id });

        const onTyping = ({ roomId: r, senderId }) => {
            if (r !== roomId || senderId === authUser?._id) return;
            setTypingFromPeers(prev => {
                const next = new Set(prev);
                next.add(senderId);
                return next;
            });
        };

        const onStopTyping = ({ roomId: r, senderId }) => {
            if (r !== roomId || senderId === authUser?._id) return;
            setTypingFromPeers(prev => {
                const next = new Set(prev);
                next.delete(senderId);
                return next;
            });
        };

        socket.on('typing', onTyping);
        socket.on('stopTyping', onStopTyping);

        return () => {
            socket.off('typing', onTyping);
            socket.off('stopTyping', onStopTyping);
            socket.emit('leave', { roomId });
        };
    }, [socket, roomId, authUser?._id]);

    // Cooldown countdown display
    useEffect(() => {
        if (!selectedUser?._id) return;
        let id;
        if ((lockedInfo[selectedUser._id]?.cooldownRemaining || 0) > 0) {
            id = setInterval(() => {
                setCooldownMs(prev => Math.max(0, prev - 1000));
            }, 1000);
        }
    }, [selectedUser?._id, lockedInfo]);

    if (isMessagesLoading) {
        return (
            <div className="flex-1 flex flex-col overflow-auto">
                <ChatHeader onProfileClick={() => {
                    console.log('Profile clicked, showing modal for:', selectedUser);
                    setShowProfileModal(true);
                }} />
                <MessageSkeleton />
                {/* Typing indicator above input */}
                <div className="px-4 pb-2 pt-1">
                    <TypingIndicator show={typingFromPeers.size > 0} label={`${selectedUser?.fullName || selectedUser?.username || 'User'} is typing…`} />
                </div>
                {/* Scroll-to-bottom floating button */}
            {showScrollDown && (
                <button
                    onClick={scrollToBottom}
                    className="absolute right-4 bottom-24 md:bottom-24 p-3 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors z-20 border border-white/20"
                    aria-label="Scroll to latest"
                    title="Scroll to latest"
                >
                    {/* Down arrow icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="m19 12-7 7-7-7" />
                    </svg>
                </button>
            )}

            <MessageInput />
            </div>
        );
    }
    const isLocked = selectedUser?._id && (lockedInfo[selectedUser._id]?.locked || false);

    if (isLocked) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-shrink-0 h-16 border-b border-gray-700 bg-gray-900 z-10">
                    <ChatHeader onProfileClick={() => {
                    console.log('Profile clicked, showing modal for:', selectedUser);
                    setShowProfileModal(true);
                }} />
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-gray-800 rounded-xl p-6 shadow-xl border border-white/10">
                        <h3 className="text-white text-lg font-semibold">Enter PIN to unlock chat</h3>
                        <p className="text-gray-400 text-sm mt-1">This chat is protected. Please enter your PIN to view messages.</p>
                        <div className="mt-4 flex gap-2">
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={8}
                                value={pin}
                                onChange={e=>setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="flex-1 rounded-lg bg-[#0b1220] border border-white/10 px-4 py-2 text-white"
                                placeholder="4–8 digit PIN"
                            />
                            <button
                                disabled={verifying || !/^\d{4,8}$/.test(pin) || (cooldownMs>0)}
                                onClick={async () => {
                                    if (!selectedUser?._id) return;
                                    setVerifying(true);
                                    try {
                                        const result = await verifyPinForChat(selectedUser._id, pin);
                                        if (result.success) {
                                            setPin('');
                                            await getMessages(selectedUser._id);
                                        } else if (result.rateLimited) {
                                            setCooldownMs(result.cooldownRemaining || 15000);
                                            toast.error('Too many attempts. Please wait.');
                                        } else {
                                            toast.error(result.message || 'Invalid PIN');
                                            // Clear PIN on error for security
                                            setPin('');
                                        }
                                    } catch (error) {
                                        console.error('Error during PIN verification:', error);
                                        toast.error('Failed to verify PIN. Please try again.');
                                    } finally {
                                        setVerifying(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                            >{verifying ? 'Verifying…' : 'Unlock'}</button>
                        </div>
                        {cooldownMs>0 && (
                            <p className="text-xs text-yellow-300 mt-2">Locked due to failed attempts. Try again in {Math.ceil(cooldownMs/1000)}s.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-auto bg-primary relative">
            <div className="flex-shrink-0 h-16 border-b border-secondary bg-secondary z-10">
                <ChatHeader onProfileClick={() => {
                    console.log('Profile clicked, showing modal for:', selectedUser);
                    setShowProfileModal(true);
                }} />
            </div>
            
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-primary">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-primary opacity-60">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    Object.entries(groupedMessages).map(([date, dateMessages]) => (
                        <div key={date} className="space-y-4">
                            <div className="text-center">
                                <span className="inline-block bg-secondary/80 text-primary font-semibold opacity-100 text-sm md:text-base px-3 py-1.5 rounded-full border border-white/10 shadow-sm tracking-wide">
                                    {date}
                                </span>
                            </div>
                            
                            {dateMessages.map((message) => {
                                // senderId can be an object (populated) or a string; normalize for comparisons
                                const senderId = (message?.senderId && message.senderId._id) ? message.senderId._id : message.senderId;
                                const isCurrentUser = senderId?.toString() === authUser?._id?.toString();
                                const isDeleted = message.deleted || (message.deletedBy && message.deletedBy.includes(authUser._id));
                                
                                if (isDeleted) return null; // Skip rendering deleted messages
                                return (
                                    <div 
                                        key={message._id} 
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({ 
                                                x: e.clientX, 
                                                y: e.clientY, 
                                                messageId: message._id,
                                                senderId: senderId
                                            });
                                        }}
                                    >
                                        <div 
                                            className={`group max-w-[80%] md:max-w-[60%] rounded-lg p-3 ${isCurrentUser ? 'bubble-in text-accent-contrast' : 'bubble-out'}`}
                                            style={{
                                                borderBottomRightRadius: isCurrentUser ? '0' : undefined,
                                                borderBottomLeftRadius: !isCurrentUser ? '0' : undefined
                                            }}
                                        >
                                            {(message.image && !message.imageEncryption) && (
                                                <div className="mb-2 rounded-lg overflow-hidden">
                                                    <img 
                                                        src={message.image} 
                                                        alt="Sent" 
                                                        className="max-h-64 w-auto rounded-lg"
                                                        onError={(e) => {
                                                            e.target.src = '';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {message.imageEncryption && (
                                                <div className="mb-2 rounded-lg overflow-hidden">
                                                    <EncryptedImage 
                                                        messageId={message._id} 
                                                        encryption={message.imageEncryption} 
                                                    />
                                                </div>
                                            )}
                                            {message.file && message.fileType === 'video' && (
                                                <div className="mb-2 rounded-lg overflow-hidden">
                                                    <video 
                                                        src={getCloudinaryUrl(message.file, 'video')} 
                                                        controls 
                                                        className="max-h-96 w-auto rounded-lg"
                                                        onError={(e) => {
                                                            // Fallback to download if video can't be played
                                                            e.target.outerHTML = `
                                                                <div class="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                                                    <p class="text-red-700 dark:text-red-300">Couldn't play video. 
                                                                        <a href="${getCloudinaryDownloadUrl(message.file, message.fileName || 'video.mp4')}" 
                                                                           download={message.fileName || 'video.mp4'}
                                                                           class="text-blue-600 dark:text-blue-400 hover:underline">
                                                                            Download instead
                                                                        </a>
                                                                    </p>
                                                                </div>
                                                            `;
                                                        }}
                                                        controlsList="nodownload"
                                                    >
                                                        Your browser does not support the video tag.
                                                        <a 
                                                            href={getCloudinaryDownloadUrl(message.file, message.fileName || 'video.mp4')} 
                                                            download={message.fileName || 'video.mp4'}
                                                        >
                                                            Download Video
                                                        </a>
                                                    </video>
                                                    <div className="mt-1 text-right">
                                                        <a 
                                                            href={getCloudinaryDownloadUrl(message.file, message.fileName || 'video.mp4')}
                                                            download={message.fileName || 'video.mp4'}
                                                            className="text-xs text-blue-500 hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            Download Video
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                            {message.file && message.fileType === 'pdf' && (
                                                <div className="mt-1">
                                                    <a 
                                                        href={message.file.startsWith('http') 
                                                            ? message.file 
                                                            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003'}${message.file.startsWith('/') ? '' : '/'}${message.file}`}
                                                        download={message.fileName || 'document.pdf'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center px-2 py-1 rounded ${
                                                            senderId?.toString() === authUser?._id?.toString() 
                                                                ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-100' 
                                                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100'
                                                        } transition-colors`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Force download for PDF files
                                                            if (!e.currentTarget.href.startsWith('blob:')) {
                                                                e.preventDefault();
                                                                const link = document.createElement('a');
                                                                link.href = e.currentTarget.href;
                                                                link.download = message.fileName || 'document.pdf';
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }
                                                        }}
                                                    >
                                                        <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6" />
                                                        </svg>
                                                        <span className="text-sm font-medium truncate max-w-[200px]">
                                                            {message.fileName || 'Download PDF'}
                                                        </span>
                                                    </a>
                                                </div>
                                            )}
                                            {message.audio ? (
                                                <div className="flex items-center space-x-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg">
                                                    <button 
                                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const audio = document.getElementById(`audio-${message._id}`);
                                                            if (!audio) return;
                                                            if (audio.paused || audio.ended) {
                                                                try { audio.currentTime = audio.ended ? 0 : audio.currentTime; } catch {}
                                                                audio.play();
                                                            } else {
                                                                audio.pause();
                                                            }
                                                        }}
                                                        aria-label="Play voice message"
                                                    >
                                                        <span className="icon-play block"><Play size={16} className="ml-0.5" /></span>
                                                        <span className="icon-pause hidden"><Pause size={16} className="ml-0.5" /></span>
                                                    </button>
                                                    <audio 
                                                        id={`audio-${message._id}`}
                                                        src={message.audio}
                                                        onPlay={(e) => {
                                                            const btn = e.target.previousElementSibling;
                                                            if (btn) {
                                                                const p = btn.querySelector('.icon-play');
                                                                const q = btn.querySelector('.icon-pause');
                                                                if (p && q) { p.classList.add('hidden'); q.classList.remove('hidden'); }
                                                            }
                                                        }}
                                                        onPause={(e) => {
                                                            const btn = e.target.previousElementSibling;
                                                            if (btn) {
                                                                const p = btn.querySelector('.icon-play');
                                                                const q = btn.querySelector('.icon-pause');
                                                                if (p && q) { p.classList.remove('hidden'); q.classList.add('hidden'); }
                                                            }
                                                        }}
                                                        onEnded={(e) => {
                                                            try { e.currentTarget.currentTime = 0; } catch {}
                                                            const btn = e.target.previousElementSibling;
                                                            if (btn) {
                                                                const p = btn.querySelector('.icon-play');
                                                                const q = btn.querySelector('.icon-pause');
                                                                if (p && q) { p.classList.remove('hidden'); q.classList.add('hidden'); }
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {formatDuration(message.audioDuration || 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`${isCurrentUser ? 'text-accent-contrast' : 'text-primary'}`}>
                                                    {message.isForwarded && (
                                                        <p className={`text-xs italic mb-1 flex items-center gap-1 ${isCurrentUser ? 'text-accent-contrast/80' : 'text-muted'}`}>
                                                            <Forward size={12} />
                                                            Forwarded Message
                                                        </p>
                                                    )}
                                                    <div className="whitespace-pre-wrap">
                                                        {message.text}
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`text-xs mt-1 flex items-center justify-between ${isCurrentUser ? 'text-accent-contrast/80' : 'text-muted'}`}>
                                                <span>{formatMessageTime(message.createdAt)}</span>
                                                <div className="flex items-center space-x-1 ml-2">
                                                <div className="flex items-center space-x-1">
                                                    {deletingMessageId === message._id ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await handleDeleteMessage(message._id, false);
                                                                    } catch (err) {
                                                                        console.error('Delete error:', err);
                                                                    }
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-white disabled:opacity-50"
                                                                title="Delete for Me"
                                                                disabled={deletingMessageId === message._id}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                            {isCurrentUser && (
                                                                <button 
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('Are you sure you want to delete this message for everyone?')) {
                                                                            try {
                                                                                await handleDeleteMessage(message._id, true);
                                                                            } catch (err) {
                                                                                console.error('Delete for everyone error:', err);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white disabled:opacity-50"
                                                                    title="Delete for Everyone"
                                                                    disabled={deletingMessageId === message._id}
                                                                >
                                                                    <UserX size={14} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                {/* bottom sentinel for auto-scroll */}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator above input */}
            <div className="px-4 pb-2 pt-1">
                <TypingIndicator show={typingFromPeers.size > 0} label={`${selectedUser?.fullName || selectedUser?.username || 'User'} is typing…`} />
            </div>

            <MessageInput />
            
            {/* Context Menu */}
            {contextMenu.messageId && (
                <div 
                    ref={contextMenuRef}
                    className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-50 w-48"
                    style={{
                        top: `${contextMenu.y}px`,
                        left: `${contextMenu.x}px`,
                        transform: 'translateY(-100%)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setMessageToForward(contextMenu.messageId);
                            setForwardModalOpen(true);
                            setContextMenu({ x: 0, y: 0, messageId: null, senderId: null });
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <Forward size={16} className="mr-2" />
                        Forward
                    </button>
                    <button
                        onClick={() => handleDeleteMessage(contextMenu.messageId, false)}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Delete for Me
                    </button>
                    {contextMenu.senderId?.toString() === authUser?._id?.toString() && (
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this message for everyone?')) {
                                    handleDeleteMessage(contextMenu.messageId, true);
                                }
                            }}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <UserX size={16} className="mr-2" />
                            Delete for Everyone
                        </button>
                    )}
                </div>
            )}

            {/* Forward Modal */}
            <ForwardModal
                isOpen={forwardModalOpen}
                onClose={() => {
                    setForwardModalOpen(false);
                    setMessageToForward(null);
                }}
                messageId={messageToForward}
            />
            
            {/* User Profile Modal */}
            {showProfileModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white relative">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full bg-white/20 p-1 mb-4">
                                    <img
                                        src={selectedUser.profilePic || selectedUser.avatar || '/avatar.png'}
                                        alt={selectedUser.fullName}
                                        className="w-full h-full rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src = '/avatar.png';
                                        }}
                                    />
                                </div>
                                <h2 className="text-2xl font-bold">{selectedUser.fullName}</h2>
                                <p className="text-blue-100">@{selectedUser.username}</p>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{selectedUser.fullName}</p>
                                    </div>
                                </div>
                                
                                
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                            {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border ${
                                onlineUsers.includes(selectedUser._id) 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : 'bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-600'
                            }`}>
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        onlineUsers.includes(selectedUser._id) 
                                            ? 'bg-green-500 animate-pulse' 
                                            : 'bg-gray-400'
                                    }`}></div>
                                    <span className={`text-sm font-medium ${
                                        onlineUsers.includes(selectedUser._id) 
                                            ? 'text-green-800 dark:text-green-200' 
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {onlineUsers.includes(selectedUser._id) ? 'Active Now' : 'Offline'}
                                    </span>
                                </div>
                                <span className={`text-xs ${
                                    onlineUsers.includes(selectedUser._id) 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    {onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatContainer;