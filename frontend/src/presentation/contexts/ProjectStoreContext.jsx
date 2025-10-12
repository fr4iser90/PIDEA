/**
 * Project Store Context
 * React context provider for ProjectStore integration
 * Provides project management functionality to child components
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import { useProjectStoreIntegration } from '@/hooks/useProjectStoreIntegration';

// Create context
const ProjectStoreContext = createContext(null);

// Context provider component
export const ProjectStoreProvider = ({ children, options = {} }) => {
  const {
    autoInitialize = true,
    autoSync = true,
    syncInterval = 30000,
    enableWorkspaceDetection = true
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  // Store hooks
  const projectStore = useProjectStore();
  const ideStore = useIDEStore();
  
  // Integration hook
  const {
    activeProject,
    activeIDE,
    isSynchronized,
    syncProjectWithIDE,
    syncIDEWithProject,
    getSynchronizedData
  } = useProjectStoreIntegration({
    autoSync,
    syncInterval,
    enableWorkspaceDetection
  });

  // Initialize stores
  useEffect(() => {
    if (!autoInitialize) return;

    const initializeStores = async () => {
      try {
        logger.info('Initializing ProjectStore context...');
        
        // SECURITY: Check authentication before loading data
        const authState = useAuthStore.getState();
        if (!authState.isInitialized || !authState.isAuthenticated) {
          logger.info('User not authenticated or store not initialized, skipping data loading');
          setIsInitialized(true);
          return;
        }
        
        // Load initial data - ONLY if authenticated
        if (Object.keys(projectStore.projects).length === 0) {
          await projectStore.loadProjects();
        }
        
        if (ideStore.availableIDEs.length === 0) {
          await ideStore.loadAvailableIDEs();
        }
        
        setIsInitialized(true);
        setInitializationError(null);
        logger.info('✅ ProjectStore context initialized');
      } catch (error) {
        logger.error('❌ Failed to initialize ProjectStore context:', error);
        setInitializationError(error.message);
        setIsInitialized(false);
      }
    };

    initializeStores();
  }, [autoInitialize, projectStore, ideStore]);

  // Context value
  const contextValue = {
    // State
    isInitialized,
    initializationError,
    
    // Store instances
    projectStore,
    ideStore,
    
    // Integration state
    activeProject,
    activeIDE,
    isSynchronized,
    
    // Integration actions
    syncProjectWithIDE,
    syncIDEWithProject,
    getSynchronizedData,
    
    // Convenience methods
    createProject: projectStore.createProject,
    updateProject: projectStore.updateProject,
    deleteProject: projectStore.deleteProject,
    setActiveProject: projectStore.setActiveProject,
    getProject: projectStore.getProject,
    getProjectByWorkspace: projectStore.getProjectByWorkspace,
    searchProjects: projectStore.searchProjects,
    refresh: projectStore.refresh,
    clearError: projectStore.clearError,
    
    // IDE methods
    setActivePort: ideStore.setActivePort,
    getActivePort: () => ideStore.activePort,
    getAvailableIDEs: () => ideStore.availableIDEs,
    
    // Statistics
    getProjectStats: projectStore.getProjectStats,
    getIDEStats: () => ({
      total: ideStore.availableIDEs.length,
      active: ideStore.availableIDEs.filter(ide => ide.active).length,
      lastUpdate: ideStore.lastUpdate
    })
  };

  return (
    <ProjectStoreContext.Provider value={contextValue}>
      {children}
    </ProjectStoreContext.Provider>
  );
};

// Hook to use the context
export const useProjectStoreContext = () => {
  const context = useContext(ProjectStoreContext);
  
  if (!context) {
    throw new Error('useProjectStoreContext must be used within a ProjectStoreProvider');
  }
  
  return context;
};

// Higher-order component for project store access
export const withProjectStore = (WrappedComponent) => {
  const WithProjectStoreComponent = (props) => {
    const projectStoreContext = useProjectStoreContext();
    
    return (
      <WrappedComponent 
        {...props} 
        projectStore={projectStoreContext}
      />
    );
  };
  
  WithProjectStoreComponent.displayName = `withProjectStore(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithProjectStoreComponent;
};

// Context consumer component
export const ProjectStoreConsumer = ({ children }) => {
  return (
    <ProjectStoreContext.Consumer>
      {children}
    </ProjectStoreContext.Consumer>
  );
};

// Default export
export default ProjectStoreContext;
