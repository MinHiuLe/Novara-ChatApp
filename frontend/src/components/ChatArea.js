import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import './ChatArea.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Message reducer for state management
const messagesReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return action.payload;
    case 'ADD_MESSAGE':
      return [...state, action.payload];
    case 'UPDATE_SEEN':
      return state.map((msg) =>
        msg.senderId === action.senderId && !msg.seen ? { ...msg, seen: true } : msg
      );
    case 'REMOVE_MESSAGE':
      return state.filter(msg => msg._id !== action.messageId);
    default:
      return state;
  }
};

const ChatArea = React.memo(({ selectedUser, currentUserId, users, socket, onlineStatus }) => {
  const [content, setContent] = useState('');
  const [messages, dispatch] = useReducer(messagesReducer, []);
  const [typingUser, setTypingUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFileHovered, setIsFileHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  
  // Get selected user ID helper
  const getSelectedUserId = useCallback(() => {
    return users.find(u => u.username === selectedUser)?._id;
  }, [selectedUser, users]);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại');
      }
      
      const response = await axios.get(`${BASE_URL}/api/messages?username=${selectedUser}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: 'SET_MESSAGES', payload: response.data || [] });
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Lỗi khi tải tin nhắn: ' + (error.response?.data?.error || error.message));
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    } finally {
      setIsLoading(false);
    }
  }, [selectedUser]);

  // Handle user selection changes
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      
      const selectedUserId = getSelectedUserId();
      if (selectedUserId && socket && onlineStatus[selectedUserId]) {
        socket.emit('markAsSeen', { senderId: selectedUserId });
      }
      
      // Focus input when changing chat
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  }, [selectedUser, socket, onlineStatus, fetchMessages, getSelectedUserId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const selectedUserId = getSelectedUserId();

    const handleNewMessage = (msg) => {
      if (msg.senderId !== currentUserId) {
        const isRelevantMessage = 
          (msg.senderId === selectedUserId && msg.receiverId === currentUserId) ||
          (msg.receiverId === selectedUserId && msg.senderId === currentUserId);
          
        if (isRelevantMessage) {
          dispatch({ type: 'ADD_MESSAGE', payload: msg });
          
          // Play notification sound
          const audio = new Audio('/message-sound.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log('Audio play failed:', e));
        }
      }
    };

    const handleReceiveFile = (msg) => {
      const isRelevantFile = 
        (msg.senderId === currentUserId && msg.receiverId === selectedUserId) ||
        (msg.senderId === selectedUserId && msg.receiverId === currentUserId);
        
      if (isRelevantFile) {
        dispatch({ type: 'ADD_MESSAGE', payload: msg });
      }
    };

    const handleMessageSeen = ({ senderId }) => {
      if (senderId === selectedUserId || senderId === currentUserId) {
        dispatch({ type: 'UPDATE_SEEN', senderId });
      }
    };

    const handleTyping = ({ senderId }) => {
      const typingUser = users.find(u => u._id === senderId);
      if (typingUser?.username === selectedUser) {
        setTypingUser(typingUser.username);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      const typingUser = users.find(u => u._id === senderId);
      if (typingUser?.username === selectedUser) {
        setTypingUser(null);
      }
    };

    // Register socket event listeners
    socket.on('newMessage', handleNewMessage);
    socket.on('receiveFile', handleReceiveFile);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    // Cleanup function to remove listeners
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('receiveFile', handleReceiveFile);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, selectedUser, currentUserId, users, getSelectedUserId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle typing events with debounce
  const handleTyping = (e) => {
    setContent(e.target.value);
    if (!socket || !selectedUser) return;

    const selectedUserId = getSelectedUserId();
    if (!selectedUserId) return;

    socket.emit('typing', { receiverId: selectedUserId });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout for stop typing event
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { receiverId: selectedUserId });
    }, 2000);
  };

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!content.trim()) return;
    if (!selectedUser) {
      setError('Vui lòng chọn người dùng để trò chuyện');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại');
      }
      
      const response = await axios.post(
        `${BASE_URL}/api/messages`,
        { receiverUsername: selectedUser, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      dispatch({ type: 'ADD_MESSAGE', payload: response.data });
      setContent('');
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        const selectedUserId = getSelectedUserId();
        if (selectedUserId && socket) {
          socket.emit('stopTyping', { receiverId: selectedUserId });
        }
      }
      
      // Focus input after sending
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError('Gửi tin nhắn thất bại: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  // File upload handler
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket || !selectedUser) return;

    const selectedUserId = getSelectedUserId();
    if (!selectedUserId) return;

    // Add temporary loading message
    const tempId = Date.now().toString();
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        _id: tempId,
        senderId: currentUserId,
        receiverId: selectedUserId,
        content: 'Đang tải file...',
        timestamp: new Date(),
        seen: false,
        isFile: false,
        isLoading: true
      }
    });

    // Read and send file
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('sendFile', {
        receiverId: selectedUserId,
        fileData: reader.result,
        fileName: file.name,
        fileType: file.type,
      });
      
      // Remove loading message
      dispatch({ type: 'REMOVE_MESSAGE', messageId: tempId });
    };
    reader.readAsDataURL(file);
  };

  // Emoji picker handler
  const handleEmojiClick = (emojiObject) => {
    setContent(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    
    // Focus input after selecting emoji
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Helper to format message timestamps
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper to check if message is first in a group
  const isFirstInGroup = (msg, index) => {
    if (index === 0) return true;
    
    const prevMsg = messages[index - 1];
    const timeDiff = new Date(msg.timestamp) - new Date(prevMsg.timestamp);
    
    return prevMsg.senderId !== msg.senderId || timeDiff > 300000; // 5 minutes
  };

  // Render message component
  const renderMessage = (msg, index) => {
    const isSentByMe = msg.senderId === currentUserId;
    const isFirst = isFirstInGroup(msg, index);
    
    return (
      <div
        key={msg._id || index}
        className={`message-wrapper ${isSentByMe ? 'sent-wrapper' : 'received-wrapper'}`}
      >
        <div className={`message ${isSentByMe ? 'sent' : 'received'} ${isFirst ? 'first-in-group' : ''} ${msg.isLoading ? 'loading' : ''}`}>
          <div className="message-content">
            {msg.isLoading ? (
              <div className="loading-spinner"></div>
            ) : msg.isFile ? (
              msg.fileType.startsWith('image/') ? (
                <img src={msg.fileData} alt={msg.fileName} className="chat-image" />
              ) : (
                <a href={msg.fileData} download={msg.fileName} className="file-link">
                  {msg.fileName}
                </a>
              )
            ) : (
              msg.content
            )}
          </div>
          <div className="message-meta">
            <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
            {isSentByMe && (
              <span className={`seen-status ${msg.seen ? 'seen' : ''}`}>
                ✓✓
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-area">
      {selectedUser ? (
        <>
          <div className="chat-header">
            <div className="user-info">
              <div className="avatar">
                {selectedUser.charAt(0).toUpperCase()}
                <span 
                  className={`status-indicator ${onlineStatus[getSelectedUserId()] ? 'online' : 'offline'}`}>
                </span>
              </div>
              <div className="user-details">
                <h3>{selectedUser}</h3>
                <span className="user-status">
                  {onlineStatus[getSelectedUserId()] ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="messages">
            {messages.length === 0 ? (
              <div className="no-messages">
                <div className="no-messages-icon">💬</div>
                <p>Hãy bắt đầu cuộc trò chuyện</p>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            
            {typingUser && (
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSendMessage} className="message-form">
            <input
              ref={messageInputRef}
              type="text"
              value={content}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Enter a message..."
              className="message-input"
              disabled={isLoading}
            />
            <div className="actions">
              <button
                type="button"
                className="emoji-button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                aria-label="Select emoji"
                disabled={isLoading}
              >
                <span className="emoji-icon">😊</span>
              </button>
              
              {showEmojiPicker && (
                <div className="emoji-picker">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
              
              <label 
                className={`file-upload ${isFileHovered ? 'hovered' : ''} ${isLoading ? 'disabled' : ''}`}
                onMouseEnter={() => setIsFileHovered(true)}
                onMouseLeave={() => setIsFileHovered(false)}
                aria-label="Gửi file"
              >
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  disabled={isLoading} 
                />
                <span className="file-icon">📎</span>
              </label>
              
              <button 
                type="submit" 
                className={`send-button ${isLoading ? 'loading' : ''}`} 
                aria-label="Send a message"
                disabled={isLoading}
              >
                <span className="send-icon">{isLoading ? '⏳' : '▶'}</span>
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="no-chat">
          <div className="welcome-illustration">
            <span className="chat-bubble"></span>
            <span className="chat-bubble"></span>
            <span className="chat-bubble"></span>
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatArea;
