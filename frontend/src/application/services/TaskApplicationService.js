/**
 * TaskApplicationService
 * Application service for task management use cases
 */
import { TaskDomainService } from '../../domain/services/TaskDomainService.js';
import { ExecuteTaskCommand } from '../commands/ExecuteTaskCommand.js';
import { GetTasksQuery } from '../queries/GetTasksQuery.js';
import { TaskCompletedEvent } from '../../domain/events/TaskCompletedEvent.js';

export class TaskApplicationService {
  constructor(taskRepository, eventBus) {
    this._taskRepository = taskRepository;
    this._eventBus = eventBus;
    this._domainService = new TaskDomainService(taskRepository);
  }

  /**
   * Create a new task
   * @param {string} projectId - The project ID
   * @param {string} type - The task type
   * @param {Object} options - Task options
   * @returns {Promise<Task>} The created task
   */
  async createTask(projectId, type, options = {}) {
    try {
      // Validate task configuration
      const validation = this._domainService.validateTaskConfiguration({
        type,
        projectId,
        ...options
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create task using domain service
      const task = await this._domainService.createTask(type, projectId, options);

      // Save task
      const savedTask = await this._taskRepository.save(task);
      return savedTask;
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Execute a task
   * @param {ExecuteTaskCommand} command - The execute task command
   * @returns {Promise<Task>} The executed task
   */
  async executeTask(command) {
    try {
      if (!command || !(command instanceof ExecuteTaskCommand)) {
        throw new Error('Invalid command provided');
      }

      const task = await this._taskRepository.findById(command.taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Validate if task can be started
      await this._domainService.canStartTask(command.taskId);

      // Start the task
      task.start();
      task.updateMetadata(command.metadata);

      // Save updated task
      const updatedTask = await this._taskRepository.update(task);
      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to execute task: ${error.message}`);
    }
  }

  /**
   * Complete a task
   * @param {string} taskId - The task ID
   * @returns {Promise<Task>} The completed task
   */
  async completeTask(taskId) {
    try {
      const task = await this._taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Validate if task can be completed
      await this._domainService.canCompleteTask(taskId);

      const startTime = task.startedAt;
      task.complete();

      // Calculate duration
      const duration = startTime ? Date.now() - startTime.getTime() : 0;

      // Save updated task
      const updatedTask = await this._taskRepository.update(task);

      // Publish domain event
      const event = new TaskCompletedEvent(
        taskId,
        task.projectId,
        task.type.value,
        task.completedAt,
        duration
      );
      await this._eventBus.publish(event);

      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }
  }

  /**
   * Get tasks
   * @param {GetTasksQuery} query - The get tasks query
   * @returns {Promise<Object>} Tasks with pagination info
   */
  async getTasks(query) {
    try {
      if (!query || !(query instanceof GetTasksQuery)) {
        throw new Error('Invalid query provided');
      }

      let tasks;
      
      if (query.projectId) {
        tasks = await this._taskRepository.findByProjectId(query.projectId, {
          status: query.status,
          type: query.type,
          priority: query.priority,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        });
      } else if (query.status) {
        tasks = await this._taskRepository.findByStatus(query.status, {
          type: query.type,
          priority: query.priority,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        });
      } else if (query.type) {
        tasks = await this._taskRepository.findByType(query.type, {
          status: query.status,
          priority: query.priority,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        });
      } else {
        tasks = await this._taskRepository.findAll({
          status: query.status,
          type: query.type,
          priority: query.priority,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        });
      }

      return {
        tasks: tasks.map(task => task.toJSON()),
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: tasks.length
        }
      };
    } catch (error) {
      throw new Error(`Failed to get tasks: ${error.message}`);
    }
  }

  /**
   * Update task progress
   * @param {string} taskId - The task ID
   * @param {number} progress - The progress percentage (0-100)
   * @returns {Promise<Task>} The updated task
   */
  async updateTaskProgress(taskId, progress) {
    try {
      const task = await this._taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      task.updateProgress(progress);
      const updatedTask = await this._taskRepository.update(task);
      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to update task progress: ${error.message}`);
    }
  }

  /**
   * Cancel a task
   * @param {string} taskId - The task ID
   * @returns {Promise<Task>} The cancelled task
   */
  async cancelTask(taskId) {
    try {
      const task = await this._taskRepository.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      task.cancel();
      const updatedTask = await this._taskRepository.update(task);
      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to cancel task: ${error.message}`);
    }
  }

  /**
   * Get task statistics
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} Task statistics
   */
  async getTaskStatistics(projectId) {
    try {
      return await this._domainService.getProjectTaskStatistics(projectId);
    } catch (error) {
      throw new Error(`Failed to get task statistics: ${error.message}`);
    }
  }

  /**
   * Estimate task duration
   * @param {string} type - The task type
   * @param {string} complexity - The complexity level
   * @returns {number} Estimated duration in minutes
   */
  estimateTaskDuration(type, complexity = 'medium') {
    return this._domainService.estimateTaskDuration(type, complexity);
  }

  /**
   * Calculate task priority
   * @param {string} type - The task type
   * @param {Object} context - The context
   * @returns {string} The calculated priority
   */
  calculateTaskPriority(type, context = {}) {
    return this._domainService.calculateTaskPriority(type, context);
  }
}
