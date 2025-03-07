import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Routes, Route } from 'react-router-dom';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import ChatArea from './components/ChatArea';
import './App.css';

const BASE_URL = process.env.REACT_APP_API_URL;
console.log('Environment:', process.env.NODE_ENV);
console.log('Backend URL:', BASE_URL);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [selectedUser, setSelectedUser] = useState(localStorage.getItem('selectedUser') || '');
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [onlineStatus, setOnlineStatus] = useState({});
  const [socket, setSocket] = useState(null);

  console.log('App rendering, token:', token);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.log('Error fetching users:', error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setCurrentUserId('');
      setCurrentUsername('');
      setUsers([]);
      setOnlineStatus({});
      return;
    }

    if (socket) socket.disconnect();

    const newSocket = io(BASE_URL, { auth: { token }, autoConnect: true });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Socket connected:', newSocket.id));
    newSocket.on('connect_error', (err) => console.log('Socket connection error:', err));

    newSocket.on('onlineUsers', ({ users }) => {
      const initialStatus = {};
      users.forEach((userId) => (initialStatus[userId] = true));
      setOnlineStatus(initialStatus);
    });

    newSocket.on('userOnline', ({ userId }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: true }));
    });

    newSocket.on('userOffline', ({ userId }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: false }));
    });

    fetchUsers();

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const tokenPayload = JSON.parse(atob(tokenParts[1]));
        setCurrentUserId(tokenPayload.userId);
        setCurrentUsername(tokenPayload.username);
      } else {
        console.error('Invalid token format');
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }

    return () => {
      newSocket.disconnect();
      newSocket.off('onlineUsers');
      newSocket.off('userOnline');
      newSocket.off('userOffline');
      newSocket.off('connect');
      newSocket.off('connect_error');
    };
  }, [token, fetchUsers]);

  useEffect(() => {
    if (selectedUser) localStorage.setItem('selectedUser', selectedUser);
  }, [selectedUser]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      if (socket) socket.disconnect();
      setToken('');
      setSocket(null);
      localStorage.removeItem('token');
      localStorage.removeItem('selectedUser');
      setCurrentUserId('');
      setSelectedUser('');
      setUsers([]);
      setOnlineStatus({});
    }
  };

  function Chat() {
    return (
      <div className="chat-container">
        <div className="user-list">
          <div className="user-list-header">
            <h3>{currentUsername}</h3>
            <button className="logout-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
          {users.map((user) => (
            <div
              key={user._id}
              className={`user ${selectedUser === user.username ? 'selected' : ''}`}
              onClick={() => setSelectedUser(user.username)}
            >
              <span className={`status-dot ${onlineStatus[user._id] ? 'online' : 'offline'}`}></span>
              {user.username}
            </div>
          ))}
        </div>
        <ChatArea
          selectedUser={selectedUser}
          currentUserId={currentUserId}
          users={users}
          socket={socket}
          onlineStatus={onlineStatus}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        <Route
          path="/login"
          element={!token ? <LoginForm setToken={setToken} baseUrl={BASE_URL} /> : <Chat />}
        />
        <Route
          path="/register"
          element={!token ? <RegisterForm /> : <Chat />}
        />
        <Route path="/" element={!token ? <LoginForm setToken={setToken} baseUrl={BASE_URL} /> : <Chat />} />
      </Routes>
    </div>
  );
}

export default App;