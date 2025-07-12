# Phase 2: Error Display Component

## Overview
Create a compact, non-intrusive error display component that shows errors in a smaller, more user-friendly format compared to the current full-screen error displays.

## Implementation Steps

### 1. Create Compact ErrorDisplay Component
**File**: `frontend/src/presentation/components/common/ErrorDisplay.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import './ErrorDisplay.css';

const ErrorDisplay = ({ 
  error, 
  onDismiss, 
  autoDismiss = true, 
  dismissDelay = 5000,
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
```

### 2. Create ErrorDisplay CSS
**File**: `frontend/src/css/components/error-display.css`

```css
.error-display {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-left: 4px solid #e53e3e;
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: slideInError 0.3s ease-out;
  max-width: 100%;
  font-size: 13px;
}

.error-display:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.error-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.error-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  font-size: 14px;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.error-message {
  color: #cbd5e0;
  line-height: 1.4;
  word-wrap: break-word;
  font-size: 13px;
}

.error-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.error-details-btn,
.error-close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.error-details-btn:hover,
.error-close-btn:hover {
  background: rgba(160, 174, 192, 0.2);
  color: #e2e8f0;
}

.error-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #4a5568;
}

.error-stack {
  background: #1a202c;
  border: 1px solid #2d3748;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  overflow-x: auto;
}

.error-stack pre {
  margin: 0;
  font-size: 11px;
  color: #a0aec0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-code,
.error-timestamp {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 4px;
}

.error-code strong,
.error-timestamp strong {
  color: #e2e8f0;
}

/* Error type specific styles */
.error-display[data-type="auth"] {
  border-left-color: #e53e3e;
}

.error-display[data-type="network"] {
  border-left-color: #d69e2e;
}

.error-display[data-type="validation"] {
  border-left-color: #3182ce;
}

/* Compact mode */
.error-display.compact {
  padding: 8px 12px;
  margin: 4px 0;
}

.error-display.compact .error-title {
  font-size: 13px;
  margin-bottom: 2px;
}

.error-display.compact .error-message {
  font-size: 12px;
}

/* Inline mode */
.error-display.inline {
  display: inline-block;
  margin: 0 4px;
  padding: 4px 8px;
  border-radius: 4px;
}

.error-display.inline .error-header {
  gap: 4px;
}

.error-display.inline .error-icon {
  font-size: 12px;
}

.error-display.inline .error-title {
  font-size: 12px;
  margin-bottom: 0;
}

.error-display.inline .error-message {
  font-size: 11px;
}

/* Animations */
@keyframes slideInError {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideOutError {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}

.error-display.removing {
  animation: slideOutError 0.3s ease-in forwards;
}

/* Responsive design */
@media (max-width: 768px) {
  .error-display {
    padding: 10px;
    margin: 6px 0;
  }
  
  .error-header {
    gap: 6px;
  }
  
  .error-icon {
    font-size: 14px;
  }
  
  .error-title {
    font-size: 13px;
  }
  
  .error-message {
    font-size: 12px;
  }
}

/* Dark theme compatibility */
@media (prefers-color-scheme: dark) {
  .error-display {
    background: #1a202c;
    border-color: #2d3748;
  }
  
  .error-stack {
    background: #0f1419;
    border-color: #1a202c;
  }
}
```

### 3. Add Error Categorization
**File**: `frontend/src/infrastructure/utils/ErrorCategorizer.js`

