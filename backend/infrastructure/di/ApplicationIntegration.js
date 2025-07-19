
/**
 * ApplicationIntegration - Example integration of DI system into Application.js
 * Shows how to migrate from manual dependency injection to the new DI system
 */

const { getServiceRegistry } = require('./ServiceRegistry');
const { getProjectContextService } = require('./ProjectContextService');
const ServiceLogger = require('@logging/ServiceLogger');

class ApplicationIntegration {
    constructor() {
        this.serviceRegistry = getServiceRegistry();
        this.projectContext = getProjectContextService();
        this.logger = new ServiceLogger('ApplicationIntegration');
    }

    /**
     * Example: Migrate Application.js initializeInfrastructure method
     */
    async initializeInfrastructureWithDI() {
        this.logger.info('Initializing infrastructure with DI...');

        // Register all services through the registry
        this.serviceRegistry.registerAllServices();

        // Get services through DI container
        this.browserManager = this.serviceRegistry.getService('browserManager');
        this.ideManager = this.serviceRegistry.getService('ideManager');
        this.chatRepository = this.serviceRegistry.getService('chatRepository');
        this.eventBus = this.serviceRegistry.getService('eventBus');
        this.commandBus = this.serviceRegistry.getService('commandBus');
        this.queryBus = this.serviceRegistry.getService('queryBus');
        this.userRepository = this.serviceRegistry.getService('userRepository');
        this.userSessionRepository = this.serviceRegistry.getService('userSessionRepository');
        this.ideWorkspaceDetectionService = this.serviceRegistry.getService('ideWorkspaceDetectionService');
        this.fileSystemService = this.serviceRegistry.getService('fileSystemService');
        this.monorepoStrategy = this.serviceRegistry.getService('monorepoStrategy');
        this.singleRepoStrategy = this.serviceRegistry.getService('singleRepoStrategy');

        this.logger.info('Infrastructure initialized with DI');
    }

    /**
     * Example: Migrate Application.js initializeDomainServices method
     */
    async initializeDomainServicesWithDI() {
        this.logger.info('Initializing domain services with DI...');

        // Get domain services through DI container
        this.cursorIDEService = this.serviceRegistry.getService('cursorIDEService');
        this.authService = this.serviceRegistry.getService('authService');
        this.aiService = this.serviceRegistry.getService('aiService');
        this.projectAnalyzer = this.serviceRegistry.getService('projectAnalyzer');
        this.codeQualityAnalyzer = this.serviceRegistry.getService('codeQualityAnalyzer');
        this.securityAnalyzer = this.serviceRegistry.getService('securityAnalyzer');
        this.performanceAnalyzer = this.serviceRegistry.getService('performanceAnalyzer');
        this.architectureAnalyzer = this.serviceRegistry.getService('architectureAnalyzer');
        this.techStackAnalyzer = this.serviceRegistry.getService('techStackAnalyzer');
        this.subprojectDetector = this.serviceRegistry.getService('subprojectDetector');
        this.analysisOutputService = this.serviceRegistry.getService('analysisOutputService');
        this.analysisRepository = this.serviceRegistry.getService('analysisRepository');
        this.projectMappingService = this.serviceRegistry.getService('projectMappingService');
        this.taskRepository = this.serviceRegistry.getService('taskRepository');
        this.taskExecutionRepository = this.serviceRegistry.getService('taskExecutionRepository');
        this.taskService = this.serviceRegistry.getService('taskService');
    
        this.taskValidationService = this.serviceRegistry.getService('taskValidationService');
        this.taskAnalysisService = this.serviceRegistry.getService('taskAnalysisService');
        this.codeQualityService = this.serviceRegistry.getService('codeQualityService');
        this.securityService = this.serviceRegistry.getService('securityService');
        this.performanceService = this.serviceRegistry.getService('performanceService');
        this.architectureService = this.serviceRegistry.getService('architectureService');
        this.dependencyAnalyzer = this.serviceRegistry.getService('dependencyAnalyzer');

        this.logger.info('Domain services initialized with DI');
    }

    /**
     * Example: Migrate Application.js initializeApplicationHandlers method
     */
    async initializeApplicationHandlersWithDI() {
        this.logger.info('Initializing application handlers with DI...');

        // Get handlers through DI container
        this.sendMessageHandler = this.serviceRegistry.getService('sendMessageHandler');
        this.getChatHistoryHandler = this.serviceRegistry.getService('getChatHistoryHandler');
        this.createTaskHandler = this.serviceRegistry.getService('createTaskHandler');

        // Note: Analyze handlers would need to be registered in ServiceRegistry first
        // this.analyzeArchitectureHandler = this.serviceRegistry.getService('analyzeArchitectureHandler');
        // this.analyzeCodeQualityHandler = this.serviceRegistry.getService('analyzeCodeQualityHandler');
        // this.analyzeDependenciesHandler = this.serviceRegistry.getService('analyzeDependenciesHandler');

        this.logger.info('Application handlers initialized with DI');
    }

