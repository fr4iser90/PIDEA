/**
 * QueueController - API endpoints for queue management
 * Provides comprehensive queue status, control, step progress tracking, and history management
 */

const Logger = require("@logging/Logger");
const TaskQueueStore = require("@domain/services/queue/TaskQueueStore");
const StepProgressService = require("@domain/services/queue/StepProgressService");
const QueueHistoryService = require("@domain/services/queue/QueueHistoryService");
const TaskModeDetector = require("@domain/services/queue/TaskModeDetector");

class QueueController {
  constructor(dependencies = {}) {
    this.logger = new Logger("QueueController");
    this.taskQueueStore =
      dependencies.taskQueueStore || new TaskQueueStore(dependencies);
    this.stepProgressService =
      dependencies.stepProgressService || new StepProgressService(dependencies);
    this.queueHistoryService =
      dependencies.queueHistoryService || new QueueHistoryService(dependencies);
    this.TaskModeDetector =
      dependencies.TaskModeDetector || new TaskModeDetector(dependencies);
    this.eventBus = dependencies.eventBus;
  }

  /**
   * Get queue status for a project
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getQueueStatus(req, res) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;

      this.logger.debug("Getting queue status", { projectId, userId });

      const queueStatus = await this.taskQueueStore.getProjectQueueStatus(
        projectId,
        userId,
      );

      res.success(queueStatus);
    } catch (error) {
      this.logger.error("Failed to get queue status", { error: error.message });
      res.error("Failed to get queue status", 500, { details: error.message });
    }
  }

  /**
   * Add item to project queue
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addToQueue(req, res) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;
      const { workflow, context, options } = req.body;

      this.logger.info("Adding item to queue", {
        projectId,
        userId,
        taskMode: workflow?.type,
      });

      const queueItem = await this.taskQueueStore.addToProjectQueue(
        projectId,
        userId,
        workflow,
        context,
        options,
      );

      // Emit WebSocket event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit("queue:updated", {
          projectId,
          action: "added",
          item: queueItem,
        });
      }

      res.success(queueItem);
    } catch (error) {
      this.logger.error("Failed to add item to queue", {
        error: error.message,
      });
      res.error("Failed to add item to queue", 500, { details: error.message });
    }
  }

  /**
   * Cancel/remove queue item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelQueueItem(req, res) {
    try {
      const { projectId, itemId } = req.params;
      const { userId } = req.user;

      this.logger.info("Cancelling queue item", { projectId, itemId, userId });

      const result = await this.taskQueueStore.cancelQueueItem(
        projectId,
        itemId,
        userId,
      );

      // Emit WebSocket event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit("queue:updated", {
          projectId,
          action: "cancelled",
          itemId,
        });
      }

      res.success(result);
    } catch (error) {
      this.logger.error("Failed to cancel queue item", {
        error: error.message,
      });
      res.error("Failed to cancel queue item", 500, { details: error.message });
    }
  }

  /**
   * Update queue item priority
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateQueueItemPriority(req, res) {
    try {
      const { projectId, itemId } = req.params;
      const { userId } = req.user;
      const { priority } = req.body;

      this.logger.info("Updating queue item priority", {
        projectId,
        itemId,
        userId,
        priority,
      });

      const result = await this.taskQueueStore.updateQueueItemPriority(
        projectId,
        itemId,
        userId,
        priority,
      );

      // Emit WebSocket event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit("queue:updated", {
          projectId,
          action: "priority_updated",
          itemId,
          priority,
        });
      }

      res.success(result);
    } catch (error) {
      this.logger.error("Failed to update queue item priority", {
        error: error.message,
      });
      res.error("Failed to update queue item priority", 500, {
        details: error.message,
      });
    }
  }

  /**
   * Get step progress for a specific task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStepProgress(req, res) {
    try {
      const { projectId, itemId } = req.params;
      const { userId } = req.user;

      this.logger.info("Getting step progress", { projectId, itemId, userId });

      const stepProgress = await this.stepProgressService.getTaskStepProgress(
        projectId,
        itemId,
        userId,
      );

      res.success(stepProgress);
    } catch (error) {
      this.logger.error("Failed to get step progress", {
        error: error.message,
      });
      res.error("Failed to get step progress", 500, { details: error.message });
    }
  }

  /**
   * Pause/resume a specific step
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async toggleStepStatus(req, res) {
    try {
      const { projectId, taskId, stepId } = req.params;
      const { userId } = req.user;
      const { action } = req.body; // 'pause' or 'resume'

      this.logger.info("Toggling step status", {
        projectId,
        taskId,
        stepId,
        userId,
        action,
      });

      const result = await this.stepProgressService.toggleStepStatus(
        projectId,
        taskId,
        stepId,
        userId,
        action,
      );

      // Emit WebSocket event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit("task:step:progress", {
          projectId,
          taskId,
          stepId,
          action,
          status: result.status,
        });
      }

      res.success(result);
    } catch (error) {
      this.logger.error("Failed to toggle step status", {
        error: error.message,
      });
      res.error("Failed to toggle step status", 500, {
        details: error.message,
      });
    }
  }

  /**
   * Get queue statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getQueueStatistics(req, res) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;

      this.logger.info("Getting queue statistics", { projectId, userId });

      const statistics = await this.taskQueueStore.getQueueStatistics(
        projectId,
        userId,
      );

      res.success(statistics);
    } catch (error) {
      this.logger.error("Failed to get queue statistics", {
        error: error.message,
      });
      res.error("Failed to get queue statistics", 500, {
        details: error.message,
      });
    }
  }

  /**
   * Clear completed items from queue
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearCompletedItems(req, res) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;

      this.logger.info("Clearing completed items", { projectId, userId });

      const result = await this.taskQueueStore.clearCompletedItems(
        projectId,
        userId,
      );

      // Emit WebSocket event for real-time updates
      if (this.eventBus) {
        this.eventBus.emit("queue:updated", {
          projectId,
          action: "cleared_completed",
          count: result.clearedCount,
        });
      }

      res.success(result);
    } catch (error) {
      this.logger.error("Failed to clear completed items", {
        error: error.message,
      });
      res.error("Failed to clear completed items", 500, {
        details: error.message,
      });
    }
  }

  // ============================================================================
  // QUEUE HISTORY ENDPOINTS
  // ============================================================================

  /**
   * Get queue history with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getQueueHistory(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || "me";
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        search,
      } = req.query;

      this.logger.debug("Getting queue history", {
        projectId,
        userId,
        page,
        limit,
        filters: { type, status, startDate, endDate, search },
      });

      const filters = { type, status, startDate, endDate, search };
      const pagination = { page: parseInt(page), limit: parseInt(limit) };

      const history = await this.queueHistoryService.getWorkflowHistory(
        filters,
        pagination,
      );

      res.success(history);
    } catch (error) {
      this.logger.error("Failed to get queue history", {
        projectId: req.params.projectId,
        error: error.message,
      });

      res.error("Failed to get queue history", 500, { details: error.message });
    }
  }

  /**
   * Get specific history item by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistoryItem(req, res) {
    try {
      const { projectId, historyId } = req.params;
      const userId = req.user?.id || "me";

      this.logger.info("Getting history item", {
        projectId,
        historyId,
        userId,
      });

      const historyItem =
        await this.queueHistoryService.getHistoryItem(historyId);

      if (!historyItem) {
        return res.notFound("History item not found", {
          message: `History item ${historyId} not found`,
        });
      }

      res.success(historyItem);
    } catch (error) {
      this.logger.error("Failed to get history item", {
        projectId: req.params.projectId,
        historyId: req.params.historyId,
        error: error.message,
      });

      res.error("Failed to get history item", 500, { details: error.message });
    }
  }

  /**
   * Delete old history items based on retention policy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteHistory(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || "me";
      const { retentionDays = 30 } = req.body;

      this.logger.info("Deleting old history items", {
        projectId,
        userId,
        retentionDays,
      });

      const result =
        await this.queueHistoryService.cleanupOldHistory(retentionDays);

      res.success(result, 200, {
        meta: {
          message: "Successfully deleted ${result.deletedCount} history items",
        },
      });
    } catch (error) {
      this.logger.error("Failed to delete history items", {
        projectId: req.params.projectId,
        error: error.message,
      });

      res.error("Failed to delete history items", 500, {
        details: error.message,
      });
    }
  }

  /**
   * Export history to CSV
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportHistory(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || "me";
      const { type, status, startDate, endDate, search } = req.query;

      this.logger.info("Exporting history to CSV", {
        projectId,
        userId,
        filters: { type, status, startDate, endDate, search },
      });

      const filters = { type, status, startDate, endDate, search };
      const csv = await this.queueHistoryService.exportHistoryToCSV(filters);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="queue-history.csv"',
      );
      res.send(csv);
    } catch (error) {
      this.logger.error("Failed to export history", {
        projectId: req.params.projectId,
        error: error.message,
      });

      res.error("Failed to export history", 500, { details: error.message });
    }
  }

  // ============================================================================
  // WORKFLOW TYPE DETECTION ENDPOINTS
  // ============================================================================

  /**
   * Detect workflow type from workflow data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async detectTaskMode(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || "me";
      const { workflowData } = req.body;

      this.logger.info("Detecting workflow type", {
        projectId,
        userId,
        workflowId: workflowData?.id,
      });

      const result = await this.TaskModeDetector.detectTaskMode(workflowData);

      res.success(result);
    } catch (error) {
      this.logger.error("Failed to detect workflow type", {
        projectId: req.params.projectId,
        error: error.message,
      });

      res.error("Failed to detect workflow type", 500, {
        details: error.message,
      });
    }
  }

  /**
   * Get list of all known workflow types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTaskModes(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || "me";

      this.logger.info("Getting workflow types", { projectId, userId });

      const types = this.TaskModeDetector.getKnownTypes();

      res.success({
        types: types,
        count: types.length,
        detectionMethod: "strict_no_fallbacks",
      });
    } catch (error) {
      this.logger.error("Failed to get workflow types", {
        projectId: req.params.projectId,
        error: error.message,
      });

      res.error("Failed to get workflow types", 500, {
        details: error.message,
      });
    }
  }

  /**
   * Get history statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHistoryStatistics(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id || "me";
      const { type, status, startDate, endDate } = req.query;

      this.logger.debug("Getting history statistics", {
        projectId,
        userId,
        filters: { type, status, startDate, endDate },
      });

      const filters = { type, status, startDate, endDate };
      const statistics =
        await this.queueHistoryService.getHistoryStatistics(filters);

      res.success(statistics);
    } catch (error) {
      this.logger.error("Failed to get history statistics", {
        projectId: req.params.projectId,
        error: error.message,
      });

      res.error("Failed to get history statistics", 500, {
        details: error.message,
      });
    }
  }
}

module.exports = QueueController;
