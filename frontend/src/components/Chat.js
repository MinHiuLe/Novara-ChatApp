import React, { useState, useEffect } from 'react';
import ChatArea from './ChatArea';

const Chat = ({
  selectedUser,
  setSelectedUser,
  currentUserId,
  currentUsername,
  users,
  socket,
  onlineStatus,
  setToken,
  baseUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(users);

  // Lọc users theo searchQuery theo thời gian thực
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      socket?.disconnect();
      setToken('');
      setSelectedUser('');
    }
  };

  return (
    <div className="chat-container">
      <div className="user-list">
        <div className="user-list-header">
          <h3>{currentUsername}</h3>
          <button className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
        <div className="search-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Search..."
            className="search-input"
          />
        </div>
        {filteredUsers.map(({ _id, username }) => (
          <div
            key={_id}
            className={`user ${selectedUser === username ? 'selected' : ''}`}
            onClick={() => setSelectedUser(username)}
          >
            <span className={`status-dot ${onlineStatus[_id] ? 'online' : 'offline'}`}></span>
            {username}
          </div>
        ))}
      </div>
      <ChatArea
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        currentUserId={currentUserId}
        users={users}
        socket={socket}
        onlineStatus={onlineStatus}
        baseUrl={baseUrl}
        setToken={setToken}
      />
    </div>
  );
};

export default Chat;