/**
 * TaskSuggestionController - REST API endpoints for AI task suggestions
 */
const { validationResult } = require('express-validator');
const { logger } = require('@infrastructure/logging/Logger');

class TaskSuggestionController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Generate AI task suggestions
     * POST /api/suggestions/generate
     */
    async generateSuggestions(req, res) {
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
                context,
                projectPath,
                aiModel = 'gpt-4',
                options = {},
                maxSuggestions = 10
            } = req.body;

            const userId = req.user?.id;

            const command = {
                context,
                projectPath,
                aiModel,
                options,
                maxSuggestions,
                generatedBy: userId
            };

            const result = await this.commandBus.execute('GenerateTaskSuggestionsCommand', command);

            this.logger.info('TaskSuggestionController: AI suggestions generated', {
                projectPath,
                suggestionCount: result.suggestions.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    suggestions: result.suggestions,
                    metadata: result.metadata,
                    confidence: result.confidence
                },
                message: 'AI suggestions generated successfully'
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to generate suggestions', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to generate suggestions',
                message: error.message
            });
        }
    }

    /**
     * Get task suggestions
     * GET /api/suggestions
     */
    async getSuggestions(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                projectId,
                suggestionType,
                status,
                aiModel,
                startDate,
                endDate
            } = req.query;

            const userId = req.user?.id;

            const query = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {
                    projectId,
                    suggestionType,
                    status,
                    aiModel,
                    startDate,
                    endDate
                },
                userId
            };

            const result = await this.queryBus.execute('GetTaskSuggestionsQuery', query);

            this.logger.info('TaskSuggestionController: Suggestions retrieved', {
                count: result.suggestions.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    suggestions: result.suggestions,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / result.limit)
                    }
                }
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to get suggestions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get suggestions',
                message: error.message
            });
        }
    }

    /**
     * Get suggestion by ID
     * GET /api/suggestions/:id
     */
    async getSuggestionById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const query = {
                suggestionId: id,
                userId
            };

            const result = await this.queryBus.execute('GetTaskSuggestionsQuery', query);

            if (!result.suggestions || result.suggestions.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Suggestion not found'
                });
            }

            const suggestion = result.suggestions[0];

            this.logger.info('TaskSuggestionController: Suggestion retrieved', {
                suggestionId: id,
                userId
            });

            res.json({
                success: true,
                data: suggestion
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to get suggestion', {
                suggestionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get suggestion',
                message: error.message
            });
        }
    }

    /**
     * Apply suggestion to create task
     * POST /api/suggestions/:id/apply
     */
    async applySuggestion(req, res) {
        try {
            const { id } = req.params;
            const { modifications = {} } = req.body;
            const userId = req.user?.id;

            const command = {
                suggestionId: id,
                modifications,
                appliedBy: userId
            };

            const result = await this.commandBus.execute('ApplySuggestionCommand', command);

            this.logger.info('TaskSuggestionController: Suggestion applied', {
                suggestionId: id,
                taskId: result.task.id,
                userId
            });

            res.json({
                success: true,
                data: {
                    task: result.task,
                    suggestion: result.suggestion
                },
                message: 'Suggestion applied successfully'
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to apply suggestion', {
                suggestionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to apply suggestion',
                message: error.message
            });
        }
    }

    /**
     * Reject suggestion
     * POST /api/suggestions/:id/reject
     */
    async rejectSuggestion(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;

            const command = {
                suggestionId: id,
                reason,
                rejectedBy: userId
            };

            const result = await this.commandBus.execute('RejectSuggestionCommand', command);

            this.logger.info('TaskSuggestionController: Suggestion rejected', {
                suggestionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.suggestion,
                message: 'Suggestion rejected successfully'
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to reject suggestion', {
                suggestionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to reject suggestion',
                message: error.message
            });
        }
    }

    /**
     * Update suggestion
     * PUT /api/suggestions/:id
     */
    async updateSuggestion(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const updateData = {
                id,
                ...req.body,
                updatedBy: userId
            };

            const result = await this.commandBus.execute('UpdateSuggestionCommand', updateData);

            this.logger.info('TaskSuggestionController: Suggestion updated', {
                suggestionId: id,
                userId
            });

            res.json({
                success: true,
                data: result.suggestion,
                message: 'Suggestion updated successfully'
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to update suggestion', {
                suggestionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to update suggestion',
                message: error.message
            });
        }
    }

    /**
     * Delete suggestion
     * DELETE /api/suggestions/:id
     */
    async deleteSuggestion(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const command = {
                suggestionId: id,
                deletedBy: userId
            };

            await this.commandBus.execute('DeleteSuggestionCommand', command);

            this.logger.info('TaskSuggestionController: Suggestion deleted', {
                suggestionId: id,
                userId
            });

            res.json({
                success: true,
                message: 'Suggestion deleted successfully'
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to delete suggestion', {
                suggestionId: req.params.id,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to delete suggestion',
                message: error.message
            });
        }
    }

    /**
     * Get suggestion statistics
     * GET /api/suggestions/stats
     */
    async getSuggestionStats(req, res) {
        try {
            const { projectId, timeRange, aiModel } = req.query;
            const userId = req.user?.id;

            const query = {
                projectId,
                timeRange,
                aiModel,
                userId
            };

            const result = await this.queryBus.execute('GetSuggestionStatsQuery', query);

            this.logger.info('TaskSuggestionController: Suggestion statistics retrieved', {
                userId
            });

            res.json({
                success: true,
                data: result.stats
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to get suggestion statistics', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get suggestion statistics',
                message: error.message
            });
        }
    }

    /**
     * Bulk apply suggestions
     * POST /api/suggestions/bulk-apply
     */
    async bulkApplySuggestions(req, res) {
        try {
            const { suggestionIds, modifications = {} } = req.body;
            const userId = req.user?.id;

            const command = {
                suggestionIds,
                modifications,
                appliedBy: userId
            };

            const result = await this.commandBus.execute('BulkApplySuggestionsCommand', command);

            this.logger.info('TaskSuggestionController: Bulk suggestions applied', {
                count: suggestionIds.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    appliedCount: result.appliedCount,
                    tasks: result.tasks,
                    errors: result.errors
                },
                message: 'Bulk suggestions applied successfully'
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to bulk apply suggestions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to bulk apply suggestions',
                message: error.message
            });
        }
    }

    /**
     * Get AI model performance
     * GET /api/suggestions/ai-performance
     */
    async getAIPerformance(req, res) {
        try {
            const { aiModel, timeRange } = req.query;
            const userId = req.user?.id;

            const query = {
                aiModel,
                timeRange,
                userId
            };

            const result = await this.queryBus.execute('GetAIPerformanceQuery', query);

            this.logger.info('TaskSuggestionController: AI performance retrieved', {
                aiModel,
                userId
            });

            res.json({
                success: true,
                data: result.performance
            });

        } catch (error) {
            this.logger.error('TaskSuggestionController: Failed to get AI performance', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get AI performance',
                message: error.message
            });
        }
    }

    /**
     * Health check endpoint
     * GET /api/suggestions/health
     */
    async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Suggestion service is healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Suggestion service is unhealthy',
                message: error.message
            });
        }
    }
}

module.exports = TaskSuggestionController; 