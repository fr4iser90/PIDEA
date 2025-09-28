import React, { useState, useEffect } from 'react';
import { logger } from "@/infrastructure/logging/Logger";

/**
 * SessionWarningModal - Modal component for session expiry warnings
 * 
 * Features:
 * - Countdown timer display
 * - Extend session option
 * - Logout option
 * - Auto-dismiss after timeout
 * - Keyboard navigation support
 * - Accessible design
 */
const SessionWarningModal = ({ 
  isOpen, 
  timeUntilExpiry, 
  onExtendSession, 
  onLogout, 
  onClose,
  className = '' 
}) => {
  const [timeLeft, setTimeLeft] = useState(timeUntilExpiry);
  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Update countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Update timeLeft when timeUntilExpiry changes
  useEffect(() => {
    setTimeLeft(timeUntilExpiry);
  }, [timeUntilExpiry]);

  // Handle extend session
  const handleExtendSession = async () => {
    if (isExtending) {
      return;
    }

    setIsExtending(true);
    logger.info('Extending session from modal');

    try {
      await onExtendSession();
      onClose();
    } catch (error) {
      logger.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    logger.info('Logging out from modal');

    try {
      await onLogout();
      onClose();
    } catch (error) {
      logger.error('Failed to logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'Enter':
        if (event.target === document.activeElement) {
          event.target.click();
        }
        break;
    }
  };

  // Format time display
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get urgency level
  const getUrgencyLevel = () => {
    if (timeLeft <= 60 * 1000) { // 1 minute
      return 'critical';
    } else if (timeLeft <= 3 * 60 * 1000) { // 3 minutes
      return 'warning';
    } else {
      return 'info';
    }
  };

  const urgencyLevel = getUrgencyLevel();

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-description"
      >
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
            urgencyLevel === 'critical' ? 'bg-red-100' :
            urgencyLevel === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
          }`}>
            <svg 
              className={`w-5 h-5 ${
                urgencyLevel === 'critical' ? 'text-red-600' :
                urgencyLevel === 'warning' ? 'text-yellow-600' : 'text-blue-600'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 
            id="session-warning-title"
            className="text-lg font-semibold text-gray-900"
          >
            Session Expiring Soon
          </h2>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p 
            id="session-warning-description"
            className="text-gray-600 mb-4"
          >
            Your session will expire in{' '}
            <span className={`font-semibold ${
              urgencyLevel === 'critical' ? 'text-red-600' :
              urgencyLevel === 'warning' ? 'text-yellow-600' : 'text-blue-600'
            }`}>
              {formatTime(timeLeft)}
            </span>
            . Please extend your session to continue working or save your work and logout.
          </p>

          {/* Countdown Timer */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Time remaining:</span>
              <span className={`text-2xl font-mono font-bold ${
                urgencyLevel === 'critical' ? 'text-red-600' :
                urgencyLevel === 'warning' ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  urgencyLevel === 'critical' ? 'bg-red-500' :
                  urgencyLevel === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ 
                  width: `${Math.max(0, (timeLeft / timeUntilExpiry) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExtendSession}
            disabled={isExtending || isLoggingOut}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              isExtending 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isExtending ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extending...
              </div>
            ) : (
              'Extend Session'
            )}
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isExtending || isLoggingOut}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              isLoggingOut 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
            }`}
          >
            {isLoggingOut ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging out...
              </div>
            ) : (
              'Logout'
            )}
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SessionWarningModal;




