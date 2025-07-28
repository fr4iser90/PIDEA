/**
 * QueueController - API endpoints for queue management
 * Provides comprehensive queue status, control, and step progress tracking
 */

const Logger = require('@logging/Logger');
const QueueMonitoringService = require('@domain/services/queue/QueueMonitoringService');
const StepProgressService = require('@domain/services/queue/StepProgressService');
const ExecutionQueue = require('@domain/workflows/execution/ExecutionQueue');

class QueueController {
    constructor(dependencies = {}) {
        this.logger = new Logger('QueueController');
        this.queueMonitoringService = dependencies.queueMonitoringService || new QueueMonitoringService(dependencies);
        this.stepProgressService = dependencies.stepProgressService || new StepProgressService(dependencies);
        this.executionQueue = dependencies.executionQueue || new ExecutionQueue();
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

            this.logger.info('Getting queue status', { projectId, userId });

            const queueStatus = await this.queueMonitoringService.getProjectQueueStatus(projectId, userId);
            
            res.json({
                success: true,
                data: queueStatus,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to get queue status', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to get queue status',
                message: error.message
            });
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

            this.logger.info('Adding item to queue', { projectId, userId, workflowType: workflow?.type });

            const queueItem = await this.queueMonitoringService.addToProjectQueue(
                projectId, 
                userId, 
                workflow, 
                context, 
                options
            );

            // Emit WebSocket event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:updated', {
                    projectId,
                    action: 'added',
                    item: queueItem
                });
            }

            res.json({
                success: true,
                data: queueItem,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to add item to queue', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to add item to queue',
                message: error.message
            });
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

            this.logger.info('Cancelling queue item', { projectId, itemId, userId });

            const result = await this.queueMonitoringService.cancelQueueItem(projectId, itemId, userId);

            // Emit WebSocket event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:updated', {
                    projectId,
                    action: 'cancelled',
                    itemId
                });
            }

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to cancel queue item', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to cancel queue item',
                message: error.message
            });
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

            this.logger.info('Updating queue item priority', { projectId, itemId, userId, priority });

            const result = await this.queueMonitoringService.updateQueueItemPriority(
                projectId, 
                itemId, 
                userId, 
                priority
            );

            // Emit WebSocket event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:updated', {
                    projectId,
                    action: 'priority_updated',
                    itemId,
                    priority
                });
            }

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to update queue item priority', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to update queue item priority',
                message: error.message
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
            const { projectId, taskId } = req.params;
            const { userId } = req.user;

            this.logger.info('Getting step progress', { projectId, taskId, userId });

            const stepProgress = await this.stepProgressService.getTaskStepProgress(projectId, taskId, userId);

            res.json({
                success: true,
                data: stepProgress,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to get step progress', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to get step progress',
                message: error.message
            });
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

            this.logger.info('Toggling step status', { projectId, taskId, stepId, userId, action });

            const result = await this.stepProgressService.toggleStepStatus(
                projectId, 
                taskId, 
                stepId, 
                userId, 
                action
            );

            // Emit WebSocket event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('task:step:progress', {
                    projectId,
                    taskId,
                    stepId,
                    action,
                    status: result.status
                });
            }

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to toggle step status', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to toggle step status',
                message: error.message
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

            this.logger.info('Getting queue statistics', { projectId, userId });

            const statistics = await this.queueMonitoringService.getQueueStatistics(projectId, userId);

            res.json({
                success: true,
                data: statistics,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to get queue statistics', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to get queue statistics',
                message: error.message
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

            this.logger.info('Clearing completed items', { projectId, userId });

            const result = await this.queueMonitoringService.clearCompletedItems(projectId, userId);

            // Emit WebSocket event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('queue:updated', {
                    projectId,
                    action: 'cleared_completed',
                    count: result.clearedCount
                });
            }

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Failed to clear completed items', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to clear completed items',
                message: error.message
            });
        }
    }
}

module.exports = QueueController; 