/**
 * Project Store Hook
 * Wrapper hook for ProjectStore with additional functionality
 * Provides convenient access to project store actions and state
 */

import { useEffect, useCallback, useMemo } from 'react';
import useProjectStoreCore from '../ProjectStore.jsx';
import useAuthStore from '../AuthStore.jsx';
import { logger } from '@/infrastructure/logging/Logger';

/**
 * Main hook for accessing project store
 */
export const useProjectStore = () => {
  return useProjectStoreCore();
};

/**
 * Hook for project management with auto-loading
 */
export const useProjectManagement = (autoLoad = false) => { // CHANGED: Default to false!
  const {
    projects,
    selectedProject,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setSelectedProject,
    clearError,
    refresh,
    stopLoading
  } = useProjectStoreCore();

  // Auto-load projects on mount - ONLY if authenticated - ONCE ONLY!
  useEffect(() => {
    // Wait for auth store to be initialized
    const authState = useAuthStore.getState();
    if (autoLoad && authState.isInitialized && authState.isAuthenticated && Object.keys(projects).length === 0 && !isLoading) {
      logger.info('🔍 [useProjectManagement] Auto-loading projects... ONCE ONLY!');
      loadProjects();
    }
  }, [autoLoad, isLoading, loadProjects]); // REMOVED 'projects' from dependencies!

  // Wrapped actions with error handling
  const handleCreateProject = useCallback(async (projectData) => {
    try {
      clearError();
      return await createProject(projectData);
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error;
    }
  }, [createProject, clearError]);

  const handleUpdateProject = useCallback(async (projectId, updates) => {
    try {
      clearError();
      return await updateProject(projectId, updates);
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw error;
    }
  }, [updateProject, clearError]);

  const handleDeleteProject = useCallback(async (projectId) => {
    try {
      clearError();
      await deleteProject(projectId);
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw error;
    }
  }, [deleteProject, clearError]);

  const handleSetSelectedProject = useCallback((projectId) => {
    try {
      setSelectedProject(projectId);
    } catch (error) {
      logger.error('Failed to set selected project:', error);
    }
  }, [setSelectedProject]);

  const handleRefresh = useCallback(async () => {
    try {
      clearError();
      // Check if already loading - USE STRICT DEDUPLICATION!
      const currentState = useProjectStoreCore.getState();
      if (currentState.isLoading || currentState.loadingLock) {
        logger.warn('🚫 Refresh skipped - already loading (STRICT DEDUPLICATION ACTIVE)', {
          isLoading: currentState.isLoading,
          loadingLock: currentState.loadingLock
        });
        return;
      }
      await refresh();
    } catch (error) {
      logger.error('Failed to refresh projects:', error);
    }
  }, [refresh, clearError]);

  return {
    // State
    projects,
    selectedProject,
    isLoading,
    error,
    
    // Actions
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    setSelectedProject: handleSetSelectedProject,
    refresh: handleRefresh,
    clearError,
    loadProjects,
    stopLoading
  };
};

/**
 * Hook for project selection and filtering
 */
export const useProjectSelection = () => {
  const {
    projects,
    selectedProject,
    setSelectedProject,
    getProject,
    getProjectByWorkspace,
    searchProjects
  } = useProjectStoreCore();

  const selectProject = useCallback((projectId) => {
    setSelectedProject(projectId);
  }, [setSelectedProject]);

  const selectProjectByWorkspace = useCallback((workspacePath) => {
    const project = getProjectByWorkspace(workspacePath);
    if (project) {
      setSelectedProject(project.id);
    }
  }, [getProjectByWorkspace, setSelectedProject]);

  const searchAndSelect = useCallback((query) => {
    const results = searchProjects(query);
    return results;
  }, [searchProjects]);

  return {
    projects,
    selectedProject,
    selectProject,
    selectProjectByWorkspace,
    searchAndSelect,
    getProject,
    getProjectByWorkspace
  };
};

/**
 * Hook for project validation
 */
export const useProjectValidation = () => {
  const { createProject, updateProject } = useProjectStore();

  const validateProjectData = useCallback((projectData) => {
    const errors = [];
    
    if (!projectData.name || projectData.name.trim().length === 0) {
      errors.push('Project name is required');
    }
    
    if (!projectData.workspacePath || projectData.workspacePath.trim().length === 0) {
      errors.push('Workspace path is required');
    }
    
    if (projectData.name && projectData.name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }
    
    if (projectData.description && projectData.description.length > 500) {
      errors.push('Project description must be less than 500 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const validateForCreation = useCallback((projectData) => {
    return validateProjectData(projectData);
  }, [validateProjectData]);

  const validateForUpdate = useCallback((projectId, updates) => {
    const validation = validateProjectData(updates);
    
    if (!projectId) {
      validation.errors.push('Project ID is required for updates');
      validation.isValid = false;
    }
    
    return validation;
  }, [validateProjectData]);

  return {
    validateProjectData,
    validateForCreation,
    validateForUpdate
  };
};

/**
 * Hook for project statistics and analytics
 */
export const useProjectAnalytics = () => {
  const { getProjectStats, projects } = useProjectStore();

  const stats = useMemo(() => {
    return getProjectStats();
  }, [getProjectStats, projects]);

  const analytics = useMemo(() => {
    const projectList = Object.values(projects);
    
    if (projectList.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        inactiveProjects: 0,
        averageAccessCount: 0,
        mostAccessedProject: null,
        leastAccessedProject: null,
        frameworkDistribution: {},
        typeDistribution: {}
      };
    }

    const activeProjects = projectList.filter(p => p.status === 'active');
    const inactiveProjects = projectList.filter(p => p.status === 'inactive');
    
    const accessCounts = projectList.map(p => p.metadata?.accessCount || 0);
    const averageAccessCount = accessCounts.reduce((sum, count) => sum + count, 0) / accessCounts.length;
    
    const mostAccessedProject = projectList.reduce((max, project) => 
      (project.metadata?.accessCount || 0) > (max.metadata?.accessCount || 0) ? project : max
    );
    
    const leastAccessedProject = projectList.reduce((min, project) => 
      (project.metadata?.accessCount || 0) < (min.metadata?.accessCount || 0) ? project : min
    );
    
    const frameworkDistribution = projectList.reduce((acc, project) => {
      const framework = project.framework || 'Unknown';
      acc[framework] = (acc[framework] || 0) + 1;
      return acc;
    }, {});
    
    const typeDistribution = projectList.reduce((acc, project) => {
      const type = project.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalProjects: projectList.length,
      activeProjects: activeProjects.length,
      inactiveProjects: inactiveProjects.length,
      averageAccessCount: Math.round(averageAccessCount),
      mostAccessedProject,
      leastAccessedProject,
      frameworkDistribution,
      typeDistribution
    };
  }, [projects]);

  return {
    stats,
    analytics
  };
};

/**
 * Hook for project persistence and synchronization
 */
export const useProjectPersistence = () => {
  const { projectConfig, cleanup } = useProjectStore();

  const isPersistenceEnabled = useMemo(() => {
    return projectConfig.persistenceEnabled;
  }, [projectConfig.persistenceEnabled]);

  const performCleanup = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    isPersistenceEnabled,
    performCleanup,
    config: projectConfig
  };
};

export default useProjectStore;
