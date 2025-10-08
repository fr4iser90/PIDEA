/**
 * Task Status Update Step
 * Handles automatic task status updates and file organization
 * Refactored to use modern step pattern (no BaseStep inheritance)
 * Created: 2025-09-19T19:22:57.000Z
 * Refactored: 2025-01-27T12:00:00.000Z
 */

require('module-alias/register');
const Logger = require('@logging/Logger');
const logger = new Logger('TaskStatusUpdateStep');
const fs = require('fs').promises;
const path = require('path');

class TaskStatusUpdateStep {
  constructor() {
    this.name = 'TaskStatusUpdateStep';
    this.description = 'Updates task status and organizes files accordingly';
    this.category = 'task';
    this.dependencies = ['TaskRepository', 'TaskStatusTransitionService'];
  }

  static getConfig() {
    return {
      name: 'task_status_update_step',
      type: 'status',
      description: 'Updates task status and organizes files accordingly',
      category: 'task',
      version: '1.0.0',
      dependencies: ['TaskRepository', 'TaskStatusTransitionService'],
      settings: {
        timeout: 30000,
        autoMoveFiles: true,
        updateDatabase: true,
        createBackup: true
      },
      validation: {
        requiredServices: ['taskRepository', 'statusTransitionService'],
        supportedStatuses: ['pending', 'in-progress', 'completed', 'failed', 'blocked', 'cancelled']
      }
    };
  }

  /**
   * Execute status update step
   * @param {Object} context - Execution context
   * @param {Object} options - Step options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context = {}, options = {}) {
    try {
      logger.info('🔄 Starting task status update step...');
      
      const {
        taskId,
        newStatus,
        taskMetadata = {},
        autoMoveFiles = true,
        updateDatabase = true
      } = options;

      if (!taskId || !newStatus) {
        throw new Error('Task ID and new status are required');
      }

      // Validate context and get services
      this.validateContext(context);
      const taskRepository = context.getService('taskRepository');
      const statusTransitionService = context.getService('statusTransitionService');

      if (!taskRepository) {
        throw new Error('TaskRepository not available in context');
      }
      if (!statusTransitionService) {
        throw new Error('TaskStatusTransitionService not available in context');
      }

      // 1. Get current task information
      const currentTask = await this.getCurrentTaskInfo(taskId, taskRepository);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }

      // 2. Validate status transition
      const isValidTransition = this.validateStatusTransition(currentTask.status, newStatus);
      if (!isValidTransition) {
        throw new Error(`Invalid status transition from ${currentTask.status} to ${newStatus}`);
      }

      // 3. Update task status in database
      if (updateDatabase) {
        await this.updateTaskStatus(taskId, newStatus, taskMetadata, taskRepository);
      }

      // 4. Move files if requested
      if (autoMoveFiles) {
        await this.moveTaskFiles(taskId, currentTask, newStatus, taskMetadata, statusTransitionService);
      }

      // 5. Update references
      await this.updateFileReferences(taskId, currentTask, newStatus);

      const result = {
        success: true,
        taskId,
        oldStatus: currentTask.status,
        newStatus,
        filesMoved: autoMoveFiles,
        databaseUpdated: updateDatabase,
        timestamp: new Date().toISOString()
      };

      logger.info(`✅ Task status updated successfully: ${taskId} -> ${newStatus}`);
      return result;

    } catch (error) {
      logger.error('❌ Task status update failed:', error);
      throw error;
    }
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   * @throws {Error} If validation fails
   */
  validateContext(context) {
    if (!context || typeof context.getService !== 'function') {
      throw new Error('Invalid context: getService method not available');
    }
  }

