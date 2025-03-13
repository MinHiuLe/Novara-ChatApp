import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import './LoginForm.css';

const LoginForm = ({ setToken, baseUrl }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name, value) => {
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    let error = '';

    if (!value) return error;
    if (name === 'username' && !usernameRegex.test(value)) {
      error = 'Only letters and numbers, no special characters.';
    }

    return error;
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const { data } = await axios.post(`${baseUrl}/api/auth/login`, formData);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      setFormData({ username: '', password: '' });
    } catch (error) {
      setErrors({ server: error.response?.data?.message || 'Invalid username or password.' });
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

      {['username', 'password'].map((field) => (
        <div key={field} className={`form-group ${formData[field] ? 'filled' : ''} ${errors[field] ? 'error' : ''}`}>
          <div className="input-wrapper">
            {field === 'username' ? <FaUser className="input-icon" /> : <FaLock className="input-icon" />}
            <input
              type={field === 'password' ? 'password' : 'text'}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              autoComplete="off"
              className="form-input"
            />
            <label className="form-label">
              {field.charAt(0).toUpperCase() + field.slice(1)} <span className="required">*</span>
            </label>
          </div>
          {errors[field] && (
            <span className="error-message">
              <span className="error-icon">!</span> {errors[field]}
            </span>
          )}
        </div>
      ))}

      {errors.server && <div className="server-error"><span className="error-icon">!</span> {errors.server}</div>}

      <button type="submit" className={`submit-btn ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting}>
        {isSubmitting ? <div className="spinner"></div> : 'Sign In'}
      </button>

      <div className="auth-switch">
        Don't have an account?{' '}
        <button type="button" onClick={() => navigate('/register')} className="auth-switch-link">
          Sign Up
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
