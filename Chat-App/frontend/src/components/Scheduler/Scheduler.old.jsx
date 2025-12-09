import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { format, isAfter, isBefore, differenceInSeconds } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FiClock, FiX, FiSend, FiUser, FiCheck, FiAlertCircle } from 'react-icons/fi';

const Scheduler = ({ onClose }) => {
  const { user } = useAuthStore();
  const { 
    selectedUser, 
    scheduleMessage, 
    scheduledMessages, 
    getScheduledMessages, 
    cancelScheduledMessage,
    formatTimeRemaining 
  } = useChatStore();
  
  const [username, setUsername] = useState(selectedUser?.username || '');
  const [message, setMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Load scheduled messages on mount
  const loadScheduledMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      await getScheduledMessages();
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
      toast.error(error.message || 'Failed to load scheduled messages');
    } finally {
      setIsLoading(false);
    }
  }, [getScheduledMessages]);
  
  // Set up auto-refresh for scheduled messages
  useEffect(() => {
    loadScheduledMessages(); // Initial load
    
    const interval = setInterval(() => {
      loadScheduledMessages();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [loadScheduledMessages]);
  
  // Local state to track time for smooth countdown
  const [now, setNow] = useState(Date.now());
  const countdownIntervalRef = useRef(null);

  // Set up countdown interval for smooth updates
  useEffect(() => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Set up the interval to update time every second
    countdownIntervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);
  
  // Memoize the formatted time remaining for each message
  const getFormattedTimeRemaining = useCallback((scheduledTime) => {
    return formatTimeRemaining(scheduledTime);
  }, [formatTimeRemaining]);

  // Filter and sort scheduled messages
  const filteredScheduledMessages = useMemo(() => {
    if (!scheduledMessages) return [];
    
    const filtered = scheduledMessages
      .filter(msg => msg.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
      
    // Force re-render by including the current time in the dependency array
    return filtered.map(msg => ({
      ...msg,
      // Add a key that changes every second to force re-render
      _countdownKey: `${msg._id}-${Math.floor(now / 1000)}`
    }));
  }, [scheduledMessages, now]); // Recalculate when now changes

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !message || !scheduledTime) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsScheduling(true);
    
    const scheduledDateTime = new Date(scheduledTime);
    if (scheduledDateTime <= new Date()) {
      toast.error('Please select a future date and time');
      setIsScheduling(false);
      return;
    }
    
    try {
      await scheduleMessage({
        receiverUsername: username,  // Add receiverUsername to the request body
        message,
        scheduledTime: scheduledDateTime,
        messageType: 'text'
      });
      
      // Reset form
      setMessage('');
      setScheduledTime('');
      
      // Reload scheduled messages
      await loadScheduledMessages();
      
      toast.success('Message scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to schedule message');
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle cancel scheduled message
  const handleCancelScheduled = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled message?')) {
      return;
    }
    
    try {
      await cancelScheduledMessage(id);
      await loadScheduledMessages();
      toast.success('Scheduled message cancelled');
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to cancel scheduled message');
    }
  };

  // Load scheduled messages on component mount
  useEffect(() => {
    loadScheduledMessages();
  }, []);

  // Set username from selected user if available
  useEffect(() => {
    if (selectedUser) {
      setUsername(selectedUser.username);
    }
  }, [selectedUser]);

  // Render scheduled messages list
  const renderScheduledMessages = () => {
    if (isLoading) {
      return (
        <div className="mt-8 flex flex-col items-center justify-center py-8">
          <div className="animate-pulse flex space-x-4 mb-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50"></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading scheduled messages...</p>
        </div>
      );
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return (
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 mb-3">
            <FiClock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">No scheduled messages</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Schedule your first message to get started!
          </p>
        </div>
      );
    }
    
    if (filteredScheduledMessages.length === 0) {
      return (
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/30 mb-3">
            <FiCheck className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            No pending scheduled messages. Schedule a new one above.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Scheduled Messages
          </h3>
          <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100 rounded-full">
            {filteredScheduledMessages.length} {filteredScheduledMessages.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {filteredScheduledMessages.map((msg) => {
            const isPastDue = isBefore(new Date(msg.scheduledTime), new Date());
            const timeRemaining = formatTimeRemaining(msg.scheduledTime);
            const formattedDate = format(new Date(msg.scheduledTime), 'MMM d, yyyy');
            const formattedTime = format(new Date(msg.scheduledTime), 'h:mm a');
            
            return (
              <div 
                key={msg._id}
                className={`group relative p-4 rounded-lg border transition-all duration-200 ${
                  isPastDue 
                    ? 'bg-amber-50/80 border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 dark:bg-amber-900/10 dark:border-amber-800/50 dark:hover:shadow-amber-900/20'
                    : 'bg-white/80 border-gray-200 hover:shadow-lg hover:shadow-blue-100/50 dark:bg-gray-700/80 dark:border-gray-600 dark:hover:shadow-blue-900/20 backdrop-blur-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
                          To: {msg.receiverUsername}
                        </span>
                      </div>
                      
                      {msg.status === 'scheduled' && (
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            isPastDue 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 animate-pulse border border-amber-200 dark:border-amber-800/50'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50'
                          }`}
                          key={msg._countdownKey}
                        >
                          {isPastDue ? (
                            <span className="flex items-center">
                              <span className="flex h-2 w-2 relative mr-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                              </span>
                              Sending now...
                            </span>
                          ) : (
                            `Sending in ${getFormattedTimeRemaining(msg.scheduledTime)}`
                          )}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-base-content/90 break-words leading-relaxed font-medium dark:text-base-content/90">
                        {msg.messageType === 'text' 
                          ? `"${msg.message}"` 
                          : `[${msg.messageType?.toUpperCase() || 'FILE'}] ${msg.fileName || 'File'}`}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <FiClock className="mr-1.5 flex-shrink-0" size={12} />
                        <span className="font-medium">{formattedDate}</span>
                        <span className="mx-1.5">•</span>
                        <span>{formattedTime}</span>
                      </div>
                      
                      <div className={`inline-flex items-center gap-1.5 ${
                        msg.status === 'sent' 
                          ? 'text-success'
                          : msg.status === 'failed' 
                            ? 'text-error'
                            : 'text-primary'
                      }`}>
                        {msg.status === 'sent' ? (
                          <>
                            <FiCheck className="mr-1.5" size={12} />
                            <span>Sent successfully</span>
                          </>
                        ) : msg.status === 'failed' ? (
                          <>
                            <FiAlertCircle className="mr-1.5" size={12} />
                            <span>Failed to send</span>
                          </>
                        ) : (
                          <>
                            <FiClock className="mr-1.5" size={12} />
                            <span>Scheduled</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {msg.status === 'scheduled' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to cancel this scheduled message?')) {
                          handleCancelScheduled(msg._id);
                        }
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transform hover:scale-110"
                      title="Cancel scheduled message"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>
                
                {/* Progress bar for pending messages */}
                {msg.status === 'scheduled' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {!isPastDue && (
                      <div 
                        className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-1000 ease-linear"
                        style={{ 
                          width: `${Math.min(100, (1 - (new Date(msg.scheduledTime) - new Date()) / (new Date(msg.scheduledTime) - new Date(msg.createdAt))) * 100)}%`
                        }}
                      ></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-black/50 backdrop-blur-sm" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white" id="modal-title">
              Schedule a Message
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 -mr-2 text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <span className="sr-only">Close</span>
              <FiX className="w-5 h-5" />
            </button>
          </div>
          
          {/* Main Content */}
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <FiUser className="mr-2 text-blue-500" />
                  <span>Recipient</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    @
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="username"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Message Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Message
              </label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 min-h-[120px] resize-none"
                  placeholder="Type your message here..."
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {message.length}/1000
                </div>
              </div>
            </div>
            
            {/* Schedule Time */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <FiClock className="mr-2 text-blue-500" />
                <span>Schedule Time</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="block w-full pl-4 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 cursor-pointer"
                  required
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600 transition-all duration-200 flex items-center"
                disabled={isScheduling}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-transparent rounded-xl shadow-sm hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center min-w-[180px] transition-all duration-200 transform hover:scale-[1.02] active:scale-95"
                disabled={isScheduling}
              >
                {isScheduling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <FiSend className="mr-2" />
                    Schedule Message
                  </>
                )}
              </button>
            </div>
          </form>
          
          {/* Scheduled Messages List */}
          {renderScheduledMessages()}
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
