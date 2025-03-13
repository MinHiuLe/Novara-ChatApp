const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const TOKEN_EXPIRY = '1h';

// Utility function to send error response
const sendError = (res, status, message) => res.status(status).json({ error: message });

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, fullName, dateOfBirth, gender, phone } = req.body;

    if (!/^[a-zA-Z0-9]{5,20}$/.test(username)) return sendError(res, 400, 'Username must be 5-20 characters, alphanumeric only.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, 'Invalid email format.');
    if (password.length < 8) return sendError(res, 400, 'Password must be at least 8 characters long.');
    if (password !== confirmPassword) return sendError(res, 400, 'Passwords do not match.');

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ $or: [{ username }, { email: normalizedEmail }] });
    if (existingUser) return sendError(res, 409, 'Username or email is already taken.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email: normalizedEmail, password: hashedPassword, fullName, dateOfBirth, gender, phone });
    await newUser.save();

    res.status(201).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 500, 'Server error, please try again later.');
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return sendError(res, 400, 'Username and password are required.');

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) return sendError(res, 401, 'Invalid username or password.');

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'Server error, please try again later.');
  }
});

// Refresh Token
router.post('/refresh', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return sendError(res, 401, 'No token provided.');

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign({ userId: decoded.userId, username: decoded.username }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    res.json({ token: newToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    sendError(res, 401, 'Invalid token.');
  }
});

module.exports = router;