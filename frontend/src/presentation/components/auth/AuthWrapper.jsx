import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import IDERequirementService from '@/infrastructure/services/IDERequirementService.jsx';
import IDEStartModal from '@/presentation/components/ide/IDEStartModal.jsx';
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
  const [showIDERequirementModal, setShowIDERequirementModal] = useState(false);
  const [isCheckingIDERequirement, setIsCheckingIDERequirement] = useState(false);

  // No validation on mount - just use the AuthStore state directly

  // Check IDE requirement when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading && !isCheckingIDERequirement) {
      checkIDERequirement();
    }
  }, [isAuthenticated, isLoading]);

  // Check if IDE requirement modal should be shown
  const checkIDERequirement = async () => {
    setIsCheckingIDERequirement(true);
    try {
      logger.info('Starting IDE requirement check...');
      const shouldShow = await IDERequirementService.shouldShowRequirementModal();
      if (shouldShow) {
        logger.info('IDE requirement modal should be shown');
        setShowIDERequirementModal(true);
      } else {
        logger.info('IDE requirement modal not needed');
      }
    } catch (error) {
      logger.error('Error checking IDE requirement:', error);
    } finally {
      setIsCheckingIDERequirement(false);
    }
  };

  // Handle IDE requirement modal close
  const handleIDERequirementClose = () => {
    setShowIDERequirementModal(false);
    // Re-check after modal is closed
    setTimeout(() => {
      checkIDERequirement();
    }, 1000);
  };

  // Handle successful IDE start
  const handleIDEStartSuccess = (ideData) => {
    logger.info('IDE started successfully:', ideData);
    setShowIDERequirementModal(false);
    showInfo('IDE started successfully!', 'Success');
  };

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
  return (
    <>
      {children}
      
      {/* IDE Requirement Modal */}
      <IDEStartModal
        isOpen={showIDERequirementModal}
        onClose={handleIDERequirementClose}
        onSuccess={handleIDEStartSuccess}
        showRequirementMessage={true}
      />
    </>
  );
};

export default AuthWrapper; 