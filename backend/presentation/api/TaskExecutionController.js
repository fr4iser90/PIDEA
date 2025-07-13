/**
 * TaskExecutionController - REST API endpoints for task execution
 */
const { validationResult } = require('express-validator');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TaskExecutionController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Execute task
     * POST /api/execution/execute
     */
    async executeTask(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const {
                taskId,
                options = {},
                priority = 'normal',
                timeout
            } = req.body;

            const userId = req.user?.id;

            const command = {
                taskId,
                options,
                priority,
                timeout,
                executedBy: userId
            };

            const result = await this.commandBus.execute('ExecuteTaskCommand', command);

            this.logger.info('TaskExecutionController: Task execution started', {
                taskId,
                executionId: result.execution.id,
                userId
            });

            res.json({
                success: true,
                data: {
                    task: result.task,
                    execution: result.execution
                },
                message: 'Task execution started'
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to execute task', {
                taskId: req.body.taskId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to execute task',
                message: error.message
            });
        }
    }

    /**
     * Get task execution status
     * GET /api/execution/:id
     */
    async getExecutionStatus(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const query = {
                executionId: id,
                userId
            };

            const result = await this.queryBus.execute('GetTaskExecutionQuery', query);

            if (!result.execution) {
                return res.status(404).json({
                    success: false,
                    error: 'Task execution not found'
                });
            }

            this.logger.info('TaskExecutionController: Execution status retrieved', {
                executionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.execution
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to get execution status', {
                executionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get execution status',
                message: error.message
            });
        }
    }

    /**
     * Cancel task execution
     * POST /api/execution/:id/cancel
     */
    async cancelExecution(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;

            const command = {
                executionId: id,
                reason,
                cancelledBy: userId
            };

            const result = await this.commandBus.execute('CancelTaskExecutionCommand', command);

            this.logger.info('TaskExecutionController: Task execution cancelled', {
                executionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.execution,
                message: 'Task execution cancelled successfully'
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to cancel execution', {
                executionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to cancel execution',
                message: error.message
            });
        }
    }

    /**
     * Pause task execution
     * POST /api/execution/:id/pause
     */
    async pauseExecution(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const command = {
                executionId: id,
                pausedBy: userId
            };

            const result = await this.commandBus.execute('PauseTaskExecutionCommand', command);

            this.logger.info('TaskExecutionController: Task execution paused', {
                executionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.execution,
                message: 'Task execution paused successfully'
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to pause execution', {
                executionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to pause execution',
                message: error.message
            });
        }
    }

    /**
     * Resume task execution
     * POST /api/execution/:id/resume
     */
    async resumeExecution(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const command = {
                executionId: id,
                resumedBy: userId
            };

            const result = await this.commandBus.execute('ResumeTaskExecutionCommand', command);

            this.logger.info('TaskExecutionController: Task execution resumed', {
                executionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.execution,
                message: 'Task execution resumed successfully'
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to resume execution', {
                executionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to resume execution',
                message: error.message
            });
        }
    }

    /**
     * Get execution logs
     * GET /api/execution/:id/logs
     */
    async getExecutionLogs(req, res) {
        try {
            const { id } = req.params;
            const { level, limit = 100, offset = 0 } = req.query;
            const userId = req.user?.id;

            const query = {
                executionId: id,
                level,
                limit: parseInt(limit),
                offset: parseInt(offset),
                userId
            };

            const result = await this.queryBus.execute('GetExecutionLogsQuery', query);

            this.logger.info('TaskExecutionController: Execution logs retrieved', {
                executionId: id,
                logCount: result.logs.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    logs: result.logs,
                    total: result.total,
                    pagination: {
                        limit: result.limit,
                        offset: result.offset,
                        hasMore: result.hasMore
                    }
                }
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to get execution logs', {
                executionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get execution logs',
                message: error.message
            });
        }
    }

    /**
     * Get execution metrics
     * GET /api/execution/:id/metrics
     */
    async getExecutionMetrics(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const query = {
                executionId: id,
                userId
            };

            const result = await this.queryBus.execute('GetExecutionMetricsQuery', query);

            this.logger.info('TaskExecutionController: Execution metrics retrieved', {
                executionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.metrics
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to get execution metrics', {
                executionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get execution metrics',
                message: error.message
            });
        }
    }

    /**
     * Get active executions
     * GET /api/execution/active
     */
    async getActiveExecutions(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                priority,
                userId: filterUserId
            } = req.query;

            const userId = req.user?.id;

            const query = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {
                    status: status || 'running',
                    priority,
                    userId: filterUserId
                },
                currentUserId: userId
            };

            const result = await this.queryBus.execute('GetActiveExecutionsQuery', query);

            this.logger.info('TaskExecutionController: Active executions retrieved', {
                count: result.executions.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    executions: result.executions,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / result.limit)
                    }
                }
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to get active executions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get active executions',
                message: error.message
            });
        }
    }

    /**
     * Get execution history
     * GET /api/execution/history
     */
    async getExecutionHistory(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                taskId,
                status,
                startDate,
                endDate,
                userId: filterUserId
            } = req.query;

            const userId = req.user?.id;

            const query = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {
                    taskId,
                    status,
                    startDate,
                    endDate,
                    userId: filterUserId
                },
                currentUserId: userId
            };

            const result = await this.queryBus.execute('GetExecutionHistoryQuery', query);

            this.logger.info('TaskExecutionController: Execution history retrieved', {
                count: result.executions.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    executions: result.executions,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / result.limit)
                    }
                }
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to get execution history', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get execution history',
                message: error.message
            });
        }
    }

    /**
     * Bulk cancel executions
     * POST /api/execution/bulk-cancel
     */
    async bulkCancelExecutions(req, res) {
        try {
            const { executionIds, reason } = req.body;
            const userId = req.user?.id;

            const command = {
                executionIds,
                reason,
                cancelledBy: userId
            };

            const result = await this.commandBus.execute('BulkCancelExecutionsCommand', command);

            this.logger.info('TaskExecutionController: Bulk executions cancelled', {
                count: executionIds.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    cancelledCount: result.cancelledCount,
                    errors: result.errors
                },
                message: 'Bulk executions cancelled successfully'
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to bulk cancel executions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to bulk cancel executions',
                message: error.message
            });
        }
    }

    /**
     * Get execution statistics
     * GET /api/execution/stats
     */
    async getExecutionStats(req, res) {
        try {
            const { timeRange, status, userId: filterUserId } = req.query;
            const userId = req.user?.id;

            const query = {
                timeRange,
                status,
                userId: filterUserId,
                currentUserId: userId
            };

            const result = await this.queryBus.execute('GetExecutionStatsQuery', query);

            this.logger.info('TaskExecutionController: Execution statistics retrieved', {
                userId
            });

            res.json({
                success: true,
                data: result.stats
            });

        } catch (error) {
            this.logger.error('TaskExecutionController: Failed to get execution statistics', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get execution statistics',
                message: error.message
            });
        }
    }

    /**
     * Health check endpoint
     * GET /api/execution/health
     */
    async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Task execution service is healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Task execution service is unhealthy',
                message: error.message
            });
        }
    }
}

module.exports = TaskExecutionController; 