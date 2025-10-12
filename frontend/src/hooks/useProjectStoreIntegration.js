/**
 * Project Store Integration Hook
 * Provides integration between ProjectStore and IDEStore
 * Handles project-IDE synchronization and workspace management
 */

import { useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import projectStoreIntegrationService from '@/infrastructure/services/ProjectStoreIntegrationService.jsx';

/**
 * Hook for project-IDE integration
 */
export const useProjectStoreIntegration = (options = {}) => {
  const {
    autoSync = true,
    syncInterval = 30000,
    enableWorkspaceDetection = true
  } = options;

  // Store hooks
  const projectStore = useProjectStore();
  const ideStore = useIDEStore();

  // Derived state
  const activeProject = useMemo(() => {
    return projectStore.activeProject ? projectStore.getProject(projectStore.activeProject) : null;
  }, [projectStore.activeProject, projectStore.projects]);

  const activeIDE = useMemo(() => {
    return ideStore.availableIDEs.find(ide => ide.active) || null;
  }, [ideStore.availableIDEs]);

  const isSynchronized = useMemo(() => {
    if (!activeProject || !activeIDE) return false;
    return activeProject.workspacePath === activeIDE.workspacePath;
  }, [activeProject, activeIDE]);

  // Integration actions
  const syncProjectWithIDE = useCallback(async (projectId) => {
    try {
      const project = projectStore.getProject(projectId);
      if (!project) {
        logger.warn('Project not found:', projectId);
        return;
      }

      // Find corresponding IDE
      const correspondingIDE = ideStore.availableIDEs.find(ide => 
        ide.workspacePath === project.workspacePath
      );

      if (correspondingIDE) {
        await ideStore.setActivePort(correspondingIDE.port);
        logger.info('Synced project with IDE:', project.name);
      } else {
        logger.warn('No corresponding IDE found for project:', project.name);
      }
    } catch (error) {
      logger.error('Failed to sync project with IDE:', error);
    }
  }, [projectStore, ideStore]);

  const syncIDEWithProject = useCallback(async (port) => {
    try {
      const ide = ideStore.availableIDEs.find(ide => ide.port === port);
      if (!ide) {
        logger.warn('IDE not found for port:', port);
        return;
      }

      // Find corresponding project
      let project = projectStore.getProjectByWorkspace(ide.workspacePath);

      if (!project && enableWorkspaceDetection) {
        // Create project if it doesn't exist
        try {
          project = await projectStore.createProject({
            name: ide.name || ide.workspacePath.split('/').pop(),
            description: `Project for ${ide.name || 'Unknown IDE'}`,
            workspacePath: ide.workspacePath,
            type: 'development',
            metadata: {
              idePort: ide.port,
              ideName: ide.name,
              createdFromIDE: true
            }
          });
          logger.info('Created project from IDE:', project.name);
        } catch (error) {
          logger.error('Failed to create project from IDE:', error);
          return;
        }
      }

      if (project) {
        projectStore.setActiveProject(project.id);
        logger.info('Synced IDE with project:', project.name);
      }
    } catch (error) {
      logger.error('Failed to sync IDE with project:', error);
    }
  }, [projectStore, ideStore, enableWorkspaceDetection]);

  const getSynchronizedData = useCallback(() => {
    return {
      project: activeProject,
      ide: activeIDE,
      isSynchronized,
      projectStore: {
        activeProject: projectStore.activeProject,
        projects: projectStore.projects,
        isLoading: projectStore.isLoading,
        error: projectStore.error
      },
      ideStore: {
        activePort: ideStore.activePort,
        availableIDEs: ideStore.availableIDEs,
        isLoading: ideStore.isLoading,
        error: ideStore.error
      }
    };
  }, [activeProject, activeIDE, isSynchronized, projectStore, ideStore]);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync) return;

    const syncIntervalId = setInterval(() => {
      projectStoreIntegrationService.synchronizeStores();
    }, syncInterval);

    return () => {
      clearInterval(syncIntervalId);
    };
  }, [autoSync, syncInterval]);

  // Initialize integration service
  useEffect(() => {
    const initializeIntegration = async () => {
      try {
        await projectStoreIntegrationService.initialize();
        logger.info('Project store integration initialized');
      } catch (error) {
        logger.error('Failed to initialize project store integration:', error);
      }
    };

    initializeIntegration();

    return () => {
      projectStoreIntegrationService.destroy();
    };
  }, []);

  return {
    // State
    activeProject,
    activeIDE,
    isSynchronized,
    
    // Actions
    syncProjectWithIDE,
    syncIDEWithProject,
    getSynchronizedData,
    
    // Store access
    projectStore,
    ideStore
  };
};

