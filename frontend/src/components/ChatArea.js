import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import './ChatArea.css';

// Đảm bảo BASE_URL có giá trị mặc định nếu biến môi trường không tồn tại
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  const [isLoading, setIsLoading] = useState(false); // Thêm state loading
  const [error, setError] = useState(null); // Thêm state lỗi
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại');
        return;
      }
      
      const response = await axios.get(`${BASE_URL}/api/messages?username=${selectedUser}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: 'SET_MESSAGES', payload: response.data || [] });
    } catch (error) {
      console.log('Error fetching messages:', error);
      setError('Lỗi khi tải tin nhắn: ' + (error.response?.data?.error || error.message));
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      const sender = users.find((u) => u.username === selectedUser);
      if (sender && socket && onlineStatus[sender._id]) {
        socket.emit('markAsSeen', { senderId: sender._id });
      }
      
      // Focus the input when changing chat
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  }, [selectedUser, socket, users, onlineStatus, fetchMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const selectedUserId = users.find((u) => u.username === selectedUser)?._id;
      if (msg.senderId !== currentUserId) {
        if (
          (msg.senderId === selectedUserId && msg.receiverId === currentUserId) ||
          (msg.receiverId === selectedUserId && msg.senderId === currentUserId)
        ) {
          dispatch({ type: 'ADD_MESSAGE', payload: msg });
          
          // Play sound for new message
          const audio = new Audio('/message-sound.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log('Audio play failed:', e));
        }
      }
    };

    const handleReceiveFile = (msg) => {
      const selectedUserId = users.find((u) => u.username === selectedUser)?._id;
      if (
        (msg.senderId === currentUserId && msg.receiverId === selectedUserId) ||
        (msg.senderId === selectedUserId && msg.receiverId === currentUserId)
      ) {
        dispatch({ type: 'ADD_MESSAGE', payload: msg });
      }
    };

    const handleMessageSeen = ({ senderId }) => {
      const selectedUserId = users.find((u) => u.username === selectedUser)?._id;
      if (senderId === selectedUserId || senderId === currentUserId) {
        dispatch({ type: 'UPDATE_SEEN', senderId });
      }
    };

    const handleTyping = ({ senderId }) => {
      const typingUser = users.find((u) => u._id === senderId);
      if (typingUser && typingUser.username === selectedUser) {
        setTypingUser(typingUser.username);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      const typingUser = users.find((u) => u._id === senderId);
      if (typingUser && typingUser.username === selectedUser) {
        setTypingUser(null);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('receiveFile', handleReceiveFile);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('receiveFile', handleReceiveFile);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, selectedUser, currentUserId, users]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const handleTyping = (e) => {
    setContent(e.target.value);
    if (!socket || !selectedUser) return;

    const receiver = users.find((u) => u.username === selectedUser);
    if (!receiver) return;

    socket.emit('typing', { receiverId: receiver._id });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { receiverId: receiver._id });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setError(null); // Reset error state
    
    if (!content.trim()) return;
    if (!selectedUser) {
      setError('Vui lòng chọn người dùng để trò chuyện');
      return;
    }
    
    setIsLoading(true); // Bắt đầu loading
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại');
        setIsLoading(false);
        return;
      }
      
      // Kiểm tra log trước khi gửi request
      console.log('Sending message to:', selectedUser);
      console.log('Message content:', content);
      console.log('Token available:', !!token);
      console.log('API URL:', `${BASE_URL}/api/messages`);
      
      const response = await axios.post(
        `${BASE_URL}/api/messages`,
        { receiverUsername: selectedUser, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Message sent successfully:', response.data);
      dispatch({ type: 'ADD_MESSAGE', payload: response.data });
      setContent('');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        const receiver = users.find((u) => u.username === selectedUser);
        if (receiver && socket) {
          socket.emit('stopTyping', { receiverId: receiver._id });
        }
      }
      
      // Focus back on input
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError('Gửi tin nhắn thất bại: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false); // Kết thúc loading
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket || !selectedUser) return;

    const receiver = users.find((u) => u.username === selectedUser);
    if (!receiver) return;

    // Add loading indicator
    const tempId = Date.now().toString();
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        _id: tempId,
        senderId: currentUserId,
        receiverId: receiver._id,
        content: 'Đang tải file...',
        timestamp: new Date(),
        seen: false,
        isFile: false,
        isLoading: true
      }
    });

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result;
      socket.emit('sendFile', {
        receiverId: receiver._id,
        fileData,
        fileName: file.name,
        fileType: file.type,
      });
      
      // Remove the loading message
      dispatch({
        type: 'SET_MESSAGES',
        payload: messages.filter(msg => msg._id !== tempId)
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEmojiClick = (emojiObject) => {
    setContent((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    
    // Focus back on input
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-area">
      {selectedUser ? (
        <>
          <div className="chat-header">
            <div className="user-info">
              <div className="avatar">
                {selectedUser.charAt(0).toUpperCase()}
                <span className={`status-indicator ${onlineStatus[users.find(u => u.username === selectedUser)?._id] ? 'online' : 'offline'}`}></span>
              </div>
              <div className="user-details">
                <h3>{selectedUser}</h3>
                <span className="user-status">
                  {onlineStatus[users.find(u => u.username === selectedUser)?._id] ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Hiển thị lỗi nếu có */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="messages">
            {messages.length === 0 && (
              <div className="no-messages">
                <div className="no-messages-icon">💬</div>
                <p>Hãy bắt đầu cuộc trò chuyện</p>
              </div>
            )}
            
            {messages.map((msg, index) => {
              const isFirstInGroup = index === 0 || 
                messages[index - 1].senderId !== msg.senderId || 
                new Date(msg.timestamp) - new Date(messages[index - 1].timestamp) > 300000;
              
              return (
                <div
                  key={index}
                  className={`message-wrapper ${msg.senderId === currentUserId ? 'sent-wrapper' : 'received-wrapper'}`}
                >
                  <div
                    className={`message ${msg.senderId === currentUserId ? 'sent' : 'received'} ${isFirstInGroup ? 'first-in-group' : ''} ${msg.isLoading ? 'loading' : ''}`}
                  >
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
                      {msg.senderId === currentUserId && (
                        <span className={`seen-status ${msg.seen ? 'seen' : ''}`}>
                          ✓✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
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
                <input type="file" onChange={handleFileChange} style={{ display: 'none' }} disabled={isLoading} />
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