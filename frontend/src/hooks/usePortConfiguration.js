import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

/**
 * Custom hook for managing port configuration state
 * Provides port validation, persistence, and IDEStore integration
 * 
 * @returns {Object} Port configuration state and methods
 */
export const usePortConfiguration = () => {
  const [customPort, setCustomPortState] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(null);
  const [lastValidation, setLastValidation] = useState(null);
  
  const { 
    validatePort, 
    isValidPortRange, 
    portPreferences,
    setActivePort 
  } = useIDEStore();

  // Initialize custom port from IDEStore on mount
  useEffect(() => {
    const initializePort = () => {
      try {
        // Try to get custom port from preferences
        const customPreference = portPreferences.find(p => p.isCustom);
        if (customPreference) {
          setCustomPortState(customPreference.port);
          logger.info('Initialized custom port from preferences:', customPreference.port);
        }
      } catch (error) {
        logger.error('Failed to initialize custom port:', error);
      }
    };

    initializePort();
  }, [portPreferences]);

  /**
   * Set custom port with validation
   * @param {number} port - Port number to set
   * @returns {Promise<Object>} Result object with success status
   */
  const setCustomPort = useCallback(async (port) => {
    try {
      setIsValidating(true);
      setError(null);
      
      logger.info('Setting custom port:', port);

      // Basic validation
      if (!port || port === '') {
        setCustomPortState(null);
        setLastValidation({ isValid: false, error: null, port: null });
        return { success: true, message: 'Port cleared' };
      }

      const portNum = parseInt(port, 10);
      
      // Range validation (1-65535 for project ports)
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        const errorMsg = 'Port must be between 1 and 65535';
        setError(errorMsg);
        setLastValidation({ isValid: false, error: errorMsg, port: portNum });
        return { success: false, error: errorMsg };
      }

      // For project ports, we don't need IDE range validation
      // Project ports can be any valid port number
      
      setCustomPortState(portNum);
      setError(null);
      setLastValidation({ isValid: true, error: null, port: portNum });
      logger.info('Project port set successfully:', portNum);
      return { success: true, port: portNum };
      
    } catch (error) {
      logger.error('Failed to set custom port:', error);
      const errorMsg = 'Failed to set port';
      setError(errorMsg);
      setLastValidation({ isValid: false, error: errorMsg, port: null });
      return { success: false, error: errorMsg };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Validate port without setting it
   * @param {number} port - Port number to validate
   * @returns {Promise<Object>} Validation result
   */
  const validatePortValue = useCallback(async (port) => {
    try {
      setIsValidating(true);
      setError(null);
      
      logger.info('Validating port:', port);

      if (!port || port === '') {
        setLastValidation({ isValid: false, error: null, port: null });
        return { isValid: false, error: null, port: null };
      }

      const portNum = parseInt(port, 10);
      
      // Basic range validation (1-65535 for project ports)
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        const errorMsg = 'Port must be between 1 and 65535';
        setError(errorMsg);
        setLastValidation({ isValid: false, error: errorMsg, port: portNum });
        return { isValid: false, error: errorMsg, port: portNum };
      }

      // For project ports, we don't need IDE range validation
      // Project ports can be any valid port number
      
      setError(null);
      setLastValidation({ isValid: true, error: null, port: portNum });
      logger.info('Project port validation successful:', portNum);
      return { isValid: true, error: null, port: portNum };
      
    } catch (error) {
      logger.error('Failed to validate port:', error);
      const errorMsg = 'Failed to validate port';
      setError(errorMsg);
      setLastValidation({ isValid: false, error: errorMsg, port: null });
      return { isValid: false, error: errorMsg, port: null };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Clear custom port
   * @returns {Object} Result object
   */
  const clearCustomPort = useCallback(() => {
    try {
      setCustomPortState(null);
      setError(null);
      setLastValidation({ isValid: false, error: null, port: null });
      logger.info('Custom port cleared');
      return { success: true };
    } catch (error) {
      logger.error('Error clearing custom port:', error);
      return { success: false, error: 'Failed to clear port' };
    }
  }, []);

  /**
   * Clear validation error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get custom port
   * @returns {number|null} Custom port value
   */
  const getCustomPort = useCallback(() => {
    return customPort;
  }, [customPort]);

  /**
   * Check if port is currently valid
   * @returns {boolean} Whether the current port is valid
   */
  const isPortValid = useCallback(() => {
    return lastValidation?.isValid === true;
  }, [lastValidation]);

  return {
    // State
    customPort,
    isValidating,
    error,
    lastValidation,
    
    // Methods
    setCustomPort,
    validatePort: validatePortValue,
    clearCustomPort,
    clearError,
    getCustomPort,
    isPortValid
  };
}; 