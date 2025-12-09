import { useState, useEffect, useRef } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { IconButton, Tooltip, Box, Typography, Snackbar, Alert } from '@mui/material';
import { useChatStore } from '../../store/useChatStore';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import { axiosInstance } from '../../lib/axios';

const AegisButton = ({ inline = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isAegisActive, setIsAegisActive] = useState(false);
  const [error, setError] = useState(null);
  const recognition = useRef(null);
  const silenceTimer = useRef(null);
  const { users, getUsers, setSelectedUser, selectedUser, sendMessage } = useChatStore(); // Added sendMessage
  const [expectingMessageFor, setExpectingMessageFor] = useState(null); // Tracks user ID for multi-turn message
  const [isDictatingMessage, setIsDictatingMessage] = useState(false); // New state for dictation mode
  const isDictatingMessageRef = useRef(false); // Ref to track dictation mode synchronously
  const isStartingRef = useRef(false); // New ref to prevent multiple start attempts
  const isFirstDictationUtterance = useRef(false); // New ref to skip first utterance in dictation mode

  const showError = (message) => {
    console.error('Aegis Error:', message);
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  useEffect(() => {
    console.log('Aegis: Initializing...');
    
    // Load users if not already loaded
    if (users.length === 0) {
      getUsers().catch(err => {
        console.error('Aegis: Failed to load users:', err);
        showError("Failed to load user list. Some features may not work properly.");
      });
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showError('Speech recognition not supported in this browser');
      return;
    }
    
    // Initialize recognition with enhanced settings
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'en-US';
    recognition.current.maxAlternatives = 3; // Get more alternatives for better accuracy
    recognition.current.pause = 10000; // Wait 10 seconds after user stops speaking
    recognition.current.silenceTimeout = 10000; // Wait 10 seconds of silence before ending
    recognition.current.noiseThreshold = 0.5; // Adjust noise threshold for better voice detection
    
    // Handle recognition results
    recognition.current.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      const isFinal = event.results[last].isFinal; // Check if the result is final

      console.log('Aegis: Heard:', transcript, ' (isFinal:', isFinal, ')');
      
      if (isFinal) { // Only process final results
      processCommand(transcript);
      }
    };
    
    // Handle recognition errors
    recognition.current.onerror = (event) => {
      console.error('Aegis: Speech recognition error', event.error);
      isStartingRef.current = false; // Reset starting flag on error
      let errorMessage = 'Error with speech recognition';
      
      switch(event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access was denied. Please allow microphone access to use Aegis.';
          setIsListening(false);
          setIsAegisActive(false);
          break;
        case 'audio-capture':
          errorMessage = 'No microphone was found. Please ensure a microphone is connected.';
          setIsListening(false);
          setIsAegisActive(false);
          break;
        case 'no-speech': // Do not deactivate for no-speech, let onend handle restart if active
          errorMessage = 'I didn\'t hear anything. Please try again.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
          setIsListening(false); // Default to deactivating for unknown errors
          setIsAegisActive(false);
      }
      
      showError(errorMessage);
    };

    // Handle recognition starting
    recognition.current.onstart = () => {
      console.log('Aegis: Speech recognition started. Setting isListening to true.');
      setIsListening(true); // Explicitly set listening state here
      isStartingRef.current = false; // Reset starting flag
    };

    // Handle recognition ending
    recognition.current.onend = () => {
      console.log('Aegis: Speech recognition ended.');
      setIsListening(false); // Update local state
      // If Aegis is still active, try to restart listening
      if (isAegisActive) {
        console.log('Aegis: Aegis is still active, attempting to restart listening...');
        setTimeout(() => {
          // Only restart if recognition.current is valid and not already listening
          if (recognition.current && !recognition.current.listening) {
            try {
              isStartingRef.current = true; // Set starting flag before attempting restart
              recognition.current.start();
              console.log('Aegis: Recognition restarted successfully after end.');
            } catch (e) {
              console.error('Aegis: Error restarting recognition after end:', e);
              showError(`Failed to restart listening: ${e.message}`);
              setIsAegisActive(false); // Deactivate if restart fails
              recognition.current = null; // Re-initialize recognition on critical error
            } finally {
              isStartingRef.current = false; // Always reset starting flag
            }
          } else {
            console.log('Aegis: Not restarting recognition: Already listening or recognition object invalid.');
          }
        }, 500); // Wait 500ms before attempting to restart
      }
    };

    // Cleanup function
    return () => {
      if (recognition.current) {
        try {
          recognition.current.stop(); // Use stop for a clean shutdown
        } catch (e) {
          console.log('Aegis: Error stopping recognition on cleanup:', e);
        }
      }
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
    };
  }, [isAegisActive]);

  const speakResponse = (text) => {
    // Enforce privacy before speaking
    const safeText = enforcePrivacy(text);
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(safeText);
      
      // Configure voice settings
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google US English') || 
        voice.lang.includes('en-US')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // Set speech properties
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Log when speech starts/ends
      utterance.onstart = () => console.log('Aegis: Speaking:', text);
      utterance.onend = () => console.log('Aegis: Finished speaking');
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported');
    }
  };

  // Check if the command is to activate/deactivate Aegis
  const checkActivationCommand = (command) => {
    const raw = command.toLowerCase().trim();
    const cmd = raw
      .replace(/[^\w\s]/g, ' ') // remove punctuation like commas/periods
      .replace(/\s+/g, ' ')      // collapse multiple spaces
      .trim();
    console.log('Aegis: Checking activation for command:', cmd);
    
    // Check for activation phrase with fuzzy matching for 'aegis'
    const activationPhrases = [
      'hello aegis', 'hey aegis', 'hi aegis', 'aegis',
      // Common mishearings (made stricter for exact match)
      'hello ages', 'hey ages', 'hi ages',
      'hello agis', 'hey agis', 'hi agis',
      'hello aegist', 'hey aegist', 'hi aegist'
    ];
    
    // Check if any activation phrase is an exact match for the command or starts the command
    const isActivationCommand = activationPhrases.some(phrase => cmd === phrase || cmd.startsWith(phrase + ' '));
    
    if (isActivationCommand) {
      console.log('Aegis: Activation phrase detected');
      if (!isAegisActive) {
        console.log('Aegis: Activating...');
        setIsAegisActive(true);
        // Start listening when activated
        if (!isListening) {
          toggleListening(true);
        }
        speakResponse("Hello! I'm Aegis. How can I assist you today?");
      } else {
        speakResponse("I'm already listening. How can I help you?");
      }
      return true;
    }
    
    // Check for deactivation phrase
    if ((cmd.includes('stop') || cmd.includes('goodbye') || cmd.includes('bye') || cmd.includes('exit')) && 
        (cmd.includes('aegis') || isAegisActive)) {
      console.log('Aegis: Deactivation phrase detected');
      if (isAegisActive) {
        console.log('Aegis: Deactivating...');
        speakResponse("Goodbye! Let me know if you need anything else.");
        setIsAegisActive(false);
      }
      return true;
    }
    
    return false;
  };

  // Privacy and security guidelines for responses
  const enforcePrivacy = (response) => {
    // Never reveal internal system information
    response = response.replace(/system\s*:|internal\s*:|configuration\s*:/gi, '')
      .replace(/\b(password|api[_-]?key|token|secret)\s*:\s*\S+/gi, '[REDACTED]')
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP ADDRESS]')
      .replace(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g, '[CREDIT CARD]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]');
    
    // Ensure no sensitive data is exposed
    if (response.toLowerCase().includes('password') || 
        response.toLowerCase().includes('token') || 
        response.toLowerCase().includes('secret')) {
      console.warn('Aegis: Attempted to return potentially sensitive information');
      return "I'm sorry, I can't provide that information for security reasons.";
    }
    
    return response;
  };

  const processCommand = async (command) => {
    console.log('Aegis: Processing command:', command.replace(/[\w\d]/g, '*')); // Redact command in logs
    const cmd = command
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // remove punctuation like commas/periods
      .replace(/\s+/g, ' ')      // collapse multiple spaces
      .trim();
    
    // If we don't have a valid command, ignore
    if (!command || command.trim() === '') {
      console.log('Aegis: Empty command, ignoring');
      return;
    }
    
    // Always check for activation/deactivation commands first
    if (checkActivationCommand(command)) {
      console.log('Aegis: Handled as activation/deactivation command');
      return;
    }

    // --- HIGH PRIORITY: Always check for stop dictation command ---
    if (cmd === 'stop sending' || cmd.includes('stop dictating') || cmd.includes('finish message')) {
        if (isDictatingMessageRef.current) {
            speakResponse("Okay, I've stopped sending messages. What else can I help you with?");
        } else {
            speakResponse("I wasn't sending a message, but I've stopped listening for messages.");
        }
        setIsDictatingMessage(false);
        isDictatingMessageRef.current = false; // Synchronize ref
        isFirstDictationUtterance.current = false; // Reset on exit
        setExpectingMessageFor(null);
        
        // Explicitly stop speech recognition here to ensure clean state
        if (recognition.current && recognition.current.listening) {
            recognition.current.stop();
        }
        return; // Exit immediately after handling stop command
    }
    
    // If Aegis is not active, ignore the command
    if (!isAegisActive) {
      console.log('Aegis: Not active, ignoring command');
      if (isListening) {
        toggleListening();
      }
      return;
    }

    // If we're not listening, try to start listening
    if (!isListening) {
      console.log('Aegis: Not listening, attempting to start...');
      toggleListening(true);
      return;
    }

    // If Aegis is active, give visual feedback and reset inactivity timer
    if (isAegisActive) {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
      silenceTimer.current = setTimeout(() => {
        console.log('Aegis: Inactivity timeout');
        if (isAegisActive) {
          speakResponse("I'll be here if you need me. Just say 'Hello Aegis' when you need assistance.");
          setIsAegisActive(false);
          setIsDictatingMessage(false);
          isDictatingMessageRef.current = false; // Synchronize ref
          isFirstDictationUtterance.current = false; // Reset on timeout
          setExpectingMessageFor(null);
          // Explicitly stop listening on inactivity timeout
          if (recognition.current && recognition.current.listening) {
            recognition.current.stop();
          }
        }
      }, 30000); // 30 seconds of inactivity
    }
    
    // --- Priority 1: Dictation Mode Handling ---
    if (isDictatingMessageRef.current) { // Use ref for synchronous check
        // Skip the very first utterance after entering dictation mode
        if (isFirstDictationUtterance.current) {
            console.log('Aegis: Skipping first dictation utterance:', command);
            isFirstDictationUtterance.current = false; // Reset for subsequent utterances
            return; 
        }

        // Removed stop sending logic from here as it's now handled at higher priority

        const recipientUser = users.find(user => user._id === expectingMessageFor);
        if (recipientUser) {
            speakResponse(`Sending message to ${recipientUser.fullName || recipientUser.username}: ${command}`);
            sendMessage({ text: command }, recipientUser._id); // Pass command as text property in an object
            console.log(`Aegis: [ACTION] Sending message: "${command}" to user ID: ${recipientUser._id}`);
        } else {
            console.log('Aegis: expectingMessageFor is invalid or recipient not found. expectingMessageFor:', expectingMessageFor);
            // Fallback to selectedUser if expectingMessageFor somehow became invalid
            const fallbackRecipient = selectedUser;
            if (fallbackRecipient) {
                console.log('Aegis: Recovered recipient from selectedUser for dictation:', fallbackRecipient.fullName || fallbackRecipient.username);
                speakResponse(`Sending message to ${fallbackRecipient.fullName || fallbackRecipient.username}: ${command}`);
                sendMessage({ text: command }, fallbackRecipient._id); // Pass command as text property in an object (fallback)
                console.log(`Aegis: [ACTION] Sending message (fallback): "${command}" to user ID: ${fallbackRecipient._id}`);
            } else {
                speakResponse("I'm sorry, I lost track of who you wanted to send the message to. Please start over.");
                setIsDictatingMessage(false);
                isDictatingMessageRef.current = false;
                isFirstDictationUtterance.current = false; // Reset on exit
                setExpectingMessageFor(null);
            }
        }
        return; // Important: Exit after handling dictation
    }

    // --- Priority 2: Initiate Multi-Turn Message Sending (if just "send message" and user selected) ---
    if (cmd === 'send message') {
        console.log('Aegis: "send message" command received. Current selectedUser:', selectedUser);
        
        let currentRecipientUser = selectedUser;
        if (!currentRecipientUser && expectingMessageFor) {
            // If selectedUser isn't immediately available, try to get the user from expectingMessageFor
            currentRecipientUser = users.find(user => user._id === expectingMessageFor);
            if (currentRecipientUser) {
                console.log('Aegis: Recovered recipient from expectingMessageFor:', currentRecipientUser.fullName || currentRecipientUser.username);
            }
        }

        if (currentRecipientUser) {
            speakResponse(`What message would you like to send to ${currentRecipientUser.fullName || currentRecipientUser.username}?`);
            setIsDictatingMessage(true);
            isDictatingMessageRef.current = true; // Synchronize ref
            isFirstDictationUtterance.current = true; // Set to skip first utterance
            setExpectingMessageFor(currentRecipientUser._id); // Ensure this is correctly set
            console.log('Aegis: Dictation mode initiated for user ID:', currentRecipientUser._id);
        } else {
            speakResponse("Please open a chat with someone first, then say 'send message'.");
        }
        return;
    }

    // --- Priority 3: Single-Turn Message Sending (with recipient and/or message in one command) ---
    // Single-turn command with full message and recipient: "send message hello to Amanjot Singh"
    // Also covers "send message to Amanjot Singh hello"
    const sendMatch = cmd.match(/^(?:send|text|message)\s*(?:a\s+)?(?:(.*)\s+(?:to|for)\s+([a-zA-Z0-9\s]+))?(?:(.*))?$/i);

    if (sendMatch) {
        let messageContent = sendMatch[1] ? sendMatch[1].trim() : '';
        let recipientPhrase = sendMatch[2] ? sendMatch[2].trim() : '';
        let trailingContent = sendMatch[3] ? sendMatch[3].trim() : '';

        // If there's a recipient phrase, assume the content before it is part of the message.
        // If there's trailing content, append it to message.
        if (recipientPhrase && messageContent) {
            messageContent = `${messageContent} ${trailingContent}`.trim();
        } else if (trailingContent) {
            messageContent = trailingContent.trim(); // If no recipient phrase, then trailing is the message
        }

        let targetUser = null;
        if (recipientPhrase) {
            targetUser = users.find(user => 
                user.fullName?.toLowerCase().includes(recipientPhrase.toLowerCase()) ||
                user.username?.toLowerCase().includes(recipientPhrase.toLowerCase())
            );
        }

        // Clean up message content from commands like "send message saying hello"
        messageContent = messageContent.replace(/^(?:saying|that)\s+/i, '').trim();

        if (targetUser && messageContent) {
            // Both recipient and message are in the initial command
            speakResponse(`Sending message to ${targetUser.fullName || targetUser.username}: ${messageContent}`);
            setSelectedUser(targetUser); // Ensure chat is opened/selected
            sendMessage({ text: messageContent }, targetUser._id); // Pass messageContent as text property in an object
            console.log(`Aegis: [ACTION] Sending direct message: "${messageContent}" to user ID: ${targetUser._id}`);
            return;
        } else if (targetUser) {
            // Recipient found, but no message content. Transition to dictation mode.
            speakResponse(`What message would you like to send to ${targetUser.fullName || targetUser.username}?`);
            setIsDictatingMessage(true);
            isDictatingMessageRef.current = true; // Synchronize ref
            isFirstDictationUtterance.current = true; // Set to skip first utterance
            setExpectingMessageFor(targetUser._id);
            return;
        } else if (messageContent) {
             // Message content but no recipient in command. Try to infer from selected user.
             if (selectedUser) {
                speakResponse(`Sending message to ${selectedUser.fullName || selectedUser.username}: ${messageContent}`);
                sendMessage({ text: messageContent }, selectedUser._id); // Pass messageContent as text property in an object
                console.log(`Aegis: [ACTION] Sending message to selected user: "${messageContent}" to user ID: ${selectedUser._id}`);
             } else {
                speakResponse("To whom would you like to send this message?");
             }
             return;
        }
    }


    // --- Other Commands (processed only if not dictating and not a direct send) ---

    // Open chat with user
    if (cmd.includes('open chat') || cmd.includes('start chat') || cmd.includes('chat with')) {
      // First, ensure we have users loaded
      if (!users || users.length === 0) {
        console.log('Aegis: No users loaded yet, fetching users...');
        try {
          await getUsers(); // Refresh the user list
          if (!users || users.length === 0) {
            speakResponse("I couldn't load the user list. Please try again later.");
            return;
          }
        } catch (error) {
          console.error('Aegis: Error fetching users:', error);
          speakResponse("I'm having trouble accessing the user list. Please try again later.");
          return;
        }
      }
      
      const chatNameMatch = cmd.match(/(?:open\s*(?:chat)?|start\s*(?:chat)?|chat)\s*(?:with|to)\s+([a-zA-Z0-9\s]+)/i);
      console.log('Aegis: chatNameMatch result:', chatNameMatch);
      let chatName = chatNameMatch && chatNameMatch[1] ? chatNameMatch[1].trim() : '';
      console.log('Aegis: Extracted chatName:', chatName);

      if (!chatName) {
        speakResponse("Who would you like to chat with?");
        return;
      }
      
      const foundUser = users.find(user => 
        user.fullName?.toLowerCase().includes(chatName.toLowerCase()) ||
        user.username?.toLowerCase().includes(chatName.toLowerCase())
      );
      console.log('Aegis: Found user:', foundUser);
      console.log('Aegis: Available users include:', users.map(u => u.fullName || u.username).join(', '));
      
      if (foundUser) {
        speakResponse(`Opening chat with ${foundUser.fullName || foundUser.username}`);
        setSelectedUser(foundUser);
        // Set expectingMessageFor for potential follow-up messages
        setExpectingMessageFor(foundUser._id); 
      } else {
        speakResponse(`I couldn't find a user named ${chatName}. Please try again.`);
      }
      return;
    }
    
    // Block / Unblock user by name via voice
    // Examples: "block John Doe", "unblock john", "block user alice"
    if (
      cmd.startsWith('block ') || cmd.includes(' block ') ||
      cmd.startsWith('unblock ') || cmd.includes(' unblock ')
    ) {
      // Ensure users list is available
      let userList = users;
      if (!userList || userList.length === 0) {
        try { await getUsers(); } catch {}
        // Pull fresh state to avoid stale closure after await
        try { userList = (useChatStore.getState && useChatStore.getState().users) || users; } catch { userList = users; }
      }

      const m = cmd.match(/(?:^|\b)(block|unblock)\s+(?:user\s+)?([a-zA-Z0-9._\-\s]+)/i);
      const action = m?.[1]?.toLowerCase();
      const namePhrase = m?.[2]?.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

      if (!namePhrase) {
        speakResponse("Please say the user's name. For example, 'block John Doe'.");
        return;
      }

      // Resolve by fullName or username (case-insensitive includes)
      const target = (userList || []).find(u =>
        u.fullName?.toLowerCase().includes(namePhrase.toLowerCase()) ||
        u.username?.toLowerCase().includes(namePhrase.toLowerCase())
      );

      if (!target) {
        speakResponse(`I couldn't find a user named ${namePhrase}. Try a different name.`);
        return;
      }

      try {
        if (action === 'block') {
          await axiosInstance.post(`/users/block/${target._id}`);
          speakResponse(`${target.fullName || target.username} has been blocked.`);
        } else if (action === 'unblock') {
          await axiosInstance.post(`/users/unblock/${target._id}`);
          speakResponse(`${target.fullName || target.username} has been unblocked.`);
        } else {
          speakResponse('Please say block or unblock followed by the user name.');
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'request failed';
        speakResponse(`Sorry, I couldn't complete that: ${msg}`);
      }
      return;
    }

    // Privacy and security related queries
    if (cmd.includes('privacy') || cmd.includes('security') || cmd.includes('data protection')) {
      const privacyResponses = [
        "Your privacy and security are important. I'm designed to protect your personal information and only process what's necessary to assist you.",
        "I follow strict privacy guidelines and don't store your conversations or personal data without your consent.",
        "Security is a top priority. Your data is encrypted and protected according to industry standards."
      ];
      speakResponse(privacyResponses[Math.floor(Math.random() * privacyResponses.length)]);
      return;
    }
    // Thank you responses
    if (cmd.includes('thank') || cmd.includes('thanks') || cmd.includes('appreciate')) {
      const thanksResponses = [
        "You're welcome! Is there anything else I can help you with?",
        "Happy to help! Let me know if you need anything else.",
        "Anytime! Don't hesitate to ask if you need more assistance."
      ];
      speakResponse(thanksResponses[Math.floor(Math.random() * thanksResponses.length)]);
      return;
    }
    // Greetings and basic interactions (Lower priority)
    if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('hey')) {
      const greetings = [
        "Hello! How can I help you today?",
        "Hi there! What can I do for you?",
        "Hello! I'm Aegis, your personal assistant. How can I assist you?"
      ];
      speakResponse(greetings[Math.floor(Math.random() * greetings.length)]);
      return;
    }
    // About Aegis
    if (cmd.includes('who are you') || cmd.includes('what are you') || cmd.includes('your name')) {
      const responses = [
        "I'm Aegis, your personal AI assistant. I'm here to help you with your chat app and more!",
        "I'm Aegis, your helpful assistant. I can help you send messages, share files, and answer questions.",
        "My name is Aegis. I'm your AI assistant, here to make your chat experience better and more productive."
      ];
      speakResponse(responses[Math.floor(Math.random() * responses.length)]);
      return;
    }
    // Help commands
    if (cmd.includes('help') || cmd.includes('what can you do')) {
      const helpText = `I can help you with various tasks. Here are some examples:\n` +
        "- 'Open chat with John' to start a conversation\n" +
        "- 'Send message hello' to send a message\n" +
        "- 'What time is it?' to get the current time\n" +
        "- 'Goodbye' to say goodbye";
      speakResponse(helpText);
      return;
    }
    // Weather queries
    if (cmd.includes('weather') || cmd.includes('temperature') || cmd.includes('forecast')) {
      const weatherResponses = [
        "I can't check the weather right now, but I can help you with other things. What would you like to do?",
        "I don't have access to weather information at the moment. Is there something else I can help you with?",
        "For weather updates, you might want to check a weather app or website. How else can I assist you?"
      ];
      speakResponse(weatherResponses[Math.floor(Math.random() * weatherResponses.length)]);
          return;
    }
    // General conversation - more natural responses
    if (cmd.includes('how are you') || cmd.includes('how\'s it going')) {
      const responses = [
        "I'm doing well, thank you for asking! How can I assist you today?",
        "I'm here and ready to help! What can I do for you?",
        "I'm functioning at optimal capacity. How may I be of service?"
      ];
      speakResponse(responses[Math.floor(Math.random() * responses.length)]);
      return;
    }
    // System information requests
    if (cmd.includes('system info') || cmd.includes('version') || cmd.includes('who made you')) {
      const systemResponses = [
        "I'm Aegis, your personal assistant, designed to help you with your chat application.",
        "I'm here to assist you with your chat app. How can I help you today?",
        "I'm Aegis, your AI assistant, focused on helping you with your messaging needs."
      ];
      speakResponse(systemResponses[Math.floor(Math.random() * systemResponses.length)]);
      return;
    }
    // Time and date
    if (cmd.includes('time') || cmd.includes('date') || cmd.includes('what day is it')) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateString = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      speakResponse(`It's ${timeString} on ${dateString}`);
      return;
    }
    // File upload commands
    if (cmd.includes('send file') || cmd.includes('upload file') || cmd.includes('share file') || 
             cmd.includes('send video') || cmd.includes('upload video') || 
             cmd.includes('send pdf') || cmd.includes('upload pdf')) {
      
      let fileType = 'file';
      if (cmd.includes('video')) {
        fileType = 'video';
      } else if (cmd.includes('pdf')) {
        fileType = 'pdf';
      }
      
      speakResponse(`Please select the ${fileType} file you'd like to send.`);
      
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.accept = fileType === 'video' ? 'video/*' : 
                          fileType === 'pdf' ? '.pdf' : '*/*';
        fileInput.click();
      } else {
        speakResponse("I couldn't find the file upload button. Please try uploading the file manually.");
      }
      return;
    }
    // Profile picture change
    if (cmd.includes('change profile picture') || cmd.includes('update profile picture') || 
             cmd.includes('change my picture') || cmd.includes('update my picture') ||
             cmd.includes('change my profile photo') || cmd.includes('update my profile photo')) {
      
      speakResponse("Please select a new profile picture from your device.");
      
      const profilePicInput = document.querySelector('input[type="file"][accept^="image/"]');
      if (profilePicInput) {
        profilePicInput.accept = 'image/*';
        profilePicInput.click();
      } else {
        const profileLink = document.querySelector('a[href*="profile"], [href*="profile"]');
        if (profileLink) {
          speakResponse("I'll take you to your profile page where you can update your picture.");
          profileLink.click();
        } else {
          speakResponse("I couldn't find the profile picture upload option. Please update your profile picture manually from the profile page.");
        }
      }
        return;
    }
    // Goodbye
    if (cmd.includes('goodbye') || cmd.includes('bye') || cmd.includes('see you')) {
      const goodbyes = [
        "Goodbye! Have a great day!",
        "See you later! Don't hesitate to call me if you need anything.",
        "Bye! It was nice talking to you."
      ];
      speakResponse(goodbyes[Math.floor(Math.random() * goodbyes.length)]);
      setIsAegisActive(false);
      return;
    }
    
    // Fallback for unrecognized commands (lowest priority, conditional response)
    console.log('Aegis: Command not recognized by any specific pattern:', cmd);
    if (Math.random() > 0.7) { 
      const fallbackResponses = [
        "I'm not sure I understand. Could you try rephrasing that?",
        "I'm still learning. Could you ask me something else?",
        "I'm not sure how to help with that. Try asking me to send a message or open a chat.",
        "I'm sorry, I didn't get that. Could you say it differently?"
      ];
      speakResponse(fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]);
      return;
    }
  };

  const toggleListening = async (startOnly = false) => {
    console.log('Aegis: Toggle listening, current state:', isListening, 'startOnly:', startOnly);
    
    if (isListening && !startOnly) {
      console.log('Aegis: Stopping recognition...');
      try {
        if (recognition.current) {
          recognition.current.stop(); // Use stop to ensure a clean stop
        }
        
        if (isAegisActive) {
          console.log('Aegis: Deactivating...');
          speakResponse("Goodbye!");
          setIsAegisActive(false);
          setIsDictatingMessage(false);
          isDictatingMessageRef.current = false; // Synchronize ref
          isFirstDictationUtterance.current = false; // Reset on exit
          setExpectingMessageFor(null);
        }
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      return;
    }
    
    console.log('Aegis: Starting recognition...');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!recognition.current) {
        console.log('Aegis: Recognition not initialized, initializing...');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          showError('Speech recognition not supported in this browser');
          return;
        }
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = true;
        recognition.current.lang = 'en-US';
        recognition.current.maxAlternatives = 3;
        recognition.current.pause = 10000;
        recognition.current.silenceTimeout = 10000;
        recognition.current.noiseThreshold = 0.5;

        // Bind onstart and onend handlers if recognition.current was just initialized
        recognition.current.onstart = () => {
          console.log('Aegis: Speech recognition started (from toggleListening init). Setting isListening to true.');
          setIsListening(true);
          isStartingRef.current = false; // Reset starting flag
        };
        recognition.current.onend = () => {
          console.log('Aegis: Speech recognition ended (from toggleListening init).');
          setIsListening(false);
          if (isAegisActive) {
            setTimeout(() => {
              if (isAegisActive && recognition.current && !recognition.current.listening) {
                try {
                  isStartingRef.current = true; // Set starting flag before attempting restart
                  recognition.current.start();
                  console.log('Aegis: Recognition restarted successfully after end (from toggleListening init).');
                } catch (e) {
                  console.error('Aegis: Error restarting recognition (from toggleListening init):', e);
                  showError(`Failed to restart listening: ${e.message}`);
                  setIsAegisActive(false);
                  recognition.current = null; // Re-initialize recognition on critical error
                } finally {
                  isStartingRef.current = false; // Always reset starting flag
                }
              } else {
                console.log('Aegis: Not restarting recognition (from toggleListening init): Already listening or recognition object invalid.');
              }
            }, 500);
          }
        };

        // Bind onerror handler if recognition.current was just initialized
        recognition.current.onerror = (event) => {
          console.error('Aegis: Speech recognition error (from toggleListening init)', event.error);
          isStartingRef.current = false; // Reset starting flag on error
          let errorMessage = 'Error with speech recognition';
          switch(event.error) {
            case 'not-allowed':
              errorMessage = 'Microphone access was denied. Please allow microphone access to use Aegis.';
              setIsListening(false);
              setIsAegisActive(false);
              break;
            case 'audio-capture':
              errorMessage = 'No microphone was found. Please ensure a microphone is connected.';
              setIsListening(false);
              setIsAegisActive(false);
              break;
            case 'no-speech':
              errorMessage = 'I didn\'t hear anything. Please try again.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
              setIsListening(false);
              setIsAegisActive(false);
          }
          showError(errorMessage);
        };
      }
      
      // Prevent multiple start attempts if already trying to start
      if (isStartingRef.current) {
        console.log('Aegis: Already attempting to start recognition. Skipping.');
        return; 
      }
      
      isStartingRef.current = true; // Set flag before attempting to start

      recognition.current.start();
      console.log('Aegis: Recognition started');
      
      if (!isAegisActive) {
        setTimeout(() => {
          if (!isAegisActive) {
            speakResponse("I'm listening. Say 'Hello Aegis' to get started.");
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting recognition:', error);
      
      if (error.name === 'InvalidStateError') {
        console.warn('Aegis: InvalidStateError caught during start. Re-initializing recognition object.');
        recognition.current = null; // Force re-initialization on next attempt
        showError('Voice recognition encountered an error and is restarting. Please try again.');
      } else {
      showError('Failed to start voice recognition. Please check your microphone settings.');
      setIsListening(false);
      setIsAegisActive(false);
      }
    }
  };

  if (inline) {
    return (
      <Tooltip title={isListening ? 'Listening... Click to stop' : 'Start Voice Assistant'}>
        <IconButton
          onClick={toggleListening}
          color={isListening ? 'primary' : 'default'}
          sx={{
            width: 40,
            height: 40,
            backgroundColor: isAegisActive ? '#4caf50' : 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: isAegisActive ? '#388e3c' : 'primary.dark',
            },
            boxShadow: isListening ? '0 0 8px rgba(0,0,0,0.2)' : 'none',
            transition: 'all 0.3s ease',
            marginLeft: 8,
          }}
        >
          {isListening ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      <Tooltip title={isListening ? 'Listening... Click to stop' : 'Start Voice Assistant'}>
        <IconButton
          onClick={toggleListening}
          color={isListening ? 'primary' : 'default'}
          sx={{
            width: 64,
            height: 64,
            backgroundColor: isAegisActive ? '#4caf50' : 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: isAegisActive ? '#388e3c' : 'primary.dark',
            },
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.1)' },
              '100%': { transform: 'scale(1)' }
            },
            boxShadow: isListening ? '0 0 15px rgba(0,0,0,0.3)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          {isListening ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tooltip>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      {isAegisActive && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            mb: 1,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 3,
            minWidth: 200,
          }}
        >
          <Typography variant="body2" color="text.primary">
            Aegis is listening...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

AegisButton.propTypes = {
  inline: PropTypes.bool,
};

export default AegisButton;