/**
 * Hook for project workspace management
 */
export const useProjectWorkspace = (workspacePath) => {
  const projectStore = useProjectStore();
  const ideStore = useIDEStore();

  const project = useMemo(() => {
    return workspacePath ? projectStore.getProjectByWorkspace(workspacePath) : null;
  }, [workspacePath, projectStore.projects]);

  const ide = useMemo(() => {
    return workspacePath ? ideStore.availableIDEs.find(ide => ide.workspacePath === workspacePath) : null;
  }, [workspacePath, ideStore.availableIDEs]);

  const isActive = useMemo(() => {
    return project && projectStore.activeProject === project.id;
  }, [project, projectStore.activeProject]);

  const activateWorkspace = useCallback(async () => {
    if (project) {
      projectStore.setActiveProject(project.id);
    } else if (ide) {
      await ideStore.setActivePort(ide.port);
    }
  }, [project, ide, projectStore, ideStore]);

  return {
    project,
    ide,
    isActive,
    activateWorkspace,
    hasProject: !!project,
    hasIDE: !!ide
  };
};

/**
 * Hook for project creation from workspace
 */
export const useProjectCreation = () => {
  const projectStore = useProjectStore();
  const ideStore = useIDEStore();

  const createProjectFromWorkspace = useCallback(async (workspacePath, options = {}) => {
    try {
      const {
        name,
        description,
        type = 'development',
        framework,
        language,
        packageManager
      } = options;

      // Find corresponding IDE
      const ide = ideStore.availableIDEs.find(ide => ide.workspacePath === workspacePath);
      
      const projectData = {
        name: name || workspacePath.split('/').pop(),
        description: description || `Project for ${name || 'Unknown'}`,
        workspacePath,
        type,
        framework,
        language,
        packageManager,
        metadata: {
          idePort: ide?.port,
          ideName: ide?.name,
          createdFromWorkspace: true,
          lastAccessed: new Date().toISOString(),
          accessCount: 0
        }
      };

      const project = await projectStore.createProject(projectData);
      logger.info('Project created from workspace:', project.name);
      
      return project;
    } catch (error) {
      logger.error('Failed to create project from workspace:', error);
      throw error;
    }
  }, [projectStore, ideStore]);

  const createProjectFromIDE = useCallback(async (port, options = {}) => {
    try {
      const ide = ideStore.availableIDEs.find(ide => ide.port === port);
      if (!ide) {
        throw new Error(`IDE not found for port: ${port}`);
      }

      return await createProjectFromWorkspace(ide.workspacePath, {
        ...options,
        name: options.name || ide.name
      });
    } catch (error) {
      logger.error('Failed to create project from IDE:', error);
      throw error;
    }
  }, [ideStore, createProjectFromWorkspace]);

  return {
    createProjectFromWorkspace,
    createProjectFromIDE
  };
};

/**
 * Hook for project-IDE synchronization status
 */
export const useProjectSyncStatus = () => {
  const { getSynchronizedData } = useProjectStoreIntegration();

  const syncStatus = useMemo(() => {
    const data = getSynchronizedData();
    
    return {
      isSynchronized: data.isSynchronized,
      hasProject: !!data.project,
      hasIDE: !!data.ide,
      projectName: data.project?.name,
      ideName: data.ide?.name,
      workspacePath: data.project?.workspacePath || data.ide?.workspacePath,
      status: data.isSynchronized ? 'synchronized' : 
              data.hasProject && data.hasIDE ? 'unsynchronized' :
              data.hasProject ? 'project-only' :
              data.hasIDE ? 'ide-only' : 'none'
    };
  }, [getSynchronizedData]);

  return syncStatus;
};

export default useProjectStoreIntegration;
