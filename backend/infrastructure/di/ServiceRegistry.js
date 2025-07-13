/**
 * ServiceRegistry - Centralized service registration and configuration
 * Provides a clean way to register all application services with proper DI
 */
const { getServiceContainer } = require('./ServiceContainer');
const { getProjectContextService } = require('./ProjectContextService');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ServiceRegistry {
    constructor() {
        this.container = getServiceContainer();
        this.projectContextService = getProjectContextService();
        this.registeredServices = new Set();
    }

    /**
     * Register core infrastructure services
     */
    registerInfrastructureServices() {
        logger.log('[ServiceRegistry] Registering infrastructure services...');

        // Database services
        this.container.register('databaseConnection', () => {
            const DatabaseConnection = require('../database/DatabaseConnection');
            return new DatabaseConnection();
        }, { singleton: true });

        // Event bus
        this.container.register('eventBus', () => {
            const EventBus = require('../messaging/EventBus');
            return new EventBus();
        }, { singleton: true });

        // Command and query buses
        this.container.register('commandBus', (eventBus) => {
            const CommandBus = require('../messaging/CommandBus');
            const bus = new CommandBus();
            bus.setLogger(console);
            return bus;
        }, { singleton: true, dependencies: ['eventBus'] });

        this.container.register('queryBus', (eventBus) => {
            const QueryBus = require('../messaging/QueryBus');
            const bus = new QueryBus();
            bus.setLogger(console);
            return bus;
        }, { singleton: true, dependencies: ['eventBus'] });

        // Logger service
        this.container.register('logger', () => {
            return console; // Default logger, can be overridden
        }, { singleton: true });

        // File system service
        this.container.register('fileSystemService', () => {
            const FileSystemService = require('../external/FileSystemService');
            return new FileSystemService();
        }, { singleton: true });

        // Browser manager
        this.container.register('browserManager', () => {
            const BrowserManager = require('../external/BrowserManager');
            return new BrowserManager();
        }, { singleton: true });

        // IDE manager
        this.container.register('ideManager', (browserManager, projectRepository, eventBus) => {
            const IDEManager = require('../external/ide/IDEManager');
            const manager = new IDEManager(browserManager, eventBus);
            // Inject project repository for automatic database operations
            manager.projectRepository = projectRepository;
            return manager;
        }, { singleton: true, dependencies: ['browserManager', 'projectRepository', 'eventBus'] });

        this.registeredServices.add('infrastructure');
    }

    /**
     * Register domain services
     */
    registerDomainServices() {
        logger.log('[ServiceRegistry] Registering domain services...');

        // IDEMirrorService - FIXED: Use DI instead of new IDEManager()
        this.container.register('ideMirrorService', (ideManager, browserManager) => {
            const IDEMirrorService = require('@domain/services/IDEMirrorService');
            return new IDEMirrorService({ ideManager, browserManager });
        }, { singleton: true, dependencies: ['ideManager', 'browserManager'] });

        // TerminalLogCaptureService - FIXED: Use DI instead of new IDEManager()
        this.container.register('terminalLogCaptureService', (ideManager, browserManager, ideMirrorService) => {
            const TerminalLogCaptureService = require('@domain/services/TerminalLogCaptureService');
            return new TerminalLogCaptureService({ ideManager, browserManager, ideMirrorService });
        }, { singleton: true, dependencies: ['ideManager', 'browserManager', 'ideMirrorService'] });

        // TerminalLogReader - FIXED: Use DI instead of new instance
        this.container.register('terminalLogReader', () => {
            const TerminalLogReader = require('@domain/services/TerminalLogReader');
            return new TerminalLogReader();
        }, { singleton: true });

        // IDEController - FIXED: Add missing dependencies
        this.container.register('ideController', (ideManager, eventBus, cursorIDEService, taskRepository, terminalLogCaptureService, terminalLogReader) => {
            const IDEController = require('@presentation/api/IDEController');
            return new IDEController(ideManager, eventBus, cursorIDEService, taskRepository, terminalLogCaptureService, terminalLogReader);
        }, { singleton: true, dependencies: ['ideManager', 'eventBus', 'cursorIDEService', 'taskRepository', 'terminalLogCaptureService', 'terminalLogReader'] });

        // Project mapping service (korrekt)
        this.container.register('projectMappingService', (monorepoStrategy) => {
            const ProjectMappingService = require('@domain/services/ProjectMappingService');
            return new ProjectMappingService({ monorepoStrategy });
        }, { singleton: true, dependencies: ['monorepoStrategy'] });

        // Logger service - KORREKT wie IDEHealthMonitor
        this.container.register('logger', () => {
            const Logger = require('@logging/Logger');
            return new Logger('IDEController');
        }, { singleton: true });

        // Workspace path detector (simplified)
        this.container.register('workspacePathDetector', () => {
            return { detect: () => process.cwd() };
        }, { singleton: true });

    // IDE workspace detection service
    this.container.register('ideWorkspaceDetectionService', (ideManager, projectRepository) => {
      const IDEWorkspaceDetectionService = require('@domain/services/IDEWorkspaceDetectionService');
      const service = new IDEWorkspaceDetectionService(ideManager);
      // Inject project repository for database operations
      service.projectRepository = projectRepository;
      return service;
    }, { singleton: true, dependencies: ['ideManager', 'projectRepository'] });

            // Subproject detector (simplified)
        this.container.register('subprojectDetector', () => {
            return { detect: () => [] };
        }, { singleton: true });

        // Analysis output service (simplified)
        this.container.register('analysisOutputService', () => {
            return { generateOutput: () => ({}) };
        }, { singleton: true });

            // Task execution service
        this.container.register('taskExecutionService', (taskRepository, taskExecutionRepository, cursorIDEService, eventBus, logger) => {
            const TaskExecutionService = require('@domain/services/TaskExecutionService');
            return new TaskExecutionService(taskRepository, taskExecutionRepository, cursorIDEService, eventBus, logger);
        }, { singleton: true, dependencies: ['taskRepository', 'taskExecutionRepository', 'cursorIDEService', 'eventBus', 'logger'] });

        // Task analysis service
        this.container.register('taskAnalysisService', (cursorIDEService, eventBus, logger, aiService, projectAnalyzer) => {
            const TaskAnalysisService = require('@domain/services/TaskAnalysisService');
            return new TaskAnalysisService(cursorIDEService, eventBus, logger, aiService, projectAnalyzer);
        }, { singleton: true, dependencies: ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'projectAnalyzer'] });

        // Task validation service
        this.container.register('taskValidationService', (taskRepository, taskExecutionRepository, cursorIDEService, eventBus, fileSystemService) => {
            const TaskValidationService = require('@domain/services/TaskValidationService');
            return new TaskValidationService(taskRepository, taskExecutionRepository, cursorIDEService, eventBus, fileSystemService);
        }, { singleton: true, dependencies: ['taskRepository', 'taskExecutionRepository', 'cursorIDEService', 'eventBus', 'fileSystemService'] });

        // Code quality service
        this.container.register('codeQualityService', (codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
            const CodeQualityService = require('@domain/services/CodeQualityService');
            return new CodeQualityService(codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        }, { singleton: true, dependencies: ['codeQualityAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Security service
        this.container.register('securityService', (securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
            const SecurityService = require('@domain/services/SecurityService');
            return new SecurityService(securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        }, { singleton: true, dependencies: ['securityAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Performance service
        this.container.register('performanceService', (performanceAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
            const PerformanceService = require('@domain/services/PerformanceService');
            return new PerformanceService(performanceAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        }, { singleton: true, dependencies: ['performanceAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Architecture service
        this.container.register('architectureService', (architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
            const ArchitectureService = require('@domain/services/ArchitectureService');
            return new ArchitectureService(architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        }, { singleton: true, dependencies: ['architectureAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

            // Auto-Finish System
        this.container.register('autoFinishSystem', (cursorIDEService, browserManager, ideManager) => {
            const AutoFinishSystem = require('@domain/services/auto-finish/AutoFinishSystem');
            return new AutoFinishSystem(cursorIDEService, browserManager, ideManager);
        }, { singleton: true, dependencies: ['cursorIDEService', 'browserManager', 'ideManager'] });

        // Workflow Orchestration Service
        this.container.register('workflowOrchestrationService', (cursorIDEService, autoFinishSystem, taskRepository, eventBus, logger) => {
            const WorkflowOrchestrationService = require('@domain/services/WorkflowOrchestrationService');
            return new WorkflowOrchestrationService({
                cursorIDEService,
                autoFinishSystem,
                taskRepository,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['cursorIDEService', 'autoFinishSystem', 'taskRepository', 'eventBus', 'logger'] });

        // Workflow Execution Service
        this.container.register('workflowExecutionService', (chatSessionService, ideAutomationService, browserManager, ideManager, eventBus, logger) => {
            const WorkflowExecutionService = require('@domain/services/WorkflowExecutionService');
            return new WorkflowExecutionService({
                chatSessionService,
                ideAutomationService,
                browserManager,
                ideManager,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['chatSessionService', 'ideAutomationService', 'browserManager', 'ideManager', 'eventBus', 'logger'] });



        // IDE Factory
        this.container.register('ideFactory', () => {
            const { getIDEFactory } = require('@domain/services/ide/IDEFactory');
            return getIDEFactory();
        }, { singleton: true });

        // IDE Service (unified interface)
        this.container.register('ideService', (browserManager, ideManager, eventBus, ideFactory) => {
            const { getIDEFactory } = require('@domain/services/ide/IDEFactory');
            const factory = getIDEFactory();
            
            // Create default IDE instance (Cursor)
            const result = factory.createIDE('cursor', { browserManager, ideManager, eventBus });
            if (result.success) {
                return result.ide;
            }
            
            throw new Error('Failed to create IDE service: ' + result.error);
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus', 'ideFactory'] });

        // Legacy Cursor IDE service (for backward compatibility)
        this.container.register('cursorIDEService', (browserManager, ideManager, eventBus) => {
            const CursorIDEService = require('@domain/services/CursorIDEService');
            return new CursorIDEService(browserManager, ideManager, eventBus);
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });

        // VSCode IDE service
        this.container.register('vscodeIDEService', (browserManager, ideManager, eventBus) => {
            const VSCodeIDEService = require('@domain/services/VSCodeService');
            return new VSCodeIDEService(browserManager, ideManager, eventBus);
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });

        // Windsurf IDE service
        this.container.register('windsurfIDEService', (browserManager, ideManager, eventBus) => {
            const WindsurfIDEService = require('@domain/services/WindsurfIDEService');
            return new WindsurfIDEService(browserManager, ideManager, eventBus);
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });

        // Auth service
        this.container.register('authService', (userRepository, userSessionRepository) => {
            const AuthService = require('@domain/services/AuthService');
            return new AuthService(userRepository, userSessionRepository, 'simple-jwt-secret', 'simple-refresh-secret');
        }, { singleton: true, dependencies: ['userRepository', 'userSessionRepository'] });

        // Task service
        this.container.register('taskService', (taskRepository, aiService, projectAnalyzer, cursorIDEService, autoFinishSystem) => {
            const TaskService = require('@domain/services/TaskService');
            return new TaskService(taskRepository, aiService, projectAnalyzer, cursorIDEService, autoFinishSystem);
        }, { singleton: true, dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService', 'autoFinishSystem'] });

        // Docs Import Service
        this.container.register('docsImportService', (browserManager, taskService, taskRepository) => {
            const DocsImportService = require('@domain/services/DocsImportService');
            return new DocsImportService(browserManager, taskService, taskRepository);
        }, { singleton: true, dependencies: ['browserManager', 'taskService', 'taskRepository'] });

        this.registeredServices.add('domain');
    }

    /**
     * Register external services
     */
    registerExternalServices() {
        logger.log('[ServiceRegistry] Registering external services...');

        // AI service
        this.container.register('aiService', () => {
            const AIService = require('../external/AIService');
            return new AIService();
        }, { singleton: true });

        // Project analyzer
        this.container.register('projectAnalyzer', () => {
            const ProjectAnalyzer = require('../external/ProjectAnalyzer');
            return new ProjectAnalyzer();
        }, { singleton: true });

        // Code quality analyzer
        this.container.register('codeQualityAnalyzer', () => {
            const CodeQualityAnalyzer = require('../external/CodeQualityAnalyzer');
            return new CodeQualityAnalyzer();
        }, { singleton: true });

        // Security analyzer
        this.container.register('securityAnalyzer', () => {
            const SecurityAnalyzer = require('../external/SecurityAnalyzer');
            return new SecurityAnalyzer();
        }, { singleton: true });

        // Performance analyzer
        this.container.register('performanceAnalyzer', () => {
            const PerformanceAnalyzer = require('../external/PerformanceAnalyzer');
            return new PerformanceAnalyzer();
        }, { singleton: true });

        // Architecture analyzer
        this.container.register('architectureAnalyzer', () => {
            const ArchitectureAnalyzer = require('../external/ArchitectureAnalyzer');
            return new ArchitectureAnalyzer();
        }, { singleton: true });

        // Tech stack analyzer
        this.container.register('techStackAnalyzer', () => {
            const TechStackAnalyzer = require('../external/TechStackAnalyzer');
            return new TechStackAnalyzer();
        }, { singleton: true });

        // Dependency analyzer
        this.container.register('dependencyAnalyzer', (monorepoStrategy, singleRepoStrategy) => {
            const DependencyAnalyzer = require('../external/DependencyAnalyzer');
            return new DependencyAnalyzer({ monorepoStrategy, singleRepoStrategy });
        }, { singleton: true, dependencies: ['monorepoStrategy', 'singleRepoStrategy'] });

        // Git service
        this.container.register('gitService', (logger, eventBus) => {
            const GitService = require('../external/GitService');
            return new GitService({ logger, eventBus });
        }, { singleton: true, dependencies: ['logger', 'eventBus'] });

        // Docker service
        this.container.register('dockerService', (logger, eventBus) => {
            const DockerService = require('../external/DockerService');
            return new DockerService({ logger, eventBus });
        }, { singleton: true, dependencies: ['logger', 'eventBus'] });

        // Test Analyzer Tools
        this.container.register('testAnalyzer', () => {
            const TestAnalyzer = require('../external/TestAnalyzer');
            return new TestAnalyzer();
        }, { singleton: true });

        this.container.register('testFixer', () => {
            const TestFixer = require('../external/TestFixer');
            return new TestFixer();
        }, { singleton: true });

        this.container.register('coverageAnalyzer', () => {
            const CoverageAnalyzer = require('../external/CoverageAnalyzer');
            return new CoverageAnalyzer();
        }, { singleton: true });

        this.container.register('testReportParser', () => {
            const TestReportParser = require('@domain/services/TestReportParser');
            return new TestReportParser();
        }, { singleton: true });

        this.container.register('testFixTaskGenerator', (taskRepository) => {
            const TestFixTaskGenerator = require('@domain/services/TestFixTaskGenerator');
            return new TestFixTaskGenerator(taskRepository);
        }, { singleton: true, dependencies: ['taskRepository'] });

        this.container.register('testCorrectionService', (testAnalyzer, testFixer, coverageAnalyzer, eventBus, logger) => {
            const TestCorrectionService = require('@domain/services/TestCorrectionService');
            return new TestCorrectionService(testAnalyzer, testFixer, coverageAnalyzer, eventBus, logger);
        }, { singleton: true, dependencies: ['testAnalyzer', 'testFixer', 'coverageAnalyzer', 'eventBus', 'logger'] });

        this.container.register('generateTestsHandler', (aiService, projectAnalyzer, eventBus, logger) => {
            const GenerateTestsHandler = require('@application/handlers/categories/generate/GenerateTestsHandler');
            return new GenerateTestsHandler(aiService, projectAnalyzer, eventBus, logger);
        }, { singleton: true, dependencies: ['aiService', 'projectAnalyzer', 'eventBus', 'logger'] });

        this.registeredServices.add('external');
    }

    /**
     * Register strategy services
     */
    registerStrategyServices() {
        logger.log('[ServiceRegistry] Registering strategy services...');

        // Monorepo strategy
        this.container.register('monorepoStrategy', (logger, eventBus, fileSystemService) => {
            const MonorepoStrategy = require('../strategies/MonorepoStrategy');
            return new MonorepoStrategy({ logger, eventBus, fileSystemService });
        }, { singleton: true, dependencies: ['logger', 'eventBus', 'fileSystemService'] });

        // Single repo strategy
        this.container.register('singleRepoStrategy', (logger, eventBus, fileSystemService) => {
            const SingleRepoStrategy = require('../strategies/SingleRepoStrategy');
            return new SingleRepoStrategy({ logger, eventBus, fileSystemService });
        }, { singleton: true, dependencies: ['logger', 'eventBus', 'fileSystemService'] });

        // Recommendations service
        this.container.register('recommendationsService', (logger) => {
            const RecommendationsService = require('../strategies/single-repo/services/recommendationsService');
            return new RecommendationsService(logger);
        }, { singleton: true, dependencies: ['logger'] });

        // Optimization service
        this.container.register('optimizationService', (logger) => {
            const OptimizationService = require('../strategies/single-repo/services/optimizationService');
            return new OptimizationService(logger);
        }, { singleton: true, dependencies: ['logger'] });

        this.registeredServices.add('strategies');
    }

    /**
     * Register repository services
     */
    registerRepositoryServices() {
        logger.log('[ServiceRegistry] Registering repository services...');

        // Chat repository
        this.container.register('chatRepository', () => {
            const InMemoryChatRepository = require('../database/InMemoryChatRepository');
            return new InMemoryChatRepository();
        }, { singleton: true });

        // Task repository
        this.container.register('taskRepository', (databaseConnection) => {
            return databaseConnection.getRepository('Task');
        }, { singleton: true, dependencies: ['databaseConnection'] });

        // Task execution repository
        this.container.register('taskExecutionRepository', () => {
            const InMemoryTaskExecutionRepository = require('../database/InMemoryTaskExecutionRepository');
            return new InMemoryTaskExecutionRepository();
        }, { singleton: true });

        // Analysis repository
        this.container.register('analysisRepository', () => {
            const InMemoryAnalysisRepository = require('../database/InMemoryAnalysisRepository');
            return new InMemoryAnalysisRepository();
        }, { singleton: true });

        // User repository
        this.container.register('userRepository', (databaseConnection) => {
            return databaseConnection.getRepository('User');
        }, { singleton: true, dependencies: ['databaseConnection'] });

        // User session repository
        this.container.register('userSessionRepository', (databaseConnection) => {
            return databaseConnection.getRepository('UserSession');
        }, { singleton: true, dependencies: ['databaseConnection'] });

        // Project analysis repository
        this.container.register('projectAnalysisRepository', (databaseConnection) => {
            return databaseConnection.getRepository('ProjectAnalysis');
        }, { singleton: true, dependencies: ['databaseConnection'] });

        // Project repository
        this.container.register('projectRepository', (databaseConnection) => {
            return databaseConnection.getRepository('Project');
        }, { singleton: true, dependencies: ['databaseConnection'] });

        this.registeredServices.add('repositories');
    }

    /**
     * Register application handlers
     */
    registerApplicationHandlers() {
        logger.log('[ServiceRegistry] Registering application handlers...');

        // Send message handler
        this.container.register('sendMessageHandler', (cursorIDEService, vscodeIDEService, windsurfIDEService, ideManager, eventBus, logger) => {
            const SendMessageHandler = require('@application/handlers/categories/management/SendMessageHandler');
            return new SendMessageHandler({ 
                cursorIDEService, 
                vscodeIDEService, 
                windsurfIDEService, 
                ideManager, 
                eventBus, 
                logger 
            });
        }, { singleton: true, dependencies: ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService', 'ideManager', 'eventBus', 'logger'] });

        // Get chat history handler
        this.container.register('getChatHistoryHandler', (chatRepository, ideManager) => {
            const GetChatHistoryHandler = require('@application/handlers/categories/management/GetChatHistoryHandler');
            return new GetChatHistoryHandler(chatRepository, ideManager, this);
        }, { singleton: true, dependencies: ['chatRepository', 'ideManager'] });

        // Create task handler
        this.container.register('createTaskHandler', (taskRepository, taskValidationService, eventBus, logger) => {
            const CreateTaskHandler = require('@application/handlers/categories/management/CreateTaskHandler');
            return new CreateTaskHandler({
                taskRepository,
                taskValidationService,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['taskRepository', 'taskValidationService', 'eventBus', 'logger'] });

        // VibeCoder auto refactor handler
        this.container.register('vibeCoderAutoRefactorHandler', (taskRepository, projectAnalysisRepository, eventBus, logger) => {
            const VibeCoderAutoRefactorHandler = require('@application/handlers/vibecoder/VibeCoderAutoRefactorHandler');
            return new VibeCoderAutoRefactorHandler({ taskRepository, projectAnalysisRepository, eventBus, logger });
        }, { singleton: true, dependencies: ['taskRepository', 'projectAnalysisRepository', 'eventBus', 'logger'] });

        this.registeredServices.add('handlers');
    }

    /**
     * Register all services
     */
    registerAllServices() {
        logger.log('[ServiceRegistry] Registering all services...');

        // ✅ CORRECT ORDER: Infrastructure first, then dependencies
        this.registerInfrastructureServices();
        this.registerRepositoryServices();
        this.registerExternalServices();  // ✅ MOVED BEFORE domain services
        this.registerStrategyServices();
        this.registerDomainServices();    // ✅ Now all dependencies are available
        this.registerApplicationHandlers();

        // Initialize project context service after all services are registered
        try {
            this.projectContextService.initialize({
                projectMappingService: this.container.resolve('projectMappingService'),
                workspacePathDetector: this.container.resolve('workspacePathDetector')
            });
        } catch (error) {
            logger.warn('[ServiceRegistry] Project context initialization failed:', error.message);
        }

        logger.log('[ServiceRegistry] All services registered successfully');
        logger.log('[ServiceRegistry] Registered service categories:', Array.from(this.registeredServices));
    }

    /**
     * Get service by name
     * @param {string} name - Service name
     * @returns {any} Service instance
     */
    getService(name) {
        return this.container.resolve(name);
    }

    /**
     * Get project context service
     * @returns {ProjectContextService} Project context service
     */
    getProjectContextService() {
        return this.projectContextService;
    }

    /**
     * Get service container
     * @returns {ServiceContainer} Service container
     */
    getContainer() {
        return this.container;
    }

    /**
     * Get service registry
     * @returns {Object} Service registry
     */
    getRegistry() {
        return this.container.getRegistry();
    }

    /**
     * Clear all services
     */
    clearAllServices() {
        this.container.clear();
        this.registeredServices.clear();
        logger.log('[ServiceRegistry] All services cleared');
    }
}

// Global singleton instance
let globalServiceRegistry = null;

/**
 * Get global service registry
 * @returns {ServiceRegistry} Global registry instance
 */
function getServiceRegistry() {
    if (!globalServiceRegistry) {
        globalServiceRegistry = new ServiceRegistry();
    }
    return globalServiceRegistry;
}

/**
 * Set global service registry
 * @param {ServiceRegistry} registry - Service registry
 */
function setServiceRegistry(registry) {
    globalServiceRegistry = registry;
}

module.exports = {
    ServiceRegistry,
    getServiceRegistry,
    setServiceRegistry
}; 