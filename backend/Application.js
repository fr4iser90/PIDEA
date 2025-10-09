
require('module-alias/register');
const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const slowDown = require('express-slow-down');
const cookieParser = require('cookie-parser');

const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('Application');

// Auto-Security
const AutoSecurityManager = require('./infrastructure/auto/AutoSecurityManager');

// Domain
const ChatMessage = require('./domain/entities/ChatMessage');
const ChatSession = require('./domain/entities/ChatSession');
const ChatRepository = require('./domain/repositories/ChatRepository');
const User = require('./domain/entities/User');
const UserSession = require('./domain/entities/UserSession');
const CursorIDEService = require('./domain/services/ide/CursorIDEService');
const AuthService = require('./domain/services/security/AuthService');
const TaskService = require('./domain/services/task/TaskService');
const TaskRepository = require('./domain/repositories/TaskRepository');
const TaskValidationService = require('./domain/services/task/TaskValidationService');
const TaskSession = require('./domain/entities/TaskSession');
const TodoTask = require('./domain/entities/TodoTask');
// Application
const GetChatHistoryQuery = require('@application/queries/GetChatHistoryQuery');
// Handler imports - Updated paths
const SendMessageHandler = require('@handler-categories/chat/SendMessageHandler');
const CreateTaskHandler = require('@handler-categories/workflow/CreateTaskHandler');
const UpdateTestStatusHandler = require('@handler-categories/workflow/UpdateTestStatusHandler');
const AutoRefactorHandler = require('@handler-categories/refactoring/AutoRefactorHandler');

// Command imports - Updated paths
const SendMessageCommand = require('@categories/chat/SendMessageCommand');
const CreateTaskCommand = require('@categories/workflow/CreateTaskCommand');
const UpdateTestStatusCommand = require('@categories/workflow/UpdateTestStatusCommand');
const AutoRefactorCommand = require('@categories/refactoring/AutoRefactorCommand');

// Application handlers - Categories-based only

// Infrastructure - Only keep what's not in DI
const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
const AuthMiddleware = require('./infrastructure/auth/AuthMiddleware');

// Presentation - Only keep what's not in DI
const WebChatController = require('./presentation/api/WebChatController');
const IDEController = require('./presentation/api/IDEController');
const IDEFeatureController = require('./presentation/api/ide/IDEFeatureController');
const IDEMirrorController = require('./presentation/api/IDEMirrorController');
const IDEConfigurationController = require('./presentation/api/ide/IDEConfigurationController');
const ContentLibraryController = require('./presentation/api/ContentLibraryController');
const AuthController = require('./presentation/api/AuthController');
const TaskController = require('./presentation/api/TaskController');
const TaskStatusSyncController = require('./presentation/api/TaskStatusSyncController');
const WorkflowController = require('./presentation/api/WorkflowController');
const AnalysisController = require('./presentation/api/AnalysisController');
const GitController = require('./presentation/api/GitController');
const WebSocketManager = require('./presentation/websocket/WebSocketManager');
const ProjectController = require('./presentation/api/controllers/ProjectController');

class Application {
  constructor(config = {}) {
    this.config = {
      port: config.port,
      ...config
    };
    
    this.app = null;
    this.server = null;
    this.isRunning = false;
    
    // Get services from DI Container
    const { getServiceContainer } = require('./infrastructure/dependency-injection/ServiceContainer');
    const container = getServiceContainer();
    
    // Get or create AutoSecurityManager
    if (!container.singletons.has('autoSecurityManager')) {
      const autoSecurityManager = new AutoSecurityManager();
      container.registerSingleton('autoSecurityManager', autoSecurityManager);
    }
    this.autoSecurityManager = container.resolve('autoSecurityManager');
    this.securityConfig = this.autoSecurityManager.getConfig();
    
    // Setup logger
    this.logger = this.setupLogger();
  }

  setupLogger() {
    // Use singleton logger - nur EINE Logger-Instanz für die ganze Anwendung!
    const { getLogger } = require('@logging/Logger');
    return getLogger('Application');
  }

