import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

/**
 * PortConfigInput Component
 * Reusable port input component with validation and error handling
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onPortChange - Callback when port changes
 * @param {Function} props.onPortValidate - Callback when port validation completes
 * @param {number} props.initialPort - Initial port value
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.placeholder - Input placeholder text
 */
const PortConfigInput = ({ 
  onPortChange, 
  onPortValidate, 
  initialPort, 
  disabled = false,
  className = '',
  placeholder = 'Enter port (1-65535)'
}) => {
  const [port, setPort] = useState(initialPort || '');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  
  const { validatePort, isValidPortRange } = useIDEStore();

  // Initialize port from initialPort prop
  useEffect(() => {
    if (initialPort && initialPort !== port) {
      setPort(initialPort);
      setHasChanged(false);
    }
  }, [initialPort]);

  // Validate port when it changes
  const validatePortValue = useCallback(async (portValue) => {
    if (!portValue || portValue === '') {
      setError(null);
      setIsValid(false);
      setIsValidating(false);
      onPortValidate?.({ isValid: false, error: null, port: null });
      return;
    }

    const portNum = parseInt(portValue, 10);
    
    // Basic range validation (1-65535 for project ports)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Port must be between 1 and 65535');
      setIsValid(false);
      setIsValidating(false);
      onPortValidate?.({ isValid: false, error: 'Port must be between 1 and 65535', port: null });
      return;
    }

    // For project ports, we don't need IDE range validation
    // Project ports can be any valid port number
    
    setIsValidating(true);
    setError(null);

    try {
      // For project ports, just accept any valid port number
      setError(null);
      setIsValid(true);
      onPortValidate?.({ isValid: true, error: null, port: portNum });
      logger.info('Project port validation successful:', portNum);
    } catch (error) {
      logger.error('Port validation error:', error);
      setError('Failed to validate port');
      setIsValid(false);
      onPortValidate?.({ isValid: false, error: 'Validation failed', port: portNum });
    } finally {
      setIsValidating(false);
    }
  }, [onPortValidate]);

  // Remove automatic debounced validation - only validate on Enter or Blur
  // useEffect(() => {
  //   if (!hasChanged) return;

  //   const timeoutId = setTimeout(() => {
  //     // Only validate if port is complete (at least 3 digits for common ports)
  //     if (port.length >= 3 || port === '') {
  //       validatePortValue(port);
  //     }
  //   }, 1000); // Increased from 500ms to 1000ms

  //   return () => clearTimeout(timeoutId);
  // }, [port, hasChanged, validatePortValue]);

  const handlePortChange = (e) => {
    const value = e.target.value;
    setPort(value);
    setHasChanged(true);
    onPortChange?.(value);
    // Clear any previous errors when user starts typing
    if (error) {
      setError(null);
      setIsValid(false);
    }
  };

  const handlePortBlur = () => {
    if (hasChanged) {
      validatePortValue(port);
    }
  };

  const handleClearPort = () => {
    setPort('');
    setError(null);
    setIsValid(false);
    setHasChanged(false);
    onPortChange?.('');
    onPortValidate?.({ isValid: false, error: null, port: null });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validatePortValue(port);
    }
  };

  const getInputClasses = () => {
    const classes = ['port-input'];
    
    if (error) classes.push('port-input-error');
    if (isValidating) classes.push('port-input-loading');
    if (isValid) classes.push('port-input-valid');
    if (disabled) classes.push('port-input-disabled');
    
    return classes.join(' ');
  };

  return (
    <div className={`port-config-input ${className}`}>
      <div className="port-input-container">
        <label className="port-input-label" htmlFor="port-input">
          Port Configuration
        </label>
        
        <div className="port-input-wrapper">
          <input
            id="port-input"
            type="number"
            className={getInputClasses()}
            value={port}
            onChange={handlePortChange}
            onBlur={handlePortBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isValidating}
            min="1"
            max="65535"
            aria-describedby={error ? 'port-error' : 'port-help'}
            aria-invalid={!!error}
          />
          
          {isValidating && (
            <div className="port-input-loading-spinner" data-testid="loading-spinner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
            </div>
          )}
          
          {!isValidating && port && (
            <button
              type="button"
              className="port-input-clear"
              onClick={handleClearPort}
              disabled={disabled}
              aria-label="Clear port"
            >
              ×
            </button>
          )}
        </div>
        
        {error && (
          <div id="port-error" className="port-input-error-message" role="alert">
            <span className="error-icon">⚠</span>
            <span className="error-text">{error}</span>
          </div>
        )}
        
        {!error && (
          <div id="port-help" className="port-input-help">
            Enter a port number between 1 and 65535
          </div>
        )}
      </div>
    </div>
  );
};

export default PortConfigInput; 