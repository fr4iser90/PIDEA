/**
 * Task Status Sync Step
 * Synchronizes task statuses across different systems
 * Ensures consistency across the PIDEA platform
 * Created: 2025-09-28T17:54:16.000Z
 */

require('module-alias/register');
const Logger = require('@logging/Logger');
const logger = new Logger('TaskStatusSyncStep');

class TaskStatusSyncStep {
  constructor() {
    this.name = 'TaskStatusSyncStep';
    this.description = 'Synchronizes task statuses across systems';
    this.category = 'task';
    this.dependencies = ['TaskRepository', 'TaskStatusTransitionService', 'EventBus'];
  }

  static getConfig() {
    return {
      name: 'TaskStatusSyncStep',
      type: 'sync',
      description: 'Synchronizes task statuses across systems',
      category: 'task',
      version: '1.0.0',
      dependencies: ['TaskRepository', 'TaskStatusTransitionService', 'EventBus'],
      settings: {
        timeout: 60000,
        batchSize: 50,
        retryAttempts: 3,
        enableFileSync: true,
        enableEventEmission: true
      },
      validation: {
        requiredServices: ['taskRepository', 'statusTransitionService', 'eventBus'],
        supportedOperations: ['sync', 'batch-sync', 'validate', 'rollback']
      }
    };
  }

  /**
   * Execute task status synchronization
   * @param {Object} context - Execution context
   * @param {Object} options - Step options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context = {}, options = {}) {
    try {
      logger.info('🔄 Starting task status sync step...');
      
      const {
        operation = 'sync',
        taskIds = [],
        targetStatus,
        sourceSystem,
        targetSystem,
        options: syncOptions = {}
      } = options;

      // Validate context and services
      this.validateContext(context);
      const services = this.getRequiredServices(context);

      // Route to appropriate operation
      switch (operation) {
        case 'sync':
          return await this.syncSingleTask(context, services, options);
        case 'batch-sync':
          return await this.syncBatchTasks(context, services, options);
        case 'validate':
          return await this.validateSync(context, services, options);
        case 'rollback':
          return await this.rollbackSync(context, services, options);
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      logger.error('❌ Task status sync failed:', error);
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
   * Get required services from context
   * @param {Object} context - Execution context
   * @returns {Object} Services object
   */
  getRequiredServices(context) {
    const taskRepository = context.getService('taskRepository');
    const statusTransitionService = context.getService('statusTransitionService');
    const eventBus = context.getService('eventBus');

    if (!taskRepository) {
      throw new Error('TaskRepository not available in context');
    }
    if (!statusTransitionService) {
      throw new Error('TaskStatusTransitionService not available in context');
    }
    if (!eventBus) {
      throw new Error('EventBus not available in context');
    }

    return {
      taskRepository,
      statusTransitionService,
      eventBus
    };
  }

  /**
   * Sync single task status
   * @param {Object} context - Execution context
   * @param {Object} services - Required services
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async syncSingleTask(context, services, options) {
    logger.info('🔄 Syncing single task...');
    
    const { taskId, targetStatus, sourceSystem, targetSystem } = options;
    
    if (!taskId || !targetStatus) {
      throw new Error('Task ID and target status are required for sync operation');
    }

    // Get current task
    const task = await services.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Validate status transition
    const isValidTransition = this.validateStatusTransition(task.status?.value || task.status, targetStatus);
    if (!isValidTransition) {
      throw new Error(`Invalid status transition from ${task.status?.value || task.status} to ${targetStatus}`);
    }

    // Perform sync
    const result = await this.performStatusSync(task, targetStatus, services, options);
    
    logger.info(`✅ Single task sync completed: ${taskId} -> ${targetStatus}`);
    return result;
  }

  /**
   * Sync multiple tasks in batch
   * @param {Object} context - Execution context
   * @param {Object} services - Required services
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Batch sync result
   */
  async syncBatchTasks(context, services, options) {
    logger.info('🔄 Syncing batch tasks...');
    
    const { taskIds, targetStatus, batchSize = 50 } = options;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Task IDs array is required for batch sync operation');
    }

    if (!targetStatus) {
      throw new Error('Target status is required for batch sync operation');
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Process tasks in batches
    for (let i = 0; i < taskIds.length; i += batchSize) {
      const batch = taskIds.slice(i, i + batchSize);
      
      for (const taskId of batch) {
        try {
          const result = await this.syncSingleTask(context, services, {
            ...options,
            taskId,
            targetStatus
          });
          results.push(result);
          processedCount++;
        } catch (error) {
          errors.push({
            taskId,
            error: error.message
          });
          logger.error(`❌ Batch sync failed for task ${taskId}:`, error);
        }
      }
    }

    const batchResult = {
      success: errors.length === 0,
      operation: 'batch-sync',
      processedTasks: processedCount,
      successfulTasks: results.length,
      failedTasks: errors.length,
      results,
      errors,
      timestamp: new Date().toISOString()
    };

    logger.info(`✅ Batch sync completed: ${results.length} successful, ${errors.length} failed`);
    return batchResult;
  }

