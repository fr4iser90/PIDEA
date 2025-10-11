/**
 * ProjectApplicationService - Application layer service for project operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate project management use cases
 * ✅ Handle project data retrieval and updates
 * ✅ Manage project workspace detection
 * ✅ Orchestrate project-related operations
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const { InterfaceManager, InterfaceFactory, InterfaceRegistry } = require('@domain/services/interface');

class ProjectApplicationService {
  constructor({
    projectRepository,
    ideManager,
    workspacePathDetector,
    projectMappingService,
    interfaceManager,
    interfaceFactory,
    interfaceRegistry,
    logger
  }) {
    // Infrastructure repositories (accessed through domain interfaces)
    this.projectRepository = projectRepository;
    
    // Domain services
    this.ideManager = ideManager;
    this.workspacePathDetector = workspacePathDetector;
    this.projectMappingService = projectMappingService;
    
    // Interface management services
    this.interfaceManager = interfaceManager;
    this.interfaceFactory = interfaceFactory;
    this.interfaceRegistry = interfaceRegistry;
    
    // Application services
    this.logger = logger || new ServiceLogger('ProjectApplicationService');
  }

  /**
   * Get project by ID
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Project data
   */
  async getProject(projectId) {
    try {
      this.logger.info(`Getting project: ${projectId}`);
      
      const project = await this.projectRepository.findById(projectId);
      
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        workspacePath: project.workspacePath,
        type: project.type,
        framework: project.framework,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get project:', error);
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  /**
   * Get all projects for user
   * @param {string} userId - User identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of projects
   */
  async getProjects(userId, options = {}) {
    try {
      this.logger.info(`Getting projects for user: ${userId}`);
      
      const { limit = 50, offset = 0, type, framework } = options;
      
      const projects = await this.projectRepository.findByUserId(userId, {
        limit,
        offset,
        type,
        framework
      });
      
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        framework: project.framework,
        workspacePath: project.workspacePath,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));
      
    } catch (error) {
      this.logger.error('❌ Failed to get projects:', error);
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  /**
   * Create new project
   * @param {Object} projectData - Project creation data
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectData, userId) {
    try {
      this.logger.info(`Creating project for user: ${userId}`);
      
      const { name, description, workspacePath, type, framework } = projectData;
      
      // Validate required fields
      if (!name || !workspacePath) {
        throw new Error('Project name and workspace path are required');
      }
      
      // Detect workspace if path detection is available
      let detectedWorkspace = null;
      if (this.workspacePathDetector) {
        try {
          detectedWorkspace = await this.workspacePathDetector.detectWorkspace(workspacePath);
        } catch (error) {
          this.logger.warn('Workspace detection failed:', error.message);
        }
      }
      
      // Create project
      const project = await this.projectRepository.create({
        name,
        description,
        workspacePath,
        type: type || detectedWorkspace?.type || 'unknown',
        framework: framework || detectedWorkspace?.framework || null,
        userId,
        metadata: {
          detectedWorkspace,
          createdBy: userId,
          createdAt: new Date().toISOString()
        }
      });
      
      this.logger.info(`✅ Project created: ${project.id}`);
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        workspacePath: project.workspacePath,
        type: project.type,
        framework: project.framework,
        createdAt: project.createdAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to create project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Update project
   * @param {string} projectId - Project identifier
   * @param {Object} updateData - Project update data
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, updateData, userId) {
    try {
      this.logger.info(`Updating project: ${projectId}`);
      
      // Verify project exists and user has access
      const existingProject = await this.projectRepository.findById(projectId);
      if (!existingProject) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      if (existingProject.userId !== userId) {
        throw new Error('Unauthorized: User does not own this project');
      }
      
      // Update project
      const updatedProject = await this.projectRepository.update(projectId, {
        ...updateData,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
      
      this.logger.info(`✅ Project updated: ${projectId}`);
      
      return {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        workspacePath: updatedProject.workspacePath,
        type: updatedProject.type,
        framework: updatedProject.framework,
        updatedAt: updatedProject.updatedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to update project:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete project
   * @param {string} projectId - Project identifier
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteProject(projectId, userId) {
    try {
      this.logger.info(`Deleting project: ${projectId}`);
      
      // Verify project exists and user has access
      const existingProject = await this.projectRepository.findById(projectId);
      if (!existingProject) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      if (existingProject.userId !== userId) {
        throw new Error('Unauthorized: User does not own this project');
      }
      
      // Delete project
      await this.projectRepository.delete(projectId);
      
      this.logger.info(`✅ Project deleted: ${projectId}`);
      
      return true;
      
    } catch (error) {
      this.logger.error('❌ Failed to delete project:', error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Get project workspace path with fallback detection
   * @param {string} projectId - Project identifier
   * @returns {Promise<string>} Project workspace path
   */
  async getProjectWorkspacePath(projectId) {
    try {
      const project = await this.projectRepository.findById(projectId);
      
      if (project && project.workspacePath) {
        return project.workspacePath;
      }
      
      // Try to detect workspace path using IDE manager
      if (this.ideManager) {
        try {
          const activeIDE = await this.ideManager.getActiveIDE();
          if (activeIDE) {
            const workspacePath = await this.ideManager.detectWorkspacePath(activeIDE.port);
            if (workspacePath) {
              // Update project with detected path
              await this.projectRepository.update(projectId, { workspacePath });
              return workspacePath;
            }
          }
        } catch (error) {
          this.logger.warn('IDE workspace detection failed:', error.message);
        }
      }
      
      // Fallback to current working directory
      const fallbackPath = process.cwd();
      this.logger.warn(`Using fallback workspace path: ${fallbackPath}`);
      return fallbackPath;
      
    } catch (error) {
      this.logger.error('❌ Failed to get project workspace path:', error);
      throw new Error(`Failed to get project workspace path: ${error.message}`);
    }
  }

  /**
   * Search projects by criteria
   * @param {Object} searchCriteria - Search parameters
   * @param {string} userId - User identifier
   * @returns {Promise<Array>} Matching projects
   */
  async searchProjects(searchCriteria, userId) {
    try {
      const { query, type, framework, limit = 20 } = searchCriteria;
      
      const projects = await this.projectRepository.search({
        query,
        type,
        framework,
        userId,
        limit
      });
      
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        framework: project.framework,
        workspacePath: project.workspacePath,
        relevanceScore: project.relevanceScore
      }));
      
    } catch (error) {
      this.logger.error('❌ Failed to search projects:', error);
      throw new Error(`Failed to search projects: ${error.message}`);
    }
  }

  /**
   * Get all projects (for controller list endpoint)
   * @returns {Promise<Array>} List of all projects
   */
  async getAllProjects() {
    try {
      this.logger.info('Getting all projects');
      
      const projects = await this.projectRepository.findAll();
      
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        workspacePath: project.workspacePath,
        type: project.type,
        framework: project.framework,
        frontendPort: project.frontendPort,
        backendPort: project.backendPort,
        databasePort: project.databasePort,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));
      
    } catch (error) {
      this.logger.error('❌ Failed to get all projects:', error);
      throw new Error(`Failed to get all projects: ${error.message}`);
    }
  }



  /**
   * Save project port
   * @param {string} projectId - Project identifier
   * @param {number} port - Port number
   * @param {string} portType - Port type (frontend, backend, database)
   * @returns {Promise<Object>} Updated project
   */
  async saveProjectPort(projectId, port, portType = 'frontend') {
    try {
      this.logger.info(`Saving port ${port} for project ${projectId} (${portType})`);
      
      // Validate port number
      if (!port || !Number.isInteger(parseInt(port))) {
        throw new Error('Valid port number required');
      }
      
      // Get existing project
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      // Update the appropriate port field
      const updateData = { ...project };
      if (portType === 'frontend') {
        updateData.frontendPort = parseInt(port);
      } else if (portType === 'backend') {
        updateData.backendPort = parseInt(port);
      } else if (portType === 'database') {
        updateData.databasePort = parseInt(port);
      } else {
        throw new Error(`Invalid port type: ${portType}`);
      }
      
      // Update project
      const updatedProject = await this.projectRepository.update(updateData);
      
      this.logger.info(`✅ Port ${port} saved for project ${projectId} (${portType})`);
      
      return {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        workspacePath: updatedProject.workspacePath,
        type: updatedProject.type,
        framework: updatedProject.framework,
        frontendPort: updatedProject.frontendPort,
        backendPort: updatedProject.backendPort,
        databasePort: updatedProject.databasePort,
        updatedAt: updatedProject.updatedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to save project port:', error);
      throw new Error(`Failed to save project port: ${error.message}`);
    }
  }

  /**
   * Update project port
   * @param {string} projectId - Project identifier
   * @param {number} port - Port number
   * @param {string} portType - Port type (frontend, backend, database)
   * @returns {Promise<Object>} Updated project
   */
  async updateProjectPort(projectId, port, portType = 'frontend') {
    try {
      this.logger.info(`Updating port ${port} for project ${projectId} (${portType})`);
      
      // Validate port number
      if (!port || !Number.isInteger(parseInt(port))) {
        throw new Error('Valid port number required');
      }
      
      // Get existing project
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      // Update the appropriate port field
      const updateData = { ...project };
      if (portType === 'frontend') {
        updateData.frontendPort = parseInt(port);
      } else if (portType === 'backend') {
        updateData.backendPort = parseInt(port);
      } else if (portType === 'database') {
        updateData.databasePort = parseInt(port);
      } else {
        throw new Error(`Invalid port type: ${portType}`);
      }
      
      // Update project
      const updatedProject = await this.projectRepository.update(updateData);
      
      this.logger.info(`✅ Port ${port} updated for project ${projectId} (${portType})`);
      
      return {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        workspacePath: updatedProject.workspacePath,
        type: updatedProject.type,
        framework: updatedProject.framework,
        frontendPort: updatedProject.frontendPort,
        backendPort: updatedProject.backendPort,
        databasePort: updatedProject.databasePort,
        updatedAt: updatedProject.updatedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to update project port:', error);
      throw new Error(`Failed to update project port: ${error.message}`);
    }
  }

  /**
   * Get project interfaces
   * @param {string} projectId - Project identifier
   * @returns {Promise<Array<Object>>} Project interfaces
   */
  async getProjectInterfaces(projectId) {
    try {
      this.logger.info(`Getting interfaces for project: ${projectId}`);
      
      if (!this.interfaceManager) {
        this.logger.warn('Interface manager not available');
        return [];
      }
      
      // Get all interfaces and filter by project
      const allInterfaces = this.interfaceManager.getAllInterfaces();
      const projectInterfaces = allInterfaces.filter(interfaceInstance => {
        const config = interfaceInstance.config || {};
        return config.projectId === projectId;
      });
      
      return projectInterfaces.map(interfaceInstance => ({
        id: interfaceInstance.id,
        type: interfaceInstance.type,
        status: interfaceInstance.status,
        config: interfaceInstance.config,
        metadata: interfaceInstance.getMetadata()
      }));
      
    } catch (error) {
      this.logger.error('❌ Failed to get project interfaces:', error);
      throw new Error(`Failed to get project interfaces: ${error.message}`);
    }
  }

  /**
   * Create interface for project
   * @param {string} projectId - Project identifier
   * @param {string} interfaceType - Interface type
   * @param {Object} config - Interface configuration
   * @returns {Promise<Object>} Created interface
   */
  async createProjectInterface(projectId, interfaceType, config = {}) {
    try {
      this.logger.info(`Creating interface for project: ${projectId}, type: ${interfaceType}`);
      
      if (!this.interfaceManager) {
        throw new Error('Interface manager not available');
      }
      
      // Get project information
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      // Merge project-specific configuration
      const interfaceConfig = {
        ...config,
        projectId,
        workspacePath: project.workspacePath,
        frontendPort: project.frontendPort,
        backendPort: project.backendPort,
        databasePort: project.databasePort
      };
      
      // Create interface using factory if available
      let interfaceInstance;
      if (this.interfaceFactory) {
        interfaceInstance = await this.interfaceFactory.createInterfaceByType(
          interfaceType,
          interfaceConfig
        );
      } else {
        interfaceInstance = await this.interfaceManager.createInterface(
          interfaceType,
          interfaceConfig
        );
      }
      
      this.logger.info(`✅ Interface created for project ${projectId}: ${interfaceInstance.id}`);
      
      return {
        id: interfaceInstance.id,
        type: interfaceInstance.type,
        status: interfaceInstance.status,
        config: interfaceInstance.config,
        metadata: interfaceInstance.getMetadata()
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to create project interface:', error);
      throw new Error(`Failed to create project interface: ${error.message}`);
    }
  }

  /**
   * Remove interface from project
   * @param {string} projectId - Project identifier
   * @param {string} interfaceId - Interface identifier
   * @returns {Promise<boolean>} True if interface was removed
   */
  async removeProjectInterface(projectId, interfaceId) {
    try {
      this.logger.info(`Removing interface ${interfaceId} from project: ${projectId}`);
      
      if (!this.interfaceManager) {
        throw new Error('Interface manager not available');
      }
      
      // Get interface instance
      const interfaceInstance = this.interfaceManager.getInterface(interfaceId);
      if (!interfaceInstance) {
        throw new Error(`Interface not found: ${interfaceId}`);
      }
      
      // Verify interface belongs to project
      const config = interfaceInstance.config || {};
      if (config.projectId !== projectId) {
        throw new Error(`Interface ${interfaceId} does not belong to project ${projectId}`);
      }
      
      // Remove interface
      const removed = await this.interfaceManager.removeInterface(interfaceId);
      
      if (removed) {
        this.logger.info(`✅ Interface ${interfaceId} removed from project ${projectId}`);
      }
      
      return removed;
      
    } catch (error) {
      this.logger.error('❌ Failed to remove project interface:', error);
      throw new Error(`Failed to remove project interface: ${error.message}`);
    }
  }

  /**
   * Get available interface types for project
   * @param {string} projectId - Project identifier
   * @returns {Promise<Array<string>>} Available interface types
   */
  async getAvailableInterfaceTypes(projectId) {
    try {
      this.logger.info(`Getting available interface types for project: ${projectId}`);
      
      if (!this.interfaceManager) {
        this.logger.warn('Interface manager not available');
        return [];
      }
      
      // Get available types from manager
      const availableTypes = this.interfaceManager.getAvailableTypes();
      
      // Filter types based on project context if registry is available
      if (this.interfaceRegistry) {
        const project = await this.projectRepository.findById(projectId);
        if (project) {
          // Filter types based on project framework and type
          const filteredTypes = availableTypes.filter(type => {
            const typeInfo = this.interfaceRegistry.getInterfaceType(type);
            if (!typeInfo) return true;
            
            const constraints = typeInfo.constraints || {};
            const supportedFrameworks = constraints.supportedFrameworks;
            const supportedTypes = constraints.supportedTypes;
            
            // Check framework compatibility
            if (supportedFrameworks && !supportedFrameworks.includes(project.framework)) {
              return false;
            }
            
            // Check project type compatibility
            if (supportedTypes && !supportedTypes.includes(project.type)) {
              return false;
            }
            
            return true;
          });
          
          return filteredTypes;
        }
      }
      
      return availableTypes;
      
    } catch (error) {
      this.logger.error('❌ Failed to get available interface types:', error);
      throw new Error(`Failed to get available interface types: ${error.message}`);
    }
  }
}

module.exports = ProjectApplicationService; 