  /**
   * Get current task information
   * @param {string} taskId - Task ID
   * @param {Object} taskRepository - Task repository service
   * @returns {Promise<Object>} Current task info
   */
  async getCurrentTaskInfo(taskId, taskRepository) {
    try {
      const task = await taskRepository.findById(taskId);
      if (!task) {
        return null;
      }

      return {
        id: task.id,
        status: task.status?.value || task.status || 'pending',
        priority: task.priority || 'medium',
        category: task.category || 'uncategorized',
        title: task.title || 'Unknown Task',
        sourcePath: task.sourcePath || task.source_path,
        completedAt: task.completedAt || task.completed_at
      };
    } catch (error) {
      logger.error(`Error getting current task info for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @returns {boolean} Whether transition is valid
   */
  validateStatusTransition(currentStatus, newStatus) {
    // Allow keeping the same status (no change)
    if (currentStatus === newStatus) {
      return true;
    }

    const validTransitions = {
      'pending': ['in-progress', 'cancelled', 'blocked'],
      'in-progress': ['completed', 'failed', 'blocked', 'cancelled'],
      'blocked': ['pending', 'in-progress', 'cancelled'],
      'completed': [], // No transitions from completed
      'failed': ['pending', 'in-progress'],
      'cancelled': [] // No transitions from cancelled
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Update task status in database
   * @param {string} taskId - Task ID
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   * @param {Object} taskRepository - Task repository service
   */
  async updateTaskStatus(taskId, newStatus, metadata, taskRepository) {
    try {
      logger.info(`📊 Updating database record for task ${taskId}: status=${newStatus}`);
      
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
        ...metadata
      };
      
      await taskRepository.update(taskId, updateData);
      logger.info(`✅ Database updated successfully for task ${taskId}`);
      
    } catch (error) {
      logger.error(`Error updating database for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Move task files to new location using TaskStatusTransitionService
   * @param {string} taskId - Task ID
   * @param {Object} currentTask - Current task info
   * @param {string} newStatus - New status
   * @param {Object} metadata - Additional metadata
   * @param {Object} statusTransitionService - Status transition service
   */
  async moveTaskFiles(taskId, currentTask, newStatus, metadata, statusTransitionService) {
    try {
      logger.info(`📁 Moving files for task ${taskId} to status: ${newStatus}`);
      
      // Use TaskStatusTransitionService for proper file movement
      switch (newStatus) {
        case 'completed':
          await statusTransitionService.moveTaskToCompleted(taskId);
          break;
        case 'in-progress':
          await statusTransitionService.moveTaskToInProgress(taskId);
          break;
        case 'pending':
          await statusTransitionService.moveTaskToPending(taskId);
          break;
        case 'cancelled':
          await statusTransitionService.moveTaskToCancelled(taskId, metadata.reason || 'Task cancelled');
          break;
        default:
          logger.warn(`No specific transition method for status: ${newStatus}`);
          break;
      }
      
      logger.info(`✅ Files moved successfully for task ${taskId}`);
      
    } catch (error) {
      logger.error(`Error moving files for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update file references to new path
   * @param {string} taskId - Task ID
   * @param {Object} currentTask - Current task info
   * @param {string} newStatus - New status
   */
  async updateFileReferences(taskId, currentTask, newStatus) {
    try {
      // TODO: Implement reference updates in other files
      // This could include updating references in:
      // - Index files
      // - Implementation files
      // - Phase files
      // - Related task files
      
      logger.info(`📝 Would update file references for task ${taskId} with new status: ${newStatus}`);
      
    } catch (error) {
      logger.error(`Error updating file references for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get completion quarter from date
   * @param {string} completedAt - Completion date
   * @returns {string} Quarter string
   */
  getCompletionQuarter(completedAt) {
    if (!completedAt) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (month <= 3) return `${year}-q1`;
      if (month <= 6) return `${year}-q2`;
      if (month <= 9) return `${year}-q3`;
      return `${year}-q4`;
    }
    
    const date = new Date(completedAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }
}

module.exports = TaskStatusUpdateStep;

// Export config and execute for StepRegistry compatibility
module.exports.config = TaskStatusUpdateStep.getConfig();
module.exports.execute = async function(context = {}, options = {}) {
  const step = new TaskStatusUpdateStep();
  return await step.execute(context, options);
};
