import React, { useState, useEffect } from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import TimeoutConfig from '@/config/timeout-config.js';
import '@/css/components/error-display.css';

const ErrorDisplay = ({ 
  error, 
  onDismiss, 
  autoDismiss = true, 
  dismissDelay = TimeoutConfig.getTimeout('UI', 'NOTIFICATION_DISMISS'),
  showDetails = false,
  className = '',
  style = {}
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  const { showError } = useNotificationStore();

  useEffect(() => {
    if (error && autoDismiss) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, dismissDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoDismiss, dismissDelay]);

  useEffect(() => {
    // Show notification for errors
    if (error) {
      showError(error.message || error, 'Error');
    }
  }, [error, showError]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const toggleDetails = () => {
    setShowFullDetails(!showFullDetails);
  };

  const getErrorType = (error) => {
    if (error?.code === 'AUTH_EXPIRED' || error?.message?.includes('expired')) {
      return 'auth';
    }
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
      return 'network';
    }
    if (error?.code === 'VALIDATION_ERROR') {
      return 'validation';
    }
    return 'general';
  };

  const getErrorIcon = (type) => {
    switch (type) {
      case 'auth': return '🔐';
      case 'network': return '🌐';
      case 'validation': return '⚠️';
      default: return '❌';
    }
  };

  const getErrorColor = (type) => {
    switch (type) {
      case 'auth': return '#e53e3e';
      case 'network': return '#d69e2e';
      case 'validation': return '#3182ce';
      default: return '#e53e3e';
    }
  };

  if (!error || !isVisible) {
    return null;
  }

  const errorType = getErrorType(error);
  const errorIcon = getErrorIcon(errorType);
  const errorColor = getErrorColor(errorType);

  return (
    <div 
      className={`error-display ${className}`}
      style={{ 
        borderLeftColor: errorColor,
        ...style 
      }}
      data-type={errorType}
    >
      <div className="error-header">
        <div className="error-icon">{errorIcon}</div>
        <div className="error-content">
          <div className="error-title">
            {error.title || 'Error'}
          </div>
          <div className="error-message">
            {error.message || error}
          </div>
        </div>
        <div className="error-actions">
          {error.stack && (
            <button
              className="error-details-btn"
              onClick={toggleDetails}
              title="Show details"
            >
              {showFullDetails ? '−' : '+'}
            </button>
          )}
          <button
            className="error-close-btn"
            onClick={handleDismiss}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
      
      {showFullDetails && error.stack && (
        <div className="error-details">
          <div className="error-stack">
            <pre>{error.stack}</pre>
          </div>
          {error.code && (
            <div className="error-code">
              <strong>Error Code:</strong> {error.code}
            </div>
          )}
          {error.timestamp && (
            <div className="error-timestamp">
              <strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay; 