    /**
     * Example: Set up project context
     */
    async setupProjectContext() {
        this.logger.info('Setting up project context...');

        // Auto-detect project path
        const projectPath = await this.projectContext.autoDetectProjectPath();
        
        // Set project context
        await this.projectContext.setProjectContext({
            projectPath: projectPath || process.env.PROJECT_PATH,
            projectId: process.env.PROJECT_ID,
            workspacePath: process.env.WORKSPACE_PATH
        });

        // Validate project context
        const validation = await this.projectContext.validateProjectContext();
        if (!validation.isValid) {
            this.logger.error('Project context validation failed:', validation.errors);
        } else {
            this.logger.info('Project context validated successfully');
        }

        this.logger.info('Project context:', this.projectContext.getProjectContext());
    }

    /**
     * Example: Get project information consistently
     */
    async getProjectInfo() {
        const projectPath = await this.projectContext.getProjectPath();
        const projectId = this.projectContext.getProjectId();
        const workspacePath = await this.projectContext.getWorkspacePath();

        return {
            projectPath,
            projectId,
            workspacePath,
            isValid: await this.projectContext.validateProjectContext()
        };
    }

    /**
     * Example: Use services with consistent project context
     */
    async executeTaskWithConsistentContext(taskCommand) {
        // Get project context consistently
        const projectPath = await this.projectContext.getProjectPath();
        const projectId = this.projectContext.getProjectId();

        // Use services with consistent context
        const taskService = this.serviceRegistry.getService('taskService');
        const aiService = this.serviceRegistry.getService('aiService');

        // Execute task with consistent project information
        const result = await taskService.executeTask({
            ...taskCommand,
            projectPath,
            projectId,
            metadata: {
                ...taskCommand.metadata,
                projectPath,
                projectId
            }
        });

        return result;
    }

    /**
     * Example: Migration helper - compare old vs new approach
     */
    compareApproaches() {
        this.logger.info('Comparing old vs new approach...');

        // OLD APPROACH (Inconsistent)
        const oldApproach = {
            projectPathDetection: [
                'task.projectPath || options.projectPath',
                'await this.autoDetectProject()',
                'this.workspacePathDetector.extractProjectRoot(filePath)',
                'process.cwd()',
                'path.resolve(currentDir, "..")'
            ],
            dependencyInjection: [
                'new TaskService(this.taskRepository, this.aiService, this.projectAnalyzer, this.cursorIDEService)',
                'new AnalyzeArchitectureHandler({ eventBus: this.eventBus, analysisRepository: this.analysisRepository, ... })',
                'Manual dependency passing through constructors'
            ],
            issues: [
                'Inconsistent project path detection',
                'Manual dependency injection',
                'Code duplication',
                'Hard to test',
                'Difficult to maintain'
            ]
        };

        // NEW APPROACH (Consistent)
        const newApproach = {
            projectPathDetection: [
                'await projectContext.getProjectPath()',
                'projectContext.getProjectId()',
                'projectContext.getWorkspacePath()',
                'Centralized auto-detection with fallbacks'
            ],
            dependencyInjection: [
                'registry.getService("taskService")',
                'registry.getService("analyzeArchitectureHandler")',
                'Automatic dependency resolution'
            ],
            benefits: [
                'Consistent project path detection',
                'Automatic dependency injection',
                'No code duplication',
                'Easy to test',
                'Easy to maintain'
            ]
        };

        return { oldApproach, newApproach };
    }

    /**
     * Example: Service registry status
     */
    getServiceRegistryStatus() {
        const registry = this.serviceRegistry.getRegistry();
        
        return {
            registeredServices: registry.factories,
            activeSingletons: registry.singletons,
            projectContext: registry.projectContext,
            totalServices: registry.factories.length + registry.singletons.length
        };
    }

    /**
     * Example: Cleanup with DI
     */
    async cleanup() {
        this.logger.info('Cleaning up with DI...');

        // Clear project context
        this.projectContext.clearProjectContext();

        // Clear service registry
        this.serviceRegistry.clearAllServices();

        this.logger.info('Cleanup completed');
    }
}

module.exports = ApplicationIntegration; 