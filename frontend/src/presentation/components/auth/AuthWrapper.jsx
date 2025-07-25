import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import LoginComponent from './LoginComponent.jsx';
import RegisterComponent from './RegisterComponent.jsx';

const AuthWrapper = ({ children }) => {
  const { 
    isAuthenticated, 
    isLoading
  } = useAuthStore();
  
  const { showInfo, showWarning } = useNotificationStore();
  
  const [authMode, setAuthMode] = useState('login');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // No validation on mount - just use the AuthStore state directly

  // Handle redirect to login - removed since we don't force redirects anymore
  // useEffect(() => {
  //   if (redirectToLogin && !isValidating) {
  //     logger.info('🔄 [AuthWrapper] Redirecting to login...');
  //     resetRedirectFlag();
  //     // The redirect is handled by AuthStore.handleAuthFailure
  //   }
  // }, [redirectToLogin, isValidating, resetRedirectFlag]);

  const handleSwitchToRegister = () => {
    setAuthMode('register');
    setValidationError(null);
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
    setValidationError(null);
  };

  // Show loading only if AuthStore is loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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