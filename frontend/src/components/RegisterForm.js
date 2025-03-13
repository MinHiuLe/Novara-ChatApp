import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import './RegisterForm.css';

const InputField = ({ label, type, name, value, onChange, error, Icon }) => (
  <div className={`form-group ${value ? 'filled' : ''} ${error ? 'error' : ''}`}>
    <div className="input-wrapper">
      <Icon className="input-icon" />
      <input type={type} name={name} value={value} onChange={onChange} autoComplete="off" className="form-input" />
      <label className="form-label">{label} <span className="required">*</span></label>
    </div>
    {error && <span className="error-message"><span className="error-icon">!</span> {error}</span>}
  </div>
);

const RegisterForm = ({ baseUrl }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBaseUrl = baseUrl || process.env.REACT_APP_API_URL;

  const validationRules = {
    username: (value) =>
      !value ? '' :
      !/^[a-zA-Z0-9]+$/.test(value) ? 'Only letters and numbers, no special characters.' :
      value.length < 5 || value.length > 20 ? 'Username must be 5-20 characters.' : '',
    email: (value) => !value ? '' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email format.' : '',
    password: (value) => !value ? '' : value.length < 8 ? 'Password must be at least 8 characters.' : '',
    confirmPassword: (value) => !value ? '' : value !== formData.password ? 'Passwords do not match.' : ''
  };

  const handleChange = ({ target: { name, value } }) => {
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validationRules[name](value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const newErrors = Object.keys(formData).reduce((acc, key) => {
      const errorMsg = validationRules[key](formData[key]);
      if (errorMsg) acc[key] = errorMsg;
      return acc;
    }, {});

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/register`, formData);
      alert(response.data.message);
      setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      setErrors({ server: error.response?.data?.error || 'Server error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="logo-container"><div className="logo">🌱 Novara</div></div>
      <h2>Create Account</h2>
      <InputField label="Username" type="text" name="username" value={formData.username} onChange={handleChange} error={errors.username} Icon={FaUser} />
      <InputField label="Email" type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email} Icon={FaEnvelope} />
      <InputField label="Password" type="password" name="password" value={formData.password} onChange={handleChange} error={errors.password} Icon={FaLock} />
      <InputField label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} Icon={FaLock} />
      {errors.server && <div className="server-error"><span className="error-icon">!</span> {errors.server}</div>}
      <button type="submit" className={`submit-btn ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting || Object.values(errors).some(e => e)}>
        {isSubmitting ? <div className="spinner"></div> : 'Sign Up'}
      </button>
      <div className="auth-switch">Already have an account? <button type="button" onClick={() => navigate('/login')} className="auth-switch-link">Sign In</button></div>
    </form>
  );
};

export default RegisterForm;
