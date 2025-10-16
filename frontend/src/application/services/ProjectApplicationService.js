/**
 * ProjectApplicationService
 * Application service for project management use cases
 */
import { ProjectDomainService } from '../../domain/services/ProjectDomainService.js';
import { CreateProjectCommand } from '../commands/CreateProjectCommand.js';
import { GetProjectQuery } from '../queries/GetProjectQuery.js';
import { ProjectCreatedEvent } from '../../domain/events/ProjectCreatedEvent.js';

export class ProjectApplicationService {
  constructor(projectRepository, eventBus) {
    this._projectRepository = projectRepository;
    this._eventBus = eventBus;
    this._domainService = new ProjectDomainService(projectRepository);
  }

  /**
   * Create a new project
   * @param {CreateProjectCommand} command - The create project command
   * @returns {Promise<Project>} The created project
   */
  async createProject(command) {
    try {
      // Validate command
      if (!command || !(command instanceof CreateProjectCommand)) {
        throw new Error('Invalid command provided');
      }

      // Validate project configuration
      const validation = this._domainService.validateProjectConfiguration({
        name: command.name,
        workspacePath: command.workspacePath,
        framework: command.framework,
        language: command.language,
        packageManager: command.packageManager
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create project using domain service
      const project = await this._domainService.createProject(
        command.name,
        command.workspacePath,
        {
          description: command.description,
          type: command.type,
          framework: command.framework,
          language: command.language,
          packageManager: command.packageManager,
          portConfiguration: command.portConfiguration,
          metadata: command.metadata
        }
      );

      // Save project
      const savedProject = await this._projectRepository.save(project);

      // Publish domain event
      const event = new ProjectCreatedEvent(
        savedProject.id.value,
        savedProject.name,
        savedProject.workspacePath,
        savedProject.createdAt
      );
      await this._eventBus.publish(event);

      return savedProject;
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   * @param {GetProjectQuery} query - The get project query
   * @returns {Promise<Object>} The project with optional related data
   */
  async getProject(query) {
    try {
      if (!query || !(query instanceof GetProjectQuery)) {
        throw new Error('Invalid query provided');
      }

      const project = await this._projectRepository.findById(query.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const result = {
        project: project.toJSON()
      };

      // Include additional data based on query options
      if (query.includeStatistics) {
        result.statistics = await this._domainService.getProjectStatistics(query.projectId);
      }

      if (query.includeTasks) {
        result.tasks = await this._projectRepository.findTasksByProjectId(query.projectId);
      }

      if (query.includeAnalysis) {
        result.analysis = await this._projectRepository.findAnalysisByProjectId(query.projectId);
      }

      if (query.includeChatSessions) {
        result.chatSessions = await this._projectRepository.findChatSessionsByProjectId(query.projectId);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  /**
   * Update project
   * @param {string} projectId - The project ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Project>} The updated project
   */
  async updateProject(projectId, updates) {
    try {
      // Validate if project can be updated
      await this._domainService.canUpdateProject(projectId, updates);

      const project = await this._projectRepository.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Apply updates
      if (updates.name) {
        project.updateName(updates.name);
      }
      if (updates.description !== undefined) {
        project.updateDescription(updates.description);
      }
      if (updates.portConfiguration) {
        project.updatePortConfiguration(updates.portConfiguration);
      }

      // Save updated project
      const updatedProject = await this._projectRepository.update(project);
      return updatedProject;
    } catch (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * Delete project
   * @param {string} projectId - The project ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteProject(projectId) {
    try {
      // Validate if project can be deleted
      await this._domainService.canDeleteProject(projectId);

      const deleted = await this._projectRepository.delete(projectId);
      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * List projects
   * @param {Object} options - Query options
   * @returns {Promise<Project[]>} Array of projects
   */
  async listProjects(options = {}) {
    try {
      const projects = await this._projectRepository.findAll(options);
      return projects.map(project => project.toJSON());
    } catch (error) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }

  /**
   * Search projects
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Project[]>} Array of matching projects
   */
  async searchProjects(query, options = {}) {
    try {
      const projects = await this._projectRepository.search(query, options);
      return projects.map(project => project.toJSON());
    } catch (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }
  }

  /**
   * Get project statistics
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Project statistics
   */
  async getProjectStatistics(projectId) {
    try {
      return await this._domainService.getProjectStatistics(projectId);
    } catch (error) {
      throw new Error(`Failed to get project statistics: ${error.message}`);
    }
  }
}
