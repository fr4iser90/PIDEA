/**
 * ServiceRegistry - Centralized service registration and configuration
 * Provides a clean way to register all application services with proper DI
 */
const { getServiceContainer } = require('./ServiceContainer');
const { getProjectContextService } = require('./ProjectContextService');

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
        console.log('[ServiceRegistry] Registering infrastructure services...');

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
            const FileSystemService = require('../../domain/services/FileSystemService');
            return new FileSystemService();
        }, { singleton: true });

        // Browser manager
        this.container.register('browserManager', () => {
            const BrowserManager = require('../external/BrowserManager');
            return new BrowserManager();
        }, { singleton: true });

        // IDE manager
        this.container.register('ideManager', (browserManager) => {
            const IDEManager = require('../external/IDEManager');
            return new IDEManager(browserManager);
        }, { singleton: true, dependencies: ['browserManager'] });

        this.registeredServices.add('infrastructure');
    }

    /**
     * Register domain services
     */
    registerDomainServices() {
        console.log('[ServiceRegistry] Registering domain services...');

        // Project mapping service
        this.container.register('projectMappingService', () => {
            const ProjectMappingService = require('../../domain/services/ProjectMappingService');
            return new ProjectMappingService();
        }, { singleton: true });

        // Workspace path detector
        this.container.register('workspacePathDetector', () => {
            const WorkspacePathDetector = require('../../domain/services/workspace/WorkspacePathDetector');
            return new WorkspacePathDetector();
        }, { singleton: true });

            // Initialize project context service
    this.projectContextService.initialize({
      projectMappingService: this.container.resolve('projectMappingService'),
      workspacePathDetector: this.container.resolve('workspacePathDetector')
    });

    // IDE workspace detection service
    this.container.register('ideWorkspaceDetectionService', (ideManager) => {
      const IDEWorkspaceDetectionService = require('../../domain/services/IDEWorkspaceDetectionService');
      return new IDEWorkspaceDetectionService(ideManager);
    }, { singleton: true, dependencies: ['ideManager'] });

    // Subproject detector
    this.container.register('subprojectDetector', () => {
      const SubprojectDetector = require('../../domain/services/SubprojectDetector');
      return new SubprojectDetector();
    }, { singleton: true });

    // Analysis output service
    this.container.register('analysisOutputService', () => {
      const AnalysisOutputService = require('../../domain/services/AnalysisOutputService');
      return new AnalysisOutputService();
    }, { singleton: true });

    // Task execution service
    this.container.register('taskExecutionService', (taskRepository, taskExecutionRepository, cursorIDEService, eventBus, logger) => {
      const TaskExecutionService = require('../../domain/services/TaskExecutionService');
      return new TaskExecutionService(taskRepository, taskExecutionRepository, cursorIDEService, eventBus, logger);
    }, { singleton: true, dependencies: ['taskRepository', 'taskExecutionRepository', 'cursorIDEService', 'eventBus', 'logger'] });

    // Task analysis service
    this.container.register('taskAnalysisService', (cursorIDEService, eventBus, logger, aiService, projectAnalyzer) => {
      const TaskAnalysisService = require('../../domain/services/TaskAnalysisService');
      return new TaskAnalysisService(cursorIDEService, eventBus, logger, aiService, projectAnalyzer);
    }, { singleton: true, dependencies: ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'projectAnalyzer'] });

    // Code quality service
    this.container.register('codeQualityService', (codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
      const CodeQualityService = require('../../domain/services/CodeQualityService');
      return new CodeQualityService(codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
    }, { singleton: true, dependencies: ['codeQualityAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

    // Security service
    this.container.register('securityService', (securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
      const SecurityService = require('../../domain/services/SecurityService');
      return new SecurityService(securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
    }, { singleton: true, dependencies: ['securityAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

    // Performance service
    this.container.register('performanceService', (performanceAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
      const PerformanceService = require('../../domain/services/PerformanceService');
      return new PerformanceService(performanceAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
    }, { singleton: true, dependencies: ['performanceAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

    // Architecture service
    this.container.register('architectureService', (architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
      const ArchitectureService = require('../../domain/services/ArchitectureService');
      return new ArchitectureService(architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
    }, { singleton: true, dependencies: ['architectureAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Cursor IDE service
        this.container.register('cursorIDEService', (browserManager, ideManager, eventBus) => {
            const CursorIDEService = require('../../domain/services/CursorIDEService');
            return new CursorIDEService(browserManager, ideManager, eventBus);
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });

        // Auth service
        this.container.register('authService', (userRepository, userSessionRepository) => {
            const AuthService = require('../../domain/services/AuthService');
            return new AuthService(userRepository, userSessionRepository, 'jwt-secret', 'jwt-refresh-secret');
        }, { singleton: true, dependencies: ['userRepository', 'userSessionRepository'] });

        // Task service
        this.container.register('taskService', (taskRepository, aiService, projectAnalyzer, cursorIDEService) => {
            const TaskService = require('../../domain/services/TaskService');
            return new TaskService(taskRepository, aiService, projectAnalyzer, cursorIDEService);
        }, { singleton: true, dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService'] });

        // Task validation service
        this.container.register('taskValidationService', (taskRepository, taskExecutionRepository, cursorIDEService, eventBus, fileSystemService) => {
            const TaskValidationService = require('../../domain/services/TaskValidationService');
            return new TaskValidationService(taskRepository, taskExecutionRepository, cursorIDEService, eventBus, fileSystemService);
        }, { singleton: true, dependencies: ['taskRepository', 'taskExecutionRepository', 'cursorIDEService', 'eventBus', 'fileSystemService'] });

        this.registeredServices.add('domain');
    }

    /**
     * Register external services
     */
    registerExternalServices() {
        console.log('[ServiceRegistry] Registering external services...');

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

        this.registeredServices.add('external');
    }

    /**
     * Register strategy services
     */
    registerStrategyServices() {
        console.log('[ServiceRegistry] Registering strategy services...');

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
        console.log('[ServiceRegistry] Registering repository services...');

        // Chat repository
        this.container.register('chatRepository', () => {
            const InMemoryChatRepository = require('../database/InMemoryChatRepository');
            return new InMemoryChatRepository();
        }, { singleton: true });

        // Task repository
        this.container.register('taskRepository', () => {
            const InMemoryTaskRepository = require('../database/InMemoryTaskRepository');
            return new InMemoryTaskRepository();
        }, { singleton: true });

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
            const PostgreSQLUserRepository = require('../database/PostgreSQLUserRepository');
            return new PostgreSQLUserRepository(databaseConnection);
        }, { singleton: true, dependencies: ['databaseConnection'] });

        // User session repository
        this.container.register('userSessionRepository', (databaseConnection) => {
            const PostgreSQLUserSessionRepository = require('../database/PostgreSQLUserSessionRepository');
            return new PostgreSQLUserSessionRepository(databaseConnection);
        }, { singleton: true, dependencies: ['databaseConnection'] });

        // Project analysis repository
        this.container.register('projectAnalysisRepository', (databaseConnection) => {
            const PostgreSQLProjectAnalysisRepository = require('../database/PostgreSQLProjectAnalysisRepository');
            return new PostgreSQLProjectAnalysisRepository(databaseConnection);
        }, { singleton: true, dependencies: ['databaseConnection'] });

        this.registeredServices.add('repositories');
    }

    /**
     * Register application handlers
     */
    registerApplicationHandlers() {
        console.log('[ServiceRegistry] Registering application handlers...');

        // Send message handler
        this.container.register('sendMessageHandler', (cursorIDEService, eventBus, logger) => {
            const SendMessageHandler = require('../../application/handlers/SendMessageHandler');
            return new SendMessageHandler({ messagingService: cursorIDEService, eventBus, logger });
        }, { singleton: true, dependencies: ['cursorIDEService', 'eventBus', 'logger'] });

        // Get chat history handler
        this.container.register('getChatHistoryHandler', (chatRepository, cursorIDEService) => {
            const GetChatHistoryHandler = require('../../application/handlers/GetChatHistoryHandler');
            return new GetChatHistoryHandler(chatRepository, cursorIDEService);
        }, { singleton: true, dependencies: ['chatRepository', 'cursorIDEService'] });

        // Create task handler
        this.container.register('createTaskHandler', (taskRepository, taskValidationService, eventBus, logger) => {
            const CreateTaskHandler = require('../../application/handlers/CreateTaskHandler');
            return new CreateTaskHandler({
                taskRepository,
                taskValidationService,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['taskRepository', 'taskValidationService', 'eventBus', 'logger'] });

        // VibeCoder auto refactor handler
        this.container.register('vibeCoderAutoRefactorHandler', (taskRepository, projectAnalysisRepository, eventBus, logger) => {
            const VibeCoderAutoRefactorHandler = require('../../application/handlers/vibecoder/VibeCoderAutoRefactorHandler');
            return new VibeCoderAutoRefactorHandler({ taskRepository, projectAnalysisRepository, eventBus, logger });
        }, { singleton: true, dependencies: ['taskRepository', 'projectAnalysisRepository', 'eventBus', 'logger'] });

        this.registeredServices.add('handlers');
    }

    /**
     * Register all services
     */
    registerAllServices() {
        console.log('[ServiceRegistry] Registering all services...');

        this.registerInfrastructureServices();
        this.registerRepositoryServices();
        this.registerDomainServices();
        this.registerExternalServices();
        this.registerStrategyServices();
        this.registerApplicationHandlers();

        console.log('[ServiceRegistry] All services registered successfully');
        console.log('[ServiceRegistry] Registered service categories:', Array.from(this.registeredServices));
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
        console.log('[ServiceRegistry] All services cleared');
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