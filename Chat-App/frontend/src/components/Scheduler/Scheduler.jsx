import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { format, isAfter, isBefore, differenceInSeconds } from 'date-fns';
import { toast } from 'react-hot-toast';
import { FiClock, FiX, FiSend, FiUser, FiCheck, FiAlertCircle } from 'react-icons/fi';

const Scheduler = ({ onClose }) => {
  const { user } = useAuthStore();
  const { selectedUser, scheduledMessages, scheduleMessage, cancelScheduledMessage, getScheduledMessages } = useChatStore();
  
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(''); // Let user select any date
  const [time, setTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [username, setUsername] = useState(selectedUser?.username || '');
  const [isCancelling, setIsCancelling] = useState({});
  
  // Combine date and time into a single datetime string when both are set
  const scheduledTime = useMemo(() => {
    if (date && time) {
      const datetime = `${date}T${time}`;
      console.log('Combined datetime:', datetime);
      return datetime;
    }
    console.log('Date or time missing:', { date, time });
    return '';
  }, [date, time]);
  
  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  const todayString = today.toISOString().split('T')[0];
  
  const countdownIntervalRef = useRef(null);

  // Load scheduled messages on mount and set up refresh interval
  const loadScheduledMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      await getScheduledMessages();
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
      toast.error('Failed to load scheduled messages');
    } finally {
      setIsLoading(false);
    }
  }, [getScheduledMessages]);

  // Set up interval for refreshing scheduled messages
  useEffect(() => {
    loadScheduledMessages();
    const interval = setInterval(() => {
      loadScheduledMessages();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [loadScheduledMessages]);
  
  // Local state to track time for smooth countdown
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Filter scheduled messages for the current user
  const filteredScheduledMessages = useMemo(() => {
    if (!scheduledMessages) return [];
    return scheduledMessages.filter(msg => 
      username && msg.receiverUsername.toLowerCase() === username.toLowerCase()
    ).sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }, [scheduledMessages, username]);

  // Format time remaining until scheduled message
  const formatTimeRemaining = useCallback((scheduledTime) => {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffInSeconds = Math.max(0, Math.floor((scheduled - now) / 1000));
    
    if (diffInSeconds < 60) {
      return 'in a few seconds';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.ceil(diffInSeconds / 60);
      return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes > 0 ? ` ${minutes} min` : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `in ${days} ${days === 1 ? 'day' : 'days'}`;
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted with:', { username, message, date, time, scheduledTime });
    
    if (!username || !message || !date || !time) {
      console.log('Missing fields:', { username: !username, message: !message, date: !date, time: !time });
      toast.error('Please fill in all fields');
      return;
    }
    
    const scheduledDateTime = new Date(scheduledTime);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      toast.error('Please select a future date and time');
      return;
    }
    
    setIsScheduling(true);
    
    try {
      await scheduleMessage({
        receiverUsername: username,
        message,
        scheduledTime: scheduledDateTime,
        messageType: 'text'
      });
      
      setMessage('');
      setScheduledTime('');
      await loadScheduledMessages();
      toast.success('Message scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to schedule message');
    } finally {
      setIsScheduling(false);
    }
  };

  // Handle canceling a scheduled message
  const handleCancelScheduled = async (messageId) => {
    setIsCancelling(prev => ({ ...prev, [messageId]: true }));
    try {
      await cancelScheduledMessage(messageId);
      await loadScheduledMessages();
      toast.success('Scheduled message cancelled');
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      toast.error('Failed to cancel scheduled message');
    } finally {
      setIsCancelling(prev => ({ ...prev, [messageId]: false }));
    }
  };

  // Render scheduled messages list
  const renderScheduledMessages = () => {
    if (isLoading) {
      return (
        <div className="mt-8 flex flex-col items-center justify-center py-8">
          <div className="animate-pulse flex space-x-4 mb-3">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50"></div>
          </div>
          <p className="text-sm text-purple-600/80 dark:text-purple-400/80">Loading scheduled messages...</p>
        </div>
      );
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return (
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-purple-50/80 dark:bg-purple-900/20 mb-3">
            <FiClock className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          </div>
          <h3 className="text-base font-medium text-purple-900 dark:text-purple-100 mb-1">No scheduled messages</h3>
          <p className="text-sm text-purple-600/80 dark:text-purple-400/80 max-w-xs">
            Schedule your first message to get started!
          </p>
        </div>
      );
    }
    
    if (filteredScheduledMessages.length === 0) {
      return (
        <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-green-50/80 dark:bg-green-900/20 mb-3">
            <FiCheck className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
          <h3 className="text-base font-medium text-purple-900 dark:text-purple-100 mb-1">All caught up!</h3>
          <p className="text-sm text-purple-600/80 dark:text-purple-400/80 max-w-xs">
            No pending scheduled messages. Schedule a new one above.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
            📅 Scheduled Messages
          </h3>
          
          {scheduledMessages.length > 0 ? (
            <div className="space-y-2">
              {scheduledMessages.map((msg) => {
                const isPastDue = new Date(msg.scheduledTime) <= new Date();
                const isScheduled = msg.status === 'scheduled';
                
                return (
                  <div key={msg._id} className="relative p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          To: {msg.recipient}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {msg.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(msg.scheduledTime), 'MMM d, yyyy h:mm a')}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                          isPastDue
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {isPastDue ? 'Sent' : 'Scheduled'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelScheduled(msg._id)}
                        disabled={isCancelling[msg._id] || isPastDue}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isPastDue ? 'Cannot cancel sent message' : 'Cancel scheduled message'}
                      >
                        {isCancelling[msg._id] ? (
                          <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        ) : (
                          <FiX size={16} />
                        )}
                      </button>
                    </div>
                    
                    {isScheduled && !isPastDue && (
                      <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                          style={{ 
                            width: `${Math.min(100, (1 - (new Date(msg.scheduledTime) - new Date()) / (new Date(msg.scheduledTime) - new Date(msg.createdAt))) * 100)}%`
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No scheduled messages. Schedule one above to see it here.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm" 
          onClick={onClose}
          aria-hidden="true"
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-purple-200 dark:border-purple-900/50 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold leading-6 text-purple-900 dark:text-purple-100" id="modal-title">
              ✨ Schedule a Message
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-purple-400 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
            >
              <span className="sr-only">Close</span>
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          {/* Main Content */}
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-white/50 dark:bg-gray-800/50 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-800 dark:text-purple-200 flex items-center">
                  <FiUser className="mr-2 text-purple-600 dark:text-purple-400" />
                  <span>Recipient</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                    @
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-8 pr-3 py-3 border-2 border-purple-100 dark:border-purple-900/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 dark:bg-gray-800/80 text-purple-900 dark:text-purple-100 transition-all duration-200 placeholder-purple-300 dark:placeholder-purple-700"
                    placeholder="username"
                    required
                  />
                </div>
              </div>
              
              {/* Message Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-purple-800 dark:text-purple-200">
                  Your Message
                </label>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="block w-full px-4 py-3 border-2 border-purple-100 dark:border-purple-900/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 dark:bg-gray-800/80 text-purple-900 dark:text-purple-100 transition-all duration-200 resize-none min-h-[120px] placeholder-purple-300 dark:placeholder-purple-700"
                    placeholder="Type your message here..."
                    required
                  />
                </div>
              </div>
              
              {/* Date and Time Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-800 dark:text-purple-200">
                    Select Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      min={todayString}
                      onChange={(e) => {
                        console.log('Date selected:', e.target.value);
                        setDate(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="block w-full px-4 py-3 border-2 border-purple-100 dark:border-purple-900/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 dark:bg-gray-800/80 text-purple-900 dark:text-purple-100 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                {/* Time Picker */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-800 dark:text-purple-200">
                    Select Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="block w-full px-4 py-3 border-2 border-purple-100 dark:border-purple-900/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 dark:bg-gray-800/80 text-purple-900 dark:text-purple-100 transition-all duration-200"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiClock className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FiSend className="mr-2" />
                  {isScheduling ? 'Scheduling...' : 'Schedule Message'}
                </button>
              </div>
            </form>
            
            {/* Scheduled Messages List */}
            {renderScheduledMessages()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
