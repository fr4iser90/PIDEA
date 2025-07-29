/**
 * WorkflowController - REST API endpoints for workflow operations
 */
const { validationResult } = require('express-validator');
const { getStepRegistry } = require('@steps');
const Logger = require('@logging/Logger');

class WorkflowController {
    constructor(dependencies = {}) {
        this.commandBus = dependencies.commandBus;
        this.queryBus = dependencies.queryBus;
        this.logger = dependencies.logger || new Logger('WorkflowController');
        this.eventBus = dependencies.eventBus;
        this.application = dependencies.application;
        this.analysisRepository = dependencies.analysisRepository; // ← HIER das Repository speichern!
        this.ideManager = dependencies.ideManager;
        this.taskService = dependencies.taskService;
        this.analysisApplicationService = dependencies.analysisApplicationService;
        this.queueMonitoringService = dependencies.queueMonitoringService;
        this.workflowLoaderService = dependencies.workflowLoaderService;
        this.stepProgressService = dependencies.stepProgressService;
        this.queueHistoryService = dependencies.queueHistoryService;
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
                                this.logger.info('🔍 Using workspace path from File-based detection', {
                                    port: activeIDE.port,
                                    workspacePath
                                });
                            }
                        }
                    }
                } catch (error) {
                    this.logger.warn('🔍 File-based detection failed, using project root', {
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
            
            // Handle JSON workflow-based task execution (NEW)
            if (req.body.type === 'task' && req.body.taskType) {
                this.logger.info('WorkflowController: Processing JSON workflow task execution', {
                    taskType: req.body.taskType,
                    projectId,
                    taskData: req.body.taskData
                });

                try {
                    // Load WorkflowLoaderService
                    const WorkflowLoaderService = require('@domain/services/workflow/WorkflowLoaderService');
                    const workflowLoader = new WorkflowLoaderService();
                    await workflowLoader.loadWorkflows();

                    // Get workflow for task type
                    const workflow = workflowLoader.getWorkflowByTaskType(req.body.taskType);
                    this.logger.info('WorkflowController: Loaded workflow', {
                        taskType: req.body.taskType,
                        workflowName: workflow.name,
                        stepsCount: workflow.steps.length
                    });

                    // Execute workflow steps
                    const executionResult = await this.executeWorkflowSteps(
                        workflow,
                        req.body.taskData,
                        projectId,
                        userId,
                        workspacePath,
                        options
                    );

                    this.logger.info('WorkflowController: JSON workflow execution completed', {
                        taskType: req.body.taskType,
                        success: executionResult.success
                    });

                    return res.json({
                        success: true,
                        data: executionResult,
                        projectId,
                        workflowType: 'task',
                        taskType: req.body.taskType,
                        workflowName: workflow.name
                    });

                } catch (error) {
                    this.logger.error('WorkflowController: JSON workflow execution failed', {
                        taskType: req.body.taskType,
                        error: error.message
                    });

                    return res.status(500).json({
                        success: false,
                        error: 'JSON workflow execution failed',
                        message: error.message
                    });
                }
            }
            
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

                // Execute task using TaskService with AutoFinish and additional steps
                try {
                    const stepRegistry = getStepRegistry();
                    
                    this.logger.info('WorkflowController: TaskService available', {
                        hasTaskService: !!this.taskService,
                        taskId: taskOptions.taskId
                    });
                    
                    if (this.taskService) {
                        this.logger.info('WorkflowController: Starting task execution with additional steps', {
                            taskId: taskOptions.taskId,
                            userId,
                            projectPath: workspacePath,
                            projectId
                        });
                        
                        // 1. AutoFinish workflow if enabled
                        if (taskOptions.enableAutoFinish) {
                            this.logger.info('WorkflowController: Starting AutoFinish workflow');
                            try {
                                const autoFinishResult = await stepRegistry.executeStep('AutoFinishStep', {
                                    projectId,
                                    workspacePath,
                                    userId,
                                    includeConfirmation: true,      // Only ConfirmationStep enabled
                                    includeQualityAssessment: false, // Others disabled
                                    includeCompletionDetection: false,
                                    includeFallback: false,
                                    includeTodoParsing: false,
                                    includeTaskSequencing: false
                                });
                                
                                this.logger.info('WorkflowController: AutoFinish completed', {
                                    success: autoFinishResult.success,
                                    message: autoFinishResult.message
                                });
                            } catch (error) {
                                this.logger.warn('WorkflowController: AutoFinish failed, continuing with task', {
                                    error: error.message
                                });
                            }
                        }
                        
                        // 2. Dev server management if enabled
                        if (taskOptions.manageDevServer) {
                            this.logger.info('WorkflowController: Managing dev server');
                            try {
                                const devServerResult = await stepRegistry.executeStep('DevServerRestartStep', {
                                    projectId,
                                    workspacePath,
                                    userId
                                });
                                
                                this.logger.info('WorkflowController: Dev server management completed', {
                                    success: devServerResult.success,
                                    status: devServerResult.data?.status
                                });
                            } catch (error) {
                                this.logger.warn('WorkflowController: Dev server management failed', {
                                    error: error.message
                                });
                            }
                        }
                        
                        // 3. Run tests if enabled
                        if (taskOptions.runTests) {
                            this.logger.info('WorkflowController: Running project tests');
                            try {
                                const testResult = await stepRegistry.executeStep('ProjectTestStep', {
                                    projectId,
                                    workspacePath,
                                    userId
                                });
                                
                                this.logger.info('WorkflowController: Tests completed', {
                                    success: testResult.success,
                                    status: testResult.data?.status
                                });
                            } catch (error) {
                                this.logger.warn('WorkflowController: Tests failed', {
                                    error: error.message
                                });
                            }
                        }
                        
                        // 4. Health check if enabled
                        if (taskOptions.healthCheck) {
                            this.logger.info('WorkflowController: Performing health check');
                            try {
                                const healthResult = await stepRegistry.executeStep('ProjectHealthCheckStep', {
                                    projectId,
                                    workspacePath,
                                    userId
                                });
                                
                                this.logger.info('WorkflowController: Health check completed', {
                                    success: healthResult.success,
                                    status: healthResult.data?.overallStatus
                                });
                            } catch (error) {
                                this.logger.warn('WorkflowController: Health check failed', {
                                    error: error.message
                                });
                            }
                        }
                        
                        // 5. Execute the actual task
                        const taskResult = await this.taskService.executeTask(taskOptions.taskId, userId, {
                            projectPath: workspacePath,
                            projectId
                        });
                        
                        this.logger.info('WorkflowController: Task executed successfully', {
                            taskId: taskOptions.taskId,
                            result: taskResult
                        });

                        res.json({
                            success: true,
                            message: 'Task executed successfully with additional steps',
                            data: {
                                taskId: taskOptions.taskId,
                                result: taskResult,
                                gitBranch: taskOptions.createGitBranch ? taskOptions.branchName : null,
                                newChat: taskOptions.clickNewChat,
                                autoFinish: taskOptions.enableAutoFinish,
                                devServerManaged: taskOptions.manageDevServer,
                                testsRun: taskOptions.runTests,
                                healthChecked: taskOptions.healthCheck
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
            const stepRegistry = this.application?.stepRegistry || getStepRegistry();
            
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
            if (mode === 'project-analysis') {
                stepName = 'ProjectAnalysisStep';
                stepOptions.includeRepoStructure = true;
                stepOptions.includeDependencies = true;
            } else if (mode === 'architecture-analysis') {
                // Use AnalysisApplicationService instead of direct step execution
                if (this.analysisApplicationService) {
                    const result = await this.analysisApplicationService.executeArchitectureAnalysis(projectId, stepOptions);
                    return res.json({
                        success: true,
                        data: result,
                        message: 'Architecture analysis completed successfully'
                    });
                } else {
                    stepName = 'ArchitectureAnalysisStep';
                    stepOptions.analysisType = 'architecture';
                    stepOptions.includePatterns = true;
                    stepOptions.includeStructure = true;
                    stepOptions.includeRecommendations = true;
                }
            } else if (mode === 'code-quality-analysis') {
                // Use AnalysisApplicationService instead of direct step execution
                if (this.analysisApplicationService) {
                    const result = await this.analysisApplicationService.executeCodeQualityAnalysis(projectId, stepOptions);
                    return res.json({
                        success: true,
                        data: result,
                        message: 'Code quality analysis completed successfully'
                    });
                } else {
                    stepName = 'CodeQualityAnalysisStep';
                    stepOptions.analysisType = 'code-quality';
                    stepOptions.includeMetrics = true;
                    stepOptions.includeIssues = true;
                    stepOptions.includeSuggestions = true;
                }
            } else if (mode === 'tech-stack-analysis') {
                stepName = 'TechStackAnalysisStep';
                stepOptions.analysisType = 'tech-stack';
                stepOptions.includeFrameworks = true;
                stepOptions.includeLibraries = true;
                stepOptions.includeTools = true;
            } else if (mode === 'manifest-analysis') {
                // Use AnalysisApplicationService instead of direct step execution
                if (this.analysisApplicationService) {
                    const result = await this.analysisApplicationService.executeManifestAnalysis(projectId, stepOptions);
                    return res.json({
                        success: true,
                        data: result,
                        message: 'Manifest analysis completed successfully'
                    });
                } else {
                    stepName = 'ManifestAnalysisStep';
                    stepOptions.analysisType = 'manifest';
                    stepOptions.includePackageJson = true;
                    stepOptions.includeConfigFiles = true;
                    stepOptions.includeDockerFiles = true;
                    stepOptions.includeCIFiles = true;
                }
            } else if (mode === 'security-analysis') {
                // Use AnalysisApplicationService instead of direct step execution
                if (this.analysisApplicationService) {
                    const result = await this.analysisApplicationService.executeSecurityAnalysis(projectId, stepOptions);
                    return res.json({
                        success: true,
                        data: result,
                        message: 'Security analysis completed successfully'
                    });
                } else {
                    stepName = 'SecurityAnalysisStep';
                    stepOptions.analysisType = 'security';
                    stepOptions.includeVulnerabilities = true;
                    stepOptions.includeBestPractices = true;
                    stepOptions.includeDependencies = true;
                }
            } else if (mode === 'performance-analysis') {
                // Use AnalysisApplicationService instead of direct step execution
                if (this.analysisApplicationService) {
                    const result = await this.analysisApplicationService.executePerformanceAnalysis(projectId, stepOptions);
                    return res.json({
                        success: true,
                        data: result,
                        message: 'Performance analysis completed successfully'
                    });
                } else {
                    stepName = 'PerformanceAnalysisStep';
                    stepOptions.analysisType = 'performance';
                    stepOptions.includeMetrics = true;
                    stepOptions.includeOptimizations = true;
                    stepOptions.includeBottlenecks = true;
                }
            } else if (mode === 'dependency-analysis' || mode === 'dependencies-analysis') {
                // Use AnalysisApplicationService instead of direct step execution
                if (this.analysisApplicationService) {
                    const result = await this.analysisApplicationService.executeDependencyAnalysis(projectId, stepOptions);
                    return res.json({
                        success: true,
                        data: result,
                        message: 'Dependency analysis completed successfully'
                    });
                } else {
                    stepName = 'DependencyAnalysisStep';
                    stepOptions.analysisType = 'dependencies';
                    stepOptions.includeOutdated = true;
                    stepOptions.includeVulnerabilities = true;
                    stepOptions.includeRecommendations = true;
                }
            } else if (mode === 'recommendations' || mode === 'recommendations-analysis') {
                // Automatisch alle Einzelanalysen ausführen und Ergebnisse sammeln
                const analysisSteps = [
                    { key: 'codeQuality', name: 'CodeQualityAnalysisStep' },
                    { key: 'security', name: 'SecurityAnalysisStep' },
                    { key: 'architecture', name: 'ArchitectureAnalysisStep' },
                    { key: 'performance', name: 'PerformanceAnalysisStep' },
                    { key: 'techStack', name: 'TechStackAnalysisStep' },
                    { key: 'manifest', name: 'ManifestAnalysisStep' },
                    { key: 'dependencies', name: 'DependencyAnalysisStep' }
                ];
                const analysis_results = {};
                for (const step of analysisSteps) {
                    const result = await stepRegistry.executeStep(step.name, {
                        projectPath: workspacePath,
                        projectId,
                        userId
                    });
                    if (!result.success) {
                        return res.status(500).json({
                            success: false,
                            error: `Failed to execute ${step.name}: ${result.error}`
                        });
                    }
                    analysis_results[step.key] = result.result;
                }
                stepName = 'RecommendationsStep';
                stepOptions.includePriority = true;
                stepOptions.includeEffort = true;
                stepOptions.includeImpact = true;
                stepOptions.maxRecommendations = 20;
                stepOptions.analysis_results = analysis_results;
            } else if (mode === 'comprehensive-analysis') {
                // Load comprehensive analysis workflow from JSON
                try {
                    // Get workflowLoaderService from application's service registry
                    let workflowLoaderService = this.workflowLoaderService;
                    
                    // Debug logging
                    this.logger.info('WorkflowController: Debugging workflowLoaderService', {
                        hasWorkflowLoaderService: !!workflowLoaderService,
                        hasApplication: !!this.application,
                        hasServiceRegistry: !!(this.application && this.application.serviceRegistry),
                        workflowLoaderServiceType: typeof workflowLoaderService,
                        workflowLoaderServiceKeys: workflowLoaderService ? Object.keys(workflowLoaderService) : null,
                        hasGetWorkflowMethod: workflowLoaderService ? typeof workflowLoaderService.getWorkflow : null,
                        userId
                    });
                    if (!workflowLoaderService && this.application && this.application.serviceRegistry) {
                        try {
                            workflowLoaderService = this.application.serviceRegistry.getService('workflowLoaderService');
                            this.logger.info('WorkflowController: Retrieved workflowLoaderService from service registry', {
                                hasWorkflowLoaderService: !!workflowLoaderService,
                                userId
                            });
                        } catch (error) {
                            this.logger.error('WorkflowController: Failed to get workflowLoaderService from service registry', {
                                error: error.message,
                                userId
                            });
                        }
                    }
                    
                    if (!workflowLoaderService) {
                        throw new Error('WorkflowLoaderService not available');
                    }
                    
                    // Load the comprehensive analysis workflow from analysis-workflows.json
                    const workflow = workflowLoaderService.getWorkflow('comprehensive-analysis-workflow');
                    if (!workflow) {
                        throw new Error('Comprehensive analysis workflow not found');
                    }
                    
                    this.logger.info('WorkflowController: Successfully loaded comprehensive analysis workflow', {
                        workflowSteps: workflow.steps?.length || 0,
                        userId
                    });
                    
                    // Define taskData for comprehensive analysis
                    const taskData = {
                        type: 'comprehensive-analysis',
                        projectId,
                        userId,
                        workspacePath,
                        options: {
                            ...options,
                            analysisType: 'comprehensive'
                        }
                    };
                    
                    // Execute the workflow with queue integration
                    const workflowResult = await this.executeWorkflowSteps(workflow, taskData, projectId, userId, workspacePath, options);
                    
                    return res.json({
                        success: workflowResult.success,
                        data: workflowResult,
                        message: workflowResult.success ? 'Comprehensive analysis completed successfully' : 'Comprehensive analysis failed',
                        workflowId: workflowResult.workflowId
                    });
                    
                } catch (error) {
                    this.logger.error('WorkflowController: Failed to execute comprehensive analysis workflow', {
                        error: error.message,
                        userId
                    });
                    
                    return res.status(500).json({
                        success: false,
                        error: `Failed to execute comprehensive analysis: ${error.message}`
                    });
                }
            } else if (mode === 'security-recommendations' || mode === 'security-recommendations-analysis') {
                stepName = 'SecurityRecommendationsStep';
                stepOptions.includePriority = true;
                stepOptions.includeEffort = true;
                stepOptions.includeImpact = true;
                stepOptions.maxRecommendations = 10;
            } else if (mode === 'code-quality-recommendations' || mode === 'code-quality-recommendations-analysis') {
                stepName = 'CodeQualityRecommendationsStep';
                stepOptions.includePriority = true;
                stepOptions.includeEffort = true;
                stepOptions.includeImpact = true;
                stepOptions.maxRecommendations = 10;
            } else if (mode === 'architecture-recommendations' || mode === 'architecture-recommendations-analysis') {
                stepName = 'ArchitectureRecommendationsStep';
                stepOptions.includePriority = true;
                stepOptions.includeEffort = true;
                stepOptions.includeImpact = true;
                stepOptions.maxRecommendations = 10;
            } else if (mode === 'auto-finish') {
                stepName = 'AutoFinishStep';
                stepOptions.maxConfirmationAttempts = 3;
                stepOptions.confirmationTimeout = 10000;
                stepOptions.fallbackDetectionEnabled = true;
                stepOptions.autoContinueThreshold = 0.8;
            } else if (mode === 'todo-parsing') {
                stepName = 'TodoParsingStep';
                stepOptions.enableDependencyDetection = true;
                stepOptions.enablePriorityDetection = true;
                stepOptions.enableTypeDetection = true;
                stepOptions.maxTasks = 50;
            } else if (mode === 'confirmation') {
                stepName = 'ConfirmationStep';
                stepOptions.maxConfirmationAttempts = 3;
                stepOptions.confirmationTimeout = 10000;
                stepOptions.autoContinueThreshold = 0.8;
                stepOptions.enableMultiLanguage = true;
            } else if (mode === 'completion-detection') {
                stepName = 'CompletionDetectionStep';
                stepOptions.confidenceThreshold = 0.6;
                stepOptions.enableMultiStrategy = true;
                stepOptions.enableContextAnalysis = true;
                stepOptions.enableQualityIntegration = true;
            } else if (mode === 'refactor') {
                stepName = 'RefactoringStep';
                stepOptions.includeCodeQuality = true;
                stepOptions.includeArchitecture = true;
            } else if (mode === 'test') {
                stepName = 'TestingStep';
                stepOptions.includeTestAnalysis = true;
                stepOptions.includeTestGeneration = true;
                stepOptions.includeTestFixing = true;
            } else if (mode === 'task-creation' || mode === 'task-creation-workflow') {
                // Execute Task Creation Workflow using WorkflowLoaderService
                try {
                    const workflowLoaderService = this.application?.workflowLoaderService;
                    if (!workflowLoaderService) {
                        throw new Error('WorkflowLoaderService not available');
                    }

                    // Get workflow based on task type or use default
                    const taskType = req.body.task?.type || 'default';
                    const workflow = workflowLoaderService.getWorkflowByTaskType(taskType);
                    
                    // Execute the workflow
                    const result = await this.executeWorkflowSteps(workflow, req.body.task, projectId, userId, workspacePath, req.body.options);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Task creation workflow executed successfully',
                        data: {
                            workflowId: workflow.name,
                            taskType,
                            result
                        }
                    });
                    
                } catch (error) {
                    this.logger.error('Task creation workflow failed:', error);
                    return res.status(500).json({
                        success: false,
                        error: `Task creation workflow failed: ${error.message}`
                    });
                }
            } else {

            }

            this.logger.info('WorkflowController: Executing Categories-based step', {
                stepName,
                projectPath: workspacePath,
                mode
            });

            // Validate that stepName is defined
            if (!stepName) {
                throw new Error(`No step mapping found for mode: ${mode}`);
            }

            // Execute the Categories-based step
            const result = await stepRegistry.executeStep(stepName, stepOptions);

            // Save analysis result to database if this is an analysis step
            if (result.success && stepOptions.analysisType) {
                try {
                    // Use the centralized analysis repository (handles both PostgreSQL and SQLite)
                    const analysisRepo = this.application?.analysisRepository;
                    if (!analysisRepo) {
                        this.logger.warn('WorkflowController: Analysis repository not available, skipping database save');
                    } else {
                        const Analysis = require('@domain/entities/Analysis');
                        
                        // Create new analysis entry with proper metadata
                        const analysis = Analysis.create(projectId, stepOptions.analysisType, {
                            result: result.result,
                            metadata: {
                                stepName,
                                projectPath: workspacePath,
                                mode,
                                executionMethod: 'categories',
                                timestamp: new Date().toISOString(),
                                executionTime: result.duration || null
                            }
                        });
                        
                        // Set as completed
                        analysis.status = 'completed';
                        analysis.progress = 100;
                        analysis.completedAt = new Date();
                        analysis.executionTime = result.duration || null;
                        
                        // Let the repository handle the database-specific logic
                        await analysisRepo.save(analysis);
                        
                        this.logger.info('WorkflowController: Analysis result saved to database', {
                            analysisId: analysis.id,
                            analysisType: stepOptions.analysisType,
                            stepName
                        });
                    }
                } catch (dbError) {
                    this.logger.warn('WorkflowController: Failed to save analysis result to database', {
                        error: dbError.message,
                        stepName,
                        analysisType: stepOptions.analysisType
                    });
                }
            }

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
     * Execute workflow steps from JSON configuration
     */
    async executeWorkflowSteps(workflow, taskData, projectId, userId, workspacePath, options) {
        const results = {
            success: true,
            steps: [],
            errors: [],
            duration: 0
        };

        const startTime = Date.now();
        const workflowId = `workflow_${projectId}_${Date.now()}`;

        try {
            this.logger.info('WorkflowController: Starting workflow execution', {
                workflowName: workflow.name,
                stepsCount: workflow.steps.length,
                workflowId
            });

            // Add workflow to queue if queue monitoring service is available
            let queueItemId = null;
            if (this.queueMonitoringService) {
                // Use central WorkflowTypes for type detection
                const WorkflowTypes = require('@domain/constants/WorkflowTypes');
                const workflowType = WorkflowTypes.getTypeFromName(workflow.name);
                
                const queueItem = {
                    id: workflowId,
                    type: workflowType,
                    title: `${workflow.name} Workflow`,
                    description: `Executing ${workflow.steps.length} steps for project ${projectId}`,
                    status: 'running',
                    progress: 0,
                    totalSteps: workflow.steps.length,
                    currentStep: 0,
                    steps: workflow.steps.map((step, index) => ({
                        id: `${workflowId}_step_${index}`,
                        name: step.name,
                        type: step.type,
                        status: 'pending',
                        progress: 0
                    })),
                    createdAt: new Date(),
                    startedAt: new Date(),
                    projectId,
                    userId
                };

                const addedItem = await this.queueMonitoringService.addToQueue(projectId, userId, queueItem);
                queueItemId = addedItem.id; // Speichere die Queue-Item-ID!
                this.logger.info('WorkflowController: Added workflow to queue', { workflowId, queueItemId });

                // Initialize step progress for the workflow
                if (this.stepProgressService) {
                    await this.stepProgressService.initializeTaskStepProgress(projectId, queueItemId, workflow.steps);
                    this.logger.info('WorkflowController: Initialized step progress', { workflowId, queueItemId });
                }
            }

            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                const stepStartTime = Date.now();
                const stepId = `${workflowId}_step_${i}`;
                
                try {
                    this.logger.info('WorkflowController: Executing step', {
                        stepName: step.name,
                        stepType: step.type,
                        stepIndex: i + 1,
                        totalSteps: workflow.steps.length
                    });

                    // Update queue with current step
                    if (this.queueMonitoringService && queueItemId) {
                        await this.queueMonitoringService.updateStepProgress(projectId, queueItemId, stepId, {
                            status: 'running',
                            progress: 0
                        });
                    }

                    const stepResult = await this.executeStep(step, taskData, projectId, userId, workspacePath, options);
                    
                    const stepDuration = Date.now() - stepStartTime;
                    const stepProgress = {
                        name: step.name,
                        type: step.type,
                        success: stepResult.success,
                        duration: stepDuration,
                        data: stepResult.data,
                        error: stepResult.error
                    };

                    results.steps.push(stepProgress);

                    // Update queue with step completion
                    if (this.queueMonitoringService && queueItemId) {
                        await this.queueMonitoringService.updateStepProgress(projectId, queueItemId, stepId, {
                            status: stepResult.success ? 'completed' : 'failed',
                            progress: 100,
                            result: stepProgress
                        });

                        // Update overall workflow progress
                        const overallProgress = Math.round(((i + 1) / workflow.steps.length) * 100);
                        await this.queueMonitoringService.updateQueueItem(projectId, queueItemId, {
                            progress: overallProgress,
                            currentStep: i + 1
                        });
                    }

                    if (!stepResult.success) {
                        results.errors.push(`Step ${step.name} failed: ${stepResult.error}`);
                        if (step.strict !== false) {
                            results.success = false;
                            break;
                        }
                    }

                } catch (error) {
                    this.logger.error('WorkflowController: Step execution failed', {
                        stepName: step.name,
                        error: error.message
                    });

                    const stepDuration = Date.now() - stepStartTime;
                    const stepProgress = {
                        name: step.name,
                        type: step.type,
                        success: false,
                        duration: stepDuration,
                        error: error.message
                    };

                    results.steps.push(stepProgress);

                    // Update queue with step failure
                    if (this.queueMonitoringService && queueItemId) {
                        await this.queueMonitoringService.updateStepProgress(projectId, queueItemId, stepId, {
                            status: 'failed',
                            progress: 100,
                            result: stepProgress
                        });
                    }

                    results.errors.push(`Step ${step.name} failed: ${error.message}`);
                    
                    if (step.strict !== false) {
                        results.success = false;
                        break;
                    }
                }
            }

            // Update queue with workflow completion
            if (this.queueMonitoringService && queueItemId) {
                await this.queueMonitoringService.updateQueueItem(projectId, queueItemId, {
                    status: results.success ? 'completed' : 'failed',
                    progress: 100,
                    completedAt: new Date()
                });
            }

            // Add to queue history when workflow completes
            if (this.queueHistoryService && queueItemId) {
                try {
                    const WorkflowTypes = require('@domain/constants/WorkflowTypes');
                    const workflowType = WorkflowTypes.getTypeFromName(workflow.name);
                    
                    await this.queueHistoryService.persistWorkflowHistory({
                        id: queueItemId,
                        type: workflowType,
                        status: results.success ? 'completed' : 'failed',
                        createdAt: new Date(startTime),
                        completedAt: new Date(),
                        executionTimeMs: results.duration,
                        userId: userId,
                        metadata: {
                            workflowName: workflow.name,
                            totalSteps: workflow.steps.length,
                            completedSteps: results.steps.filter(s => s.success).length,
                            failedSteps: results.steps.filter(s => !s.success).length,
                            errors: results.errors
                        },
                        stepsData: results.steps
                    });
                    
                    this.logger.info('WorkflowController: Added workflow to history', { 
                        workflowId, 
                        queueItemId, 
                        workflowType 
                    });
                } catch (error) {
                    this.logger.error('WorkflowController: Failed to add workflow to history', {
                        workflowId,
                        queueItemId,
                        error: error.message
                    });
                }
            }

        } catch (error) {
            this.logger.error('WorkflowController: Workflow execution failed', {
                workflowName: workflow.name,
                error: error.message
            });
            
            results.success = false;
            results.errors.push(`Workflow execution failed: ${error.message}`);

            // Update queue with workflow failure
            if (this.queueMonitoringService && queueItemId) {
                await this.queueMonitoringService.updateQueueItem(projectId, queueItemId, {
                    status: 'failed',
                    error: error.message,
                    completedAt: new Date()
                });
            }
        }

        results.duration = Date.now() - startTime;

        this.logger.info('WorkflowController: Workflow execution completed', {
            workflowName: workflow.name,
            success: results.success,
            duration: results.duration,
            stepsCompleted: results.steps.length,
            errorsCount: results.errors.length,
            workflowId
        });

        return results;
    }

    /**
     * Execute individual workflow step using existing StepRegistry
     */
    async executeStep(step, taskData, projectId, userId, workspacePath, options) {
        try {
            // Get StepRegistry
            const { getStepRegistry } = require('@steps');
            const stepRegistry = getStepRegistry();
            
            // Get step name from step configuration
            const stepName = step.step || step.type;
            
            this.logger.info('WorkflowController: Executing step via StepRegistry', {
                stepName,
                stepType: step.type
            });
            
            // Format prompt if needed
            let stepOptions = {
                projectPath: workspacePath,
                projectId,
                userId,
                taskData,
                ...step.options,
                ...options
            };

            // Format prompt for IDE steps
            if (step.type === 'ide_send_message') {
                // If useTaskPrompt is true, use the actual task prompt from TaskService
                if (step.options?.useTaskPrompt && taskData) {
                    // Use the existing TaskService from the application context
                    if (this.taskService) {
                        // Create a task object with the data
                        const task = {
                            id: taskData.id,
                            title: taskData.title,
                            description: taskData.description,
                            type: { value: taskData.type },
                            metadata: taskData.metadata || {}
                        };
                        
                        const taskPrompt = await this.taskService.buildTaskExecutionPrompt(task);
                        stepOptions.message = taskPrompt;
                    } else {
                        this.logger.error('TaskService not available for prompt building');
                        stepOptions.message = `Execute the following task:\n\n${taskData.title}\n\n${taskData.description || ''}`;
                    }
                } else if (step.options?.message) {
                    // Fallback to template-based prompt
                    const WorkflowLoaderService = require('@domain/services/workflow/WorkflowLoaderService');
                    const workflowLoader = new WorkflowLoaderService();
                    await workflowLoader.loadWorkflows();
                    
                    const formattedPrompt = workflowLoader.formatPromptForStep(step, taskData);
                    if (formattedPrompt) {
                        stepOptions.message = formattedPrompt;
                    }
                }
            }
            
            // Execute step using existing StepRegistry
            const result = await stepRegistry.executeStep(stepName, stepOptions);
            
            this.logger.info('WorkflowController: Step executed successfully', {
                stepName,
                success: result.success
            });
            
            // Save analysis result to database if this is an analysis step and has results
            if (result.success && step.type === 'analysis' && result.data) {
                try {
                    // Use the centralized analysis repository (handles both PostgreSQL and SQLite)
                    const analysisRepo = this.analysisRepository;
                    if (!analysisRepo) {
                        this.logger.warn('WorkflowController: Analysis repository not available, skipping database save');
                    } else {
                        const Analysis = require('@domain/entities/Analysis');
                        
                        // Create new analysis entry with proper metadata
                        const analysis = Analysis.create(projectId, stepName, {
                            result: result.data,
                            metadata: {
                                stepName,
                                projectPath: workspacePath,
                                workflowExecution: true,
                                executionMethod: 'workflow',
                                timestamp: new Date().toISOString(),
                                executionTime: result.duration || null,
                                stepType: step.type,
                                stepOptions: Object.keys(stepOptions)
                            }
                        });
                        
                        // Set as completed
                        analysis.status = 'completed';
                        analysis.progress = 100;
                        analysis.completedAt = new Date();
                        analysis.executionTime = result.duration || null;
                        
                        // Let the repository handle the database-specific logic
                        await analysisRepo.save(analysis);
                        
                        this.logger.info('WorkflowController: Analysis result saved to database', {
                            analysisId: analysis.id,
                            analysisType: stepName,
                            stepName
                        });
                    }
                } catch (dbError) {
                    this.logger.warn('WorkflowController: Failed to save analysis result to database', {
                        error: dbError.message,
                        stepName,
                        analysisType: stepName
                    });
                }
            }
            
            return {
                success: result.success,
                data: result.data || result,
                error: result.error
            };
            
        } catch (error) {
            this.logger.error('WorkflowController: Step execution failed', {
                stepName: step.step || step.type,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
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