/**
 * WorkflowController - REST API endpoints for workflow operations
 */
const { validationResult } = require('express-validator');
const { getStepRegistry } = require('@steps');

class WorkflowController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.application = dependencies.application;
        this.ideManager = dependencies.ideManager;
    }

    /**
     * Execute workflow
     * POST /api/workflow/execute
     */
    async executeWorkflow(req, res) {
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
            this.logger.info('WorkflowController: Received request body', {
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

            this.logger.info('WorkflowController: Extracted taskOptions', {
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
                                this.logger.info('WorkflowController: Using workspace path from File-based detection', {
                                    port: activeIDE.port,
                                    workspacePath
                                });
                            }
                        }
                    }
                } catch (error) {
                    this.logger.warn('WorkflowController: File-based detection failed, using project root', {
                        error: error.message
                    });
                }
            }

            // Final fallback: Use project root (one level up from backend)
            if (!workspacePath) {
                const path = require('path');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('WorkflowController');
                const currentDir = process.cwd();
                workspacePath = path.resolve(currentDir, '..');
                this.logger.info('WorkflowController: Using project root as final fallback', {
                    workspacePath
                });
            }

            this.logger.info('WorkflowController: Using workspace path', {
                projectId,
                workspacePath
            });

            // Check if this is a task execution request
            this.logger.info('WorkflowController: Checking task execution request', {
                taskOptionsExists: !!taskOptions,
                taskOptions,
                hasTaskId: !!taskOptions?.taskId
            });
            
            if (taskOptions && taskOptions.taskId) {
                this.logger.info('WorkflowController: Processing task execution request', {
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
                            this.logger.info('WorkflowController: Git branch created', {
                                branchName: taskOptions.branchName
                            });
                        }
                    } catch (error) {
                        this.logger.error('WorkflowController: Failed to create Git branch', {
                            error: error.message,
                            branchName: taskOptions.branchName
                        });
                    }
                }

                // Click new chat if requested
                if (taskOptions.clickNewChat) {
                    try {
                        this.logger.info('WorkflowController: Starting New Chat click process');
                        
                        const activeIDE = await this.ideManager.getActiveIDE();
                        this.logger.info('WorkflowController: Active IDE found', {
                            hasActiveIDE: !!activeIDE,
                            port: activeIDE?.port
                        });
                        
                        if (activeIDE && activeIDE.port) {
                            this.logger.info('WorkflowController: Using modular commands for IDE operations');
                            
                            // Use SwitchIDEPortCommand to switch to port
                            const SwitchIDEPortCommand = require('@categories/ide/SwitchIDEPortCommand');
                            const switchPortCommand = new SwitchIDEPortCommand({
                                userId: userId,
                                port: activeIDE.port,
                                ideType: activeIDE.type || 'cursor'
                            });
                            
                            await switchPortCommand.execute({
                                eventBus: this.eventBus,
                                browserManager: this.application?.browserManager
                            });
                            
                            this.logger.info('WorkflowController: Port switched successfully', { port: activeIDE.port });
                            
                            // Use CreateChatCommand with proper handler execution
                            const CreateChatCommand = require('@categories/ide/CreateChatCommand');
                            const CreateChatHandler = require('@application/handlers/categories/ide/CreateChatHandler');
                            
                            const createChatCommand = new CreateChatCommand({
                                userId: userId,
                                title: 'New Chat',
                                clickNewChat: true,
                                metadata: { port: activeIDE.port }
                            });
                            
                            // Create handler with all required dependencies
                            const createChatHandler = new CreateChatHandler({
                                chatSessionService: this.application?.chatSessionService || this.application?.getChatHistoryHandler,
                                ideManager: this.ideManager,
                                browserManager: this.application?.browserManager,
                                eventBus: this.eventBus,
                                logger: this.logger
                            });
                            
                            this.logger.info('WorkflowController: Creating new chat with timeout');
                            // Add timeout to prevent hanging
                            const clickPromise = createChatHandler.handle(createChatCommand);
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('New Chat creation timeout')), 10000)
                            );
                            
                            const result = await Promise.race([clickPromise, timeoutPromise]);
                            
                            if (result && result.success) {
                                this.logger.info('WorkflowController: New chat created successfully', {
                                    port: activeIDE.port,
                                    sessionId: result.session?.id
                                });
                            } else {
                                throw new Error('Failed to create new chat');
                            }
                        } else {
                            this.logger.warn('WorkflowController: No active IDE found for New Chat');
                        }
                    } catch (error) {
                        this.logger.error('WorkflowController: Failed to click new chat', {
                            error: error.message,
                            stack: error.stack
                        });
                    }
                }
                
                this.logger.info('WorkflowController: New Chat process completed, proceeding to task execution');

                // Execute task using TaskService
                try {
                    const taskService = this.application?.taskService;
                    this.logger.info('WorkflowController: TaskService available', {
                        hasTaskService: !!taskService,
                        taskId: taskOptions.taskId
                    });
                    
                    if (taskService) {
                        this.logger.info('WorkflowController: Starting task execution', {
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
                        
                        this.logger.info('WorkflowController: Task executed successfully', {
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
                    this.logger.error('WorkflowController: Failed to execute task', {
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

            // Execute using Categories-based step registry
            const stepRegistry = getStepRegistry();
            
            let stepName;
            let stepOptions = {
                projectPath: workspacePath,
                aiModel,
                autoExecute,
                userId,
                projectId,
                // Add required services for steps
                refactoringService: this.application?.refactoringService,
                aiService: this.application?.aiService,
                optimizationService: this.application?.optimizationService,
                cleanupService: this.application?.cleanupService,
                restructureService: this.application?.restructureService,
                modernizeService: this.application?.modernizeService,
                testingService: this.application?.testingService,
                deploymentService: this.application?.deploymentService,
                customTaskService: this.application?.customTaskService,
                taskRepository: this.application?.taskRepository,
                projectAnalysisRepository: this.application?.projectAnalysisRepository,
                analysisOutputService: this.application?.analysisOutputService,
                // Add analyzers for refactoring steps
                projectAnalyzer: this.application?.projectAnalyzer,
                codeQualityAnalyzer: this.application?.codeQualityAnalyzer,
                architectureAnalyzer: this.application?.architectureAnalyzer,
                // Add step registry for orchestration
                stepRegistry: stepRegistry,
                ...options
            };

            // Map modes to Categories-based steps
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

            this.logger.info('WorkflowController: Executing Categories-based step', {
                stepName,
                projectPath: workspacePath,
                mode
            });

            // Execute the Categories-based step
            const result = await stepRegistry.executeStep(stepName, stepOptions);

            // Save workflow execution to database for tracking
            if (this.application?.workflowExecutionRepository) {
                try {
                    const executionData = {
                        executionId: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        workflowId: stepName,
                        workflowName: stepName,
                        workflowVersion: '1.0.0',
                        taskId: null,
                        userId: userId || 'me',
                        status: result.success ? 'completed' : 'failed',
                        strategy: 'categories',
                        priority: 1,
                        estimatedDuration: null,
                        actualDuration: result.duration || 0,
                        startTime: new Date(Date.now() - (result.duration || 0)),
                        endTime: new Date(),
                        resultData: result.result || result,
                        errorData: result.success ? null : { error: result.error },
                        metadata: {
                            projectPath: workspacePath,
                            projectId,
                            mode,
                            executionMethod: 'categories',
                            stepOptions: Object.keys(stepOptions)
                        }
                    };

                    await this.application.workflowExecutionRepository.create(executionData);
                    
                    this.logger.info('WorkflowController: Workflow execution saved to database', {
                        executionId: executionData.executionId,
                        stepName
                    });
                } catch (dbError) {
                    this.logger.warn('WorkflowController: Failed to save workflow execution to database', {
                        error: dbError.message,
                        stepName
                    });
                }
            }

            this.logger.info('WorkflowController: Workflow execution completed with Categories', {
                stepName,
                success: true,
                executionMethod: 'categories'
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.publish('workflow:completed', {
                    stepName,
                    projectId,
                    userId,
                    result,
                    executionMethod: 'categories'
                });
            }

            res.json({
                success: true,
                message: 'Workflow executed successfully with Categories system',
                data: {
                    stepName,
                    result: result,
                    projectPath: workspacePath,
                    mode,
                    executionMethod: 'categories'
                }
            });

        } catch (error) {
            this.logger.error('WorkflowController: Failed to execute workflow', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            // Emit error event
            if (this.eventBus) {
                this.eventBus.publish('workflow:failed', {
                    projectId: req.params.projectId,
                    userId: req.user?.id,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to execute workflow',
                message: error.message
            });
        }
    }

    /**
     * Get workflow status
     * GET /api/workflow/status
     */
    async getWorkflowStatus(req, res) {
        try {
            const { sessionId } = req.query;
            const userId = req.user?.id;

            const query = {
                sessionId,
                userId
            };

            const result = await this.queryBus.execute('GetWorkflowStatusQuery', query);

            this.logger.info('WorkflowController: Workflow status retrieved', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.status
            });

        } catch (error) {
            this.logger.error('WorkflowController: Failed to get workflow status', {
                sessionId: req.query.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get workflow status',
                message: error.message
            });
        }
    }

    /**
     * Get workflow progress
     * GET /api/workflow/progress
     */
    async getWorkflowProgress(req, res) {
        try {
            const { sessionId } = req.query;
            const userId = req.user?.id;

            const query = {
                sessionId,
                userId
            };

            const result = await this.queryBus.execute('GetWorkflowProgressQuery', query);

            this.logger.info('WorkflowController: Workflow progress retrieved', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.progress
            });

        } catch (error) {
            this.logger.error('WorkflowController: Failed to get workflow progress', {
                sessionId: req.query.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get workflow progress',
                message: error.message
            });
        }
    }

    /**
     * Get workflow results
     * GET /api/workflow/results
     */
    async getWorkflowResults(req, res) {
        try {
            const { sessionId } = req.query;
            const userId = req.user?.id;

            const query = {
                sessionId,
                userId
            };

            const result = await this.queryBus.execute('GetWorkflowResultsQuery', query);

            this.logger.info('WorkflowController: Workflow results retrieved', {
                sessionId,
                userId
            });

            res.json({
                success: true,
                data: result.results
            });

        } catch (error) {
            this.logger.error('WorkflowController: Failed to get workflow results', {
                sessionId: req.query.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get workflow results',
                message: error.message
            });
        }
    }

    /**
     * Get workflow sessions
     * GET /api/workflow/sessions
     */
    async getWorkflowSessions(req, res) {
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

            const result = await this.queryBus.execute('GetWorkflowSessionsQuery', query);

            this.logger.info('WorkflowController: Workflow sessions retrieved', {
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
            this.logger.error('WorkflowController: Failed to get workflow sessions', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get workflow sessions',
                message: error.message
            });
        }
    }

    /**
     * Get workflow statistics
     * GET /api/workflow/stats
     */
    async getWorkflowStats(req, res) {
        try {
            const { timeRange, mode } = req.query;
            const userId = req.user?.id;

            const query = {
                timeRange,
                mode,
                userId
            };

            const result = await this.queryBus.execute('GetWorkflowStatsQuery', query);

            this.logger.info('WorkflowController: Workflow statistics retrieved', {
                userId
            });

            res.json({
                success: true,
                data: result.stats
            });

        } catch (error) {
            this.logger.error('WorkflowController: Failed to get workflow statistics', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get workflow statistics',
                message: error.message
            });
        }
    }

    /**
     * Stop workflow
     * POST /api/workflow/stop
     */
    async stopWorkflow(req, res) {
        try {
            const { sessionId } = req.body;
            const userId = req.user?.id;

            this.logger.info('WorkflowController: Stopping workflow', {
                sessionId,
                userId
            });

            // Emit stop event
            if (this.eventBus) {
                this.eventBus.publish('workflow:stopped', {
                    sessionId,
                    userId
                });
            }

            res.json({
                success: true,
                message: 'Workflow stopped successfully'
            });

        } catch (error) {
            this.logger.error('WorkflowController: Failed to stop workflow', {
                sessionId: req.body.sessionId,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to stop workflow',
                message: error.message
            });
        }
    }

    /**
     * Health check endpoint
     * GET /api/workflow/health
     */
    async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Workflow service is healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Workflow service is unhealthy',
                message: error.message
            });
        }
    }
}

module.exports = WorkflowController; 