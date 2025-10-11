import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import '@/scss/components/_ide-features.scss';;

/**
 * IDE Features Component
 * Provides IDE-specific feature detection and availability indicators
 */
const IDEFeatures = ({ 
  eventBus, 
  activePort, 
  className = '',
  showDetails = true,
  showActions = true,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [features, setFeatures] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeFeatures, setActiveFeatures] = useState([]);
  const [featureStats, setFeatureStats] = useState({});
  const [refreshTimer, setRefreshTimer] = useState(null);

  // Load features when activePort changes
  useEffect(() => {
    if (activePort) {
      loadFeatures();
    } else {
      setFeatures({});
      setActiveFeatures([]);
    }
  }, [activePort]);

  // Set up auto-refresh timer
  useEffect(() => {
    if (autoRefresh && activePort && refreshInterval > 0) {
      const timer = setInterval(() => {
        loadFeatures();
      }, refreshInterval);
      setRefreshTimer(timer);

      return () => {
        clearInterval(timer);
        setRefreshTimer(null);
      };
    }
  }, [autoRefresh, activePort, refreshInterval]);

  // Listen for feature events
  useEffect(() => {
    if (!eventBus) return;

    const handleFeaturesUpdated = (data) => {
      if (data.port === activePort) {
        setFeatures(data.features);
        setLastUpdate(new Date());
        setError(null);
        updateActiveFeatures(data.features);
        updateFeatureStats(data.features);
      }
    };

    const handleFeatureActivated = (data) => {
      if (data.port === activePort) {
        setActiveFeatures(prev => [...prev, data.feature]);
      }
    };

    const handleFeatureDeactivated = (data) => {
      if (data.port === activePort) {
        setActiveFeatures(prev => prev.filter(f => f !== data.feature));
      }
    };

    eventBus.on('featuresUpdated', handleFeaturesUpdated);
    eventBus.on('featureActivated', handleFeatureActivated);
    eventBus.on('featureDeactivated', handleFeatureDeactivated);

    return () => {
      eventBus.off('featuresUpdated', handleFeaturesUpdated);
      eventBus.off('featureActivated', handleFeatureActivated);
      eventBus.off('featureDeactivated', handleFeatureDeactivated);
    };
  }, [eventBus, activePort]);

  /**
   * Load features from API
   */
  const loadFeatures = async () => {
    if (!activePort) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall(`/api/ide/features?port=${activePort}`);
      if (result.success) {
        setFeatures(result.data);
        setLastUpdate(new Date());
        updateActiveFeatures(result.data);
        updateFeatureStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to load features');
      }
    } catch (error) {
      logger.error('Error loading features:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update active features list
   */
  const updateActiveFeatures = (featureData) => {
    const active = [];
    Object.entries(featureData).forEach(([feature, data]) => {
      if (data.available && data.enabled) {
        active.push(feature);
      }
    });
    setActiveFeatures(active);
  };

  /**
   * Update feature statistics
   */
  const updateFeatureStats = (featureData) => {
    const stats = {
      total: Object.keys(featureData).length,
      available: 0,
      enabled: 0,
      disabled: 0,
      unavailable: 0
    };

    Object.values(featureData).forEach(feature => {
      if (feature.available) {
        stats.available++;
        if (feature.enabled) {
          stats.enabled++;
        } else {
          stats.disabled++;
        }
      } else {
        stats.unavailable++;
      }
    });

    setFeatureStats(stats);
  };

  /**
   * Toggle feature
   */
  const toggleFeature = async (featureName) => {
    if (!activePort) return;

    try {
      const currentState = features[featureName]?.enabled || false;
      const result = await apiCall('/api/ide/features/toggle', {
        method: 'POST',
        body: JSON.stringify({
          port: activePort,
          feature: featureName,
          enabled: !currentState
        })
      });

      if (result.success) {
        // Update local state
        setFeatures(prev => ({
          ...prev,
          [featureName]: {
            ...prev[featureName],
            enabled: !currentState
          }
        }));

        // Emit event
        if (eventBus) {
          eventBus.emit('featureToggled', {
            port: activePort,
            feature: featureName,
            enabled: !currentState
          });
        }

        // Reload features to get updated state
        setTimeout(loadFeatures, 500);
      } else {
        throw new Error(result.error || 'Failed to toggle feature');
      }
    } catch (error) {
      logger.error('Error toggling feature:', error);
      setError(error.message);
    }
  };

  /**
   * Get feature icon
   */
  const getFeatureIcon = (featureName) => {
    const iconMap = {
      chat: '💬',
      terminal: '💻',
      git: '📦',
      extensions: '🔌',
      refactoring: '🔧',
      debugging: '🐛',
      testing: '🧪',
      profiling: '📊',
      collaboration: '👥',
      ai: '🤖',
      search: '🔍',
      navigation: '🧭',
      formatting: '✨',
      linting: '🔍',
      autocomplete: '⌨️',
      snippets: '📝',
      themes: '🎨',
      keyboard: '⌨️',
      mouse: '🖱️',
      accessibility: '♿'
    };

    return iconMap[featureName] || '⚙️';
  };

  /**
   * Get feature status indicator
   */
  const getFeatureStatus = (feature) => {
    if (!feature.available) {
      return { icon: '❌', text: 'Unavailable', class: 'unavailable' };
    }
    if (feature.enabled) {
      return { icon: '✅', text: 'Enabled', class: 'enabled' };
    }
    return { icon: '⭕', text: 'Disabled', class: 'disabled' };
  };

  /**
   * Get feature description
   */
  const getFeatureDescription = (featureName) => {
    const descriptions = {
      chat: 'AI-powered chat assistance',
      terminal: 'Integrated terminal access',
      git: 'Git version control integration',
      extensions: 'Extension management',
      refactoring: 'Code refactoring tools',
      debugging: 'Debugging capabilities',
      testing: 'Testing framework support',
      profiling: 'Performance profiling',
      collaboration: 'Team collaboration features',
      ai: 'AI assistance features',
      search: 'Advanced search functionality',
      navigation: 'Code navigation tools',
      formatting: 'Code formatting',
      linting: 'Code linting and analysis',
      autocomplete: 'Intelligent autocomplete',
      snippets: 'Code snippets support',
      themes: 'UI theme customization',
      keyboard: 'Keyboard shortcuts',
      mouse: 'Mouse interaction support',
      accessibility: 'Accessibility features'
    };

    return descriptions[featureName] || 'IDE feature';
  };

  /**
   * Render feature card
   */
  const renderFeatureCard = (featureName, featureData) => {
    const status = getFeatureStatus(featureData);
    const icon = getFeatureIcon(featureName);
    const description = getFeatureDescription(featureName);

    return (
      <div
        key={featureName}
        className={`feature-card ${status.class} ${featureData.available ? 'available' : 'unavailable'}`}
      >
        <div className="feature-header">
          <span className="feature-icon">{icon}</span>
          <span className="feature-name">{featureName}</span>
          <span className={`feature-status ${status.class}`}>
            {status.icon} {status.text}
          </span>
        </div>

        <div className="feature-content">
          <p className="feature-description">{description}</p>
          
          {showDetails && featureData.details && (
            <div className="feature-details">
              {featureData.details.version && (
                <span className="detail-item">Version: {featureData.details.version}</span>
              )}
              {featureData.details.provider && (
                <span className="detail-item">Provider: {featureData.details.provider}</span>
              )}
              {featureData.details.config && (
                <span className="detail-item">Config: {featureData.details.config}</span>
              )}
            </div>
          )}

          {showActions && featureData.available && (
            <div className="feature-actions">
              <button
                onClick={() => toggleFeature(featureName)}
                className={`toggle-button ${featureData.enabled ? 'enabled' : 'disabled'}`}
                disabled={isLoading}
              >
                {featureData.enabled ? 'Disable' : 'Enable'}
              </button>
              
              {featureData.actions && featureData.actions.length > 0 && (
                <div className="feature-action-buttons">
                  {featureData.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => executeFeatureAction(featureName, action)}
                      className="action-button"
                      disabled={isLoading}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Execute feature action
   */
  const executeFeatureAction = async (featureName, action) => {
    if (!activePort) return;

    try {
      const result = await apiCall('/api/ide/features/action', {
        method: 'POST',
        body: JSON.stringify({
          port: activePort,
          feature: featureName,
          action: action.name,
          data: action.data || {}
        })
      });

      if (result.success) {
        // Emit event
        if (eventBus) {
          eventBus.emit('featureActionExecuted', {
            port: activePort,
            feature: featureName,
            action: action.name,
            result: result.data
          });
        }
      } else {
        throw new Error(result.error || 'Action failed');
      }
    } catch (error) {
      logger.error('Error executing feature action:', error);
      setError(error.message);
    }
  };

  /**
   * Get feature statistics display
   */
  const getFeatureStats = () => {
    return (
      <div className="feature-stats">
        <div className="stat-item">
          <span className="stat-label">Total:</span>
          <span className="stat-value">{featureStats.total || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Available:</span>
          <span className="stat-value available">{featureStats.available || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Enabled:</span>
          <span className="stat-value enabled">{featureStats.enabled || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Disabled:</span>
          <span className="stat-value disabled">{featureStats.disabled || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Unavailable:</span>
          <span className="stat-value unavailable">{featureStats.unavailable || 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`ide-features ${className}`}>
      <div className="features-header">
        <h3>IDE Features - Port {activePort}</h3>
        {lastUpdate && (
          <span className="last-update">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {getFeatureStats()}

      <div className="features-controls">
        <button
          onClick={loadFeatures}
          disabled={isLoading}
          className="refresh-button"
        >
          {isLoading ? '🔄' : '🔄'} Refresh Features
        </button>

        {activeFeatures.length > 0 && (
          <div className="active-features">
            <span className="active-label">Active:</span>
            {activeFeatures.map(feature => (
              <span key={feature} className="active-feature">
                {getFeatureIcon(feature)} {feature}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="features-content">
        {error && (
          <div className="features-error">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
            <button onClick={loadFeatures} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {isLoading && (
          <div className="features-loading">
            <span className="loading-icon">🔄</span>
            <span className="loading-text">Loading features...</span>
          </div>
        )}

        {!isLoading && !error && Object.keys(features).length > 0 && (
          <div className="features-grid">
            {Object.entries(features).map(([featureName, featureData]) =>
              renderFeatureCard(featureName, featureData)
            )}
          </div>
        )}

        {!isLoading && !error && Object.keys(features).length === 0 && activePort && (
          <div className="features-empty">
            <span className="empty-icon">⚙️</span>
            <span className="empty-text">No features available</span>
          </div>
        )}

        {!activePort && (
          <div className="features-disconnected">
            <span className="disconnected-icon">🔌</span>
            <span className="disconnected-text">No IDE connected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default IDEFeatures; 