import { useState, useCallback } from 'react';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import { ErrorCategorizer } from '@/infrastructure/utils/ErrorCategorizer.js';
import ErrorDisplay from '@/presentation/components/common/ErrorDisplay.jsx';

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

  const ErrorDisplayComponent = useCallback(({ error, ...props }) => {
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
  }, [removeError, autoDismiss, dismissDelay]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    getErrorsByType,
    hasErrors,
    ErrorDisplay: ErrorDisplayComponent
  };
}; 