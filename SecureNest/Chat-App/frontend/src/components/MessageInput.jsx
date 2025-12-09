import { useRef, useState, useEffect, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Smile, Mic, Square, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from 'emoji-picker-react';
import HashtagSuggestions from "./HashtagSuggestions";
import useHashtagSuggestions from "../hooks/useHashtagSuggestions";

const MessageInput = () => {
  // State for message input and media
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [measuredDuration, setMeasuredDuration] = useState(0);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileName, setFileName] = useState('');
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const audioPreviewRef = useRef(null);
  
  // Chat store and recording interval
  const { sendMessage, selectedUser } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const recordingInterval = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const caretRef = useRef({ start: null, end: null });

  // Build a stable room id for 1:1 chat using sorted user IDs
  const roomId = (authUser?._id && selectedUser?._id)
    ? [authUser._id.toString(), selectedUser._id.toString()].sort().join(":")
    : null;

  const emitStopTyping = useCallback(() => {
    if (!socket || !roomId) return;
    if (isTypingRef.current) {
      socket.emit("stopTyping", { roomId, senderId: authUser?._id });
      isTypingRef.current = false;
    }
  }, [socket, roomId, authUser?._id]);

  const scheduleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
    }, 1000);
  }, [emitStopTyping]);
  
  // Handle when a suggestion is selected
  const handleSuggestionSelect = useCallback((newText) => {
    setText(newText);
  }, []);

  // Hashtag suggestions hook
  const {
    inputRef,
    suggestions,
    isLoading: isLoadingSuggestions,
    showSuggestions,
    selectedIndex: selectedSuggestionIndex,
    position: suggestionPosition,
    handleInputChange: handleHashtagInputChange,
    handleKeyDown: handleSuggestionKeyDown,
    selectSuggestion,
    setShowSuggestions,
    setSelectedIndex: setSelectedSuggestionIndex,
  } = useHashtagSuggestions(handleSuggestionSelect);

  // Toggle emoji picker
  const toggleEmojiPicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEmojiPicker(prev => !prev);
  };

  // Cleanup typing timers and stopTyping on unmount or when room changes
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitStopTyping();
    };
  }, [emitStopTyping, roomId]);

  // Handle emoji selection (insert at caret, keep focus)
  const onEmojiClick = (emojiData, event) => {
    // Support both emoji-picker-react signatures
    const maybeEmoji = (typeof emojiData === 'string') ? emojiData : emojiData?.emoji;
    const emoji = maybeEmoji || '';
    if (!emoji) return;
    const el = inputRef.current;
    // Use saved caret if input lost focus
    const savedStart = caretRef.current.start;
    const savedEnd = caretRef.current.end;
    if (el && typeof savedStart === 'number' && typeof savedEnd === 'number') {
      const start = savedStart;
      const end = savedEnd;
      const newValue = text.slice(0, start) + emoji + text.slice(end);
      setText(newValue);
      // Emit typing update
      if (socket && roomId && !isTypingRef.current) {
        socket.emit('typing', { roomId, senderId: authUser?._id });
        isTypingRef.current = true;
      }
      scheduleStopTyping();
      // Restore caret just after inserted emoji
      requestAnimationFrame(() => {
        try {
          el.focus();
          const pos = start + emoji.length;
          el.setSelectionRange(pos, pos);
          caretRef.current = { start: pos, end: pos };
        } catch {}
      });
    } else {
      // Fallback: append
      setText(prev => (prev || '') + emoji);
      if (socket && roomId && !isTypingRef.current) {
        socket.emit('typing', { roomId, senderId: authUser?._id });
        isTypingRef.current = true;
      }
      scheduleStopTyping();
      requestAnimationFrame(() => { try { el?.focus(); } catch {} });
    }
  };
  
  // Handle text input changes
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    // Check for hashtags in the input
    handleHashtagInputChange(newText);

    // Emit typing events
    if (!socket || !roomId) return;
    if (newText.trim().length > 0 && !isTypingRef.current) {
      socket.emit("typing", { roomId, senderId: authUser?._id });
      isTypingRef.current = true;
    }
    // Schedule stop after idle
    scheduleStopTyping();
  };
  
  // Handle key down events
  const handleKeyDown = useCallback((e) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() || imagePreview || audioBlob || filePreview) {
        handleSendMessage(e);
      }
    }
    
    // Cancel recording on Escape
    if (e.key === 'Escape' && isRecording) {
      e.preventDefault();
      stopRecording();
    }
  }, [text, imagePreview, audioBlob, filePreview, isRecording]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset previous file states
    setImagePreview(null);
    setFileType(null);
    setFilePreview(null);
    setFileName('');

    // Check file type and size
    const fileType = file.type.split('/')[0];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isPDF = file.type === 'application/pdf' || fileExtension === 'pdf';
    
    let maxSize = 5 * 1024 * 1024; // 5MB default
    let errorMessage = '';
    
    if (fileType === 'image') {
      maxSize = 10 * 1024 * 1024; // 10MB for images
      errorMessage = "Image size should be less than 10MB";
    } else if (fileType === 'video') {
      maxSize = 50 * 1024 * 1024; // 50MB for videos
      errorMessage = "Video size should be less than 50MB";
    } else if (isPDF) {
      maxSize = 20 * 1024 * 1024; // 20MB for PDFs
      errorMessage = "PDF size should be less than 20MB";
    } else {
      toast.error("Unsupported file type. Please upload an image, video, or PDF.");
      return;
    }

    if (file.size > maxSize) {
      toast.error(errorMessage);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (fileType === 'image') {
        setImagePreview(event.target.result);
      } else if (fileType === 'video') {
        setFileType('video');
        setFilePreview(URL.createObjectURL(file));
      } else if (isPDF) {
        setFileType('pdf');
        setFilePreview(URL.createObjectURL(file));
      }
      setFileName(file.name);
    };
    
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      toast.error("Error loading file. Please try another file.");
    };
    
    if (fileType === 'image') {
      reader.readAsDataURL(file);
    } else {
      // For videos and PDFs, we'll use the file object directly in FormData
      reader.readAsArrayBuffer(file);
    }
  };

  const removeFile = () => {
    setFileType(null);
    setFilePreview(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Revoke object URLs to free memory
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAudio = () => {
    setAudioBlob(null);
    setAudioPreview(null);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioPreview(audioUrl);
        // Keep the recorded seconds; UI preview will show measured duration once loaded
        // Reset measured duration; will recalc from metadata below
        setMeasuredDuration(0);
        setRecordingTime(prev => prev); // preserve last recorded seconds until measured
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
          recordingInterval.current = null;
        }
        // Measure accurate duration from metadata
        try {
          const probe = new Audio();
          probe.src = audioUrl;
          probe.addEventListener('loadedmetadata', () => {
            const d = Math.max(1, Math.round(probe.duration || 0));
            setMeasuredDuration(d);
          }, { once: true });
        } catch {}
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Update recording time every second
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioBlob && !filePreview) return;

    try {
      // Convert Blob to base64 if it's an audio blob
      let audioBase64 = null;
      if (audioBlob) {
        audioBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result;
            console.log('Converted audio to base64, length:', base64String.length);
            resolve(base64String);
          };
          reader.onerror = (error) => {
            console.error('Error reading audio blob:', error);
            reject(new Error('Failed to process audio'));
          };
          reader.readAsDataURL(audioBlob);
        });
      }

      // Handle file upload if there's a file
      let fileData = null;
      let fileType = null;
      
      if (fileInputRef.current?.files?.length > 0) {
        const file = fileInputRef.current.files[0];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const isPDF = file.type === 'application/pdf' || fileExtension === 'pdf';
        
        if (file.type.startsWith('video/')) {
          fileType = 'video';
        } else if (isPDF) {
          fileType = 'pdf';
        }
        
        if (fileType) {
          fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64String = reader.result;
              console.log(`Converted ${fileType} to base64, length:`, base64String.length);
              resolve({
                data: base64String,
                type: fileType,
                name: file.name,
                size: file.size
              });
            };
            reader.onerror = (error) => {
              console.error(`Error reading ${fileType} file:`, error);
              reject(new Error(`Failed to process ${fileType} file`));
            };
            reader.readAsDataURL(file);
          });
        }
      }

      // Prepare message data
      const messageData = {
        text: text.trim(),
        image: imagePreview,
        audio: audioBase64,
        audioDuration: Math.max(1, Math.round(measuredDuration || recordingTime || 0)),
        file: fileData?.data || null,
        fileType: fileData?.type || null,
        fileName: fileData?.name || null
      };

      console.log('Sending message with data:', {
        hasText: !!text.trim(),
        textLength: text.trim().length,
        hasImage: !!imagePreview,
        hasAudio: !!audioBase64,
        audioDataLength: audioBase64?.length || 0,
        audioDuration: messageData.audioDuration,
        hasFile: !!fileData,
        fileType: messageData.fileType,
        fileName: messageData.fileName
      });

      // Clear form immediately to prevent duplicate sends
      const formData = { ...messageData };
      setText("");
      setImagePreview(null);
      setAudioBlob(null);
      setAudioPreview(null);
      setMeasuredDuration(0);
      setFileType(null);
      setFilePreview(null);
      setFileName('');
      setRecordingTime(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Send the message
      await sendMessage(formData);
      // Immediately stop typing on send
      emitStopTyping();
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
      // Don't clear the form if there was an error
    }
  };

  return (
    <div className="w-full">
      {/* Audio Preview */}
      {audioPreview && (
        <div className="mb-3 relative group">
          <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-lg">
            <audio
              ref={audioPreviewRef}
              src={audioPreview}
              controls
              className="w-full"
              onEnded={(e) => { try { e.currentTarget.currentTime = 0; } catch {} }}
            />
            <button
              onClick={removeAudio}
              className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-red-900/30"
              type="button"
              aria-label="Remove audio"
            >
              <X size={16} />
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {(Math.floor((measuredDuration || recordingTime) / 60))
              .toString()
              .padStart(1, '0')}
            :
            {((measuredDuration || recordingTime) % 60).toString().padStart(2, '0')}
          </div>
        </div>
      )}

      {/* File Previews */}
      {imagePreview && (
        <div className="mb-3">
          <div className="relative inline-block">
            <div className="relative group">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-40 w-auto max-w-full rounded-lg border-2 border-amber-400 shadow-lg"
                onError={(e) => {
                  console.error("Error loading image preview");
                  e.target.onerror = null;
                  e.target.src = '';
                  toast.error("Failed to load image preview");
                  removeImage();
                }}
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white
                flex items-center justify-center transition-all duration-200 opacity-100 md:opacity-0 group-hover:opacity-100
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                type="button"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {fileType === 'video' && filePreview && (
        <div className="mb-3 relative group">
          <div className="bg-gray-800 rounded-lg p-2">
            <video
              src={filePreview}
              controls
              className="max-h-60 rounded-lg"
            />
            <div className="text-xs text-gray-300 mt-1 truncate">{fileName}</div>
          </div>
          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white
            flex items-center justify-center transition-all duration-200 opacity-100 md:opacity-0 group-hover:opacity-100
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            type="button"
            aria-label="Remove video"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {fileType === 'pdf' && filePreview && (
        <div className="mb-3 relative group bg-gray-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="bg-red-100 p-2 rounded-lg">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{fileName}</p>
              <p className="text-xs text-gray-400">PDF Document</p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white
            flex items-center justify-center transition-all duration-200 opacity-100 md:opacity-0 group-hover:opacity-100
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            type="button"
            aria-label="Remove PDF"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <style jsx>{`
        .chat-input-area-glass {
          background: rgba(17,24,39,0.95);
          border-radius: 9999px !important;
          border: none;
          box-shadow: 0 0 8px 2px #fffbe6aa, 0 0 12px 3px #ffe06688, 0 0 18px 4px #ff880066, 0 0 24px 6px #ff3d3d44, 0 1px 8px 0 #fff6e022 inset;
          position: relative;
          overflow: hidden;
          padding: 0.25rem 1.25rem;
          transition: box-shadow 0.25s;
        }
        .chat-input-area-glass:focus-within {
          box-shadow: 0 0 0 4px #fffbe6aa, 0 0 16px 4px #ffe06699, 0 0 24px 6px #ff880088, 0 0 32px 8px #ff3d3d66, 0 1px 8px 0 #fff6e022 inset;
        }
        .chat-input-text-glass {
          background: transparent;
          border: none;
          color: #e0e7ef;
          box-shadow: none;
          border-radius: 9999px !important;
          padding-left: 2.5rem;
        }
        .chat-input-text-glass:focus {
          outline: none;
          background: transparent;
          color: #fff;
        }
        .chat-action-btn {
          background: linear-gradient(120deg, #fffbe6 0%, #ffe066 40%, #ff8800 75%, #ff3d3d 100%);
          color: #181f2e;
          border: none;
          box-shadow: 0 2px 8px 0 #ffe06644;
          transition: box-shadow 0.18s, transform 0.18s, background 0.25s;
          outline: none;
        }
        .chat-action-btn:hover,
        .chat-action-btn:focus,
        .chat-action-btn:active {
          box-shadow: 0 0 16px 2px #ffe066cc, 0 0 32px 8px #ff8800cc, 0 2px 24px 0 #ff3d3dcc;
          background: linear-gradient(120deg, #fffbe6 10%, #ffe066 40%, #ff8800 75%, #ff3d3d 100%);
          color: #181f2e;
          transform: scale(1.07) rotate(-2deg);
        }

        /* Thin theme-colored accent line around the input (non-intrusive) */
        .chat-input-accent {
          position: relative;
          border-radius: 1rem; /* matches rounded-2xl */
          overflow: hidden; /* clip pseudo-elements to avoid horizontal scroll */
          box-sizing: border-box;
          max-width: 100%;
        }
        .chat-input-accent::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px; /* thicker accent line */
          background: linear-gradient(90deg, var(--accent, #14b8a6), #67e8f9, #f5d37d);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; /* Safari/Chrome */
                  mask-composite: exclude; /* Firefox */
          opacity: 0.85;
          pointer-events: none;
        }
        .chat-input-accent::after {
          content: '';
          position: absolute;
          inset: 0; /* stay within the element bounds */
          border-radius: inherit;
          pointer-events: none;
          box-shadow: 0 0 18px rgba(103,232,249,0.12); /* glow without affecting layout */
        }
        .chat-input-accent:focus-within::before {
          opacity: 1;
          box-shadow: 0 0 14px rgba(20,184,166,0.3);
        }
      `}</style>
      
      <div className="relative w-full">
        {/* Emoji Picker - Moved outside the form */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef} 
            className="absolute bottom-full left-0 mb-2 z-[100]"
            style={{
              position: 'fixed',
              bottom: '80px',
              left: '20px',
              zIndex: 1000
            }}
          >
            <EmojiPicker 
              onEmojiClick={onEmojiClick}
              width={300}
              height={350}
              previewConfig={{
                showPreview: false
              }}
              skinTonesDisabled
              searchDisabled={false}
            />
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 w-full bg-surface border border-theme rounded-2xl px-3 py-2 relative chat-input-accent"
        >
          <div className="flex-1 flex gap-2 relative">
            <div className="relative flex-1">
              <div className="relative flex items-center">
                <button
                  type="button"
                  ref={emojiButtonRef}
                  onClick={toggleEmojiPicker}
                  className="absolute left-2 text-gray-400 hover:text-amber-300 focus:outline-none z-10"
                  aria-label="Open emoji picker"
                >
                  <Smile size={20} />
                </button>
                
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input border border-theme text-primary focus:outline-none focus:ring-2 ring-accent focus:border-transparent"
                  placeholder="Type a message..."
                  value={text}
                  onChange={handleTextChange}
                  onSelect={(e) => {
                    caretRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
                  }}
                  onClick={(e) => {
                    caretRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
                  }}
                  onKeyUp={(e) => {
                    caretRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
                  }}
                  onFocus={(e) => {
                    caretRef.current = { start: e.target.selectionStart ?? text.length, end: e.target.selectionEnd ?? text.length };
                  }}
                  onKeyDown={(e) => {
                    handleSuggestionKeyDown(e);
                    handleKeyDown(e);
                  }}
                  autoComplete="off"
                />
                
                {/* Hashtag Suggestions */}
                {showSuggestions && (
                  <div 
                    className="hashtag-suggestions"
                    style={{
                      position: 'fixed',
                      transform: 'translateY(calc(-100% - 10px))',
                      left: '1rem',
                      right: '1rem',
                      zIndex: 1000,
                      maxWidth: 'calc(100% - 2rem)',
                      margin: '0 auto',
                    }}
                  >
                    <HashtagSuggestions
                      suggestions={suggestions}
                      loading={isLoadingSuggestions}
                      selectedIndex={selectedSuggestionIndex}
                      onSelect={selectSuggestion}
                      position={{ top: 0, left: 0 }}
                      onMouseEnterSuggestion={(index) => {
                        // Update selected index when hovering over suggestions
                        const newIndex = Math.min(Math.max(0, index), suggestions.length - 1);
                        if (newIndex >= 0 && newIndex < suggestions.length) {
                          setSelectedSuggestionIndex(newIndex);
                        }
                      }}
                      onMouseLeaveSuggestion={() => setSelectedSuggestionIndex(0)}
                    />
                  </div>
                )}
                
                {/* (removed duplicate inline EmojiPicker to avoid conflicts) */}
              </div>
            </div>
            
            <input
              type="file"
              accept="image/*,video/*,.pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <div className="flex items-center space-x-1">
              {/* Voice message button (press-and-hold or tap to toggle) */}
              <button
                type="button"
                className={`flex items-center justify-center w-10 h-10 rounded-full chat-action-btn ${
                  isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-400'
                }`}
                onClick={(e) => { e.preventDefault(); toggleRecording(); }}
                onMouseDown={(e) => { e.preventDefault(); if (!isRecording) startRecording(); }}
                onMouseUp={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
                onMouseLeave={(e) => { if (isRecording) stopRecording(); }}
                onTouchStart={(e) => { if (!isRecording) startRecording(); }}
                onTouchEnd={(e) => { if (isRecording) stopRecording(); }}
                title={isRecording ? 'Release to stop' : 'Hold to record (tap to toggle)'}
                aria-label={isRecording ? 'Stop Recording' : 'Record Audio'}
              >
                {isRecording ? <Square size={16} /> : <Mic size={20} />}
              </button>
              
              <button
                type="button"
                className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full chat-action-btn ${
                  (imagePreview || filePreview) ? 'text-emerald-500' : 'text-zinc-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
                title="Upload File (Image/Video/PDF)"
              >
                <Image size={20} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="p-2 rounded-full btn-accent focus:outline-none transition-transform duration-200 hover:scale-105"
            disabled={!text.trim() && !imagePreview && !audioBlob && !filePreview}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
export default MessageInput;