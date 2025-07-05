/**
 * AutoModeController - REST API endpoints for VibeCoder auto mode
 */
const { validationResult } = require('express-validator');
const AutoModeCommand = require('../../application/commands/AutoModeCommand');

class AutoModeController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.application = dependencies.application;
    }

    /**
     * Execute auto mode
     * POST /api/auto/execute
     */
    async executeAutoMode(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { projectId } = req.params;
            const {
                projectPath,
                mode = 'full',
                options = {},
                aiModel = 'gpt-4',
                autoExecute = true
            } = req.body;

            const userId = req.user?.id;

            // Get workspace path from project ID if not provided
            let workspacePath = projectPath;
            if (!workspacePath && projectId !== 'default') {
                // Try to get workspace path from project mapping
                const projectMappingService = this.application?.projectMappingService;
                if (projectMappingService) {
                    workspacePath = projectMappingService.getWorkspaceFromProjectId(projectId);
                }
            }

            // Fallback to current working directory
            if (!workspacePath) {
                workspacePath = process.cwd();
            }

            this.logger.info('AutoModeController: Using workspace path', {
                projectId,
                workspacePath
            });

            const command = new AutoModeCommand({
                projectPath: workspacePath,
                mode,
                options,
                aiModel,
                autoConfirm: autoExecute,
                requestedBy: userId
            });

            const result = await this.commandBus.execute('AutoModeCommand', command);

            this.logger.info('AutoModeController: Auto mode execution started', {
                projectPath,
                mode,
                sessionId: result.result.session.id,
                userId
            });

            res.json({
                success: true,
                data: {
                    session: result.result.session,
                    tasks: result.result.tasks,
                    scripts: result.result.scripts,
                    analysis: result.result.analysis
                },
                message: 'Auto mode execution started successfully'
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to execute auto mode', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to execute auto mode',
                message: error.message
            });
        }
    }

    /**
     * Get auto mode status
     * GET /api/auto/status
     */
    async getAutoModeStatus(req, res) {
        try {
            const { sessionId } = req.query;
            const userId = req.user?.id;

            const query = {
                sessionId,
                userId
            };

            const result = await this.queryBus.execute('GetAutoModeStatusQuery', query);

            this.logger.info('AutoModeController: Auto mode status retrieved', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.status
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to get auto mode status', {
                sessionId: req.query.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get auto mode status',
                message: error.message
            });
        }
    }

    /**
     * Stop auto mode
     * POST /api/auto/stop
     */
    async stopAutoMode(req, res) {
        try {
            const { sessionId, reason } = req.body;
            const userId = req.user?.id;

            const command = {
                sessionId,
                reason,
                stoppedBy: userId
            };

            const result = await this.commandBus.execute('StopAutoModeCommand', command);

            this.logger.info('AutoModeController: Auto mode stopped', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.session,
                message: 'Auto mode stopped successfully'
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to stop auto mode', {
                sessionId: req.body.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to stop auto mode',
                message: error.message
            });
        }
    }

    /**
     * Pause auto mode
     * POST /api/auto/pause
     */
    async pauseAutoMode(req, res) {
        try {
            const { sessionId } = req.body;
            const userId = req.user?.id;

            const command = {
                sessionId,
                pausedBy: userId
            };

            const result = await this.commandBus.execute('PauseAutoModeCommand', command);

            this.logger.info('AutoModeController: Auto mode paused', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.session,
                message: 'Auto mode paused successfully'
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to pause auto mode', {
                sessionId: req.body.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to pause auto mode',
                message: error.message
            });
        }
    }

    /**
     * Resume auto mode
     * POST /api/auto/resume
     */
    async resumeAutoMode(req, res) {
        try {
            const { sessionId } = req.body;
            const userId = req.user?.id;

            const command = {
                sessionId,
                resumedBy: userId
            };

            const result = await this.commandBus.execute('ResumeAutoModeCommand', command);

            this.logger.info('AutoModeController: Auto mode resumed', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.session,
                message: 'Auto mode resumed successfully'
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to resume auto mode', {
                sessionId: req.body.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to resume auto mode',
                message: error.message
            });
        }
    }

    /**
     * Get auto mode progress
     * GET /api/auto/progress
     */
    async getAutoModeProgress(req, res) {
        try {
            const { sessionId } = req.query;
            const userId = req.user?.id;

            const query = {
                sessionId,
                userId
            };

            const result = await this.queryBus.execute('GetAutoModeProgressQuery', query);

            this.logger.info('AutoModeController: Auto mode progress retrieved', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.progress
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to get auto mode progress', {
                sessionId: req.query.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get auto mode progress',
                message: error.message
            });
        }
    }

    /**
     * Get auto mode results
     * GET /api/auto/results
     */
    async getAutoModeResults(req, res) {
        try {
            const { sessionId } = req.query;
            const userId = req.user?.id;

            const query = {
                sessionId,
                userId
            };

            const result = await this.queryBus.execute('GetAutoModeResultsQuery', query);

            this.logger.info('AutoModeController: Auto mode results retrieved', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.results
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to get auto mode results', {
                sessionId: req.query.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get auto mode results',
                message: error.message
            });
        }
    }

    /**
     * Get auto mode sessions
     * GET /api/auto/sessions
     */
    async getAutoModeSessions(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                mode,
                startDate,
                endDate
            } = req.query;

            const userId = req.user?.id;

            const query = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {
                    status,
                    mode,
                    startDate,
                    endDate
                },
                userId
            };

            const result = await this.queryBus.execute('GetAutoModeSessionsQuery', query);

            this.logger.info('AutoModeController: Auto mode sessions retrieved', {
                count: result.sessions.length,
                userId
            });

            res.json({
                success: true,
                data: {
                    sessions: result.sessions,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / result.limit)
                    }
                }
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to get auto mode sessions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get auto mode sessions',
                message: error.message
            });
        }
    }

    /**
     * Configure auto mode settings
     * POST /api/auto/configure
     */
    async configureAutoMode(req, res) {
        try {
            const {
                settings,
                preferences,
                aiConfiguration,
                executionRules
            } = req.body;

            const userId = req.user?.id;

            const command = {
                settings,
                preferences,
                aiConfiguration,
                executionRules,
                configuredBy: userId
            };

            const result = await this.commandBus.execute('ConfigureAutoModeCommand', command);

            this.logger.info('AutoModeController: Auto mode configured', {
                userId
            });

            res.json({
                success: true,
                data: result.configuration,
                message: 'Auto mode configured successfully'
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to configure auto mode', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to configure auto mode',
                message: error.message
            });
        }
    }

    /**
     * Get auto mode configuration
     * GET /api/auto/configuration
     */
    async getAutoModeConfiguration(req, res) {
        try {
            const userId = req.user?.id;

            const query = {
                userId
            };

            const result = await this.queryBus.execute('GetAutoModeConfigurationQuery', query);

            this.logger.info('AutoModeController: Auto mode configuration retrieved', {
                userId
            });

            res.json({
                success: true,
                data: result.configuration
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to get auto mode configuration', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get auto mode configuration',
                message: error.message
            });
        }
    }

    /**
     * Get auto mode statistics
     * GET /api/auto/stats
     */
    async getAutoModeStats(req, res) {
        try {
            const { timeRange, mode } = req.query;
            const userId = req.user?.id;

            const query = {
                timeRange,
                mode,
                userId
            };

            const result = await this.queryBus.execute('GetAutoModeStatsQuery', query);

            this.logger.info('AutoModeController: Auto mode statistics retrieved', {
                userId
            });

            res.json({
                success: true,
                data: result.stats
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to get auto mode statistics', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get auto mode statistics',
                message: error.message
            });
        }
    }

    /**
     * Health check endpoint
     * GET /api/auto/health
     */
    async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Auto mode service is healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Auto mode service is unhealthy',
                message: error.message
            });
        }
    }
}

module.exports = AutoModeController; 