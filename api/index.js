require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./auth');
const messageRoutes = require('./message');
const User = require('./models/User');
const ChatSession = require('./models/ChatSession');
const authMiddleware = require('./authMiddleware');

const app = express();
const server = http.createServer(app);
const onlineUsers = new Set();

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 10e6,
});

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

console.log('Starting backend...');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

mongoose.set('strictQuery', true);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, 'username');
    res.json(users.filter(user => user._id.toString() !== req.user.userId));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users/search/suggest', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query?.trim()) return res.json([]);

    const currentUser = await User.findById(req.user.id);
    const existingFriendIds = currentUser.friends.map(f => f.user.toString());
    
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user.id, $nin: existingFriendIds }
    }).select('username').limit(5);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/users/search', authMiddleware, async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const users = await User.find({
      username: { $regex: searchTerm, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('username').limit(10);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Search
app.get('/api/users/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query; 
    if (!q?.trim()) return res.json([]); 

    const users = await User.find({
      username: { $regex: new RegExp(`^${q}`, 'i') },
      _id: { $ne: req.user.userId }, 
    })
      .select('username fullName')
      .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, { body: req.body, query: req.query, userId: req?.user?.userId });
  next();
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  autoIndex: false
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

io.on('connection', async socket => {
  console.log('User connected:', socket.id);

  try {
    const { token } = socket.handshake.auth;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    socket.userId = userId;
    socket.join(userId);

    onlineUsers.add(userId);
    io.emit('userOnline', { userId });
    socket.emit('onlineUsers', { users: [...onlineUsers] });
  } catch (error) {
    console.log('Invalid token on socket connection:', error.message);
    return socket.disconnect();
  }

  socket.on('typing', ({ receiverId }) => socket.to(receiverId).emit('typing', { senderId: socket.userId }));
  socket.on('stopTyping', ({ receiverId }) => socket.to(receiverId).emit('stopTyping', { senderId: socket.userId }));

  socket.on('sendFile', async ({ receiverId, fileData, fileName, fileType }) => {
    if (!receiverId || !fileData || !fileName || !fileType) return console.error('Missing file data fields');

    try {
      const participants = [socket.userId, receiverId].sort();
      let session = await ChatSession.findOne({ participants }) || new ChatSession({ participants, messages: [] });

      const newMessage = { senderId: socket.userId, receiverId, fileData, fileName, fileType, isFile: true, timestamp: new Date() };
      session.messages.push(newMessage);
      await session.save();

      io.to(receiverId).emit('receiveFile', newMessage);
      io.to(socket.userId).emit('receiveFile', newMessage);

      const sender = await User.findById(socket.userId);
      io.to(receiverId).emit('newNotification', {
        senderId: socket.userId,
        senderUsername: sender.username,
        message: msg.isFile ? 'Sent you a file' : msg.content,
        type: msg.isFile ? 'file' : 'message',
      });
    } catch (error) {
      console.error('Error processing sendFile:', error);
    }
  });

  socket.on('markAsSeen', async ({ senderId }) => {
    try {
      const receiverId = socket.userId;
      const participants = [senderId, receiverId].sort();
      const session = await ChatSession.findOne({ participants });
      if (session) {
        session.messages = session.messages.map(msg => ({ ...msg, seen: msg.senderId.toString() === senderId ? true : msg.seen }));
        await session.save();
        io.to(senderId).emit('messageSeen', { senderId, receiverId });
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('userOffline', { userId: socket.userId });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

module.exports = app;
