/**
 * Task Domain Service
 * Contains business logic for task management
 */
import { Task } from '../entities/Task.js';
import { TaskType } from '../value-objects/TaskType.js';

export class TaskDomainService {
  constructor(taskRepository) {
    this._taskRepository = taskRepository;
  }

  /**
   * Creates a new task with validation
   */
  async createTask(type, projectId, options = {}) {
    // Validate project exists
    const project = await this._taskRepository.findProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Generate unique task ID
    const taskId = this.generateTaskId();

    // Create task
    const task = new Task(taskId, type, projectId, {
      ...options,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return task;
  }

  /**
   * Validates if a task can be started
   */
  async canStartTask(taskId) {
    const task = await this._taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'pending') {
      throw new Error('Only pending tasks can be started');
    }

    // Check if project is active
    const project = await this._taskRepository.findProjectById(task.projectId);
    if (!project || !project.isActive) {
      throw new Error('Cannot start task for inactive project');
    }

    return true;
  }

  /**
   * Validates if a task can be completed
   */
  async canCompleteTask(taskId) {
    const task = await this._taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'running' && task.status !== 'paused') {
      throw new Error('Only running or paused tasks can be completed');
    }

    return true;
  }

  /**
   * Gets task statistics for a project
   */
  async getProjectTaskStatistics(projectId) {
    const tasks = await this._taskRepository.findByProjectId(projectId);
    
    const stats = {
      total: tasks.length,
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byType: {},
      averageProgress: 0
    };

    let totalProgress = 0;

    tasks.forEach(task => {
      stats[task.status]++;
      
      if (!stats.byType[task.type.value]) {
        stats.byType[task.type.value] = 0;
      }
      stats.byType[task.type.value]++;
      
      totalProgress += task.progress;
    });

    stats.averageProgress = tasks.length > 0 ? totalProgress / tasks.length : 0;

    return stats;
  }

  /**
   * Validates task configuration
   */
  validateTaskConfiguration(config) {
    const errors = [];

    if (!config.type) {
      errors.push('Task type is required');
    } else {
      try {
        new TaskType(config.type);
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (!config.projectId) {
      errors.push('Project ID is required');
    }

    if (config.title && config.title.length > 200) {
      errors.push('Task title must be less than 200 characters');
    }

    if (config.priority && !['low', 'medium', 'high', 'urgent'].includes(config.priority)) {
      errors.push('Invalid priority level');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Calculates task priority based on type and context
   */
  calculateTaskPriority(taskType, context = {}) {
    const priorityMap = {
      [TaskType.SECURITY.value]: 'high',
      [TaskType.DEPLOYMENT.value]: 'high',
      [TaskType.TESTING.value]: 'medium',
      [TaskType.ANALYSIS.value]: 'medium',
      [TaskType.REFACTORING.value]: 'low',
      [TaskType.OPTIMIZATION.value]: 'low',
      [TaskType.DOCUMENTATION.value]: 'low',
      [TaskType.CUSTOM.value]: 'medium'
    };

    let priority = priorityMap[taskType.value] || 'medium';

    // Adjust based on context
    if (context.isUrgent) {
      priority = 'urgent';
    } else if (context.isBlocking) {
      priority = 'high';
    }

    return priority;
  }

  /**
   * Estimates task duration based on type and complexity
   */
  estimateTaskDuration(taskType, complexity = 'medium') {
    const baseDurations = {
      [TaskType.ANALYSIS.value]: 30, // minutes
      [TaskType.REFACTORING.value]: 60,
      [TaskType.TESTING.value]: 45,
      [TaskType.DEPLOYMENT.value]: 20,
      [TaskType.SECURITY.value]: 90,
      [TaskType.OPTIMIZATION.value]: 75,
      [TaskType.DOCUMENTATION.value]: 30,
      [TaskType.CUSTOM.value]: 60
    };

    const complexityMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 2.0
    };

    const baseDuration = baseDurations[taskType.value] || 60;
    const multiplier = complexityMultipliers[complexity] || 1.0;

    return Math.round(baseDuration * multiplier);
  }
}
