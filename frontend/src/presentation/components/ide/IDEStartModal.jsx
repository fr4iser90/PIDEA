/**
 * IDEStartModal Component
 * Modal for configuring and starting new IDE instances
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import IDERequirementService from '@/infrastructure/services/IDERequirementService.jsx';
import '@/css/components/ide/ide-start-modal.css';

const IDEStartModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  className = '',
  showRequirementMessage = false
}) => {
  const { refresh } = useIDEStore();
  const [formData, setFormData] = useState({
    ideType: 'cursor',
    port: 'auto',
    customPort: '',
    executablePath: '',
    additionalFlags: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [downloadLinks, setDownloadLinks] = useState({});
  const [executablePaths, setExecutablePaths] = useState({});
  const [isValidatingPath, setIsValidatingPath] = useState(false);
  const [pathValidation, setPathValidation] = useState(null);

  // IDE type options
  const ideTypes = [
    { value: 'cursor', label: 'Cursor', icon: '🎯', description: 'AI-powered code editor' },
    { value: 'vscode', label: 'VS Code', icon: '📝', description: 'Microsoft Visual Studio Code' },
    { value: 'windsurf', label: 'Windsurf', icon: '🌊', description: 'AI-powered development environment' }
  ];

  // Port range options
  const portRanges = {
    cursor: { min: 9222, max: 9231, label: 'Cursor (9222-9231)' },
    vscode: { min: 9232, max: 9241, label: 'VS Code (9232-9241)' },
    windsurf: { min: 9242, max: 9251, label: 'Windsurf (9242-9251)' }
  };

  // Load available ports when IDE type changes
  useEffect(() => {
    if (isOpen && formData.ideType) {
      loadAvailablePorts();
    }
  }, [isOpen, formData.ideType]);

  // Load download links and executable paths when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDownloadLinks();
      loadExecutablePaths();
    }
  }, [isOpen]);

  // Validate executable path when it changes
  useEffect(() => {
    if (formData.executablePath && formData.executablePath.trim()) {
      validateExecutablePath(formData.executablePath);
    } else {
      setPathValidation(null);
    }
  }, [formData.executablePath]);


  // Load available ports
  const loadAvailablePorts = useCallback(async () => {
    try {
      const result = await apiCall('/api/ide/available');
      if (result.success) {
        const usedPorts = (result.data.ides || result.data || []).map(ide => ide.port);
        const range = portRanges[formData.ideType];
        const available = [];
        
        for (let port = range.min; port <= range.max; port++) {
          if (!usedPorts.includes(port)) {
            available.push(port);
          }
        }
        
        setAvailablePorts(available);
      }
    } catch (error) {
      logger.error('Error loading available ports:', error);
    }
  }, [formData.ideType]);

  // Load download links
  const loadDownloadLinks = useCallback(async () => {
    try {
      const links = await IDERequirementService.getDownloadLinks();
      setDownloadLinks(links);
    } catch (error) {
      logger.error('Error loading download links:', error);
    }
  }, []);

  // Load executable paths
  const loadExecutablePaths = useCallback(async () => {
    try {
      const paths = await IDERequirementService.getExecutablePaths();
      setExecutablePaths(paths);
    } catch (error) {
      logger.error('Error loading executable paths:', error);
    }
  }, []);

  // Validate executable path
  const validateExecutablePath = useCallback(async (path) => {
    if (!path || !path.trim()) {
      setPathValidation(null);
      return;
    }

    setIsValidatingPath(true);
    try {
      const validation = await IDERequirementService.validateExecutablePath(path);
      setPathValidation(validation);
    } catch (error) {
      logger.error('Error validating executable path:', error);
      setPathValidation({ valid: false, error: 'Failed to validate path' });
    } finally {
      setIsValidatingPath(false);
    }
  }, []);

  // Handle download link click
  const handleDownloadClick = useCallback((ideType) => {
    const links = downloadLinks[ideType];
    if (links) {
      // Detect platform and open appropriate download link
      const platform = navigator.platform.toLowerCase();
      let downloadUrl = links.linux; // default
      
      if (platform.includes('win')) {
        downloadUrl = links.windows;
      } else if (platform.includes('mac')) {
        downloadUrl = links.macos;
      }
      
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }, [downloadLinks]);

  // Handle form input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user makes changes
    if (error) {
      setError(null);
    }
  }, [error]);

  // Handle script execution
  const handleRunScript = useCallback((ideType) => {
    const platform = navigator.platform.toLowerCase();
    let scriptCommand = '';
    
    if (platform.includes('win')) {
      // Windows - use PowerShell script
      scriptCommand = `powershell -File start_ide_example.ps1 ${ideType}`;
    } else {
      // Linux/Mac - use bash script
      scriptCommand = `./start_ide_example.sh ${ideType}`;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(scriptCommand).then(() => {
      logger.info('Script command copied to clipboard:', scriptCommand);
    }).catch((error) => {
      logger.error('Failed to copy to clipboard:', error);
    });
  }, []);

  // Handle IDE type change
  const handleIDETypeChange = useCallback((ideType) => {
    handleInputChange('ideType', ideType);
    handleInputChange('port', 'auto'); // Reset port selection
  }, [handleInputChange]);

  // Handle port selection
  const handlePortChange = useCallback((port) => {
    if (port === 'custom') {
      handleInputChange('port', 'custom');
    } else {
      handleInputChange('port', port);
      handleInputChange('customPort', '');
    }
  }, [handleInputChange]);

  // Validate form
  const validateForm = useCallback(() => {
    if (!formData.ideType) {
      setError('Please select an IDE type');
      return false;
    }
    
    if (formData.port === 'custom' && !formData.customPort) {
      setError('Please enter a custom port number');
      return false;
    }
    
    if (formData.port === 'custom' && formData.customPort) {
      const port = parseInt(formData.customPort);
      const range = portRanges[formData.ideType];
      
      if (isNaN(port) || port < range.min || port > range.max) {
        setError(`Port must be between ${range.min} and ${range.max} for ${formData.ideType}`);
        return false;
      }
    }

    // Validate executable path if provided
    if (formData.executablePath && formData.executablePath.trim()) {
      if (pathValidation && !pathValidation.valid) {
        setError(`Invalid executable path: ${pathValidation.error}`);
        return false;
      }
      
      // If still validating, wait
      if (isValidatingPath) {
        setError('Please wait while validating executable path...');
        return false;
      }
    }
    
    return true;
  }, [formData, pathValidation, isValidatingPath]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const payload = {
        ideType: formData.ideType,
        options: {
          port: formData.port === 'custom' ? parseInt(formData.customPort) : formData.port,
          executablePath: formData.executablePath || null,
          additionalFlags: formData.additionalFlags || null
        }
      };
      
      logger.info('Starting IDE with payload:', payload);
      
      const result = await apiCall('/api/ide/start', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (result.success) {
        logger.info('IDE started successfully:', result.data);
        
        // Refresh IDE list
        await refresh();
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result.data);
        }
        
        // Close modal
        onClose();
      } else {
        throw new Error(result.error || 'Failed to start IDE');
      }
    } catch (error) {
      logger.error('Error starting IDE:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, refresh, onSuccess, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      setError(null);
      setFormData({
        ideType: 'cursor',
        port: 'auto',
        customPort: '',
        executablePath: '',
        additionalFlags: ''
      });
      onClose();
    }
  }, [isLoading, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className={`ide-start-modal-overlay ${className}`}>
      <div className="ide-start-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {showRequirementMessage ? 'IDE Required' : 'Start New IDE'}
          </h2>
          <button 
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>
        
        {showRequirementMessage && (
          <div className="requirement-message">
            <div className="requirement-icon">⚠️</div>
            <div className="requirement-text">
              <h3>No IDE Running</h3>
              <p>You need to start an IDE before you can use PIDEA. Please configure and start an IDE below.</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3 className="section-title">IDE Configuration</h3>
            
            {/* IDE Type Selection */}
            <div className="form-group">
              <label className="form-label">IDE Type</label>
              <div className="ide-type-options">
                {ideTypes.map(ide => (
                  <div
                    key={ide.value}
                    className={`ide-type-option ${formData.ideType === ide.value ? 'selected' : ''}`}
                    onClick={() => handleIDETypeChange(ide.value)}
                  >
                    <span className="ide-icon">{ide.icon}</span>
                    <div className="ide-info">
                      <div className="ide-name">{ide.label}</div>
                      <div className="ide-description">{ide.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Download Links Section */}
            <div className="form-group download-section">
              <label className="form-label">Don't have this IDE?</label>
              <div className="download-links">
                <button
                  type="button"
                  className="download-btn"
                  onClick={() => handleDownloadClick(formData.ideType)}
                  disabled={!downloadLinks[formData.ideType]}
                >
                  <span className="download-icon">⬇️</span>
                  <span className="download-text">Download {ideTypes.find(ide => ide.value === formData.ideType)?.label}</span>
                  <span className="download-external">↗</span>
                </button>
                <p className="download-note">
                  Opens official download page in a new tab
                </p>
              </div>
            </div>
            
            {/* Port Selection */}
            <div className="form-group">
              <label className="form-label">Port</label>
              <div className="port-selection">
                <div className="port-options">
                  <label className="port-option">
                    <input
                      type="radio"
                      name="port"
                      value="auto"
                      checked={formData.port === 'auto'}
                      onChange={() => handlePortChange('auto')}
                    />
                    <span>Auto-assign</span>
                  </label>
                  
                  {availablePorts.slice(0, 5).map(port => (
                    <label key={port} className="port-option">
                      <input
                        type="radio"
                        name="port"
                        value={port}
                        checked={formData.port === port.toString()}
                        onChange={() => handlePortChange(port.toString())}
                      />
                      <span>{port}</span>
                    </label>
                  ))}
                  
                  <label className="port-option">
                    <input
                      type="radio"
                      name="port"
                      value="custom"
                      checked={formData.port === 'custom'}
                      onChange={() => handlePortChange('custom')}
                    />
                    <span>Custom</span>
                  </label>
                </div>
                
                {formData.port === 'custom' && (
                  <input
                    type="number"
                    className="form-input custom-port-input"
                    placeholder="Enter port number"
                    value={formData.customPort}
                    onChange={(e) => handleInputChange('customPort', e.target.value)}
                    min={portRanges[formData.ideType]?.min}
                    max={portRanges[formData.ideType]?.max}
                  />
                )}
              </div>
            </div>
          </div>
          
          
          <div className="form-section">
            <h3 className="section-title">Advanced Options</h3>
            
            {/* Executable Path */}
            <div className="form-group">
              <label className="form-label">Executable Path (optional)</label>
              <div className="executable-path-section">
                <div className="path-input-group">
                  <input
                    type="text"
                    className={`form-input ${pathValidation ? (pathValidation.valid ? 'valid' : 'invalid') : ''}`}
                    placeholder="Path to IDE executable (only if not using startup scripts)"
                    value={formData.executablePath}
                    onChange={(e) => handleInputChange('executablePath', e.target.value)}
                  />
                </div>
                
                {/* Path validation feedback */}
                {isValidatingPath && (
                  <div className="path-validation validating">
                    <span className="validation-icon">⏳</span>
                    <span className="validation-text">Validating executable path...</span>
                  </div>
                )}
                
                {pathValidation && !isValidatingPath && (
                  <div className={`path-validation ${pathValidation.valid ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {pathValidation.valid ? '✅' : '❌'}
                    </span>
                    <span className="validation-text">
                      {pathValidation.valid 
                        ? `Valid executable${pathValidation.version ? ` (version ${pathValidation.version})` : ''}`
                        : pathValidation.error
                      }
                    </span>
                  </div>
                )}
                
                {!formData.executablePath && (
                  <p className="path-help">
                    Leave empty to use startup scripts, or specify a custom path to your IDE executable
                  </p>
                )}
              </div>
            </div>
            
            {/* Additional Flags */}
            <div className="form-group">
              <label className="form-label">Additional Flags (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Additional command line flags"
                value={formData.additionalFlags}
                onChange={(e) => handleInputChange('additionalFlags', e.target.value)}
              />
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="form-error">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error}</span>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Starting IDE...' : 'Start IDE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IDEStartModal;
