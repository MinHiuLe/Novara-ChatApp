const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 5, maxlength: 20 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  phone: { type: String },
});

userSchema.index({ username: 1, email: 1 }); // Tối ưu tìm kiếm

module.exports = mongoose.model('User', userSchema);