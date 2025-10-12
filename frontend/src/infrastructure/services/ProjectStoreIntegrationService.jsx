/**
 * Project Store Integration Service
 * Handles integration between ProjectStore and IDEStore
 * Manages project data synchronization and workspace management
 */

import { logger } from '@/infrastructure/logging/Logger';
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

class ProjectStoreIntegrationService {
  constructor() {
    this.logger = logger;
    this.isInitialized = false;
    this.syncInterval = null;
    this.syncIntervalMs = 30000; // 30 seconds
  }

  /**
   * Initialize the integration service
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('ProjectStoreIntegrationService already initialized');
      return;
    }

    try {
      this.logger.info('Initializing ProjectStoreIntegrationService...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start synchronization
      this.startSynchronization();
      
      this.isInitialized = true;
      this.logger.info('✅ ProjectStoreIntegrationService initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize ProjectStoreIntegrationService:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for store changes
   */
  setupEventListeners() {
    // Listen for IDEStore changes
    useIDEStore.subscribe(
      (state) => state.activePort,
      (activePort, previousActivePort) => {
        if (activePort !== previousActivePort) {
          this.handleActivePortChange(activePort);
        }
      }
    );

    // Listen for ProjectStore changes
    useProjectStore.subscribe(
      (state) => state.activeProject,
      (activeProject, previousActiveProject) => {
        if (activeProject !== previousActiveProject) {
          this.handleActiveProjectChange(activeProject);
        }
      }
    );
  }

  /**
   * Handle active port change from IDEStore
   */
  async handleActivePortChange(activePort) {
    try {
      this.logger.info('Active port changed:', activePort);
      
      if (!activePort) {
        return;
      }

      // Get IDE data from IDEStore
      const ideStore = useIDEStore.getState();
      const activeIDE = ideStore.availableIDEs.find(ide => ide.port === activePort);
      
      if (!activeIDE) {
        this.logger.warn('Active IDE not found for port:', activePort);
        return;
      }

      // Check if project exists in ProjectStore
      const projectStore = useProjectStore.getState();
      let project = projectStore.getProjectByWorkspace(activeIDE.workspacePath);

      if (!project) {
        // Create project if it doesn't exist
        this.logger.info('Creating project for workspace:', activeIDE.workspacePath);
        project = await this.createProjectFromIDE(activeIDE);
      } else {
        // Update project metadata
        this.logger.info('Updating project metadata for:', project.id);
        projectStore.updateProjectMetadata(project.id, {
          lastAccessed: new Date().toISOString(),
          accessCount: (project.metadata?.accessCount || 0) + 1
        });
      }

      // Set active project in ProjectStore
      if (project) {
        projectStore.setActiveProject(project.id);
      }
    } catch (error) {
      this.logger.error('Failed to handle active port change:', error);
    }
  }

  /**
   * Handle active project change from ProjectStore
   */
  async handleActiveProjectChange(activeProjectId) {
    try {
      this.logger.info('Active project changed:', activeProjectId);
      
      if (!activeProjectId) {
        return;
      }

      const projectStore = useProjectStore.getState();
      const project = projectStore.getProject(activeProjectId);
      
      if (!project) {
        this.logger.warn('Active project not found:', activeProjectId);
        return;
      }

      // Find corresponding IDE in IDEStore
      const ideStore = useIDEStore.getState();
      const correspondingIDE = ideStore.availableIDEs.find(ide => 
        ide.workspacePath === project.workspacePath
      );

      if (correspondingIDE) {
        // Set active port in IDEStore
        this.logger.info('Setting active port to:', correspondingIDE.port);
        await ideStore.setActivePort(correspondingIDE.port);
      } else {
        this.logger.warn('No corresponding IDE found for project:', project.name);
      }
    } catch (error) {
      this.logger.error('Failed to handle active project change:', error);
    }
  }

  /**
   * Create project from IDE data
   */
  async createProjectFromIDE(ideData) {
    try {
      const projectStore = useProjectStore.getState();
      
      const projectData = {
        name: ideData.name || ideData.workspacePath.split('/').pop(),
        description: `Project for ${ideData.name || 'Unknown IDE'}`,
        workspacePath: ideData.workspacePath,
        type: 'development',
        framework: this.detectFramework(ideData.workspacePath),
        language: this.detectLanguage(ideData.workspacePath),
        packageManager: this.detectPackageManager(ideData.workspacePath),
        metadata: {
          idePort: ideData.port,
          ideName: ideData.name,
          createdFromIDE: true,
          lastAccessed: new Date().toISOString(),
          accessCount: 1
        }
      };

      const project = await projectStore.createProject(projectData);
      this.logger.info('✅ Project created from IDE:', project.id);
      
      return project;
    } catch (error) {
      this.logger.error('Failed to create project from IDE:', error);
      throw error;
    }
  }

