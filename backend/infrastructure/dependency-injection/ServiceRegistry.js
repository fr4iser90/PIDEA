/**
 * ServiceRegistry - Centralized service registration and configuration
 * Provides automatic dependency resolution and ordering for all application services
 */
const { getServiceContainer } = require('./ServiceContainer');
const { getProjectContextService } = require('./ProjectContextService');
const ServiceOrderResolver = require('./ServiceOrderResolver');
const ServiceLogger = require('@logging/ServiceLogger');

class ServiceRegistry {
    constructor() {
        this.container = getServiceContainer();
        this.projectContextService = getProjectContextService();
        this.serviceOrderResolver = new ServiceOrderResolver();
        this.registeredServices = new Set();
        this.logger = new ServiceLogger('ServiceRegistry');
        
        // Set preferred category order for automatic resolution
        this.serviceOrderResolver.setCategoryOrder([
            'infrastructure',
            'repositories', 
            'external',
            'strategies',
            'domain',
            'handlers'
        ]);
    }

    /**
     * Register core infrastructure services
     */
    registerInfrastructureServices() {
        this.logger.info('Registering infrastructure services...');

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
            return bus;
        }, { singleton: true, dependencies: ['eventBus'] });

        this.container.register('queryBus', (eventBus) => {
            const QueryBus = require('../messaging/QueryBus');
            const bus = new QueryBus();
            return bus;
        }, { singleton: true, dependencies: ['eventBus'] });

        // Logger service
        this.container.register('logger', () => {
            const ServiceLogger = require('@logging/ServiceLogger');
            return new ServiceLogger('ServiceRegistry');
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

        // Terminal service
        this.container.register('terminalService', () => {
            const { TerminalService } = require('@domain/services/TerminalService');
            return new TerminalService();
        }, { singleton: true });

        // IDE manager
        this.container.register('ideManager', (browserManager, projectRepository, eventBus, gitService) => {
            const IDEManager = require('../external/ide/IDEManager');
            const manager = new IDEManager(browserManager, eventBus, gitService);
            // Inject project repository for automatic database operations
            manager.projectRepository = projectRepository;
            return manager;
        }, { singleton: true, dependencies: ['browserManager', 'projectRepository', 'eventBus', 'gitService'] });

        // IDE Port Manager
        this.container.register('idePortManager', (ideManager, eventBus) => {
            const IDEPortManager = require('@domain/services/IDEPortManager');
            return new IDEPortManager(ideManager, eventBus);
        }, { singleton: true, dependencies: ['ideManager', 'eventBus'] });

        // Step Registry Service (moved from external services)
        this.container.register('stepRegistry', () => {
            const { getStepRegistry } = require('@domain/steps');
            return getStepRegistry();
        }, { singleton: true });

        this.registeredServices.add('infrastructure');
    }

    /**
     * Register domain services
     */
    registerDomainServices() {
        this.logger.info('Registering domain services...');

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

        // Analysis output service
        this.container.register('analysisOutputService', () => {
            const AnalysisOutputService = require('@domain/services/AnalysisOutputService');
            return new AnalysisOutputService();
        }, { singleton: true });

    

        // Task analysis service
        this.container.register('taskAnalysisService', (cursorIDEService, eventBus, logger, aiService, projectAnalyzer, analysisOrchestrator) => {
            const TaskAnalysisService = require('@domain/services/TaskAnalysisService');
            return new TaskAnalysisService(cursorIDEService, eventBus, logger, aiService, projectAnalyzer, analysisOrchestrator);
        }, { singleton: true, dependencies: ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'projectAnalyzer', 'analysisOrchestrator'] });

        // Task validation service
        this.container.register('taskValidationService', (taskRepository, cursorIDEService, eventBus, fileSystemService) => {
            const TaskValidationService = require('@domain/services/TaskValidationService');
            return new TaskValidationService(taskRepository, cursorIDEService, eventBus, fileSystemService);
        }, { singleton: true, dependencies: ['taskRepository', 'cursorIDEService', 'eventBus', 'fileSystemService'] });

        // Code quality service - TODO: Phase 2 - Update to use AnalysisOrchestrator
        // this.container.register('codeQualityService', (codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
        //     const CodeQualityService = require('@domain/services/CodeQualityService');
        //     return new CodeQualityService(codeQualityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        // }, { singleton: true, dependencies: ['codeQualityAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Security service - TODO: Phase 2 - Update to use AnalysisOrchestrator
        // this.container.register('securityService', (securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
        //     const SecurityService = require('@domain/services/SecurityService');
        //     return new SecurityService(securityAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        // }, { singleton: true, dependencies: ['securityAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Performance service - TODO: Phase 2 - Update to use AnalysisOrchestrator
        // this.container.register('performanceService', (performanceAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
        //     const PerformanceService = require('@domain/services/PerformanceService');
        //     return new PerformanceService(performanceAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        // }, { singleton: true, dependencies: ['performanceAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Architecture service - TODO: Phase 2 - Update to use AnalysisOrchestrator
        // this.container.register('architectureService', (architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository) => {
        //     const ArchitectureService = require('@domain/services/ArchitectureService');
        //     return new ArchitectureService(architectureAnalyzer, eventBus, logger, analysisOutputService, analysisRepository);
        // }, { singleton: true, dependencies: ['architectureAnalyzer', 'eventBus', 'logger', 'analysisOutputService', 'analysisRepository'] });

        // Analysis Controller - TODO: Phase 2 - Update to use AnalysisOrchestrator
        // this.container.register('analysisController', (codeQualityService, securityService, performanceService, architectureService, logger, analysisOutputService, analysisRepository, projectRepository) => {
        //     const AnalysisController = require('@presentation/api/AnalysisController');
        //     return new AnalysisController(codeQualityService, securityService, performanceService, architectureService, logger, analysisOutputService, analysisRepository, projectRepository);
        // }, { singleton: true, dependencies: ['codeQualityService', 'securityService', 'performanceService', 'architectureService', 'logger', 'analysisOutputService', 'analysisRepository', 'projectRepository'] });

            // AutoFinishSystem removed - using Steps instead
        // this.container.register('autoFinishSystem', ...);



        // Advanced Analysis Service
        this.container.register('advancedAnalysisService', (layerValidationService, logicValidationService, taskAnalysisService, eventBus, logger) => {
            const AdvancedAnalysisService = require('@domain/services/AdvancedAnalysisService');
            return new AdvancedAnalysisService({
                layerValidationService,
                logicValidationService,
                taskAnalysisService,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['layerValidationService', 'logicValidationService', 'taskAnalysisService', 'eventBus', 'logger'] });

        // Layer Validation Service
        this.container.register('layerValidationService', (logger) => {
            const LayerValidationService = require('@domain/services/LayerValidationService');
            return new LayerValidationService(logger);
        }, { singleton: true, dependencies: ['logger'] });

        // Logic Validation Service
        this.container.register('logicValidationService', (logger) => {
            const LogicValidationService = require('@domain/services/LogicValidationService');
            return new LogicValidationService(logger);
        }, { singleton: true, dependencies: ['logger'] });

        // Chat Session Service
        this.container.register('chatSessionService', (browserManager, ideManager, eventBus, logger) => {
            const ChatSessionService = require('@domain/services/ChatSessionService');
            return new ChatSessionService({
                browserManager,
                ideManager,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] });

        // IDE Automation Service
        this.container.register('ideAutomationService', (browserManager, ideManager, eventBus, logger) => {
            const IDEAutomationService = require('@domain/services/IDEAutomationService');
            return new IDEAutomationService({
                browserManager,
                ideManager,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] });

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
        this.container.register('taskService', (taskRepository, aiService, projectAnalyzer, cursorIDEService) => {
            const TaskService = require('@domain/services/TaskService');
            return new TaskService(taskRepository, aiService, projectAnalyzer, cursorIDEService, null); // autoFinishSystem removed
        }, { singleton: true, dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService'] });

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
        this.logger.info('Registering external services...');

        // AI service
        this.container.register('aiService', () => {
            const AIService = require('../external/AIService');
            return new AIService();
        }, { singleton: true });

        // Analysis Orchestrator (Phase 2: Step delegation)
        this.container.register('analysisOrchestrator', (stepRegistry, eventBus, logger, analysisRepository) => {
            const AnalysisOrchestrator = require('../external/AnalysisOrchestrator');
            return new AnalysisOrchestrator({
                stepRegistry,
                eventBus,
                logger,
                analysisRepository
            });
        }, { singleton: true, dependencies: ['stepRegistry', 'eventBus', 'logger', 'analysisRepository'] });

        // Test Orchestrator (Step delegation)
        this.container.register('testOrchestrator', (stepRegistry, eventBus, logger) => {
            const TestOrchestrator = require('../external/TestOrchestrator');
            return new TestOrchestrator({
                stepRegistry,
                eventBus,
                logger,
                testRepository: null // Not needed for step delegation
            });
        }, { singleton: true, dependencies: ['stepRegistry', 'eventBus', 'logger'] });

        // Workflow Orchestration Service - ORCHESTRATES STEPS! (moved to external services)
        this.container.register('workflowOrchestrationService', (taskRepository, eventBus, logger, stepRegistry) => {
            const WorkflowOrchestrationService = require('@domain/services/WorkflowOrchestrationService');
            return new WorkflowOrchestrationService({
                cursorIDEService: null, // Will be injected later
                taskRepository,
                eventBus,
                logger,
                stepRegistry
            });
        }, { singleton: true, dependencies: ['taskRepository', 'eventBus', 'logger', 'stepRegistry'] });

        // Project analyzer - Stub for Phase 1 compatibility
        this.container.register('projectAnalyzer', () => {
            // TODO: Phase 2 - Remove this stub and use AnalysisOrchestrator
            return {
                analyzeProject: async () => ({ id: 'stub', type: 'project', result: { stub: true } }),
                analyzeCodeQuality: async () => ({ id: 'stub', type: 'code-quality', result: { stub: true } }),
                detectPatterns: async () => ({ patterns: [] }),
                identifyDependencies: async () => ({ dependencies: [] })
            };
        }, { singleton: true });

        // Code quality analyzer - REMOVED (using CodeQualityAnalysisStep instead)
        // this.container.register('codeQualityAnalyzer', () => {
        //     const CodeQualityAnalyzer = require('../external/CodeQualityAnalyzer');
        //     return new CodeQualityAnalyzer();
        // }, { singleton: true });

        // Security analyzer - REMOVED (using SecurityAnalysisStep instead)
        // this.container.register('securityAnalyzer', () => {
        //     const SecurityAnalyzer = require('../external/SecurityAnalyzer');
        //     return new SecurityAnalyzer();
        // }, { singleton: true });

        // Performance analyzer - REMOVED (using PerformanceAnalysisStep instead)
        // this.container.register('performanceAnalyzer', () => {
        //     const PerformanceAnalyzer = require('../external/PerformanceAnalyzer');
        //     return new PerformanceAnalyzer();
        // }, { singleton: true });

        // Architecture analyzer - REMOVED (using ArchitectureAnalysisStep instead)
        // this.container.register('architectureAnalyzer', () => {
        //     const ArchitectureAnalyzer = require('../external/ArchitectureAnalyzer');
        //     return new ArchitectureAnalyzer();
        // }, { singleton: true });

        // Tech stack analyzer - REMOVED (using TechStackAnalysisStep instead)
        // this.container.register('techStackAnalyzer', () => {
        //     const TechStackAnalyzer = require('../external/TechStackAnalyzer');
        //     return new TechStackAnalyzer();
        // }, { singleton: true });

        // Dependency analyzer - REMOVED (using DependencyAnalysisStep instead)
        // this.container.register('dependencyAnalyzer', (monorepoStrategy, singleRepoStrategy) => {
        //     const DependencyAnalyzer = require('../external/OLD6');
        //     return new DependencyAnalyzer({ monorepoStrategy, singleRepoStrategy });
        // }, { singleton: true, dependencies: ['monorepoStrategy', 'singleRepoStrategy'] });



        // Git service (orchestrator using steps)
        this.container.register('gitService', (logger, eventBus, stepRegistry) => {
            const GitService = require('../external/GitService');
            return new GitService({ logger, eventBus, stepRegistry });
        }, { singleton: true, dependencies: ['logger', 'eventBus', 'stepRegistry'] });

        // Docker service
        this.container.register('dockerService', (logger, eventBus) => {
            const DockerService = require('../external/DockerService');
            return new DockerService({ logger, eventBus });
        }, { singleton: true, dependencies: ['logger', 'eventBus'] });

        // Workflow Git Service (verwendet Steps statt gitService)
        this.container.register('workflowGitService', (logger, eventBus) => {
            const WorkflowGitService = require('@domain/services/WorkflowGitService');
            return new WorkflowGitService({
                logger,
                eventBus
            });
        }, { singleton: true, dependencies: ['logger', 'eventBus'] });

        // Test Orchestrator Tools
        this.container.register('testFixer', () => {
            const TestFixer = require('../external/TestFixer');
            return new TestFixer();
        }, { singleton: true });

        // Test Analyzer - REMOVED (using TestOrchestrator instead)
        // this.container.register('testAnalyzer', () => {
        //     const TestAnalyzer = require('../external/OLD9');
        //     return new TestAnalyzer();
        // }, { singleton: true });

        // Coverage Analyzer - REMOVED (using TestOrchestrator instead)
        // this.container.register('coverageAnalyzer', () => {
        //     const CoverageAnalyzer = require('../external/OLD3');
        //     return new CoverageAnalyzer();
        // }, { singleton: true });

        this.container.register('testReportParser', () => {
            const TestReportParser = require('@domain/services/TestReportParser');
            return new TestReportParser();
        }, { singleton: true });

        this.container.register('testFixTaskGenerator', (taskRepository) => {
            const TestFixTaskGenerator = require('@domain/services/TestFixTaskGenerator');
            return new TestFixTaskGenerator(taskRepository);
        }, { singleton: true, dependencies: ['taskRepository'] });

        this.container.register('testCorrectionService', (testOrchestrator, testFixer, eventBus, logger) => {
            const TestCorrectionService = require('@domain/services/TestCorrectionService');
            return new TestCorrectionService({
                testOrchestrator,
                testFixer,
                eventBus,
                logger
            });
        }, { singleton: true, dependencies: ['testOrchestrator', 'testFixer', 'eventBus', 'logger'] });

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
        this.logger.info('Registering strategy services...');

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
        this.logger.info('Registering repository services...');

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
        this.container.register('analysisRepository', (databaseConnection) => {
            return databaseConnection.getRepository('Analysis');
        }, { singleton: true, dependencies: ['databaseConnection'] });

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
        this.logger.info('Registering application handlers...');

        // Send message handler
        this.container.register('sendMessageHandler', (cursorIDEService, vscodeIDEService, windsurfIDEService, ideManager, idePortManager, eventBus, logger) => {
            const SendMessageHandler = require('@application/handlers/categories/management/SendMessageHandler');
            return new SendMessageHandler({ 
                cursorIDEService, 
                vscodeIDEService, 
                windsurfIDEService, 
                ideManager, 
                idePortManager,
                eventBus, 
                logger 
            });
        }, { singleton: true, dependencies: ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService', 'ideManager', 'idePortManager', 'eventBus', 'logger'] });

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

        // Advanced Analysis Handler
        this.container.register('advancedAnalysisHandler', (advancedAnalysisService, taskRepository, taskExecutionRepository, analysisRepository, eventBus, logger) => {
            const AdvancedAnalysisHandler = require('@application/handlers/categories/analysis/AdvancedAnalysisHandler');
            return new AdvancedAnalysisHandler({ 
                advancedAnalysisService, 
                taskRepository, 
                taskExecutionRepository, 
                analysisRepository,
                eventBus, 
                logger 
            });
        }, { singleton: true, dependencies: ['advancedAnalysisService', 'taskRepository', 'taskExecutionRepository', 'analysisRepository', 'eventBus', 'logger'] });

        this.registeredServices.add('handlers');
    }

    /**
     * Register a single infrastructure service by name
     * @param {string} serviceName - Name of the service to register
     */
    registerInfrastructureService(serviceName) {
        switch (serviceName) {
            case 'databaseConnection':
                this.container.register('databaseConnection', () => {
                    const DatabaseConnection = require('../database/DatabaseConnection');
                    return new DatabaseConnection();
                }, { singleton: true });
                break;
            case 'eventBus':
                this.container.register('eventBus', () => {
                    const EventBus = require('../messaging/EventBus');
                    return new EventBus();
                }, { singleton: true });
                break;
            case 'commandBus':
                this.container.register('commandBus', (eventBus) => {
                    const CommandBus = require('../messaging/CommandBus');
                    const bus = new CommandBus();
                    return bus;
                }, { singleton: true, dependencies: ['eventBus'] });
                break;
            case 'queryBus':
                this.container.register('queryBus', (eventBus) => {
                    const QueryBus = require('../messaging/QueryBus');
                    const bus = new QueryBus();
                    return bus;
                }, { singleton: true, dependencies: ['eventBus'] });
                break;
            case 'logger':
                this.container.register('logger', () => {
                    const ServiceLogger = require('@logging/ServiceLogger');
                    return new ServiceLogger('ServiceRegistry');
                }, { singleton: true });
                break;
            case 'fileSystemService':
                this.container.register('fileSystemService', () => {
                    const FileSystemService = require('../external/FileSystemService');
                    return new FileSystemService();
                }, { singleton: true });
                break;
            case 'browserManager':
                this.container.register('browserManager', () => {
                    const BrowserManager = require('../external/BrowserManager');
                    return new BrowserManager();
                }, { singleton: true });
                break;
            case 'terminalService':
                this.container.register('terminalService', () => {
                    const { TerminalService } = require('@domain/services/TerminalService');
                    return new TerminalService();
                }, { singleton: true });
                break;
            case 'ideManager':
                this.container.register('ideManager', (browserManager, projectRepository, eventBus, gitService) => {
                    const IDEManager = require('../external/ide/IDEManager');
                    const manager = new IDEManager(browserManager, eventBus, gitService);
                    manager.projectRepository = projectRepository;
                    return manager;
                }, { singleton: true, dependencies: ['browserManager', 'projectRepository', 'eventBus', 'gitService'] });
                break;
            case 'idePortManager':
                this.container.register('idePortManager', (ideManager, eventBus) => {
                    const IDEPortManager = require('@domain/services/IDEPortManager');
                    return new IDEPortManager(ideManager, eventBus);
                }, { singleton: true, dependencies: ['ideManager', 'eventBus'] });
                break;
            case 'stepRegistry':
                this.container.register('stepRegistry', () => {
                    const { getStepRegistry } = require('@domain/steps');
                    return getStepRegistry();
                }, { singleton: true });
                break;
            default:
                throw new Error(`Unknown infrastructure service: ${serviceName}`);
        }
    }

    /**
     * Register a single repository service by name
     * @param {string} serviceName - Name of the service to register
     */
    registerRepositoryService(serviceName) {
        switch (serviceName) {
            case 'chatRepository':
                this.container.register('chatRepository', () => {
                    const InMemoryChatRepository = require('../database/InMemoryChatRepository');
                    return new InMemoryChatRepository();
                }, { singleton: true });
                break;
            case 'taskRepository':
                this.container.register('taskRepository', (databaseConnection) => {
                    return databaseConnection.getRepository('Task');
                }, { singleton: true, dependencies: ['databaseConnection'] });
                break;
            case 'taskExecutionRepository':
                this.container.register('taskExecutionRepository', () => {
                    const InMemoryTaskExecutionRepository = require('../database/InMemoryTaskExecutionRepository');
                    return new InMemoryTaskExecutionRepository();
                }, { singleton: true });
                break;
            case 'analysisRepository':
                this.container.register('analysisRepository', (databaseConnection) => {
                    return databaseConnection.getRepository('Analysis');
                }, { singleton: true, dependencies: ['databaseConnection'] });
                break;
            case 'userRepository':
                this.container.register('userRepository', (databaseConnection) => {
                    return databaseConnection.getRepository('User');
                }, { singleton: true, dependencies: ['databaseConnection'] });
                break;
            case 'userSessionRepository':
                this.container.register('userSessionRepository', (databaseConnection) => {
                    return databaseConnection.getRepository('UserSession');
                }, { singleton: true, dependencies: ['databaseConnection'] });
                break;
            case 'projectAnalysisRepository':
                this.container.register('projectAnalysisRepository', (databaseConnection) => {
                    return databaseConnection.getRepository('ProjectAnalysis');
                }, { singleton: true, dependencies: ['databaseConnection'] });
                break;
            case 'projectRepository':
                this.container.register('projectRepository', (databaseConnection) => {
                    return databaseConnection.getRepository('Project');
                }, { singleton: true, dependencies: ['databaseConnection'] });
                break;
            default:
                throw new Error(`Unknown repository service: ${serviceName}`);
        }
    }

    /**
     * Register a single external service by name
     * @param {string} serviceName - Name of the service to register
     */
    registerExternalService(serviceName) {
        switch (serviceName) {
            case 'aiService':
                this.container.register('aiService', () => {
                    const AIService = require('../external/AIService');
                    return new AIService();
                }, { singleton: true });
                break;
            case 'analysisOrchestrator':
                this.container.register('analysisOrchestrator', (stepRegistry, eventBus, logger, analysisRepository) => {
                    const AnalysisOrchestrator = require('../external/AnalysisOrchestrator');
                    return new AnalysisOrchestrator({
                        stepRegistry,
                        eventBus,
                        logger,
                        analysisRepository
                    });
                }, { singleton: true, dependencies: ['stepRegistry', 'eventBus', 'logger', 'analysisRepository'] });
                break;
            case 'testOrchestrator':
                this.container.register('testOrchestrator', (stepRegistry, eventBus, logger) => {
                    const TestOrchestrator = require('../external/TestOrchestrator');
                    return new TestOrchestrator({
                        stepRegistry,
                        eventBus,
                        logger,
                        testRepository: null
                    });
                }, { singleton: true, dependencies: ['stepRegistry', 'eventBus', 'logger'] });
                break;
            case 'workflowOrchestrationService':
                this.container.register('workflowOrchestrationService', (taskRepository, eventBus, logger, stepRegistry, cursorIDEService) => {
                    const WorkflowOrchestrationService = require('@domain/services/WorkflowOrchestrationService');
                    return new WorkflowOrchestrationService({
                        cursorIDEService,
                        taskRepository,
                        eventBus,
                        logger,
                        stepRegistry
                    });
                }, { singleton: true, dependencies: ['taskRepository', 'eventBus', 'logger', 'stepRegistry', 'cursorIDEService'] });
                break;
            case 'projectAnalyzer':
                this.container.register('projectAnalyzer', () => {
                    return {
                        analyzeProject: async () => ({ id: 'stub', type: 'project', result: { stub: true } }),
                        analyzeCodeQuality: async () => ({ id: 'stub', type: 'code-quality', result: { stub: true } }),
                        detectPatterns: async () => ({ patterns: [] }),
                        identifyDependencies: async () => ({ dependencies: [] })
                    };
                }, { singleton: true });
                break;
            case 'gitService':
                this.container.register('gitService', (logger, eventBus, stepRegistry) => {
                    const GitService = require('../external/GitService');
                    return new GitService({ logger, eventBus, stepRegistry });
                }, { singleton: true, dependencies: ['logger', 'eventBus', 'stepRegistry'] });
                break;
            default:
                throw new Error(`Unknown external service: ${serviceName}`);
        }
    }

    /**
     * Register a single strategy service by name
     * @param {string} serviceName - Name of the service to register
     */
    registerStrategyService(serviceName) {
        switch (serviceName) {
            case 'monorepoStrategy':
                this.container.register('monorepoStrategy', (logger, eventBus, fileSystemService) => {
                    const MonorepoStrategy = require('../strategies/MonorepoStrategy');
                    return new MonorepoStrategy({ logger, eventBus, fileSystemService });
                }, { singleton: true, dependencies: ['logger', 'eventBus', 'fileSystemService'] });
                break;
            case 'singleRepoStrategy':
                this.container.register('singleRepoStrategy', (logger, eventBus, fileSystemService) => {
                    const SingleRepoStrategy = require('../strategies/SingleRepoStrategy');
                    return new SingleRepoStrategy({ logger, eventBus, fileSystemService });
                }, { singleton: true, dependencies: ['logger', 'eventBus', 'fileSystemService'] });
                break;
            case 'recommendationsService':
                this.container.register('recommendationsService', (logger) => {
                    const RecommendationsService = require('../strategies/single-repo/services/recommendationsService');
                    return new RecommendationsService(logger);
                }, { singleton: true, dependencies: ['logger'] });
                break;
            case 'optimizationService':
                this.container.register('optimizationService', (logger) => {
                    const OptimizationService = require('../strategies/single-repo/services/optimizationService');
                    return new OptimizationService(logger);
                }, { singleton: true, dependencies: ['logger'] });
                break;
            default:
                throw new Error(`Unknown strategy service: ${serviceName}`);
        }
    }

    /**
     * Register a single domain service by name
     * @param {string} serviceName - Name of the service to register
     */
    registerDomainService(serviceName) {
        switch (serviceName) {
            case 'ideMirrorService':
                this.container.register('ideMirrorService', (ideManager, browserManager) => {
                    const IDEMirrorService = require('@domain/services/IDEMirrorService');
                    return new IDEMirrorService({ ideManager, browserManager });
                }, { singleton: true, dependencies: ['ideManager', 'browserManager'] });
                break;
            case 'terminalLogCaptureService':
                this.container.register('terminalLogCaptureService', (ideManager, browserManager, ideMirrorService) => {
                    const TerminalLogCaptureService = require('@domain/services/TerminalLogCaptureService');
                    return new TerminalLogCaptureService({ ideManager, browserManager, ideMirrorService });
                }, { singleton: true, dependencies: ['ideManager', 'browserManager', 'ideMirrorService'] });
                break;
            case 'terminalLogReader':
                this.container.register('terminalLogReader', () => {
                    const TerminalLogReader = require('@domain/services/TerminalLogReader');
                    return new TerminalLogReader();
                }, { singleton: true });
                break;
            case 'ideController':
                this.container.register('ideController', (ideManager, eventBus, cursorIDEService, taskRepository, terminalLogCaptureService, terminalLogReader) => {
                    const IDEController = require('@presentation/api/IDEController');
                    return new IDEController(ideManager, eventBus, cursorIDEService, taskRepository, terminalLogCaptureService, terminalLogReader);
                }, { singleton: true, dependencies: ['ideManager', 'eventBus', 'cursorIDEService', 'taskRepository', 'terminalLogCaptureService', 'terminalLogReader'] });
                break;
            case 'projectMappingService':
                this.container.register('projectMappingService', (monorepoStrategy) => {
                    const ProjectMappingService = require('@domain/services/ProjectMappingService');
                    return new ProjectMappingService({ monorepoStrategy });
                }, { singleton: true, dependencies: ['monorepoStrategy'] });
                break;
            case 'workspacePathDetector':
                this.container.register('workspacePathDetector', () => {
                    return { detect: () => process.cwd() };
                }, { singleton: true });
                break;
            case 'ideWorkspaceDetectionService':
                this.container.register('ideWorkspaceDetectionService', (ideManager, projectRepository) => {
                    const IDEWorkspaceDetectionService = require('@domain/services/IDEWorkspaceDetectionService');
                    const service = new IDEWorkspaceDetectionService(ideManager);
                    service.projectRepository = projectRepository;
                    return service;
                }, { singleton: true, dependencies: ['ideManager', 'projectRepository'] });
                break;
            case 'subprojectDetector':
                this.container.register('subprojectDetector', () => {
                    return { detect: () => [] };
                }, { singleton: true });
                break;
            case 'analysisOutputService':
                this.container.register('analysisOutputService', () => {
                    const AnalysisOutputService = require('@domain/services/AnalysisOutputService');
                    return new AnalysisOutputService();
                }, { singleton: true });
                break;
            case 'taskAnalysisService':
                this.container.register('taskAnalysisService', (cursorIDEService, eventBus, logger, aiService, projectAnalyzer, analysisOrchestrator) => {
                    const TaskAnalysisService = require('@domain/services/TaskAnalysisService');
                    return new TaskAnalysisService(cursorIDEService, eventBus, logger, aiService, projectAnalyzer, analysisOrchestrator);
                }, { singleton: true, dependencies: ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'projectAnalyzer', 'analysisOrchestrator'] });
                break;
            case 'taskValidationService':
                this.container.register('taskValidationService', (taskRepository, cursorIDEService, eventBus, fileSystemService) => {
                    const TaskValidationService = require('@domain/services/TaskValidationService');
                    return new TaskValidationService(taskRepository, cursorIDEService, eventBus, fileSystemService);
                }, { singleton: true, dependencies: ['taskRepository', 'cursorIDEService', 'eventBus', 'fileSystemService'] });
                break;
            case 'advancedAnalysisService':
                this.container.register('advancedAnalysisService', (layerValidationService, logicValidationService, taskAnalysisService, eventBus, logger) => {
                    const AdvancedAnalysisService = require('@domain/services/AdvancedAnalysisService');
                    return new AdvancedAnalysisService({
                        layerValidationService,
                        logicValidationService,
                        taskAnalysisService,
                        eventBus,
                        logger
                    });
                }, { singleton: true, dependencies: ['layerValidationService', 'logicValidationService', 'taskAnalysisService', 'eventBus', 'logger'] });
                break;
            case 'layerValidationService':
                this.container.register('layerValidationService', (logger) => {
                    const LayerValidationService = require('@domain/services/LayerValidationService');
                    return new LayerValidationService(logger);
                }, { singleton: true, dependencies: ['logger'] });
                break;
            case 'logicValidationService':
                this.container.register('logicValidationService', (logger) => {
                    const LogicValidationService = require('@domain/services/LogicValidationService');
                    return new LogicValidationService(logger);
                }, { singleton: true, dependencies: ['logger'] });
                break;
            case 'chatSessionService':
                this.container.register('chatSessionService', (browserManager, ideManager, eventBus, logger) => {
                    const ChatSessionService = require('@domain/services/ChatSessionService');
                    return new ChatSessionService({
                        browserManager,
                        ideManager,
                        eventBus,
                        logger
                    });
                }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] });
                break;
            case 'ideAutomationService':
                this.container.register('ideAutomationService', (browserManager, ideManager, eventBus, logger) => {
                    const IDEAutomationService = require('@domain/services/IDEAutomationService');
                    return new IDEAutomationService({
                        browserManager,
                        ideManager,
                        eventBus,
                        logger
                    });
                }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus', 'logger'] });
                break;
            case 'workflowExecutionService':
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
                break;
            case 'ideFactory':
                this.container.register('ideFactory', () => {
                    const { getIDEFactory } = require('@domain/services/ide/IDEFactory');
                    return getIDEFactory();
                }, { singleton: true });
                break;
            case 'ideService':
                this.container.register('ideService', (browserManager, ideManager, eventBus, ideFactory) => {
                    const { getIDEFactory } = require('@domain/services/ide/IDEFactory');
                    const factory = getIDEFactory();
                    
                    const result = factory.createIDE('cursor', { browserManager, ideManager, eventBus });
                    if (result.success) {
                        return result.ide;
                    }
                    
                    throw new Error('Failed to create IDE service: ' + result.error);
                }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus', 'ideFactory'] });
                break;
            case 'cursorIDEService':
                this.container.register('cursorIDEService', (browserManager, ideManager, eventBus) => {
                    const CursorIDEService = require('@domain/services/CursorIDEService');
                    return new CursorIDEService(browserManager, ideManager, eventBus);
                }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });
                break;
            case 'vscodeIDEService':
                this.container.register('vscodeIDEService', (browserManager, ideManager, eventBus) => {
                    const VSCodeIDEService = require('@domain/services/VSCodeService');
                    return new VSCodeIDEService(browserManager, ideManager, eventBus);
                }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });
                break;
            case 'windsurfIDEService':
                this.container.register('windsurfIDEService', (browserManager, ideManager, eventBus) => {
                    const WindsurfIDEService = require('@domain/services/WindsurfIDEService');
                    return new WindsurfIDEService(browserManager, ideManager, eventBus);
                }, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });
                break;
            case 'authService':
                this.container.register('authService', (userRepository, userSessionRepository) => {
                    const AuthService = require('@domain/services/AuthService');
                    return new AuthService(userRepository, userSessionRepository, 'simple-jwt-secret', 'simple-refresh-secret');
                }, { singleton: true, dependencies: ['userRepository', 'userSessionRepository'] });
                break;
            case 'taskService':
                this.container.register('taskService', (taskRepository, aiService, projectAnalyzer, cursorIDEService) => {
                    const TaskService = require('@domain/services/TaskService');
                    return new TaskService(taskRepository, aiService, projectAnalyzer, cursorIDEService, null);
                }, { singleton: true, dependencies: ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService'] });
                break;
            case 'docsImportService':
                this.container.register('docsImportService', (browserManager, taskService, taskRepository) => {
                    const DocsImportService = require('@domain/services/DocsImportService');
                    return new DocsImportService(browserManager, taskService, taskRepository);
                }, { singleton: true, dependencies: ['browserManager', 'taskService', 'taskRepository'] });
                break;
            default:
                throw new Error(`Unknown domain service: ${serviceName}`);
        }
    }

    /**
     * Register a single handler service by name
     * @param {string} serviceName - Name of the service to register
     */
    registerHandlerService(serviceName) {
        switch (serviceName) {
            case 'sendMessageHandler':
                this.container.register('sendMessageHandler', (cursorIDEService, vscodeIDEService, windsurfIDEService, ideManager, idePortManager, eventBus, logger) => {
                    const SendMessageHandler = require('@application/handlers/categories/management/SendMessageHandler');
                    return new SendMessageHandler({ 
                        cursorIDEService, 
                        vscodeIDEService, 
                        windsurfIDEService, 
                        ideManager, 
                        idePortManager,
                        eventBus, 
                        logger 
                    });
                }, { singleton: true, dependencies: ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService', 'ideManager', 'idePortManager', 'eventBus', 'logger'] });
                break;
            case 'getChatHistoryHandler':
                this.container.register('getChatHistoryHandler', (chatRepository, ideManager) => {
                    const GetChatHistoryHandler = require('@application/handlers/categories/management/GetChatHistoryHandler');
                    return new GetChatHistoryHandler(chatRepository, ideManager, this);
                }, { singleton: true, dependencies: ['chatRepository', 'ideManager'] });
                break;
            case 'createTaskHandler':
                this.container.register('createTaskHandler', (taskRepository, taskValidationService, eventBus, logger) => {
                    const CreateTaskHandler = require('@application/handlers/categories/management/CreateTaskHandler');
                    return new CreateTaskHandler({
                        taskRepository,
                        taskValidationService,
                        eventBus,
                        logger
                    });
                }, { singleton: true, dependencies: ['taskRepository', 'taskValidationService', 'eventBus', 'logger'] });
                break;
            case 'vibeCoderAutoRefactorHandler':
                this.container.register('vibeCoderAutoRefactorHandler', (taskRepository, projectAnalysisRepository, eventBus, logger) => {
                    const VibeCoderAutoRefactorHandler = require('@application/handlers/vibecoder/VibeCoderAutoRefactorHandler');
                    return new VibeCoderAutoRefactorHandler({ taskRepository, projectAnalysisRepository, eventBus, logger });
                }, { singleton: true, dependencies: ['taskRepository', 'projectAnalysisRepository', 'eventBus', 'logger'] });
                break;
            case 'advancedAnalysisHandler':
                this.container.register('advancedAnalysisHandler', (advancedAnalysisService, taskRepository, taskExecutionRepository, analysisRepository, eventBus, logger) => {
                    const AdvancedAnalysisHandler = require('@application/handlers/categories/analysis/AdvancedAnalysisHandler');
                    return new AdvancedAnalysisHandler({ 
                        advancedAnalysisService, 
                        taskRepository, 
                        taskExecutionRepository, 
                        analysisRepository,
                        eventBus, 
                        logger 
                    });
                }, { singleton: true, dependencies: ['advancedAnalysisService', 'taskRepository', 'taskExecutionRepository', 'analysisRepository', 'eventBus', 'logger'] });
                break;
            default:
                throw new Error(`Unknown handler service: ${serviceName}`);
        }
    }

    /**
     * Collect all service definitions for automatic dependency resolution
     */
    collectServiceDefinitions() {
        this.logger.info('🔍 Collecting service definitions for automatic dependency resolution...');
        
        // Infrastructure services
        this.addServiceDefinition('databaseConnection', [], 'infrastructure');
        this.addServiceDefinition('eventBus', [], 'infrastructure');
        this.addServiceDefinition('commandBus', ['eventBus'], 'infrastructure');
        this.addServiceDefinition('queryBus', ['eventBus'], 'infrastructure');
        this.addServiceDefinition('logger', [], 'infrastructure');
        this.addServiceDefinition('fileSystemService', [], 'infrastructure');
        this.addServiceDefinition('browserManager', [], 'infrastructure');
        this.addServiceDefinition('terminalService', [], 'infrastructure');
        this.addServiceDefinition('ideManager', ['browserManager', 'projectRepository', 'eventBus', 'gitService'], 'infrastructure');
        this.addServiceDefinition('idePortManager', ['ideManager', 'eventBus'], 'infrastructure');
        this.addServiceDefinition('stepRegistry', [], 'infrastructure');

        // Repository services
        this.addServiceDefinition('chatRepository', [], 'repositories');
        this.addServiceDefinition('taskRepository', ['databaseConnection'], 'repositories');
        this.addServiceDefinition('taskExecutionRepository', [], 'repositories');
        this.addServiceDefinition('analysisRepository', ['databaseConnection'], 'repositories');
        this.addServiceDefinition('userRepository', ['databaseConnection'], 'repositories');
        this.addServiceDefinition('userSessionRepository', ['databaseConnection'], 'repositories');
        this.addServiceDefinition('projectAnalysisRepository', ['databaseConnection'], 'repositories');
        this.addServiceDefinition('projectRepository', ['databaseConnection'], 'repositories');

        // External services
        this.addServiceDefinition('aiService', [], 'external');
        this.addServiceDefinition('analysisOrchestrator', ['stepRegistry', 'eventBus', 'logger', 'analysisRepository'], 'external');
        this.addServiceDefinition('testOrchestrator', ['stepRegistry', 'eventBus', 'logger'], 'external');
        this.addServiceDefinition('workflowOrchestrationService', ['taskRepository', 'eventBus', 'logger', 'stepRegistry', 'cursorIDEService'], 'external');
        this.addServiceDefinition('projectAnalyzer', [], 'external');
        this.addServiceDefinition('gitService', ['logger', 'eventBus', 'stepRegistry'], 'external');

        // Strategy services
        this.addServiceDefinition('monorepoStrategy', ['logger', 'eventBus', 'fileSystemService'], 'strategies');
        this.addServiceDefinition('singleRepoStrategy', ['logger', 'eventBus', 'fileSystemService'], 'strategies');
        this.addServiceDefinition('recommendationsService', ['logger'], 'strategies');
        this.addServiceDefinition('optimizationService', ['logger'], 'strategies');

        // Domain services
        this.addServiceDefinition('ideMirrorService', ['ideManager', 'browserManager'], 'domain');
        this.addServiceDefinition('terminalLogCaptureService', ['ideManager', 'browserManager', 'ideMirrorService'], 'domain');
        this.addServiceDefinition('terminalLogReader', [], 'domain');
        this.addServiceDefinition('ideController', ['ideManager', 'eventBus', 'cursorIDEService', 'taskRepository', 'terminalLogCaptureService', 'terminalLogReader'], 'domain');
        this.addServiceDefinition('projectMappingService', ['monorepoStrategy'], 'domain');
        this.addServiceDefinition('workspacePathDetector', [], 'domain');
        this.addServiceDefinition('ideWorkspaceDetectionService', ['ideManager', 'projectRepository'], 'domain');
        this.addServiceDefinition('subprojectDetector', [], 'domain');
        this.addServiceDefinition('analysisOutputService', [], 'domain');
        this.addServiceDefinition('taskAnalysisService', ['cursorIDEService', 'eventBus', 'logger', 'aiService', 'projectAnalyzer', 'analysisOrchestrator'], 'domain');
        this.addServiceDefinition('taskValidationService', ['taskRepository', 'cursorIDEService', 'eventBus', 'fileSystemService'], 'domain');
        this.addServiceDefinition('advancedAnalysisService', ['layerValidationService', 'logicValidationService', 'taskAnalysisService', 'eventBus', 'logger'], 'domain');
        this.addServiceDefinition('layerValidationService', ['logger'], 'domain');
        this.addServiceDefinition('logicValidationService', ['logger'], 'domain');
        this.addServiceDefinition('chatSessionService', ['browserManager', 'ideManager', 'eventBus', 'logger'], 'domain');
        this.addServiceDefinition('ideAutomationService', ['browserManager', 'ideManager', 'eventBus', 'logger'], 'domain');
        this.addServiceDefinition('workflowExecutionService', ['chatSessionService', 'ideAutomationService', 'browserManager', 'ideManager', 'eventBus', 'logger'], 'domain');
        this.addServiceDefinition('ideFactory', [], 'domain');
        this.addServiceDefinition('ideService', ['browserManager', 'ideManager', 'eventBus', 'ideFactory'], 'domain');
        this.addServiceDefinition('cursorIDEService', ['browserManager', 'ideManager', 'eventBus'], 'domain');
        this.addServiceDefinition('vscodeIDEService', ['browserManager', 'ideManager', 'eventBus'], 'domain');
        this.addServiceDefinition('windsurfIDEService', ['browserManager', 'ideManager', 'eventBus'], 'domain');
        this.addServiceDefinition('authService', ['userRepository', 'userSessionRepository'], 'domain');
        this.addServiceDefinition('taskService', ['taskRepository', 'aiService', 'projectAnalyzer', 'cursorIDEService'], 'domain');
        this.addServiceDefinition('docsImportService', ['browserManager', 'taskService', 'taskRepository'], 'domain');

        // Handler services
        this.addServiceDefinition('sendMessageHandler', ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService', 'ideManager', 'idePortManager', 'eventBus', 'logger'], 'handlers');
        this.addServiceDefinition('getChatHistoryHandler', ['chatRepository', 'ideManager'], 'handlers');
        this.addServiceDefinition('createTaskHandler', ['taskRepository', 'taskValidationService', 'eventBus', 'logger'], 'handlers');
        this.addServiceDefinition('vibeCoderAutoRefactorHandler', ['taskRepository', 'projectAnalysisRepository', 'eventBus', 'logger'], 'handlers');
        this.addServiceDefinition('advancedAnalysisHandler', ['advancedAnalysisService', 'taskRepository', 'taskExecutionRepository', 'analysisRepository', 'eventBus', 'logger'], 'handlers');

        this.logger.info('✅ Service definitions collected for automatic dependency resolution');
    }

    /**
     * Add a service definition to the resolver
     * @param {string} serviceName - Name of the service
     * @param {Array<string>} dependencies - Array of dependency service names
     * @param {string} category - Service category
     */
    addServiceDefinition(serviceName, dependencies, category) {
        this.serviceOrderResolver.addService(serviceName, dependencies, category);
    }

    /**
     * Get services by category
     * @param {string} category - Service category
     * @returns {Array<string>} Array of service names in the category
     */
    getServicesByCategory(category) {
        const services = [];
        for (const [serviceName, serviceCategory] of this.serviceOrderResolver.serviceCategories.entries()) {
            if (serviceCategory === category) {
                services.push(serviceName);
            }
        }
        return services;
    }

    /**
     * Register all services using automatic dependency resolution
     */
    registerAllServices() {
        this.logger.info('🔧 Registering all services with automatic dependency resolution...');

        try {
            // Collect all service definitions first
            this.collectServiceDefinitions();

            // Use simple category-based ordering instead of complex topological sort
            const categoryOrder = ['infrastructure', 'repositories', 'external', 'strategies', 'domain', 'handlers'];
            
            for (const category of categoryOrder) {
                const services = this.getServicesByCategory(category);
                if (services.length > 0) {
                    this.logger.info(`📦 Registering ${services.length} services in category: ${category}`);
                    
                    for (const serviceName of services) {
                        try {
                            this.registerServiceByName(serviceName);
                            this.registeredServices.add(serviceName);
                        } catch (error) {
                            this.logger.warn(`⚠️ Failed to register service ${serviceName}: ${error.message}`);
                            // Continue with other services
                        }
                    }
                }
            }

        // Initialize project context service after all services are registered
        try {
            this.projectContextService.initialize({
                projectMappingService: this.container.resolve('projectMappingService'),
                workspacePathDetector: this.container.resolve('workspacePathDetector')
            });
                } catch (error) {
            this.logger.warn('Project context initialization failed:', error.message);
        }
        
            this.logger.info('✅ All services registered successfully with category-based ordering');
            this.logger.info('Registered services:', Array.from(this.registeredServices));

        } catch (error) {
            this.logger.error('❌ Failed to register services:', error.message);
            throw new Error(`Service registration failed: ${error.message}`);
        }
    }

    /**
     * Register a service by name using the appropriate registration method
     * @param {string} serviceName - Name of the service to register
     */
    registerServiceByName(serviceName) {
        const category = this.serviceOrderResolver.serviceCategories.get(serviceName);
        
        switch (category) {
            case 'infrastructure':
                this.registerInfrastructureService(serviceName);
                break;
            case 'repositories':
                this.registerRepositoryService(serviceName);
                break;
            case 'external':
                this.registerExternalService(serviceName);
                break;
            case 'strategies':
                this.registerStrategyService(serviceName);
                break;
            case 'domain':
                this.registerDomainService(serviceName);
                break;
            case 'handlers':
                this.registerHandlerService(serviceName);
                break;
            default:
                throw new Error(`Unknown service category for '${serviceName}': ${category}`);
        }
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
        this.logger.info('All services cleared');
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