```javascript
export const ERROR_TYPES = {
  AUTH: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

export const ERROR_CODES = {
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE'
};

export class ErrorCategorizer {
  static categorize(error) {
    if (!error) return { type: ERROR_TYPES.UNKNOWN, code: null };

    // Check for specific error codes
    if (error.code) {
      return this.categorizeByCode(error.code);
    }

    // Check for specific error messages
    if (error.message) {
      return this.categorizeByMessage(error.message);
    }

    // Check for HTTP status codes
    if (error.status) {
      return this.categorizeByStatus(error.status);
    }

    return { type: ERROR_TYPES.UNKNOWN, code: null };
  }

  static categorizeByCode(code) {
    switch (code) {
      case ERROR_CODES.AUTH_EXPIRED:
      case ERROR_CODES.AUTH_INVALID:
      case ERROR_CODES.AUTH_REQUIRED:
        return { type: ERROR_TYPES.AUTH, code };

      case ERROR_CODES.NETWORK_TIMEOUT:
      case ERROR_CODES.NETWORK_OFFLINE:
        return { type: ERROR_TYPES.NETWORK, code };

      case ERROR_CODES.VALIDATION_REQUIRED:
      case ERROR_CODES.VALIDATION_FORMAT:
        return { type: ERROR_TYPES.VALIDATION, code };

      case ERROR_CODES.SERVER_ERROR:
      case ERROR_CODES.SERVER_UNAVAILABLE:
        return { type: ERROR_TYPES.SERVER, code };

      default:
        return { type: ERROR_TYPES.UNKNOWN, code };
    }
  }

  static categorizeByMessage(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('expired') || 
        lowerMessage.includes('token') || 
        lowerMessage.includes('auth') ||
        lowerMessage.includes('login')) {
      return { type: ERROR_TYPES.AUTH, code: ERROR_CODES.AUTH_EXPIRED };
    }

    if (lowerMessage.includes('network') || 
        lowerMessage.includes('fetch') || 
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('offline')) {
      return { type: ERROR_TYPES.NETWORK, code: ERROR_CODES.NETWORK_TIMEOUT };
    }

    if (lowerMessage.includes('validation') || 
        lowerMessage.includes('required') || 
        lowerMessage.includes('format')) {
      return { type: ERROR_TYPES.VALIDATION, code: ERROR_CODES.VALIDATION_REQUIRED };
    }

    if (lowerMessage.includes('server') || 
        lowerMessage.includes('500') || 
        lowerMessage.includes('503')) {
      return { type: ERROR_TYPES.SERVER, code: ERROR_CODES.SERVER_ERROR };
    }

    return { type: ERROR_TYPES.UNKNOWN, code: null };
  }

  static categorizeByStatus(status) {
    if (status >= 500) {
      return { type: ERROR_TYPES.SERVER, code: ERROR_CODES.SERVER_ERROR };
    }

    if (status === 401 || status === 403) {
      return { type: ERROR_TYPES.AUTH, code: ERROR_CODES.AUTH_REQUIRED };
    }

    if (status === 400 || status === 422) {
      return { type: ERROR_TYPES.VALIDATION, code: ERROR_CODES.VALIDATION_REQUIRED };
    }

    if (status === 0) {
      return { type: ERROR_TYPES.NETWORK, code: ERROR_CODES.NETWORK_OFFLINE };
    }

    return { type: ERROR_TYPES.UNKNOWN, code: null };
  }

  static getErrorIcon(type) {
    switch (type) {
      case ERROR_TYPES.AUTH: return '🔐';
      case ERROR_TYPES.NETWORK: return '🌐';
      case ERROR_TYPES.VALIDATION: return '⚠️';
      case ERROR_TYPES.SERVER: return '🖥️';
      case ERROR_TYPES.CLIENT: return '💻';
      default: return '❌';
    }
  }

  static getErrorColor(type) {
    switch (type) {
      case ERROR_TYPES.AUTH: return '#e53e3e';
      case ERROR_TYPES.NETWORK: return '#d69e2e';
      case ERROR_TYPES.VALIDATION: return '#3182ce';
      case ERROR_TYPES.SERVER: return '#805ad5';
      case ERROR_TYPES.CLIENT: return '#38a169';
      default: return '#e53e3e';
    }
  }

  static getErrorMessage(error, type) {
    switch (type) {
      case ERROR_TYPES.AUTH:
        return 'Authentication required. Please log in again.';
      case ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your internet connection.';
      case ERROR_TYPES.VALIDATION:
        return 'Please check your input and try again.';
      case ERROR_TYPES.SERVER:
        return 'Server error. Please try again later.';
      case ERROR_TYPES.CLIENT:
        return 'An error occurred. Please refresh the page.';
      default:
        return error?.message || 'An unexpected error occurred.';
    }
  }
}
```

### 4. Create Error Display Hooks
**File**: `frontend/src/infrastructure/hooks/useErrorDisplay.js`

```javascript
import { useState, useCallback } from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import { ErrorCategorizer } from '@/infrastructure/utils/ErrorCategorizer.js';

export const useErrorDisplay = (options = {}) => {
  const [errors, setErrors] = useState([]);
  const { showError, showWarning, showInfo } = useNotificationStore();
  
  const {
    autoDismiss = true,
    dismissDelay = 5000,
    showNotifications = true,
    maxErrors = 3
  } = options;

  const addError = useCallback((error) => {
    const categorizedError = ErrorCategorizer.categorize(error);
    const errorWithCategory = {
      ...error,
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      category: categorizedError.type,
      code: categorizedError.code
    };

    setErrors(prev => {
      const newErrors = [errorWithCategory, ...prev].slice(0, maxErrors);
      return newErrors;
    });

    // Show notification if enabled
    if (showNotifications) {
      const message = ErrorCategorizer.getErrorMessage(error, categorizedError.type);
      showError(message, 'Error');
    }

    return errorWithCategory;
  }, [showNotifications, showError, maxErrors]);

  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getErrorsByType = useCallback((type) => {
    return errors.filter(error => error.category === type);
  }, [errors]);

  const hasErrors = useCallback(() => {
    return errors.length > 0;
  }, [errors]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    getErrorsByType,
    hasErrors,
    ErrorDisplay: ({ error, ...props }) => {
      if (!error) return null;
      
      return (
        <ErrorDisplay
          error={error}
          onDismiss={() => removeError(error.id)}
          autoDismiss={autoDismiss}
          dismissDelay={dismissDelay}
          {...props}
        />
      );
    }
  };
};
```

## Success Criteria
- [ ] ErrorDisplay component is compact and non-intrusive
- [ ] Auto-dismiss functionality works correctly
- [ ] Error categorization works for all error types
- [ ] CSS styles are responsive and visually appealing
- [ ] Error details can be expanded/collapsed
- [ ] Integration with notification system works

## Testing Checklist
- [ ] Test error display for all error types
- [ ] Test auto-dismiss functionality
- [ ] Test error categorization accuracy
- [ ] Test responsive design
- [ ] Test error details expansion
- [ ] Test integration with notification system

## Next Phase
Proceed to Phase 3: Auto-Redirect Integration for implementing seamless authentication redirects. 