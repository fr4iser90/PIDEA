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

class ProjectApplicationService {
  constructor({
    projectRepository,
    ideManager,
    workspacePathDetector,
    projectMappingService,
    logger
  }) {
    // Infrastructure repositories (accessed through domain interfaces)
    this.projectRepository = projectRepository;
    
    // Domain services
    this.ideManager = ideManager;
    this.workspacePathDetector = workspacePathDetector;
    this.projectMappingService = projectMappingService;
    
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
}

module.exports = ProjectApplicationService; 