import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Routes, Route } from 'react-router-dom';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import Chat from './components/Chat';
import './App.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [selectedUser, setSelectedUser] = useState(localStorage.getItem('selectedUser') || '');
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [onlineStatus, setOnlineStatus] = useState({});
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const audioRef = useRef(new Audio('/message-sound.mp3'));

  // Yêu cầu quyền thông báo khi người dùng đăng nhập
  useEffect(() => {
    if (token) {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Notification permission granted');
          }
        });
      }
    }
  }, [token]);

  // Fetch danh sách người dùng
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) setToken('');
    }
  }, [token]);

  // Kết nối Socket.IO và xử lý sự kiện
  useEffect(() => {
    if (!token) {
      setSocket(null);
      setCurrentUserId('');
      setCurrentUsername('');
      setUsers([]);
      setOnlineStatus({});
      setSelectedUser('');
      return;
    }

    if (socket) socket.disconnect();

    const newSocket = io(BASE_URL, { auth: { token }, autoConnect: true });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Socket connected:', newSocket.id));
    newSocket.on('connect_error', (err) => console.error('Socket connection error:', err));

    newSocket.on('onlineUsers', ({ users }) => {
      setOnlineStatus(users.reduce((acc, userId) => ({ ...acc, [userId]: true }), {}));
    });

    newSocket.on('userOnline', ({ userId }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: true }));
    });

    newSocket.on('userOffline', ({ userId }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: false }));
    });

    // Xử lý thông báo khi có tin nhắn mới
    newSocket.on('newNotification', (data) => {
      console.log('Received newNotification:', data);

      // Phát âm thanh
      if (document.hidden) {
        audioRef.current.play().catch(error => {
          console.log('Auto-play prevented:', error);
        });
      }

      // Hiển thị thông báo trình duyệt
      if (document.hidden && Notification.permission === 'granted') {
        new Notification('New Message', {
          body: `${data.senderUsername}: ${data.message}`,
          icon: '/logo.png',
        });
      }

      // Thêm vào danh sách thông báo ứng dụng
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...data,
          timestamp: new Date(),
        },
      ]);
    });

    fetchUsers();

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(tokenPayload.userId);
      setCurrentUsername(tokenPayload.username);
    } catch (error) {
      console.error('Error decoding token:', error);
    }

    return () => newSocket.disconnect();
  }, [token, fetchUsers]);

  // Lưu selectedUser vào localStorage
  useEffect(() => {
    if (selectedUser) localStorage.setItem('selectedUser', selectedUser);
    else localStorage.removeItem('selectedUser');
  }, [selectedUser]);

  // Xóa thông báo
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="App">
      {/* Hiển thị thông báo */}
      {notifications.map((notification) => (
        <div key={notification.id} className="notification">
          <div className="notification-bell">🔔</div>
          <div>
            <strong>{notification.senderUsername}</strong>
            <p>{notification.message}</p>
            <small>{new Date(notification.timestamp).toLocaleTimeString()}</small>
          </div>
          <button onClick={() => removeNotification(notification.id)}>×</button>
        </div>
      ))}

      <Routes>
        <Route
          path="/login"
          element={
            !token ? (
              <LoginForm setToken={setToken} baseUrl={BASE_URL} />
            ) : (
              <Chat
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                users={users}
                socket={socket}
                onlineStatus={onlineStatus}
                setToken={setToken}
                baseUrl={BASE_URL}
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            !token ? (
              <RegisterForm baseUrl={BASE_URL} />
            ) : (
              <Chat
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                users={users}
                socket={socket}
                onlineStatus={onlineStatus}
                setToken={setToken}
                baseUrl={BASE_URL}
              />
            )
          }
        />
        <Route
          path="/"
          element={
            !token ? (
              <LoginForm setToken={setToken} baseUrl={BASE_URL} />
            ) : (
              <Chat
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                users={users}
                socket={socket}
                onlineStatus={onlineStatus}
                setToken={setToken}
                baseUrl={BASE_URL}
              />
            )
          }
        />
      </Routes>
    </div>
  );
}

export default App;