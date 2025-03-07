const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const authMiddleware = require('./authMiddleware');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { receiverUsername, content } = req.body;
  try {
    const receiver = await User.findOne({ username: receiverUsername });
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    const senderId = req.user.userId;
    const receiverId = receiver._id;

    // Fix participants sorting
    const participants = [senderId, receiverId]
      .map(id => id.toString()) // Convert ObjectId to string
      .sort() // Sort alphabetically
      .map(id => mongoose.Types.ObjectId(id)); // Convert back to ObjectId

    let session = await ChatSession.findOne({ participants });
    if (!session) {
      session = new ChatSession({ participants, messages: [] });
    }
    const newMessage = { senderId, content, timestamp: new Date() };
    session.messages.push(newMessage);
    await session.save();

    req.io.emit('newMessage', { 
      senderId, 
      receiverId, 
      content, 
      timestamp: newMessage.timestamp 
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  const { username } = req.query;
  try {
    const receiver = await User.findOne({ username });
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }
    const senderId = req.user.userId;
    const receiverId = receiver._id;

    // Fix participants sorting
    const participants = [senderId, receiverId]
      .map(id => id.toString())
      .sort()
      .map(id => mongoose.Types.ObjectId(id));

    const session = await ChatSession.findOne({ participants });
    if (!session) {
      return res.json([]);
    }
    res.json(session.messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;