  /**
   * Detect framework from workspace path
   */
  detectFramework(workspacePath) {
    // Simple framework detection based on common patterns
    if (workspacePath.includes('react')) return 'React';
    if (workspacePath.includes('vue')) return 'Vue';
    if (workspacePath.includes('angular')) return 'Angular';
    if (workspacePath.includes('svelte')) return 'Svelte';
    if (workspacePath.includes('next')) return 'Next.js';
    if (workspacePath.includes('nuxt')) return 'Nuxt.js';
    return null;
  }

  /**
   * Detect language from workspace path
   */
  detectLanguage(workspacePath) {
    // Simple language detection based on common patterns
    if (workspacePath.includes('typescript') || workspacePath.includes('ts')) return 'TypeScript';
    if (workspacePath.includes('javascript') || workspacePath.includes('js')) return 'JavaScript';
    if (workspacePath.includes('python')) return 'Python';
    if (workspacePath.includes('java')) return 'Java';
    if (workspacePath.includes('go')) return 'Go';
    if (workspacePath.includes('rust')) return 'Rust';
    return 'JavaScript'; // Default
  }

  /**
   * Detect package manager from workspace path
   */
  detectPackageManager(workspacePath) {
    // Simple package manager detection based on lock files
    // This would need to be enhanced with actual file system checks
    return 'npm'; // Default
  }

  /**
   * Start synchronization between stores
   */
  startSynchronization() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.synchronizeStores();
    }, this.syncIntervalMs);

    this.logger.info('Started store synchronization');
  }

  /**
   * Stop synchronization
   */
  stopSynchronization() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.info('Stopped store synchronization');
    }
  }

  /**
   * Synchronize data between stores
   */
  async synchronizeStores() {
    try {
      const ideStore = useIDEStore.getState();
      const projectStore = useProjectStore.getState();

      // Sync project data from IDEStore to ProjectStore
      if (ideStore.activePort) {
        const activeIDE = ideStore.availableIDEs.find(ide => ide.port === ideStore.activePort);
        if (activeIDE) {
          let project = projectStore.getProjectByWorkspace(activeIDE.workspacePath);
          
          if (!project) {
            // Create project if it doesn't exist
            await this.createProjectFromIDE(activeIDE);
          } else {
            // Update project with latest IDE data
            projectStore.updateProjectMetadata(project.id, {
              lastAccessed: new Date().toISOString(),
              idePort: activeIDE.port,
              ideName: activeIDE.name
            });
          }
        }
      }

      // Sync project data from ProjectStore to IDEStore
      if (projectStore.activeProject) {
        const project = projectStore.getProject(projectStore.activeProject);
        if (project) {
          const correspondingIDE = ideStore.availableIDEs.find(ide => 
            ide.workspacePath === project.workspacePath
          );
          
          if (correspondingIDE && ideStore.activePort !== correspondingIDE.port) {
            // Set active port if it doesn't match
            await ideStore.setActivePort(correspondingIDE.port);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to synchronize stores:', error);
    }
  }

  /**
   * Get synchronized project data
   */
  getSynchronizedProjectData() {
    const ideStore = useIDEStore.getState();
    const projectStore = useProjectStore.getState();

    return {
      ide: {
        activePort: ideStore.activePort,
        availableIDEs: ideStore.availableIDEs,
        activeIDE: ideStore.availableIDEs.find(ide => ide.active)
      },
      project: {
        activeProject: projectStore.activeProject,
        projects: projectStore.projects,
        activeProjectData: projectStore.activeProject ? projectStore.getProject(projectStore.activeProject) : null
      },
      synchronized: this.isInitialized
    };
  }

  /**
   * Cleanup and destroy the service
   */
  destroy() {
    this.stopSynchronization();
    this.isInitialized = false;
    this.logger.info('ProjectStoreIntegrationService destroyed');
  }
}

// Create singleton instance
const projectStoreIntegrationService = new ProjectStoreIntegrationService();

export default projectStoreIntegrationService;
