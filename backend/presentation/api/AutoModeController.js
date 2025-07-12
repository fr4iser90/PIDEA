/**
 * AutoModeController - REST API endpoints for auto mode operations
 */
const { validationResult } = require('express-validator');
const { StepRegistry } = require('@workflows/steps');

class AutoModeController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.application = dependencies.application;
        this.ideManager = dependencies.ideManager;
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
                autoExecute = true,
                task,
                createGitBranch = false,
                branchName,
                clickNewChat = false
            } = req.body;

            // Debug logging
            this.logger.info('AutoModeController: Received request body', {
                projectId,
                projectPath,
                mode,
                options,
                task,
                createGitBranch,
                branchName,
                clickNewChat,
                bodyKeys: Object.keys(req.body)
            });

            // Extract task-specific options from root level or options object
            const taskOptions = (req.body.taskId || options.taskId) ? {
                taskId: req.body.taskId || options.taskId,
                createGitBranch: (req.body.options?.createGitBranch || options.createGitBranch) || false,
                branchName: req.body.options?.branchName || options.branchName,
                clickNewChat: (req.body.options?.clickNewChat || options.clickNewChat) || false,
                autoExecute: (req.body.options?.autoExecute || options.autoExecute) || true
            } : null;

            this.logger.info('AutoModeController: Extracted taskOptions', {
                taskOptions,
                hasTask: !!taskOptions?.task
            });

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

            // Use File-based Workspace Detection as fallback
            if (!workspacePath) {
                try {
                    // Try to get workspace path from active IDE
                    if (this.ideManager) {
                        const activeIDE = await this.ideManager.getActiveIDE();
                        if (activeIDE && activeIDE.port) {
                            const workspaceInfo = await this.ideManager.getWorkspaceInfo(activeIDE.port);
                            if (workspaceInfo && workspaceInfo.workspace) {
                                workspacePath = workspaceInfo.workspace;
                                this.logger.info('AutoModeController: Using workspace path from File-based detection', {
                                    port: activeIDE.port,
                                    workspacePath
                                });
                            }
                        }
                    }
                } catch (error) {
                    this.logger.warn('AutoModeController: File-based detection failed, using project root', {
                        error: error.message
                    });
                }
            }

            // Final fallback: Use project root (one level up from backend)
            if (!workspacePath) {
                const path = require('path');
                const currentDir = process.cwd();
                workspacePath = path.resolve(currentDir, '..');
                this.logger.info('AutoModeController: Using project root as final fallback', {
                    workspacePath
                });
            }

            this.logger.info('AutoModeController: Using workspace path', {
                projectId,
                workspacePath
            });

            // Check if this is a task execution request
            this.logger.info('AutoModeController: Checking task execution request', {
                taskOptionsExists: !!taskOptions,
                taskOptions,
                hasTaskId: !!taskOptions?.taskId
            });
            
            if (taskOptions && taskOptions.taskId) {
                this.logger.info('AutoModeController: Processing task execution request', {
                    taskId: taskOptions.taskId,
                    createGitBranch: taskOptions.createGitBranch,
                    branchName: taskOptions.branchName,
                    clickNewChat: taskOptions.clickNewChat
                });

                // Create Git branch if requested
                if (taskOptions.createGitBranch && taskOptions.branchName) {
                    try {
                        const gitService = this.application?.gitService;
                        if (gitService) {
                            await gitService.createBranch(workspacePath, taskOptions.branchName);
                            this.logger.info('AutoModeController: Git branch created', {
                                branchName: taskOptions.branchName
                            });
                        }
                    } catch (error) {
                        this.logger.error('AutoModeController: Failed to create Git branch', {
                            error: error.message,
                            branchName: taskOptions.branchName
                        });
                    }
                }

                // Click new chat if requested
                if (taskOptions.clickNewChat) {
                    try {
                        const activeIDE = await this.ideManager.getActiveIDE();
                        if (activeIDE && activeIDE.port) {
                            // Use browserManager instead of ideManager for clickNewChat
                            const browserManager = this.application?.browserManager;
                            if (browserManager) {
                                await browserManager.switchToPort(activeIDE.port);
                                const success = await browserManager.clickNewChat();
                                if (success) {
                                    this.logger.info('AutoModeController: New chat clicked', {
                                        port: activeIDE.port
                                    });
                                } else {
                                    throw new Error('Failed to click New Chat button');
                                }
                            } else {
                                throw new Error('Browser manager not available');
                            }
                        }
                    } catch (error) {
                        this.logger.error('AutoModeController: Failed to click new chat', {
                            error: error.message
                        });
                    }
                }

                // Execute task using TaskService
                try {
                    const taskService = this.application?.taskService;
                    this.logger.info('AutoModeController: TaskService available', {
                        hasTaskService: !!taskService,
                        taskId: taskOptions.taskId
                    });
                    
                    if (taskService) {
                        this.logger.info('AutoModeController: Starting task execution', {
                            taskId: taskOptions.taskId,
                            userId,
                            projectPath: workspacePath,
                            projectId
                        });
                        
                        // Execute task using TaskService with existing task ID
                        const taskResult = await taskService.executeTask(taskOptions.taskId, userId, {
                            projectPath: workspacePath,
                            projectId
                        });
                        
                        this.logger.info('AutoModeController: Task executed successfully', {
                            taskId: taskOptions.taskId,
                            result: taskResult
                        });

                        res.json({
                            success: true,
                            message: 'Task executed successfully',
                            data: {
                                taskId: taskOptions.taskId,
                                result: taskResult,
                                gitBranch: taskOptions.createGitBranch ? taskOptions.branchName : null,
                                newChat: taskOptions.clickNewChat
                            }
                        });
                        return;
                    } else {
                        throw new Error('TaskService not available');
                    }
                } catch (error) {
                    this.logger.error('AutoModeController: Failed to execute task', {
                        error: error.message,
                        taskId: taskOptions.taskId,
                        stack: error.stack
                    });
                    
                    res.status(500).json({
                        success: false,
                        error: 'Failed to execute task',
                        message: error.message
                    });
                    return;
                }
            }

            // Execute using Unified Workflow Steps instead of legacy VibeCoder
            const stepRegistry = new StepRegistry();
            
            let stepName;
            let stepOptions = {
                projectPath: workspacePath,
                aiModel,
                autoExecute,
                userId,
                projectId,
                ...options
            };

            // Map modes to unified workflow steps
            if (mode === 'analysis') {
                stepName = 'AnalysisStep';
                stepOptions.includeCodeQuality = true;
                stepOptions.includeArchitecture = true;
                stepOptions.includeTechStack = true;
                stepOptions.includeDependencies = true;
                stepOptions.includeRepoStructure = true;
            } else if (mode === 'refactor') {
                stepName = 'RefactoringStep';
                stepOptions.includeCodeQuality = true;
                stepOptions.includeArchitecture = true;
            } else if (mode === 'test') {
                stepName = 'TestingStep';
                stepOptions.includeTestAnalysis = true;
                stepOptions.includeTestGeneration = true;
                stepOptions.includeTestFixing = true;
            } else {
                // Default to analysis
                stepName = 'AnalysisStep';
                stepOptions.includeCodeQuality = true;
                stepOptions.includeArchitecture = true;
                stepOptions.includeTechStack = true;
                stepOptions.includeDependencies = true;
                stepOptions.includeRepoStructure = true;
            }

            this.logger.info('AutoModeController: Executing unified workflow step', {
                stepName,
                projectPath: workspacePath,
                mode
            });

            // Execute the unified workflow step
            const result = await stepRegistry.executeStep(stepName, stepOptions);

            this.logger.info('AutoModeController: Auto mode execution completed', {
                stepName,
                success: true
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.publish('autoMode:completed', {
                    stepName,
                    projectId,
                    userId,
                    result
                });
            }

            res.json({
                success: true,
                message: 'Auto mode execution completed successfully',
                data: {
                    stepName,
                    result: result
                }
            });

        } catch (error) {
            this.logger.error('AutoModeController: Failed to execute auto mode', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            // Emit error event
            if (this.eventBus) {
                this.eventBus.publish('autoMode:failed', {
                    projectId: req.params.projectId,
                    userId: req.user?.id,
                    error: error.message
                });
            }

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
     * Stop auto mode
     * POST /api/auto/stop
     */
    async stopAutoMode(req, res) {
        try {
            const { sessionId } = req.body;
            const userId = req.user?.id;

            this.logger.info('AutoModeController: Stopping auto mode', {
                sessionId,
                userId
            });

            // Emit stop event
            if (this.eventBus) {
                this.eventBus.publish('autoMode:stopped', {
                    sessionId,
                    userId
                });
            }

            res.json({
                success: true,
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