  /**
   * Validate sync operation
   * @param {Object} context - Execution context
   * @param {Object} services - Required services
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateSync(context, services, options) {
    logger.info('🔄 Validating sync operation...');
    
    const { taskIds, targetStatus } = options;
    
    if (!taskIds || !Array.isArray(taskIds)) {
      throw new Error('Task IDs array is required for validation');
    }

    const validationResults = [];
    
    for (const taskId of taskIds) {
      try {
        const task = await services.taskRepository.findById(taskId);
        if (!task) {
          validationResults.push({
            taskId,
            valid: false,
            error: 'Task not found'
          });
          continue;
        }

        const currentStatus = task.status?.value || task.status;
        const isValidTransition = this.validateStatusTransition(currentStatus, targetStatus);
        
        validationResults.push({
          taskId,
          valid: isValidTransition,
          currentStatus,
          targetStatus,
          error: isValidTransition ? null : `Invalid transition from ${currentStatus} to ${targetStatus}`
        });
      } catch (error) {
        validationResults.push({
          taskId,
          valid: false,
          error: error.message
        });
      }
    }

    const validationResult = {
      success: true,
      operation: 'validate',
      totalTasks: taskIds.length,
      validTasks: validationResults.filter(r => r.valid).length,
      invalidTasks: validationResults.filter(r => !r.valid).length,
      results: validationResults,
      timestamp: new Date().toISOString()
    };

    logger.info(`✅ Validation completed: ${validationResult.validTasks} valid, ${validationResult.invalidTasks} invalid`);
    return validationResult;
  }

  /**
   * Rollback sync operation
   * @param {Object} context - Execution context
   * @param {Object} services - Required services
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackSync(context, services, options) {
    logger.info('🔄 Rolling back sync operation...');
    
    const { taskIds, previousStatus } = options;
    
    if (!taskIds || !Array.isArray(taskIds)) {
      throw new Error('Task IDs array is required for rollback');
    }

    if (!previousStatus) {
      throw new Error('Previous status is required for rollback');
    }

    const rollbackResults = [];
    
    for (const taskId of taskIds) {
      try {
        const task = await services.taskRepository.findById(taskId);
        if (!task) {
          rollbackResults.push({
            taskId,
            success: false,
            error: 'Task not found'
          });
          continue;
        }

        // Rollback to previous status
        const result = await this.performStatusSync(task, previousStatus, services, options);
        rollbackResults.push({
          taskId,
          success: true,
          previousStatus: task.status?.value || task.status,
          newStatus: previousStatus
        });
      } catch (error) {
        rollbackResults.push({
          taskId,
          success: false,
          error: error.message
        });
      }
    }

    const rollbackResult = {
      success: rollbackResults.every(r => r.success),
      operation: 'rollback',
      totalTasks: taskIds.length,
      successfulRollbacks: rollbackResults.filter(r => r.success).length,
      failedRollbacks: rollbackResults.filter(r => !r.success).length,
      results: rollbackResults,
      timestamp: new Date().toISOString()
    };

    logger.info(`✅ Rollback completed: ${rollbackResult.successfulRollbacks} successful, ${rollbackResult.failedRollbacks} failed`);
    return rollbackResult;
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
   * Perform actual status sync
   * @param {Object} task - Task object
   * @param {string} newStatus - New status
   * @param {Object} services - Required services
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async performStatusSync(task, newStatus, services, options) {
    const { enableFileSync = true, enableEventEmission = true } = options;
    
    // Update task status in database
    task.updateStatus(newStatus);
    await services.taskRepository.update(task.id, task);

    // Move files if enabled
    if (enableFileSync) {
      await this.moveTaskFiles(task, newStatus, services);
    }

    // Emit event if enabled
    if (enableEventEmission) {
      await this.emitSyncEvent(task, newStatus, services, options);
    }

    return {
      success: true,
      taskId: task.id,
      oldStatus: task.status?.value || task.status,
      newStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Move task files to new location
   * @param {Object} task - Task object
   * @param {string} newStatus - New status
   * @param {Object} services - Required services
   */
  async moveTaskFiles(task, newStatus, services) {
    try {
      // Use TaskStatusTransitionService for proper file movement
      switch (newStatus) {
        case 'completed':
          await services.statusTransitionService.moveTaskToCompleted(task.id);
          break;
        case 'in-progress':
          await services.statusTransitionService.moveTaskToInProgress(task.id);
          break;
        case 'pending':
          await services.statusTransitionService.moveTaskToPending(task.id);
          break;
        case 'cancelled':
          await services.statusTransitionService.moveTaskToCancelled(task.id, 'Task cancelled via sync');
          break;
        default:
          logger.warn(`No specific transition method for status: ${newStatus}`);
          break;
      }
    } catch (error) {
      logger.error(`Error moving files for task ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * Emit sync event
   * @param {Object} task - Task object
   * @param {string} newStatus - New status
   * @param {Object} services - Required services
   * @param {Object} options - Sync options
   */
  async emitSyncEvent(task, newStatus, services, options) {
    try {
      const event = {
        type: 'task.status.synced',
        taskId: task.id,
        oldStatus: task.status?.value || task.status,
        newStatus,
        sourceSystem: options.sourceSystem || 'unknown',
        targetSystem: options.targetSystem || 'unknown',
        timestamp: new Date().toISOString(),
        metadata: options.metadata || {}
      };

      await services.eventBus.emit(event);
      logger.info(`📡 Sync event emitted for task ${task.id}`);
    } catch (error) {
      logger.error(`Error emitting sync event for task ${task.id}:`, error);
      // Don't throw error for event emission failures
    }
  }
}

module.exports = TaskStatusSyncStep;

// Export config and execute for StepRegistry compatibility
module.exports.config = TaskStatusSyncStep.getConfig();
module.exports.execute = async function(context = {}, options = {}) {
  const step = new TaskStatusSyncStep();
  return await step.execute(context, options);
};
