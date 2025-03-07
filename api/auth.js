const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword, fullName, dateOfBirth, gender, phone } = req.body;

  // Kiểm tra dữ liệu phía server
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!usernameRegex.test(username) || username.length < 5 || username.length > 20) {
    return res.status(400).json({ error: 'Tên đăng nhập phải từ 5-20 ký tự, chỉ dùng chữ và số.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Mật khẩu phải ít nhất 8 ký tự.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp.' });
  }

  try {
    // Kiểm tra trùng lặp
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại.' });
      if (existingUser.email === email) return res.status(400).json({ error: 'Email đã được sử dụng.' });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      dateOfBirth,
      gender,
      phone,
    });
    await user.save();

    res.status(201).json({ message: 'Đăng ký thành công!' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Lỗi server, vui lòng thử lại sau.' });
  }
});

//-------------------------Login---------------------//
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

//Socket.io (index.js-App.js-auth.js)
// Trong api/auth.js
router.post('/refresh', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;