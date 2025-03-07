import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import './RegisterForm.css';

const RegisterForm = ({ baseUrl }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sử dụng baseUrl từ props hoặc fall back về biến môi trường
  const apiBaseUrl = process.env.REACT_APP_API_URL;

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (name) {
      case 'username':
        if (!value) {
          // Không hiển thị lỗi khi username trống
          delete newErrors.username;
        } else if (!usernameRegex.test(value)) {
          newErrors.username = 'Only letters and numbers, no special characters.';
        } else if (value.length < 5 || value.length > 20) {
          newErrors.username = 'Username must be 5-20 characters.';
        } else {
          delete newErrors.username;
        }
        break;
      case 'email':
        if (!value) {
          // Không hiển thị lỗi khi email trống
          delete newErrors.email;
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Invalid email (e.g., user@example.com).';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value) {
          // Không hiển thị lỗi khi password trống
          delete newErrors.password;
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters.';
        } else {
          delete newErrors.password;
        }
        break;
      case 'confirmPassword':
        if (!value) {
          // Không hiển thị lỗi khi confirmPassword trống
          delete newErrors.confirmPassword;
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match.';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const isValid =
      Object.keys(errors).length === 0 &&
      formData.username &&
      formData.email &&
      formData.password &&
      formData.confirmPassword;

    if (!isValid) {
      const newErrors = {};
      for (const [key, value] of Object.entries(formData)) {
        validateField(key, value);
      }
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/register`, formData);
      alert(response.data.message);
      setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      const serverError = error.response?.data?.error || 'Server error';
      if (serverError.includes('Username already exists')) {
        setErrors({ username: serverError });
      } else if (serverError.includes('Email already used')) {
        setErrors({ email: serverError });
      } else {
        setErrors({ server: serverError });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="logo-container">
        <div className="logo">🌱 Novara</div>
      </div>
      <h2>Create Account</h2>
      
      <div className={`form-group ${formData.username ? 'filled' : ''} ${errors.username ? 'error' : ''}`}>
        <div className="input-wrapper">
          <FaUser className="input-icon" />
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="off"
            className="form-input"
          />
          <label className="form-label">
            Username <span className="required">*</span>
          </label>
        </div>
        {errors.username && (
          <span className="error-message">
            <span className="error-icon">!</span> {errors.username}
          </span>
        )}
      </div>

      <div className={`form-group ${formData.email ? 'filled' : ''} ${errors.email ? 'error' : ''}`}>
        <div className="input-wrapper">
          <FaEnvelope className="input-icon" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="off"
            className="form-input"
          />
          <label className="form-label">
            Email <span className="required">*</span>
          </label>
        </div>
        {errors.email && (
          <span className="error-message">
            <span className="error-icon">!</span> {errors.email}
          </span>
        )}
      </div>

      <div className={`form-group ${formData.password ? 'filled' : ''} ${errors.password ? 'error' : ''}`}>
        <div className="input-wrapper">
          <FaLock className="input-icon" />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
          />
          <label className="form-label">
            Password <span className="required">*</span>
          </label>
        </div>
        {errors.password && (
          <span className="error-message">
            <span className="error-icon">!</span> {errors.password}
          </span>
        )}
      </div>

      <div className={`form-group ${formData.confirmPassword ? 'filled' : ''} ${errors.confirmPassword ? 'error' : ''}`}>
        <div className="input-wrapper">
          <FaLock className="input-icon" />
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="form-input"
          />
          <label className="form-label">
            Confirm Password <span className="required">*</span>
          </label>
        </div>
        {errors.confirmPassword && (
          <span className="error-message">
            <span className="error-icon">!</span> {errors.confirmPassword}
          </span>
        )}
      </div>

      {errors.server && (
        <div className="server-error">
          <span className="error-icon">!</span> {errors.server}
        </div>
      )}

      <button
        type="submit"
        className={`submit-btn ${isSubmitting ? 'submitting' : ''}`}
        disabled={isSubmitting || Object.keys(errors).length > 0}
      >
        {isSubmitting ? (
          <div className="spinner"></div>
        ) : (
          'Sign Up'
        )}
      </button>
      <div className="auth-switch">
        Already have an account?{' '}
        <button 
          type="button" 
          onClick={() => navigate('/login')}
          className="auth-switch-link"
        >
          Sign In
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;