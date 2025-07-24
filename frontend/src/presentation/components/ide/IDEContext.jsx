import { logger } from "@/infrastructure/logging/Logger";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';

// Create IDE Context
const IDEContext = createContext();

// IDE Context Provider
export const IDEProvider = ({ children, eventBus }) => {
  const {
    activePort,
    availableIDEs,
    isLoading,
    error,
    loadActivePort,
    loadAvailableIDEs,
    switchIDE,
    refresh,
    clearError
  } = useIDEStore();
  
  const { isAuthenticated } = useAuthStore();
  const [ideFeatures, setIdeFeatures] = useState({});
  const [ideStatus, setIdeStatus] = useState({});

  // Stabilize functions with useCallback to prevent infinite loops
  const stableLoadAvailableIDEs = useCallback(() => {
    loadAvailableIDEs();
  }, [loadAvailableIDEs]);

  const stableLoadActivePort = useCallback(() => {
    loadActivePort();
  }, [loadActivePort]);

  // Load available IDEs on mount ONLY if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      logger.debug('🔍 [IDEContext] User authenticated, loading IDE data...');
      // Add a small delay to prevent race conditions with authentication
      const timer = setTimeout(() => {
        stableLoadAvailableIDEs();
        stableLoadActivePort();
      }, 500); // Increased delay to prevent race conditions
      
      return () => clearTimeout(timer);
    } else {
      logger.debug('🔍 [IDEContext] User not authenticated, skipping IDE loading');
    }
  }, [isAuthenticated, stableLoadAvailableIDEs, stableLoadActivePort]);

  // Listen for IDE events
  useEffect(() => {
    if (!eventBus) return;

    const handleIDEListUpdated = () => {
      stableLoadAvailableIDEs();
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
  }, [eventBus, activePort, stableLoadAvailableIDEs]);

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
      logger.error('Error loading IDE features:', error);
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
      logger.error('Error loading IDE status:', error);
    }
  };

  /**
   * Start a new IDE
   */
  const startNewIDE = async () => {
    try {
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
      logger.error('Error starting new IDE:', error);
      clearError();
    }
  };

  /**
   * Stop an IDE
   */
  const stopIDE = async (port) => {
    try {
      const result = await apiCall('/api/ide/stop', {
        method: 'POST',
        body: JSON.stringify({ port })
      });

      if (result.success) {
        // Reload IDE list
        await loadAvailableIDEs();
        
        // If we stopped the active IDE, clear it
        if (port === activePort) {
          setIdeFeatures({});
          setIdeStatus({});
        }
      } else {
        throw new Error(result.error || 'Failed to stop IDE');
      }
    } catch (error) {
      logger.error('Error stopping IDE:', error);
      clearError();
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
      logger.error('Error toggling feature:', error);
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