  async initialize() {
    try {
      // Initialize database connection
      const DatabaseInitialization = require('./infrastructure/database/DatabaseInitialization');
      const databaseInitialization = new DatabaseInitialization(this.logger);
      const { databaseConnection, migrationService } = await databaseInitialization.initializeDatabase(this.securityConfig);
      this.databaseConnection = databaseConnection;
      this.migrationService = migrationService;

      // Initialize infrastructure
      const ServiceInitialization = require('./infrastructure/dependency-injection/ServiceInitialization');
      const serviceInitialization = new ServiceInitialization(this.logger);
      const infrastructureServices = await serviceInitialization.initializeInfrastructure();
      
      // Assign infrastructure services
      this.stepRegistry = infrastructureServices.stepRegistry;
      this.serviceRegistry = infrastructureServices.serviceRegistry;
      this.projectContext = infrastructureServices.projectContext;
      this.browserManager = infrastructureServices.browserManager;
      this.ideManager = infrastructureServices.ideManager;
      this.chatRepository = infrastructureServices.chatRepository;
      this.eventBus = infrastructureServices.eventBus;
      this.commandBus = infrastructureServices.commandBus;
      this.queryBus = infrastructureServices.queryBus;
      this.userRepository = infrastructureServices.userRepository;
      this.userSessionRepository = infrastructureServices.userSessionRepository;
      this.ideWorkspaceDetectionService = infrastructureServices.ideWorkspaceDetectionService;
      this.fileSystemService = infrastructureServices.fileSystemService;
      this.monorepoStrategy = infrastructureServices.monorepoStrategy;
      this.singleRepoStrategy = infrastructureServices.singleRepoStrategy;

      // Initialize domain services
      const domainServices = await serviceInitialization.initializeDomainServices(this.serviceRegistry, this.databaseConnection);
      
      // Assign domain services
      this.cursorIDEService = domainServices.cursorIDEService;
      this.authService = domainServices.authService;
      this.aiService = domainServices.aiService;
      this.recommendationsService = domainServices.recommendationsService;
      this.subprojectDetector = domainServices.subprojectDetector;
      this.analysisOutputService = domainServices.analysisOutputService;
      this.analysisRepository = domainServices.analysisRepository;
      this.projectRepository = domainServices.projectRepository;
      this.projectMappingService = domainServices.projectMappingService;
      this.taskRepository = domainServices.taskRepository;
      this.taskExecutionRepository = domainServices.taskExecutionRepository;
      this.taskService = domainServices.taskService;
      this.taskValidationService = domainServices.taskValidationService;
      this.taskAnalysisService = domainServices.taskAnalysisService;
      this.workflowOrchestrationService = domainServices.workflowOrchestrationService;
      this.gitService = domainServices.gitService;
      this.testOrchestrator = domainServices.testOrchestrator;
      this.workflowLoaderService = domainServices.workflowLoaderService;
      this.taskProcessor = domainServices.taskProcessor;
      this.taskSessionRepository = domainServices.taskSessionRepository;
      this.frameworkManager = domainServices.manager;
      this.frameworkLoader = domainServices.loader;
      this.frameworkValidator = domainServices.validator;
      this.frameworkConfig = domainServices.config;
      this.frameworkStepRegistry = domainServices.stepRegistry;
      this.frameworkInitializationResults = domainServices.initializationResults;

      // Initialize application handlers
      const applicationHandlers = await serviceInitialization.initializeApplicationHandlers(this.serviceRegistry);
      
      // Assign application handlers
      this.sendMessageHandler = applicationHandlers.sendMessageHandler;
      this.getChatHistoryHandler = applicationHandlers.getChatHistoryHandler;
      this.createTaskHandler = applicationHandlers.createTaskHandler;
      this.createChatHandler = applicationHandlers.createChatHandler;
      this.versionManagementHandler = applicationHandlers.versionManagementHandler;

      // Initialize presentation layer
      await this.initializePresentationLayer();

      // Setup Express app
      this.app = express();
      
      // Middleware setup - Using modular setup file
      const MiddlewareSetup = require('./infrastructure/MiddlewareSetup');
      const middlewareSetup = new MiddlewareSetup(this.autoSecurityManager, this.logger);
      middlewareSetup.setupMiddleware(this.app);
      
      this.setupRoutes();

      // Create HTTP server
      this.server = http.createServer(this.app);

      // Initialize WebSocket manager with auth
      this.webSocketManager = new WebSocketManager(this.server, this.eventBus, this.authMiddleware);
      this.webSocketManager.initialize();

      // Initialize EventEmissionService for refresh coordination
      try {
        const EventEmissionService = require('./infrastructure/services/EventEmissionService');
        this.eventEmissionService = new EventEmissionService({
          eventBus: this.eventBus,
          webSocketManager: this.webSocketManager,
          ideManager: this.ideManager,
          taskRepository: this.taskRepository,
          analysisRepository: this.analysisRepository
        });
        await this.eventEmissionService.initialize();
        
        // Register WebSocket manager in service registry
        this.serviceRegistry.getContainer().registerSingleton('webSocketManager', this.webSocketManager);
        this.serviceRegistry.getContainer().registerSingleton('eventEmissionService', this.eventEmissionService);
        
        logger.info('✅ EventEmissionService initialized successfully');
      } catch (error) {
        logger.warn('⚠️ EventEmissionService initialization failed, continuing without it:', error?.message || error || 'Unknown error');
        this.eventEmissionService = null;
        
        // Register WebSocket manager in service registry
        this.serviceRegistry.getContainer().registerSingleton('webSocketManager', this.webSocketManager);
      }

      // Connect IDE Mirror Controller to WebSocket Manager
      this.webSocketManager.setIDEMirrorController(this.ideMirrorController);

      // Initialize streaming services after WebSocket manager is available
      this.ideMirrorController.initializeStreamingServices(this.serviceRegistry);

      // Re-register routes to include streaming endpoints
      this.ideMirrorController.setupRoutes(this.app);

      // Initialize IDE Manager
      try {
        await this.ideManager.initialize();
        this.logger.info('IDE Manager initialized successfully');
      } catch (error) {
        this.logger.warn('IDE Manager initialization failed, continuing without IDE support:', error.message);
      }

    // Event handlers - Using modular handler file
    const EventHandlers = require('./presentation/api/routes/eventHandlers');
    const eventHandlers = new EventHandlers(this.eventBus, this.webSocketManager, this.logger);
    eventHandlers.setupEventHandlers();

    // Cleanup tasks - Using modular handler file
    const CleanupTasks = require('./infrastructure/CleanupTasks');
    const cleanupTasks = new CleanupTasks(this.autoSecurityManager, this.authService, this.taskSessionRepository, this.ideManager, this.logger);
    cleanupTasks.setupCleanupTasks();

      // Make application instance globally available
      global.application = this;

      this.logger.info('[Application] Ready');
    } catch (error) {
      this.logger.error('[Application] Initialization failed:', error);
      throw error;
    }
  }







