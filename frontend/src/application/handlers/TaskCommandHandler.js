/**
 * TaskCommandHandler
 * Handles task-related commands
 */
import { TaskApplicationService } from '../services/TaskApplicationService.js';
import { ExecuteTaskCommand } from '../commands/ExecuteTaskCommand.js';

export class TaskCommandHandler {
  constructor(taskApplicationService) {
    this._taskApplicationService = taskApplicationService;
  }

  /**
   * Handle create task command
   * @param {string} projectId - The project ID
   * @param {string} type - The task type
   * @param {Object} options - Task options
   * @returns {Promise<Task>} The created task
   */
  async handleCreateTask(projectId, type, options = {}) {
    return await this._taskApplicationService.createTask(projectId, type, options);
  }

  /**
   * Handle execute task command
   * @param {ExecuteTaskCommand} command - The execute task command
   * @returns {Promise<Task>} The executed task
   */
  async handleExecuteTask(command) {
    return await this._taskApplicationService.executeTask(command);
  }

  /**
   * Handle complete task command
   * @param {string} taskId - The task ID
   * @returns {Promise<Task>} The completed task
   */
  async handleCompleteTask(taskId) {
    return await this._taskApplicationService.completeTask(taskId);
  }

  /**
   * Handle update task progress command
   * @param {string} taskId - The task ID
   * @param {number} progress - The progress percentage
   * @returns {Promise<Task>} The updated task
   */
  async handleUpdateTaskProgress(taskId, progress) {
    return await this._taskApplicationService.updateTaskProgress(taskId, progress);
  }

  /**
   * Handle cancel task command
   * @param {string} taskId - The task ID
   * @returns {Promise<Task>} The cancelled task
   */
  async handleCancelTask(taskId) {
    return await this._taskApplicationService.cancelTask(taskId);
  }
}
