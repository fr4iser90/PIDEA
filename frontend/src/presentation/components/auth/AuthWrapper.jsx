import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import LoginComponent from './LoginComponent.jsx';
import RegisterComponent from './RegisterComponent.jsx';

const AuthWrapper = ({ children }) => {
  const { 
    isAuthenticated, 
    validateToken, 
    isLoading, 
    redirectToLogin,
    resetRedirectFlag 
  } = useAuthStore();
  
  const { showInfo, showWarning } = useNotificationStore();
  
  const [authMode, setAuthMode] = useState('login');
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        logger.info('🔍 [AuthWrapper] Checking authentication...');
        const isValid = await validateToken();
        
        if (!isValid) {
          logger.info('❌ [AuthWrapper] Authentication validation failed');
          setValidationError('Session expired. Please log in again.');
          showWarning('Your session has expired. Please log in again.', 'Session Expired');
        } else {
          logger.info('✅ [AuthWrapper] Authentication validation successful');
          showInfo('Welcome back!', 'Authentication Successful');
        }
      } catch (error) {
        logger.error('❌ [AuthWrapper] Authentication validation error:', error);
        setValidationError('Authentication check failed. Please log in again.');
        showWarning('Authentication check failed. Please log in again.', 'Authentication Error');
      } finally {
        setIsValidating(false);
      }
    };

    // Only validate once on mount - cookies are handled automatically
    checkAuth();
  }, []); // Empty dependency array - only run once

  // Handle redirect to login
  useEffect(() => {
    if (redirectToLogin && !isValidating) {
      logger.info('🔄 [AuthWrapper] Redirecting to login...');
      resetRedirectFlag();
      // The redirect is handled by AuthStore.handleAuthFailure
    }
  }, [redirectToLogin, isValidating, resetRedirectFlag]);

  const handleSwitchToRegister = () => {
    setAuthMode('register');
    setValidationError(null);
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
    setValidationError(null);
  };

  // Show loading while validating authentication
  if (isValidating || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isValidating ? 'Validating authentication...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show auth forms if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        {validationError && (
          <div className="auth-error-banner">
            <span>⚠️ {validationError}</span>
          </div>
        )}
        
        {authMode === 'login' ? (
          <LoginComponent 
            onSwitchToRegister={handleSwitchToRegister}
            validationError={validationError}
          />
        ) : (
          <RegisterComponent 
            onSwitchToLogin={handleSwitchToLogin}
            validationError={validationError}
          />
        )}
      </div>
    );
  }

  // Show main app if authenticated
  return children;
};

export default AuthWrapper; 