  async initializePresentationLayer() {

    // Initialize auth middleware
    this.authMiddleware = new AuthMiddleware(this.authService);

    // Initialize controllers with Application Services
    this.authController = this.serviceRegistry.getService('authController');
    
    // Initialize Session Controller
    const SessionController = require('./presentation/api/SessionController');
    this.sessionController = new SessionController({
      sessionActivityService: this.serviceRegistry.getService('sessionActivityService'),
      authService: this.authService,
      userSessionRepository: this.userSessionRepository
    });
    
    const WebChatController = require('./presentation/api/WebChatController');
    this.webChatController = new WebChatController({
        webChatApplicationService: this.serviceRegistry.getService('webChatApplicationService'),
        logger: this.serviceRegistry.getService('logger')
    });

    // Use Application Service for IDEController
    const IDEController = require('./presentation/api/IDEController');
    this.ideController = new IDEController({
        ideApplicationService: this.serviceRegistry.getService('ideApplicationService'),
        logger: this.serviceRegistry.getService('logger')
    });

    // Initialize IDE Feature Controller
    const IDEFeatureController = require('./presentation/api/ide/IDEFeatureController');
    this.ideFeatureController = new IDEFeatureController({
      ideManager: this.ideManager,
      eventBus: this.eventBus,
      logger: this.logger,
      serviceRegistry: this.serviceRegistry
    });

    const IDEMirrorController = require('./presentation/api/IDEMirrorController');
    this.ideMirrorController = new IDEMirrorController({
        ideMirrorApplicationService: this.serviceRegistry.getService('ideMirrorApplicationService'),
        logger: this.serviceRegistry.getService('logger')
    });

    // Initialize IDE Configuration Controller
    this.ideConfigurationController = new IDEConfigurationController();

    const ContentLibraryController = require('./presentation/api/ContentLibraryController');
    this.ContentLibraryController = new ContentLibraryController({
        contentLibraryApplicationService: this.serviceRegistry.getService('contentLibraryApplicationService'),
        logger: this.serviceRegistry.getService('logger')
    });

    const TaskController = require('./presentation/api/TaskController');
    this.taskController = new TaskController(
        this.serviceRegistry.getService('taskApplicationService'),
        this.eventBus
    );

    // 🆕 NEW: Initialize TaskStatusSyncController
    const TaskStatusSyncController = require('./presentation/api/TaskStatusSyncController');
    this.taskStatusSyncController = new TaskStatusSyncController(
        this.serviceRegistry.getService('taskRepository'),
        this.serviceRegistry.getService('taskService')?.statusTransitionService,
        this.eventBus
    );

    const WorkflowController = require('./presentation/api/WorkflowController');
    this.workflowController = new WorkflowController({
        workflowApplicationService: this.serviceRegistry.getService('workflowApplicationService'),
        analysisApplicationService: this.serviceRegistry.getService('analysisApplicationService'),
        analysisRepository: this.serviceRegistry.getService('analysisRepository'),
        ideManager: this.serviceRegistry.getService('ideManager'),
        taskService: this.serviceRegistry.getService('taskService'),
        queueMonitoringService: this.serviceRegistry.getService('taskQueueStore'),
        workflowLoaderService: this.serviceRegistry.getService('workflowLoaderService'),
        stepProgressService: this.serviceRegistry.getService('stepProgressService'),
        queueHistoryService: this.serviceRegistry.getService('queueHistoryService'),
        eventBus: this.eventBus,
        application: this,
        logger: this.serviceRegistry.getService('logger')
    });

    // Initialize QueueController
    const QueueController = require('./presentation/api/QueueController');
    this.queueController = new QueueController({
        taskQueueStore: this.serviceRegistry.getService('taskQueueStore'),
        stepProgressService: this.serviceRegistry.getService('stepProgressService'),
        queueHistoryService: this.serviceRegistry.getService('queueHistoryService'),
        TaskModeDetector: this.serviceRegistry.getService('TaskModeDetector'),
        eventBus: this.eventBus,
        logger: this.serviceRegistry.getService('logger')
    });

    // Initialize TestManagementController - CLEAN VERSION
    const TestManagementController = require('./presentation/api/controllers/TestManagementController');
    const PlaywrightTestHandler = require('./application/handlers/categories/testing/PlaywrightTestHandler');
    const PlaywrightTestApplicationService = require('./application/services/PlaywrightTestApplicationService');
    
    // Create PlaywrightTestHandler with proper dependencies
    const playwrightTestHandler = new PlaywrightTestHandler({
        playwrightTestService: new PlaywrightTestApplicationService({
            workspaceDetector: this.serviceRegistry.getService('workspacePathDetector'),
            projectMapper: this.serviceRegistry.getService('projectMappingService'),
            application: this  // ✅ APPLICATION OBJEKT ÜBERGEBEN!
        }),
        application: this  // ✅ APPLICATION OBJEKT AUCH AN HANDLER!
    });
    
    this.testManagementController = new TestManagementController({
        playwrightTestHandler: playwrightTestHandler,
        application: this,
        logger: this.logger
    });

    // Initialize AnalysisController
    const AnalysisController = require('./presentation/api/AnalysisController');
    this.analysisController = new AnalysisController(
        this.serviceRegistry.getService('analysisApplicationService'),
        this.workflowController
    );

    const GitController = require('./presentation/api/GitController');
    this.gitController = new GitController({
        gitApplicationService: this.serviceRegistry.getService('gitApplicationService'),
        gitService: this.serviceRegistry.getService('gitService'),
        eventBus: this.eventBus,
        logger: this.serviceRegistry.getService('logger')
    });

    this.projectController = new ProjectController(this.serviceRegistry.getService('projectApplicationService'));

    this.logger.info('Presentation layer initialized');
  }


