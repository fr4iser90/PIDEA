import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import '@/css/global/login.css';

const RegisterComponent = ({ onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const result = await register(formData.email, formData.password, formData.username);
    if (result.success) {
      // Registration successful, component will be unmounted by parent
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Join PIDEA for secure development</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="Username"
            value={formData.username}
            onChange={handleInputChange}
          />
          {validationErrors.username && (
            <div className="auth-error">{validationErrors.username}</div>
          )}
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange}
          />
          {validationErrors.email && (
            <div className="auth-error">{validationErrors.email}</div>
          )}
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
          />
          {validationErrors.password && (
            <div className="auth-error">{validationErrors.password}</div>
          )}
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
          />
          {validationErrors.confirmPassword && (
            <div className="auth-error">{validationErrors.confirmPassword}</div>
          )}
          {error && (
            <div className="auth-error">{error}</div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="auth-btn"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className="auth-footer">
          <span>Already have an account? </span>
          <span className="auth-link" onClick={onSwitchToLogin}>Sign in</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterComponent; 