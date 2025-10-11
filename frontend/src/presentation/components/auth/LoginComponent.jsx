import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import '@/scss/components/_auth.scss';

const LoginComponent = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = () => {
    const errors = {};
    
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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      // Login successful, component will be unmounted by parent
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
    <div className="auth">
      <div className="auth__card">
        <h2 className="auth__title">Sign in to PIDEA</h2>
        <p className="auth__subtitle">Access your secure development environment</p>
        <form className="auth__form" onSubmit={handleSubmit}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange}
            className="auth__input"
          />
          {validationErrors.email && (
            <div className="auth__error">{validationErrors.email}</div>
          )}
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className="auth__input"
          />
          {validationErrors.password && (
            <div className="auth__error">{validationErrors.password}</div>
          )}
          {error && (
            <div className="auth__error">{error}</div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="auth__button"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {/* <div className="auth__footer">
          <span>Don't have an account? </span>
          <span className="auth__link" onClick={onSwitchToRegister}>Sign up</span>
        </div> */}
      </div>
    </div>
  );
};

export default LoginComponent; 