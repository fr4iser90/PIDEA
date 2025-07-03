import React, { useState, useEffect } from 'react';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';
import LoginComponent from './LoginComponent.jsx';
import RegisterComponent from './RegisterComponent.jsx';

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, validateToken, isLoading } = useAuthStore();
  const [authMode, setAuthMode] = useState('login');
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsValidating(true);
      await validateToken();
      setIsValidating(false);
    };

    checkAuth();
  }, [validateToken]);

  const handleSwitchToRegister = () => {
    setAuthMode('register');
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
  };

  // Show loading while validating token
  if (isValidating || isLoading) {
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