  setupRoutes() {
    this.logger.info('Setting up routes...');

    // Main routes - Using modular route file
    const MainRoutes = require('./presentation/api/routes/mainRoutes');
    const mainRoutes = new MainRoutes();
    mainRoutes.setupRoutes(this.app);

    // Health check routes - Using modular route file
    const HealthRoutes = require('./presentation/api/routes/healthRoutes');
    const healthRoutes = new HealthRoutes(this.autoSecurityManager, this.databaseConnection);
    healthRoutes.setupRoutes(this.app);

    // Auth routes - Using modular route file
    const AuthRoutes = require('./presentation/api/routes/authRoutes');
    const authRoutes = new AuthRoutes(this.authController, this.authMiddleware);
    authRoutes.setupRoutes(this.app);

    // Session management routes - Using modular route file
    const SessionRoutes = require('./presentation/api/routes/sessionRoutes');
    const sessionRoutes = new SessionRoutes(this.sessionController, this.authMiddleware);
    sessionRoutes.setupRoutes(this.app);

    // Chat routes - Using modular route file
    const ChatRoutes = require('./presentation/api/routes/chatRoutes');
    const chatRoutes = new ChatRoutes(this.webChatController, this.authMiddleware);
    chatRoutes.setupRoutes(this.app);

    // IDE routes - Using modular route file
    const IDERoutes = require('./presentation/api/routes/ideRoutes');
    const ideRoutes = new IDERoutes(this.ideController, this.ideFeatureController, this.ideConfigurationController, this.authMiddleware);
    ideRoutes.setupRoutes(this.app);

    // File explorer routes - Using modular route file
    const FileRoutes = require('./presentation/api/routes/fileRoutes');
    const fileRoutes = new FileRoutes(this.browserManager, this.authMiddleware, this.logger);
    fileRoutes.setupRoutes(this.app);

    // Content Library routes - Using modular route file
    const ContentLibraryRoutes = require('./presentation/api/routes/contentLibraryRoutes');
    const contentLibraryRoutes = new ContentLibraryRoutes(this.ContentLibraryController, this.authMiddleware);
    contentLibraryRoutes.setupRoutes(this.app);

    // Task Management routes - Using modular route file
    const TaskRoutes = require('./presentation/api/routes/taskRoutes');
    const taskRoutes = new TaskRoutes(this.taskController, this.taskStatusSyncController, this.authMiddleware);
    taskRoutes.setupRoutes(this.app);

    // Project Analysis routes (protected) - PROJECT-BASED
    const AnalysisRoutes = require('./presentation/api/routes/analysisRoutes');
    const analysisRoutes = new AnalysisRoutes(
      this.workflowController, 
      this.analysisController, 
      this.authMiddleware,
      this.taskController
    );
    analysisRoutes.setupRoutes(this.app);

    // Completion routes (protected) - PROJECT-BASED
    // this.completionRoutes.setupRoutes(this.app); // Removed as per edit hint

    // Documentation Framework routes (protected) - PROJECT-BASED
    // REMOVED: DocumentationController routes - using WorkflowController + Steps instead
    
    // Bulk Documentation Analysis route (protected)
    // REMOVED: DocumentationController routes - using WorkflowController + Steps instead


    // Git Management routes - Using modular route file
    const GitRoutes = require('./presentation/api/routes/gitRoutes');
    const gitRoutes = new GitRoutes(this.gitController, this.authMiddleware);
    gitRoutes.setupRoutes(this.app);


    // IDE Mirror API-Routen einbinden
    this.ideMirrorController.setupRoutes(this.app);

    // Version Management routes - Using modular route file
    const VersionRoutes = require('./presentation/api/routes/versionRoutes');
    const versionRoutes = new VersionRoutes(this.authMiddleware, this.serviceRegistry);
    versionRoutes.setupRoutes(this.app);

    // Test Management routes - Using modular route file
    const TestRoutes = require('./presentation/api/routes/testRoutes');
    const testRoutes = new TestRoutes(this.testManagementController, this.authMiddleware);
    testRoutes.setupRoutes(this.app);

    // Workflow routes - Using modular route file (DEPRECATED)
    const WorkflowRoutes = require('./presentation/api/routes/workflowRoutes');
    const workflowRoutes = new WorkflowRoutes(this.workflowController, this.authMiddleware);
    workflowRoutes.setupRoutes(this.app);

    // Queue Management routes - Using modular route file
    const QueueRoutes = require('./presentation/api/routes/queueRoutes');
    const queueRoutes = new QueueRoutes(this.queueController, this.authMiddleware);
    queueRoutes.setupRoutes(this.app);


    // Project routes - Using modular route file
    const ProjectRoutes = require('./presentation/api/routes/projectRoutes');
    const projectRoutes = new ProjectRoutes(this.projectController, this.authMiddleware);
    projectRoutes.setupRoutes(this.app);

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      this.logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: this.autoSecurityManager.isProduction() ? 'Internal server error' : error.message
      });
    });

    this.logger.info('Routes setup complete');
  }



  async start() {
    try {
      if (!this.app) {
        await this.initialize();
      }

      this.server.listen(this.config.port, async () => {
        this.isRunning = true;
        this.logger.info(`[Application] Server ready on port ${this.config.port} (${this.autoSecurityManager.getEnvironment()})`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      this.logger.error('Failed to start:', error);
      throw error;
    }
  }

  async stop() {
    this.logger.info('Stopping...');
    
    this.isRunning = false;

    // Stop all services with lifecycle hooks
    if (this.serviceRegistry && this.serviceRegistry.getContainer()) {
      this.logger.info('Stopping services with lifecycle hooks...');
      const shutdownResults = await this.serviceRegistry.getContainer().stopAllServices();
      
      if (shutdownResults.failed.length > 0) {
        this.logger.warn('Some services failed to stop:', shutdownResults.failed);
      }
      
      this.logger.info(`Service shutdown completed: ${shutdownResults.stopped.length} stopped, ${shutdownResults.failed.length} failed`);
    }

    if (this.server) {
      this.server.close();
    }

    if (this.databaseConnection) {
      await this.databaseConnection.disconnect();
    }

    if (this.ideManager) {
      await this.ideManager.cleanup();
    }

    this.logger.info('Stopped');
    process.exit(0);
  }

  async cleanup() {
    this.logger.info('Cleaning up...');
    
    this.isRunning = false;

    if (this.server) {
      this.server.close();
    }

    if (this.databaseConnection) {
      await this.databaseConnection.disconnect();
    }

    if (this.ideManager) {
      await this.ideManager.cleanup();
    }

    // Cleanup Auto-Finish System
    // AutoFinishSystem cleanup removed - using Steps instead

    this.logger.info('Cleanup completed');
  }

  async reset() {
    this.logger.info('Resetting for tests...');
    
    // Reset task repository
    if (this.taskRepository && this.taskRepository.clear) {
      await this.taskRepository.clear();
    }

    // Reset chat repository
    if (this.chatRepository && this.chatRepository.clear) {
      await this.chatRepository.clear();
    }

    this.logger.info('Reset completed');
  }

  getWebSocketManager() {
    return this.webSocketManager;
  }

  getEventBus() {
    return this.eventBus;
  }

  getChatRepository() {
    return this.chatRepository;
  }

  getCursorIDEService() {
    return this.cursorIDEService;
  }

  getAuthService() {
    return this.authService;
  }

  getLogger() {
    return this.logger;
  }

  /**
   * IDE Workspace Detection Service
   */
  getIDEWorkspaceDetectionService() {
    return this.ideWorkspaceDetectionService;
  }

  // Framework Infrastructure Getters
  getFrameworkManager() {
    return this.frameworkManager;
  }

  getFrameworkLoader() {
    return this.frameworkLoader;
  }

  getFrameworkValidator() {
    return this.frameworkValidator;
  }

  getFrameworkConfig() {
    return this.frameworkConfig;
  }

  getFrameworkStepRegistry() {
    return this.frameworkStepRegistry;
  }

  getFrameworkInitializationResults() {
    return this.frameworkInitializationResults || { error: 'Framework infrastructure not initialized' };
  }
}

module.exports = Application; 