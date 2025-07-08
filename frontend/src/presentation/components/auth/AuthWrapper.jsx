import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import LoginComponent from './LoginComponent.jsx';
import RegisterComponent from './RegisterComponent.jsx';

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, validateToken, isLoading, token } = useAuthStore();
  const [authMode, setAuthMode] = useState('login');
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        console.log('🔍 [AuthWrapper] Checking authentication...');
        const isValid = await validateToken();
        
        if (!isValid) {
          console.log('❌ [AuthWrapper] Token validation failed');
          setValidationError('Session expired. Please log in again.');
        } else {
          console.log('✅ [AuthWrapper] Token validation successful');
        }
      } catch (error) {
        console.error('❌ [AuthWrapper] Token validation error:', error);
        setValidationError('Authentication check failed. Please log in again.');
      } finally {
        setIsValidating(false);
      }
    };

    // Only validate if we have a token
    if (token) {
      checkAuth();
    } else {
      console.log('🔍 [AuthWrapper] No token found, skipping validation');
      setIsValidating(false);
    }
  }, [validateToken, token]);

  const handleSwitchToRegister = () => {
    setAuthMode('register');
    setValidationError(null);
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
    setValidationError(null);
  };

  // Show loading while validating token
  if (isValidating || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isValidating ? 'Validating session...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show auth forms if not authenticated
  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <LoginComponent onSwitchToRegister={handleSwitchToRegister} />
    ) : (
      <RegisterComponent onSwitchToLogin={handleSwitchToLogin} />
    );
  }

  // Show main app if authenticated
  return children;
};

export default AuthWrapper; 