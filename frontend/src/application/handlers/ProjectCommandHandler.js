/**
 * ProjectCommandHandler
 * Handles project-related commands
 */
import { ProjectApplicationService } from '../services/ProjectApplicationService.js';
import { CreateProjectCommand } from '../commands/CreateProjectCommand.js';

export class ProjectCommandHandler {
  constructor(projectApplicationService) {
    this._projectApplicationService = projectApplicationService;
  }

  /**
   * Handle create project command
   * @param {CreateProjectCommand} command - The create project command
   * @returns {Promise<Project>} The created project
   */
  async handleCreateProject(command) {
    return await this._projectApplicationService.createProject(command);
  }

  /**
   * Handle update project command
   * @param {string} projectId - The project ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Project>} The updated project
   */
  async handleUpdateProject(projectId, updates) {
    return await this._projectApplicationService.updateProject(projectId, updates);
  }

  /**
   * Handle delete project command
   * @param {string} projectId - The project ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async handleDeleteProject(projectId) {
    return await this._projectApplicationService.deleteProject(projectId);
  }
}
