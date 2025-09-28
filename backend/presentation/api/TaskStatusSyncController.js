/**
 * Task Status Sync API Controller
 * Handles task status synchronization requests from frontend
 * Created: 2025-09-28T17:54:16.000Z
 */

const TaskStatusSyncStep = require('../../domain/steps/categories/task/task_status_sync_step');
const Logger = require('@logging/Logger');

class TaskStatusSyncController {
  constructor(taskRepository, statusTransitionService, eventBus) {
    this.taskRepository = taskRepository;
    this.statusTransitionService = statusTransitionService;
    this.eventBus = eventBus;
    this.logger = new Logger('TaskStatusSyncController');
    this.syncStep = new TaskStatusSyncStep();
  }

  /**
   * POST /api/projects/:projectId/tasks/sync-status
   * Sync task statuses with validation
   */
  async syncTaskStatuses(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const {
        operation = 'sync',
        taskIds = [],
        targetStatus,
        sourceSystem = 'manual',
        targetSystem = 'automated',
        options = {}
      } = req.body;

      this.logger.info('🔄 [TaskStatusSyncController] syncTaskStatuses called', {
        projectId,
        userId,
        operation,
        taskIds: taskIds.length,
        targetStatus
      });

      // Create context with required services
      const context = {
        getService: (serviceName) => {
          const serviceMap = {
            'taskRepository': this.taskRepository,
            'statusTransitionService': this.statusTransitionService,
            'eventBus': this.eventBus
          };
          return serviceMap[serviceName];
        }
      };

      // Execute sync step
      const result = await this.syncStep.execute(context, {
        operation,
        taskIds,
        targetStatus,
        sourceSystem,
        targetSystem,
        options: {
          validateTransitions: true,
          moveFiles: true,
          emitEvents: true,
          createBackup: true,
          ...options
        }
      });

      this.logger.info('✅ [TaskStatusSyncController] Task status sync completed', {
        projectId,
        operation,
        success: result.success,
        processedTasks: result.processedTasks || result.totalTasks || 0
      });

      // Emit WebSocket event
      if (this.eventBus) {
        this.eventBus.emit('task:status:sync:completed', {
          projectId,
          userId,
          operation,
          result,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: result,
        projectId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('❌ [TaskStatusSyncController] Task status sync failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync task statuses',
        message: error.message
      });
    }
  }

  /**
   * POST /api/projects/:projectId/tasks/validate-status
   * Validate task status transitions
   */
  async validateTaskStatuses(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const { taskIds = [], targetStatus } = req.body;

      this.logger.info('🔍 [TaskStatusSyncController] validateTaskStatuses called', {
        projectId,
        userId,
        taskIds: taskIds.length,
        targetStatus
      });

      // Create context
      const context = {
        getService: (serviceName) => {
          const serviceMap = {
            'taskRepository': this.taskRepository,
            'statusTransitionService': this.statusTransitionService,
            'eventBus': this.eventBus
          };
          return serviceMap[serviceName];
        }
      };

      // Execute validation
      const result = await this.syncStep.execute(context, {
        operation: 'validate',
        taskIds,
        targetStatus
      });

      this.logger.info('✅ [TaskStatusSyncController] Task status validation completed', {
        projectId,
        validTasks: result.validTasks,
        invalidTasks: result.invalidTasks
      });

      res.json({
        success: true,
        data: result,
        projectId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('❌ [TaskStatusSyncController] Task status validation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate task statuses',
        message: error.message
      });
    }
  }

  /**
   * POST /api/projects/:projectId/tasks/rollback-status
   * Rollback task status changes
   */
  async rollbackTaskStatuses(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const { taskIds = [], previousStatus } = req.body;

      this.logger.info('🔄 [TaskStatusSyncController] rollbackTaskStatuses called', {
        projectId,
        userId,
        taskIds: taskIds.length,
        previousStatus
      });

      // Create context
      const context = {
        getService: (serviceName) => {
          const serviceMap = {
            'taskRepository': this.taskRepository,
            'statusTransitionService': this.statusTransitionService,
            'eventBus': this.eventBus
          };
          return serviceMap[serviceName];
        }
      };

      // Execute rollback
      const result = await this.syncStep.execute(context, {
        operation: 'rollback',
        taskIds,
        previousStatus
      });

      this.logger.info('✅ [TaskStatusSyncController] Task status rollback completed', {
        projectId,
        successfulRollbacks: result.successfulRollbacks,
        failedRollbacks: result.failedRollbacks
      });

      // Emit WebSocket event
      if (this.eventBus) {
        this.eventBus.emit('task:status:rollback:completed', {
          projectId,
          userId,
          result,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: result,
        projectId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('❌ [TaskStatusSyncController] Task status rollback failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rollback task statuses',
        message: error.message
      });
    }
  }
}

module.exports = TaskStatusSyncController;
