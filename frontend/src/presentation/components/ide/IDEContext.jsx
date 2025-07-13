import { logger } from "@/infrastructure/logging/Logger";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Create IDE Context
const IDEContext = createContext();

// IDE Context Provider
export const IDEProvider = ({ children, eventBus }) => {
  const [activePort, setActivePort] = useState(null);
  const [availableIDEs, setAvailableIDEs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ideFeatures, setIdeFeatures] = useState({});
  const [ideStatus, setIdeStatus] = useState({});

  // Load available IDEs on mount
  useEffect(() => {
    loadAvailableIDEs();
  }, []);

  // Listen for IDE events
  useEffect(() => {
    if (!eventBus) return;

    const handleIDEListUpdated = () => {
      loadAvailableIDEs();
    };

    const handleActiveIDEChanged = (data) => {
      if (data.port) {
        setActivePort(data.port);
        loadIdeFeatures(data.port);
        loadIdeStatus(data.port);
      }
    };

    const handleIDESwitched = (data) => {
      if (data.toPort) {
        setActivePort(data.toPort);
        loadIdeFeatures(data.toPort);
        loadIdeStatus(data.toPort);
      }
    };

    const handleFeaturesUpdated = (data) => {
      if (data.port === activePort) {
        setIdeFeatures(data.features);
      }
    };

    const handleStatusUpdated = (data) => {
      if (data.port === activePort) {
        setIdeStatus(data.status);
      }
    };

    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    eventBus.on('ideSwitched', handleIDESwitched);
    eventBus.on('featuresUpdated', handleFeaturesUpdated);
    eventBus.on('statusUpdated', handleStatusUpdated);

    return () => {
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
      eventBus.off('ideSwitched', handleIDESwitched);
      eventBus.off('featuresUpdated', handleFeaturesUpdated);
      eventBus.off('statusUpdated', handleStatusUpdated);
    };
  }, [eventBus, activePort]);

  /**
   * Load available IDEs from API
   */
  const loadAvailableIDEs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall('/api/ide/available');
      if (result.success) {
        const ides = result.data.ides || result.data || [];
        setAvailableIDEs(ides);

        // Set active IDE if none is selected
        if (!activePort && ides.length > 0) {
          const activeIDE = ides.find(ide => ide.active || ide.isSelected);
          if (activeIDE) {
            setActivePort(activeIDE.port);
            loadIdeFeatures(activeIDE.port);
            loadIdeStatus(activeIDE.port);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to load IDEs');
      }
    } catch (error) {
      logger.error('[IDEContext] Error loading IDEs:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load IDE features
   */
  const loadIdeFeatures = async (port) => {
    if (!port) return;

    try {
      const result = await apiCall(`/api/ide/features?port=${port}`);
      if (result.success) {
        setIdeFeatures(result.data);
      }
    } catch (error) {
      logger.error('[IDEContext] Error loading IDE features:', error);
    }
  };

  /**
   * Load IDE status
   */
  const loadIdeStatus = async (port) => {
    if (!port) return;

    try {
      const result = await apiCall(`/api/ide/status?port=${port}`);
      if (result.success) {
        setIdeStatus(result.data);
      }
    } catch (error) {
      logger.error('[IDEContext] Error loading IDE status:', error);
    }
  };

  /**
   * Switch to a different IDE
   */
  const switchIDE = async (port, reason = 'manual') => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall('/api/ide/selection', {
        method: 'POST',
        body: JSON.stringify({ port, reason })
      });

      if (result.success) {
        setActivePort(port);
        loadIdeFeatures(port);
        loadIdeStatus(port);

        // Emit event
        if (eventBus) {
          eventBus.emit('ideSwitched', { fromPort: activePort, toPort: port, reason });
        }
      } else {
        throw new Error(result.error || 'Failed to switch IDE');
      }
    } catch (error) {
      logger.error('[IDEContext] Error switching IDE:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start a new IDE
   */
  const startNewIDE = async () => {
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
        
        // Switch to the new IDE
        if (result.data && result.data.port) {
          await switchIDE(result.data.port, 'new');
        }
      } else {
        throw new Error(result.error || 'Failed to start new IDE');
      }
    } catch (error) {
      logger.error('[IDEContext] Error starting new IDE:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Stop an IDE
   */
  const stopIDE = async (port) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall('/api/ide/stop', {
        method: 'POST',
        body: JSON.stringify({ port })
      });

      if (result.success) {
        // Reload IDE list
        await loadAvailableIDEs();
        
        // If we stopped the active IDE, clear it
        if (port === activePort) {
          setActivePort(null);
          setIdeFeatures({});
          setIdeStatus({});
        }
      } else {
        throw new Error(result.error || 'Failed to stop IDE');
      }
    } catch (error) {
      logger.error('[IDEContext] Error stopping IDE:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get current IDE info
   */
  const getCurrentIDE = () => {
    return availableIDEs.find(ide => ide.port === activePort);
  };

  /**
   * Check if a feature is available
   */
  const isFeatureAvailable = (featureName) => {
    return ideFeatures[featureName]?.available || false;
  };

  /**
   * Check if a feature is enabled
   */
  const isFeatureEnabled = (featureName) => {
    return ideFeatures[featureName]?.enabled || false;
  };

  /**
   * Toggle a feature
   */
  const toggleFeature = async (featureName) => {
    if (!activePort) return;

    try {
      const currentState = ideFeatures[featureName]?.enabled || false;
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
        setIdeFeatures(prev => ({
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
      } else {
        throw new Error(result.error || 'Failed to toggle feature');
      }
    } catch (error) {
      logger.error('[IDEContext] Error toggling feature:', error);
      setError(error.message);
    }
  };

  // Context value
  const contextValue = {
    // State
    activePort,
    availableIDEs,
    isLoading,
    error,
    ideFeatures,
    ideStatus,
    
    // Actions
    switchIDE,
    startNewIDE,
    stopIDE,
    loadAvailableIDEs,
    loadIdeFeatures,
    loadIdeStatus,
    getCurrentIDE,
    isFeatureAvailable,
    isFeatureEnabled,
    toggleFeature,
    
    // Computed values
    currentIDE: getCurrentIDE(),
    hasActiveIDE: !!activePort,
    availableFeatures: Object.keys(ideFeatures).filter(f => isFeatureAvailable(f)),
    enabledFeatures: Object.keys(ideFeatures).filter(f => isFeatureEnabled(f))
  };

  return (
    <IDEContext.Provider value={contextValue}>
      {children}
    </IDEContext.Provider>
  );
};

// Custom hook to use IDE context
export const useIDE = () => {
  const context = useContext(IDEContext);
  if (!context) {
    throw new Error('useIDE must be used within an IDEProvider');
  }
  return context;
};

export default IDEContext; 