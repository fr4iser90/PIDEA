import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import '@/css/components/ide/ide-selector.css';

/**
 * IDE Selector Component
 * Provides IDE selection dropdown with status indicators and feature badges
 */
const IDESelector = ({ 
  eventBus, 
  activePort, 
  onPortChange, 
  className = '', 
  showFeatures = true,
  showStatus = true,
  compact = false 
}) => {
  const [availableIDEs, setAvailableIDEs] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);

  // Load available IDEs on component mount
  useEffect(() => {
    // Don't call loadAvailableIDEs here - IDEProvider will handle it
    logger.info('IDESelector mounted, IDEProvider will handle IDE loading');
  }, []);

  // Update current selection when activePort changes
  useEffect(() => {
    if (activePort && availableIDEs.length > 0) {
      const selectedIDE = availableIDEs.find(ide => ide.port === activePort);
      setCurrentSelection(selectedIDE || null);
    }
  }, [activePort, availableIDEs]);

  // Listen for IDE list updates
  useEffect(() => {
    if (!eventBus) return;

    const handleIDEListUpdated = () => {
      loadAvailableIDEs();
    };

    const handleActiveIDEChanged = (data) => {
      if (data.port && onPortChange) {
        onPortChange(data.port);
      }
    };

    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);

    return () => {
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
    };
  }, [eventBus, onPortChange]);

  /**
   * Load available IDEs from API
   */
  const loadAvailableIDEs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall('/api/ide/available');
      if (result.success) {
        setAvailableIDEs(result.data.ides || result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load IDEs');
      }
    } catch (error) {
      logger.error('Error loading IDEs:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle IDE selection
   */
  const handleIDESelection = async (ide) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall(`/api/ide/selection`, {
        method: 'POST',
        body: JSON.stringify({ port: ide.port, reason: 'manual' })
      });

      if (result.success) {
        setCurrentSelection(ide);
        if (onPortChange) {
          onPortChange(ide.port);
        }
        setIsOpen(false);

        // Emit event
        if (eventBus) {
          eventBus.emit('ideSelected', { ide, reason: 'manual' });
        }
      } else {
        throw new Error(result.error || 'Failed to select IDE');
      }
    } catch (error) {
      logger.error('Error selecting IDE:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle new IDE creation
   */
  const handleNewIDE = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall('/api/ide/start', {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (result.success) {
        // Reload IDE list
        await loadAvailableIDEs();
        
        // Select the new IDE
        if (result.data && onPortChange) {
          onPortChange(result.data.port);
        }
      } else {
        throw new Error(result.error || 'Failed to start new IDE');
      }
    } catch (error) {
      logger.error('Error starting new IDE:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get IDE status indicator
   */
  const getStatusIndicator = (ide) => {
    const status = ide.status || 'unknown';
    const isActive = ide.isSelected || ide.active;
    
    return (
      <span className={`ide-status-indicator ${status} ${isActive ? 'active' : ''}`}>
        {status === 'running' && '🟢'}
        {status === 'starting' && '🟡'}
        {status === 'stopped' && '🔴'}
        {status === 'error' && '🔴'}
        {status === 'unknown' && '⚪'}
      </span>
    );
  };

  /**
   * Get IDE feature badges
   */
  const getFeatureBadges = (ide) => {
    if (!showFeatures || !ide.features) return null;

    const features = ide.features;
    const badges = [];

    if (features.hasChat) badges.push({ icon: '💬', label: 'Chat', color: 'blue' });
    if (features.hasTerminal) badges.push({ icon: '💻', label: 'Terminal', color: 'green' });
    if (features.hasGit) badges.push({ icon: '📦', label: 'Git', color: 'orange' });
    if (features.hasExtensions) badges.push({ icon: '🔌', label: 'Extensions', color: 'purple' });
    if (features.hasRefactoring) badges.push({ icon: '🔧', label: 'Refactor', color: 'cyan' });

    return (
      <div className="ide-feature-badges">
        {badges.slice(0, 3).map((badge, index) => (
          <span 
            key={index} 
            className={`feature-badge ${badge.color}`}
            title={badge.label}
          >
            {badge.icon}
          </span>
        ))}
        {badges.length > 3 && (
          <span className="feature-badge more" title={`${badges.length - 3} more features`}>
            +{badges.length - 3}
          </span>
        )}
      </div>
    );
  };

  /**
   * Get IDE display name
   */
  const getIDEDisplayName = (ide) => {
    if (ide.metadata?.displayName) {
      return ide.metadata.displayName;
    }
    
    if (ide.ideType) {
      return ide.ideType.charAt(0).toUpperCase() + ide.ideType.slice(1);
    }
    
    return `IDE ${ide.port}`;
  };

  /**
   * Get workspace display name
   */
  const getWorkspaceDisplayName = (ide) => {
    if (!ide.workspacePath) return 'No workspace';
    
    const pathParts = ide.workspacePath.split('/');
    return pathParts[pathParts.length - 1] || 'Unknown workspace';
  };

  // Render loading state
  if (isLoading && availableIDEs.length === 0) {
    return (
      <div className={`ide-selector loading ${className}`}>
        <div className="ide-selector-loading">
          <div className="loading-spinner"></div>
          <span>Loading IDEs...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && availableIDEs.length === 0) {
    return (
      <div className={`ide-selector error ${className}`}>
        <div className="ide-selector-error">
          <span>⚠️ {error}</span>
          <button onClick={loadAvailableIDEs} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`ide-selector ${className} ${compact ? 'compact' : ''}`}>
      {/* Main Selector Button */}
      <div 
        className={`ide-selector-button ${isOpen ? 'open' : ''} ${currentSelection ? 'has-selection' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentSelection ? (
          <div className="selected-ide">
            {showStatus && getStatusIndicator(currentSelection)}
            <div className="ide-info">
              <div className="ide-name">{getIDEDisplayName(currentSelection)}</div>
              <div className="ide-details">
                <span className="ide-port">Port {currentSelection.port}</span>
                <span className="ide-workspace">{getWorkspaceDisplayName(currentSelection)}</span>
              </div>
            </div>
            {showFeatures && getFeatureBadges(currentSelection)}
          </div>
        ) : (
          <div className="no-selection">
            <span>Select IDE</span>
          </div>
        )}
        <span className="dropdown-arrow">▼</span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="ide-selector-dropdown">
          <div className="dropdown-header">
            <h4>Available IDEs</h4>
            <button 
              onClick={handleNewIDE}
              className="new-ide-btn"
              disabled={isLoading}
            >
              🚀 New IDE
            </button>
          </div>

          <div className="ide-list">
            {availableIDEs.length === 0 ? (
              <div className="no-ides">
                <span>No IDEs available</span>
                <button onClick={handleNewIDE} className="create-ide-btn">
                  Create First IDE
                </button>
              </div>
            ) : (
              availableIDEs.map(ide => (
                <div
                  key={ide.port}
                  className={`ide-option ${ide.isSelected ? 'selected' : ''} ${ide.status === 'running' ? 'running' : ''}`}
                  onClick={() => handleIDESelection(ide)}
                >
                  {showStatus && getStatusIndicator(ide)}
                  
                  <div className="ide-option-info">
                    <div className="ide-option-name">
                      {getIDEDisplayName(ide)}
                      {ide.isSelected && <span className="active-indicator">✓</span>}
                    </div>
                    <div className="ide-option-details">
                      <span className="ide-port">Port {ide.port}</span>
                      <span className="ide-status">{ide.status}</span>
                      {ide.workspacePath && (
                        <span className="ide-workspace">{getWorkspaceDisplayName(ide)}</span>
                      )}
                    </div>
                  </div>

                  {showFeatures && getFeatureBadges(ide)}

                  <div className="ide-option-actions">
                    {ide.status === 'running' && !ide.isSelected && (
                      <button 
                        className="switch-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIDESelection(ide);
                        }}
                      >
                        Switch
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="dropdown-error">
              <span>⚠️ {error}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="ide-selector-loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default IDESelector; 