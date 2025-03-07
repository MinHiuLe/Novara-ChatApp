import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import './LoginForm.css';


const LoginForm = ({ setToken, baseUrl}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    const usernameRegex = /^[a-zA-Z0-9]+$/;

    switch (name) {
      case 'username':
        if (!value) {
          //newErrors.username = 'Username is required.';
        } else if (!usernameRegex.test(value)) {
          //newErrors.username = 'Only letters and numbers, no special characters.';
        } else {
          delete newErrors.username;
        }
        break;
      case 'password':
        if (!value) {
          //newErrors.password = 'Password is required.';
        } else {
          delete newErrors.password;
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
      formData.password;

    if (!isValid) {
      const newErrors = {};
      for (const [key, value] of Object.entries(formData)) {
        validateField(key, value);
      }
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        username: formData.username,
        password: formData.password
      });
      
      const newToken = response.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setFormData({ username: '', password: '' });
    } catch (error) {
      const serverError = error.response?.data?.message || 'Invalid username or password.';
      setErrors({ server: serverError });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="logo-container">
        <div className="logo">🌱 Novara</div>
      </div>
      <h2>Sign In</h2>
      
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
          'Sign In'
        )}
      </button>
      <div className="auth-switch">
        Don't have an account?{' '}
        <button 
          type="button" 
          onClick={() => navigate('/register')}
          className="auth-switch-link"
        >
          Sign Up
        </button>
      </div>
    </form>
  );
};

export default LoginForm;