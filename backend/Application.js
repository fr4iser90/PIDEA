
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
const ContentLibraryController = require('./presentation/api/ContentLibraryController');
const AuthController = require('./presentation/api/AuthController');
const TaskController = require('./presentation/api/TaskController');
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
    return {
      info: (message, ...args) => logger.info(message, ...args),
      error: (message, ...args) => logger.error(message, ...args),
      debug: (message, ...args) => {
        if (!this.autoSecurityManager.isProduction()) {
          logger.debug(message, ...args);
        }
      },
      warn: (message, ...args) => logger.warn(message, ...args)
    };
  }

  async initialize() {
    this.logger.info('🔧 Initializing...');

    try {
      // Initialize database connection
      await this.initializeDatabase();

      // Initialize infrastructure
      await this.initializeInfrastructure();

      // Initialize domain services
      await this.initializeDomainServices();

      // Initialize application handlers
      await this.initializeApplicationHandlers();

      // Initialize presentation layer
      await this.initializePresentationLayer();

      // Setup Express app
      this.app = express();
      this.setupMiddleware();
      this.setupRoutes();

      // Create HTTP server
      this.server = http.createServer(this.app);

      // Initialize WebSocket manager with auth
      this.webSocketManager = new WebSocketManager(this.server, this.eventBus, this.authMiddleware);
      this.webSocketManager.initialize();

      // Register WebSocket manager in service registry
      this.serviceRegistry.getContainer().registerSingleton('webSocketManager', this.webSocketManager);

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

      // Setup event handlers
      this.setupEventHandlers();

      // Setup cleanup tasks
      this.setupCleanupTasks();

      // Make application instance globally available
      global.application = this;

      this.logger.info('✅ Initialization complete');
    } catch (error) {
      this.logger.error('Initialization failed:', error);
      throw error;
    }
  }

  async initializeDatabase() {
    this.logger.info('💾 Initializing database...');
    
    // Get database from DI Container
    const { getServiceContainer } = require('./infrastructure/dependency-injection/ServiceContainer');
    const container = getServiceContainer();
    
    if (!container.singletons.has('databaseConnection')) {
      this.databaseConnection = new DatabaseConnection(this.securityConfig.database);
      await this.databaseConnection.connect();
      container.registerSingleton('databaseConnection', this.databaseConnection);
    } else {
      this.databaseConnection = container.resolve('databaseConnection');
    }
    
    this.logger.info(`✅ Database connected: ${this.databaseConnection.getType()}`);
    
    // Initialize database migrations
    const DatabaseMigrationService = require('./infrastructure/database/DatabaseMigrationService');
    this.migrationService = new DatabaseMigrationService(this.databaseConnection);
    await this.migrationService.initialize();
    
    // Check if default user exists
    await this.checkDefaultUser();
  }

  async checkDefaultUser() {
    try {
      // Wait a moment for database to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if database is connected
      if (!this.databaseConnection || !this.databaseConnection.isConnected()) {
        this.logger.warn('⚠️ Database not ready, skipping user check for now...');
        return;
      }
      
      const dbType = this.databaseConnection.getType();
      const param = dbType === 'postgresql' ? '$1' : '?';
      
      const checkResult = await this.databaseConnection.query(
        `SELECT id, email, username FROM users WHERE id = ${param}`,
        ['me']
      );
      
      if (!checkResult || checkResult.length === 0) {
        this.logger.warn('⚠️ No default user found, creating one automatically...');
        
        // Try to create default user automatically
        try {
          const createDefaultUser = require('./scripts/create-default-user');
          await createDefaultUser();
          this.logger.info('✅ Default user created automatically');
        } catch (createError) {
          this.logger.error('❌ Could not create default user automatically:', createError.message);
          this.logger.error('📝 Please run manually: node scripts/create-default-user.js');
          process.exit(0);
        }
      } else {
        this.logger.info('✅ Default user found in database');
      }
    } catch (error) {
      this.logger.warn('⚠️ Could not check for default user, continuing anyway:', error.message);
      // Don't exit, just continue - the user might be created later
    }
  }

  async initializeInfrastructure() {
    this.logger.info('🏗️ Initializing infrastructure...');

    // Initialize Step Registry FIRST (before DI)
    const { initializeSteps } = require('./domain/steps');
    await initializeSteps();
    this.stepRegistry = require('./domain/steps').getStepRegistry();
    this.logger.info('Step Registry initialized');

    // Initialize DI system
    const { getServiceRegistry } = require('./infrastructure/dependency-injection/ServiceRegistry');
    const { getProjectContextService } = require('./infrastructure/dependency-injection/ProjectContextService');
    
    this.serviceRegistry = getServiceRegistry();
    this.projectContext = getProjectContextService();
    
    // Register all services (including handlers)
    this.serviceRegistry.registerAllServices();
    
    // Register the logger service with the actual logger instance
    this.serviceRegistry.getContainer().registerSingleton('logger', this.logger);
    
    // Replace the DI container's database connection with the properly configured one
    this.serviceRegistry.getContainer().registerSingleton('databaseConnection', this.databaseConnection);

    // Get services from DI container with consistent error handling
    try {
        this.browserManager = this.serviceRegistry.getService('browserManager');
        this.ideManager = this.serviceRegistry.getService('ideManager');
        this.chatRepository = this.serviceRegistry.getService('chatRepository');
        this.eventBus = this.serviceRegistry.getService('eventBus');
        
        // Initialize command and query buses
        this.commandBus = this.serviceRegistry.getService('commandBus');
        this.queryBus = this.serviceRegistry.getService('queryBus');

        // Initialize repositories
        this.userRepository = this.serviceRegistry.getService('userRepository');
        this.userSessionRepository = this.serviceRegistry.getService('userSessionRepository');

        // IDE Services
        this.ideWorkspaceDetectionService = this.serviceRegistry.getService('ideWorkspaceDetectionService');

        // Initialize file system service for strategies
        this.fileSystemService = this.serviceRegistry.getService('fileSystemService');

        // Get strategies through DI
        this.monorepoStrategy = this.serviceRegistry.getService('monorepoStrategy');
        this.singleRepoStrategy = this.serviceRegistry.getService('singleRepoStrategy');
    } catch (error) {
        this.logger.error('Failed to get infrastructure services:', error.message);
        throw error; // Re-throw because these are critical services
    }

    this.logger.info('✅ Infrastructure initialized with DI');
  }

  async initializeDomainServices() {
    this.logger.info('🔧 Initializing domain services with automatic dependency resolution...');

    // Validate dependency resolution before getting services
    const validation = this.serviceRegistry.getContainer().validateDependencies();
    if (!validation.isValid) {
        this.logger.error('Dependency validation failed:', validation);
        throw new Error(`Dependency validation failed: ${JSON.stringify(validation)}`);
    }

    // Get services through DI container with automatic dependency resolution
    try {
        // Core services
        this.cursorIDEService = this.serviceRegistry.getService('cursorIDEService');
        this.authService = this.serviceRegistry.getService('authService');
        this.aiService = this.serviceRegistry.getService('aiService');
        this.recommendationsService = this.serviceRegistry.getService('recommendationsService');
        this.subprojectDetector = this.serviceRegistry.getService('subprojectDetector');
        this.analysisOutputService = this.serviceRegistry.getService('analysisOutputService');
        this.analysisRepository = this.serviceRegistry.getService('analysisRepository');
        this.projectRepository = this.serviceRegistry.getService('projectRepository');
        this.projectMappingService = this.serviceRegistry.getService('projectMappingService');
        this.taskRepository = this.serviceRegistry.getService('taskRepository');
        this.taskExecutionRepository = this.serviceRegistry.getService('taskExecutionRepository');
        this.taskService = this.serviceRegistry.getService('taskService');
        this.taskValidationService = this.serviceRegistry.getService('taskValidationService');
        this.taskAnalysisService = this.serviceRegistry.getService('taskAnalysisService');
        this.monorepoStrategy = this.serviceRegistry.getService('monorepoStrategy');
        this.singleRepoStrategy = this.serviceRegistry.getService('singleRepoStrategy');

        // Workflow and orchestration services
        this.workflowOrchestrationService = this.serviceRegistry.getService('workflowOrchestrationService');
        this.gitService = this.serviceRegistry.getService('gitService');
        this.testOrchestrator = this.serviceRegistry.getService('testOrchestrator');
        
        // Get WorkflowLoaderService from service registry and initialize it
        this.workflowLoaderService = this.serviceRegistry.getService('workflowLoaderService');
        await this.workflowLoaderService.loadWorkflows();
        this.logger.info('✅ WorkflowLoaderService loaded and initialized from service registry');

            // Log dependency statistics
    const stats = this.serviceRegistry.getContainer().getDependencyStats();
    this.logger.info('Dependency resolution statistics:', stats);

    // Start all services with lifecycle hooks
    this.logger.info('Starting services with lifecycle hooks...');
    const startupResults = await this.serviceRegistry.getContainer().startAllServices();
    
    if (startupResults.failed.length > 0) {
        this.logger.warn('Some services failed to start:', startupResults.failed);
    }
    
    this.logger.info(`Service startup completed: ${startupResults.started.length} started, ${startupResults.failed.length} failed`);

    } catch (error) {
        this.logger.error('Failed to get domain services:', error.message);
        
        // Get detailed dependency information for debugging
        const dependencyInfo = this.serviceRegistry.getContainer().getAllDependencyInfo();
        this.logger.error('Dependency information:', dependencyInfo);
        
        throw error; // Re-throw because these are critical services
    }

    // Set up project context AFTER repositories are available
    await this.setupProjectContext();

    // Update step registry with service registry for dependency injection
    if (this.stepRegistry && this.serviceRegistry) {
        this.stepRegistry.serviceRegistry = this.serviceRegistry;
        this.logger.info('Step Registry updated with DI container');
    }

    // Initialize Auto-Finish System
    this.taskSessionRepository = this.databaseConnection.getRepository('TaskSession');
    await this.taskSessionRepository.initialize();

    // Auto Test Fix System - Now converted to workflow
    // this.autoTestFixSystem = new AutoTestFixSystem({
    //   cursorIDE: this.cursorIDEService,
    //   browserManager: this.browserManager,
    //   ideManager: this.ideManager,
    //   webSocketManager: this.webSocketManager,
    //   taskRepository: this.taskRepository,
    //   workflowOrchestrationService: this.workflowOrchestrationService,
    //   gitService: this.gitService,
    //   eventBus: this.eventBus,
    //   logger: this.logger,
    //   testOrchestrator: this.testOrchestrator
    // });
    // await this.autoTestFixSystem.initialize();

    // Step Registry already initialized in initializeInfrastructure()
    // Update it with service registry for dependency injection
    if (this.stepRegistry && this.serviceRegistry) {
      this.stepRegistry.serviceRegistry = this.serviceRegistry;
      this.logger.info('Step Registry updated with DI container');
    }

    // Initialize Framework Infrastructure
    try {
      const { initializeFrameworkInfrastructure } = require('./infrastructure/framework');
      const frameworkInfrastructure = await initializeFrameworkInfrastructure(this.stepRegistry);
      this.frameworkManager = frameworkInfrastructure.manager;
      this.frameworkLoader = frameworkInfrastructure.loader;
      this.frameworkValidator = frameworkInfrastructure.validator;
      this.frameworkConfig = frameworkInfrastructure.config;
      this.frameworkStepRegistry = frameworkInfrastructure.stepRegistry;
      this.logger.info('Framework Infrastructure initialized');
    } catch (error) {
      this.logger.warn('Framework Infrastructure initialization failed, continuing without framework support:', error.message);
      // Create fallback framework services
      this.frameworkManager = { 
        activateFramework: () => Promise.resolve({}),
        deactivateFramework: () => Promise.resolve(true),
        getActiveFramework: () => null,
        getAllActiveFrameworks: () => []
      };
      this.frameworkLoader = { getStats: () => ({}) };
      this.frameworkValidator = { validateFramework: () => Promise.resolve({ isValid: true }) };
      this.frameworkConfig = { getConfigStats: () => ({}) };
      this.frameworkStepRegistry = { 
        getFrameworkSteps: () => [], 
        isFrameworkStep: () => false,
        getLoadedFrameworks: () => []
      };
    }

    this.logger.info('Domain services initialized with DI');
  }

  async setupProjectContext() {
    this.logger.info('📁 Setting up project context...');
    
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
      this.logger.warn('Project context validation warnings:', validation.warnings);
    } else {
      this.logger.info('✅ Project context validated successfully');
    }
  }

  async initializeApplicationHandlers() {
    this.logger.info('Initializing application handlers with DI...');

    // Instantiate handlers with dependencies from ServiceRegistry
    const SendMessageHandler = require('./application/handlers/categories/chat/SendMessageHandler');
    const GetChatHistoryHandler = require('./application/handlers/categories/chat/GetChatHistoryHandler');
    const CreateTaskHandler = require('./application/handlers/categories/workflow/CreateTaskHandler');

    // Create handler instances with dependencies
    this.sendMessageHandler = new SendMessageHandler({
      browserManager: this.serviceRegistry.getService('browserManager'),
      ideManager: this.serviceRegistry.getService('ideManager'),
      eventBus: this.serviceRegistry.getService('eventBus'),
      logger: this.serviceRegistry.getService('logger')
    });

    this.getChatHistoryHandler = new GetChatHistoryHandler(
      this.serviceRegistry.getService('chatRepository'),
      this.serviceRegistry.getService('ideManager'),
      this.serviceRegistry,
      this.serviceRegistry.getService('chatCacheService')
    );

    this.createTaskHandler = new CreateTaskHandler({
      taskRepository: this.serviceRegistry.getService('taskRepository'),
      taskTemplateRepository: this.serviceRegistry.getService('taskTemplateRepository'),
                  analysisRepository: this.serviceRegistry.getService('analysisRepository'),
      taskValidationService: this.serviceRegistry.getService('taskValidationService'),
      taskGenerationService: this.serviceRegistry.getService('taskGenerationService'),
      eventBus: this.serviceRegistry.getService('eventBus'),
      logger: this.serviceRegistry.getService('logger')
    });

    // Register handlers in ServiceRegistry for steps to access
    this.serviceRegistry.container.register('sendMessageHandler', () => this.sendMessageHandler, { singleton: true });
    this.serviceRegistry.container.register('getChatHistoryHandler', () => this.getChatHistoryHandler, { singleton: true });
    this.serviceRegistry.container.register('createTaskHandler', () => this.createTaskHandler, { singleton: true });
    
    // Register CreateChatHandler for steps
    const CreateChatHandler = require('./application/handlers/categories/chat/CreateChatHandler');
    this.createChatHandler = new CreateChatHandler({
      chatSessionService: this.serviceRegistry.getService('chatSessionService'),
      ideManager: this.serviceRegistry.getService('ideManager'),
      browserManager: this.serviceRegistry.getService('browserManager'),
      eventBus: this.serviceRegistry.getService('eventBus'),
      logger: this.serviceRegistry.getService('logger')
    });
    this.serviceRegistry.container.register('createChatHandler', () => this.createChatHandler, { singleton: true });

    // Legacy handlers removed - using new workflow system instead
    this.processTodoListHandler = null;

    this.logger.info('Application handlers initialized with DI');
  }

  async initializePresentationLayer() {
    this.logger.info('Initializing presentation layer...');

    // Initialize auth middleware
    this.authMiddleware = new AuthMiddleware(this.authService);

    // Initialize controllers with Application Services
    this.authController = this.serviceRegistry.getService('authController');
    
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

    const WorkflowController = require('./presentation/api/WorkflowController');
    this.workflowController = new WorkflowController({
        workflowApplicationService: this.serviceRegistry.getService('workflowApplicationService'),
        analysisApplicationService: this.serviceRegistry.getService('analysisApplicationService'),
        analysisRepository: this.serviceRegistry.getService('analysisRepository'),
        ideManager: this.serviceRegistry.getService('ideManager'),
        taskService: this.serviceRegistry.getService('taskService'),
        queueMonitoringService: this.serviceRegistry.getService('queueMonitoringService'),
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
        queueMonitoringService: this.serviceRegistry.getService('queueMonitoringService'),
        stepProgressService: this.serviceRegistry.getService('stepProgressService'),
        executionQueue: this.serviceRegistry.getService('executionQueue'),
        queueHistoryService: this.serviceRegistry.getService('queueHistoryService'),
        workflowTypeDetector: this.serviceRegistry.getService('workflowTypeDetector'),
        eventBus: this.eventBus,
        logger: this.serviceRegistry.getService('logger')
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

  setupMiddleware() {
    this.logger.info('Setting up middleware...');

    // Import centralized security configuration
    const securityConfig = require('./config/security-config');

    // Security middleware
    this.app.use(helmet(securityConfig.config.helmet));
    this.app.use(cors({
      ...securityConfig.config.cors,
      credentials: true // Allow cookies
    }));

    // HTTP Parameter Pollution protection
    this.app.use(hpp());

    // Progressive rate limiting (slow down) - only for unauthenticated users
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 20, // allow 20 requests per 15 minutes for visitors, then...
      delayMs: 1000, // begin adding 1000ms of delay per request above 20
      skip: (req) => {
        // Skip rate limiting for authenticated users
        return req.user || req.path === '/api/health';
      },
      onLimitReached: (req, res) => {
        // Redirect content library requests to GitHub
        if (req.path.includes('/api/frameworks') || req.path.includes('/api/prompts') || req.path.includes('/api/templates')) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded for content library',
            message: 'Please visit our GitHub repository for direct access to frameworks, prompts, and templates',
            githubUrl: 'https://github.com/fr4iser90/PIDEA'
          });
        }
      }
    });
    this.app.use('/api/', speedLimiter);

    // Standard rate limiting
    const limiter = rateLimit({
      ...securityConfig.config.rateLimiting,
      skip: (req) => {
        // Skip rate limiting for authenticated users and public content
        return req.user || 
               req.path === '/api/health' || 
               req.path.startsWith('/web/') || 
               req.path.startsWith('/framework/') ||
               req.path.startsWith('/api/frameworks') ||
               req.path.startsWith('/api/prompts') ||
               req.path.startsWith('/api/templates');
      }
    });
    this.app.use('/api/', limiter);

    // Cookie parsing
    this.app.use(cookieParser());

    // Body parsing with security limits
    this.app.use(express.json({ 
      limit: securityConfig.config.inputValidation.limits.maxBodySize,
      strict: true
    }));
    this.app.use(express.urlencoded({ 
      extended: true,
      limit: securityConfig.config.inputValidation.limits.maxBodySize
    }));

    // Request logging entfernt auf Wunsch des Users

    // Serve static files with security headers
    this.app.use('/web', express.static(path.join(__dirname, '../web'), {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        // Add security headers to static files
        Object.entries(securityConfig.config.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
    }));

    this.app.use('/framework', require('express').static(path.join(__dirname, '../framework')));
  }

  setupRoutes() {
    this.logger.info('Setting up routes...');

    // Serve the main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });

    // Health check (public)
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: this.autoSecurityManager.getEnvironment(),
          database: this.databaseConnection.getType()
        }
      });
    });

    // Auth routes (public) with brute force protection
    this.app.post('/api/auth/login', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.login(req, res));
    this.app.post('/api/auth/refresh', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.refresh(req, res));
    this.app.get('/api/auth/validate', (req, res) => this.authController.validateToken(req, res));

    // Protected routes
    this.app.use('/api/auth/profile', this.authMiddleware.authenticate());
    this.app.get('/api/auth/profile', (req, res) => this.authController.getProfile(req, res));
    this.app.put('/api/auth/profile', (req, res) => this.authController.updateProfile(req, res));
    this.app.get('/api/auth/sessions', (req, res) => this.authController.getSessions(req, res));
    this.app.post('/api/auth/logout', this.authMiddleware.authenticate(), (req, res) => this.authController.logout(req, res));

    // Chat routes (protected) - no rate limiting for authenticated users
    this.app.use('/api/chat', this.authMiddleware.authenticate());
    this.app.post('/api/chat', (req, res) => this.webChatController.sendMessage(req, res));
    this.app.get('/api/chat/history', (req, res) => this.webChatController.getChatHistory(req, res));
    this.app.get('/api/chat/port/:port/history', (req, res) => this.webChatController.getPortChatHistory(req, res));
    this.app.get('/api/chat/status', (req, res) => this.webChatController.getConnectionStatus(req, res));

    // Settings routes (protected)
    this.app.use('/api/settings', this.authMiddleware.authenticate());
    this.app.get('/api/settings', (req, res) => this.webChatController.getSettings(req, res));

    // Prompts routes (protected)
    this.app.use('/api/prompts', this.authMiddleware.authenticate());
    this.app.get('/api/prompts/quick', (req, res) => this.webChatController.getQuickPrompts(req, res));

    // IDE routes (protected)
    this.app.use('/api/ide', this.authMiddleware.authenticate());
    this.app.get('/api/ide/available', (req, res) => this.ideController.getAvailableIDEs(req, res));
    this.app.get('/api/ide/features', (req, res) => this.ideFeatureController.getIDEFeatures(req, res));
    this.app.post('/api/ide/start', (req, res) => this.ideController.startIDE(req, res));
    this.app.post('/api/ide/switch/:port', (req, res) => this.ideController.switchIDE(req, res));
    this.app.delete('/api/ide/stop/:port', (req, res) => this.ideController.stopIDE(req, res));
    this.app.get('/api/ide/status', (req, res) => this.ideController.getStatus(req, res));
    this.app.post('/api/ide/restart-app', (req, res) => this.ideController.restartUserApp(req, res));
    this.app.get('/api/ide/user-app-url', (req, res) => this.ideController.getUserAppUrl(req, res));
    this.app.get('/api/ide/user-app-url/:port', (req, res) => this.ideController.getUserAppUrlForPort(req, res));
    this.app.post('/api/ide/monitor-terminal', (req, res) => this.ideController.monitorTerminal(req, res));
    this.app.post('/api/ide/set-workspace/:port', (req, res) => this.ideController.setWorkspacePath(req, res));
    this.app.get('/api/ide/workspace-info', (req, res) => this.ideController.getWorkspaceInfo(req, res));
    this.app.post('/api/ide/detect-workspace-paths', (req, res) => this.ideController.detectWorkspacePaths(req, res));
    this.app.post('/api/ide/new-chat/:port', (req, res) => this.ideController.clickNewChat(req, res));

    // VSCode-specific routes (protected)
    this.app.post('/api/ide/start-vscode', (req, res) => this.ideController.startVSCode(req, res));
    this.app.get('/api/ide/vscode/:port/extensions', (req, res) => this.ideController.getVSCodeExtensions(req, res));
    this.app.get('/api/ide/vscode/:port/workspace-info', (req, res) => this.ideController.getVSCodeWorkspaceInfo(req, res));
    this.app.post('/api/ide/vscode/send-message', (req, res) => this.ideController.sendMessageToVSCode(req, res));
    this.app.get('/api/ide/vscode/:port/status', (req, res) => this.ideController.getVSCodeStatus(req, res));

    // Workspace Detection routes (protected)
    this.app.get('/api/ide/workspace-detection', (req, res) => this.ideController.detectAllWorkspaces(req, res));
    this.app.get('/api/ide/workspace-detection/:port', (req, res) => this.ideController.detectWorkspaceForIDE(req, res));
    this.app.post('/api/ide/workspace-detection/:port', (req, res) => this.ideController.forceDetectWorkspaceForIDE(req, res));
    this.app.get('/api/ide/workspace-detection/stats', (req, res) => this.ideController.getDetectionStats(req, res));
    this.app.delete('/api/ide/workspace-detection/results', (req, res) => this.ideController.clearDetectionResults(req, res));
    this.app.post('/api/ide/workspace-detection/:port/execute', (req, res) => this.ideController.executeTerminalCommand(req, res));

    // File explorer routes (protected)
    this.app.use('/api/files', this.authMiddleware.authenticate());
    this.app.get('/api/files', async (req, res) => {
      try {
        const fileTree = await this.browserManager.getFileExplorerTree();
        res.json({
          success: true,
          data: fileTree
        });
      } catch (error) {
        this.logger.error('Error getting file tree:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file tree'
        });
      }
    });

    this.app.get('/api/files/content', async (req, res) => {
      try {
        const filePath = req.query.path;
        this.logger.info('/api/files/content called with path:', '[REDACTED_FILE_PATH]');
        if (!filePath) {
          return res.status(400).json({
            success: false,
            error: 'File path is required'
          });
        }
        const content = await this.browserManager.getFileContent(filePath);
        res.json({
          success: true,
          data: {
            path: filePath,
            content: content
          }
        });
      } catch (error) {
        this.logger.error('Error getting file content:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file content'
        });
      }
    });

    // Content Library routes (protected) - MUST BE BEFORE GENERIC AUTH MIDDLEWARE
    this.app.get('/api/frameworks', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getFrameworks(req, res));
    this.app.get('/api/frameworks/:frameworkId/prompts', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getFrameworkPrompts(req, res));
    this.app.get('/api/frameworks/:frameworkId/templates', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getFrameworkTemplates(req, res));
    this.app.get('/api/frameworks/:frameworkId/prompts/:filename', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getFrameworkPromptFile(req, res));
    this.app.get('/api/frameworks/:frameworkId/templates/:filename', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getFrameworkTemplateFile(req, res));
    this.app.get('/api/prompts', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getPrompts(req, res));
    this.app.get('/api/prompts/:category/:filename', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getPromptFile(req, res));
    this.app.get('/api/templates', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getTemplates(req, res));
    this.app.get('/api/templates/:category/:filename', this.authMiddleware.authenticate(), (req, res) => this.ContentLibraryController.getTemplateFile(req, res));

    // Task Management routes (protected) - PROJECT-BASED (CRUD only, no execution)
    this.app.use('/api/projects/:projectId/tasks', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/tasks', (req, res) => this.taskController.createTask(req, res));
    this.app.get('/api/projects/:projectId/tasks', (req, res) => this.taskController.getProjectTasks(req, res));
    this.app.get('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.getTask(req, res));
    this.app.put('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.updateTask(req, res));
    this.app.delete('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.deleteTask(req, res));
    this.app.get('/api/projects/:projectId/tasks/:id/execution', (req, res) => this.taskController.getTaskExecution(req, res));
    this.app.post('/api/projects/:projectId/tasks/:id/cancel', (req, res) => this.taskController.cancelTask(req, res));
    
    // NEW: Sync manual tasks route
    this.app.post('/api/projects/:projectId/tasks/sync-manual', (req, res) => this.taskController.syncManualTasks(req, res));
    // NEW: Clean manual tasks route
    this.app.post('/api/projects/:projectId/tasks/clean-manual', (req, res) => this.taskController.cleanManualTasks(req, res));

    // Project Analysis routes (protected) - PROJECT-BASED
    const AnalysisRoutes = require('./presentation/api/routes/analysis');
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

    // Script Generation routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/scripts', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/scripts/generate', (req, res) => this.taskController.generateScript(req, res));
    this.app.get('/api/projects/:projectId/scripts', (req, res) => this.taskController.getGeneratedScripts(req, res));
    this.app.post('/api/projects/:projectId/scripts/:id/execute', (req, res) => this.taskController.executeScript(req, res));

    // Git Management routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/git', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/git/status', (req, res) => this.gitController.getStatus(req, res));
    this.app.post('/api/projects/:projectId/git/branches', (req, res) => this.gitController.getBranches(req, res));
    this.app.post('/api/projects/:projectId/git/validate', (req, res) => this.gitController.validate(req, res));
    this.app.post('/api/projects/:projectId/git/compare', (req, res) => this.gitController.compare(req, res));
    this.app.post('/api/projects/:projectId/git/pull', (req, res) => this.gitController.pull(req, res));
    this.app.post('/api/projects/:projectId/git/checkout', (req, res) => this.gitController.checkout(req, res));
    this.app.post('/api/projects/:projectId/git/merge', (req, res) => this.gitController.merge(req, res));
    this.app.post('/api/projects/:projectId/git/create-branch', (req, res) => this.gitController.createBranch(req, res));
    this.app.post('/api/projects/:projectId/git/info', (req, res) => this.gitController.getRepositoryInfo(req, res));
    
    // Pidea-Agent Git routes (protected) - PROJECT-BASED
    this.app.post('/api/projects/:projectId/git/pull-pidea-agent', (req, res) => this.gitController.pullPideaAgent(req, res));
    this.app.post('/api/projects/:projectId/git/merge-to-pidea-agent', (req, res) => this.gitController.mergeToPideaAgent(req, res));
    this.app.post('/api/projects/:projectId/git/pidea-agent-status', (req, res) => this.gitController.getPideaAgentStatus(req, res));
    this.app.post('/api/projects/:projectId/git/compare-pidea-agent', (req, res) => this.gitController.compareWithPideaAgent(req, res));

    // Terminal Log routes (protected)
    this.app.use('/api/terminal-logs/:port', this.authMiddleware.authenticate());
    this.app.post('/api/terminal-logs/:port/initialize', (req, res) => this.ideController.initializeTerminalLogCapture(req, res));
    this.app.post('/api/terminal-logs/:port/execute', (req, res) => this.ideController.executeTerminalCommandWithCapture(req, res));
    this.app.get('/api/terminal-logs/:port', (req, res) => this.ideController.getTerminalLogs(req, res));
    this.app.get('/api/terminal-logs/:port/search', (req, res) => this.ideController.searchTerminalLogs(req, res));
    this.app.get('/api/terminal-logs/:port/export', (req, res) => this.ideController.exportTerminalLogs(req, res));
    this.app.delete('/api/terminal-logs/:port', (req, res) => this.ideController.deleteTerminalLogs(req, res));
    this.app.get('/api/terminal-logs/:port/capture-status', (req, res) => this.ideController.getTerminalLogCaptureStatus(req, res));

    // IDE Mirror API-Routen einbinden
    this.ideMirrorController.setupRoutes(this.app);

    // Workflow routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/workflow', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/workflow/execute', (req, res) => this.workflowController.executeWorkflow(req, res));
    this.app.get('/api/projects/:projectId/workflow/status', (req, res) => this.workflowController.getWorkflowStatus(req, res));
    this.app.post('/api/projects/:projectId/workflow/stop', (req, res) => this.workflowController.stopWorkflow(req, res));
    this.app.get('/api/projects/:projectId/workflow/health', (req, res) => this.workflowController.healthCheck(req, res));

    // Queue Management routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/queue', this.authMiddleware.authenticate());
    this.app.get('/api/projects/:projectId/queue/status', (req, res) => this.queueController.getQueueStatus(req, res));
    this.app.post('/api/projects/:projectId/queue/add', (req, res) => this.queueController.addToQueue(req, res));
    this.app.delete('/api/projects/:projectId/queue/:itemId', (req, res) => this.queueController.cancelQueueItem(req, res));
    this.app.put('/api/projects/:projectId/queue/:itemId/priority', (req, res) => this.queueController.updateQueueItemPriority(req, res));
    this.app.get('/api/projects/:projectId/queue/:itemId/step-progress', (req, res) => this.queueController.getStepProgress(req, res));
    this.app.post('/api/projects/:projectId/queue/:itemId/step/:stepId/toggle', (req, res) => this.queueController.toggleStepStatus(req, res));
    
    // Queue History routes (protected) - PROJECT-BASED
    this.app.get('/api/projects/:projectId/queue/history', (req, res) => this.queueController.getQueueHistory(req, res));
    this.app.get('/api/projects/:projectId/queue/history/statistics', (req, res) => this.queueController.getHistoryStatistics(req, res));
    this.app.get('/api/projects/:projectId/queue/history/export', (req, res) => this.queueController.exportHistory(req, res));
    this.app.delete('/api/projects/:projectId/queue/history', (req, res) => this.queueController.deleteHistory(req, res));
    this.app.get('/api/projects/:projectId/queue/history/:historyId', (req, res) => this.queueController.getHistoryItem(req, res));
    
    // Workflow Type Detection routes (protected) - PROJECT-BASED
    this.app.post('/api/projects/:projectId/queue/type-detect', (req, res) => this.queueController.detectWorkflowType(req, res));
    this.app.get('/api/projects/:projectId/queue/types', (req, res) => this.queueController.getWorkflowTypes(req, res));
    this.app.get('/api/projects/:projectId/queue/statistics', (req, res) => this.queueController.getQueueStatistics(req, res));
    this.app.delete('/api/projects/:projectId/queue/completed', (req, res) => this.queueController.clearCompletedItems(req, res));


    // Project routes (protected)
    this.app.use('/api/projects', this.authMiddleware.authenticate());
    this.app.get('/api/projects', (req, res) => this.projectController.list(req, res));
    this.app.get('/api/projects/:id', (req, res) => this.projectController.getById(req, res));
    this.app.get('/api/projects/ide-port/:idePort', (req, res) => this.projectController.getByIDEPort(req, res));
    this.app.post('/api/projects/:id/save-port', (req, res) => this.projectController.savePort(req, res));
    this.app.put('/api/projects/:id/port', (req, res) => this.projectController.updatePort(req, res));

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

  setupEventHandlers() {
    this.logger.info('Setting up event handlers...');

    if (this.eventBus) {
      this.logger.info('EventBus available, setting up subscriptions...');
      this.eventBus.subscribe('ide-started', (data) => {
        this.logger.info('IDE started:', '[REDACTED_IDE_DATA]');
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('ide-started', data);
        }
      });

      this.eventBus.subscribe('ide-stopped', (data) => {
        this.logger.info('IDE stopped:', '[REDACTED_IDE_DATA]');
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('ide-stopped', data);
        }
      });

      this.eventBus.subscribe('chat-message', (data) => {
        this.logger.info('Chat message:', '[REDACTED_CHAT_DATA]');
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('chat-message', data);
        }
      });

      this.eventBus.subscribe('MessageSent', (data) => {
        this.logger.info('Message sent event:', '[REDACTED_MESSAGE_DATA]');
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('chat-message', data);
        }
      });

      this.eventBus.subscribe('ChatHistoryUpdated', (data) => {
        this.logger.info('Chat history updated event:', '[REDACTED_HISTORY_DATA]');
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('chat-history-updated', data);
        }
      });

      this.eventBus.subscribe('userAppDetected', (data) => {
        this.logger.info('User app detected event:', '[REDACTED_APP_DATA]');
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToAll('userAppUrl', data);
        }
      });

      this.eventBus.subscribe('activeIDEChanged', (data) => {
        this.logger.info('Active IDE changed event:', '[REDACTED_IDE_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting activeIDEChanged to all clients');
          this.webSocketManager.broadcastToAll('activeIDEChanged', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting activeIDEChanged');
        }
      });

      this.eventBus.subscribe('analysis:completed', (data) => {
        this.logger.info('Analysis completed event:', '[REDACTED_ANALYSIS_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting analysis:completed to all clients');
          this.webSocketManager.broadcastToAll('analysis:completed', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting analysis:completed');
        }
      });

      // Queue Events
      this.eventBus.subscribe('queue:item:added', (data) => {
        this.logger.info('Queue item added event:', '[REDACTED_QUEUE_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting queue:item:added to all clients');
          this.webSocketManager.broadcastToAll('queue:item:added', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting queue:item:added');
        }
      });

      this.eventBus.subscribe('queue:item:updated', (data) => {
        this.logger.info('Queue item updated event:', '[REDACTED_QUEUE_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting queue:item:updated to all clients');
          this.webSocketManager.broadcastToAll('queue:item:updated', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting queue:item:updated');
        }
      });

      this.eventBus.subscribe('queue:item:completed', (data) => {
        this.logger.info('Queue item completed event:', '[REDACTED_QUEUE_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting queue:item:completed to all clients');
          this.webSocketManager.broadcastToAll('queue:item:completed', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting queue:item:completed');
        }
      });

      // Workflow Events
      this.eventBus.subscribe('workflow:step:progress', (data) => {
        this.logger.info('Workflow step progress event:', '[REDACTED_WORKFLOW_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting workflow:step:progress to all clients');
          this.webSocketManager.broadcastToAll('workflow:step:progress', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting workflow:step:progress');
        }
      });

      this.eventBus.subscribe('workflow:step:completed', (data) => {
        this.logger.info('Workflow step completed event:', '[REDACTED_WORKFLOW_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting workflow:step:completed to all clients');
          this.webSocketManager.broadcastToAll('workflow:step:completed', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting workflow:step:completed');
        }
      });

      this.eventBus.subscribe('workflow:step:failed', (data) => {
        this.logger.info('Workflow step failed event:', '[REDACTED_WORKFLOW_DATA]');
        if (this.webSocketManager) {
          this.logger.info('Broadcasting workflow:step:failed to all clients');
          this.webSocketManager.broadcastToAll('workflow:step:failed', data);
        } else {
          this.logger.warn('No WebSocket manager available for broadcasting workflow:step:failed');
        }
      });
    } else {
      this.logger.warn('No EventBus available for setting up event handlers');
    }

    this.logger.info('Event handlers setup complete');
  }

  setupCleanupTasks() {
    this.logger.info('Setting up cleanup tasks...');

    // Cleanup expired sessions every 15 minutes
    setInterval(async () => {
      try {
        const result = await this.authService.cleanupExpiredSessions();
        this.logger.info(`Cleaned up ${result.expired} expired and ${result.orphaned} orphaned sessions`);
      } catch (error) {
        this.logger.error('Failed to cleanup expired sessions:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Cleanup old secrets every day
    setInterval(async () => {
      try {
        await this.autoSecurityManager.cleanupOldSecrets();
        this.logger.info('Cleaned up old secrets');
      } catch (error) {
        this.logger.error('Failed to cleanup old secrets:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Cleanup old Auto-Finish sessions every 6 hours
    setInterval(async () => {
      try {
        if (this.taskSessionRepository) {
          await this.taskSessionRepository.cleanupOldSessions(7); // Keep sessions for 7 days
          this.logger.info('Cleaned up old Auto-Finish sessions');
        }
      } catch (error) {
        this.logger.error('Failed to cleanup old Auto-Finish sessions:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    this.logger.info('Cleanup tasks setup complete');
  }

  async start() {
    try {
      this.logger.info('Starting...');
      
      if (!this.app) {
        await this.initialize();
      }

      this.server.listen(this.config.port, async () => {
        this.isRunning = true;
        this.logger.info(`Server running on port ${this.config.port}`);
        this.logger.info(`Environment: ${this.autoSecurityManager.getEnvironment()}`);
        this.logger.info(`Database: ${this.databaseConnection.getType()}`);
        this.logger.info(`Auto-security: ${this.autoSecurityManager.isProduction() ? 'Production' : 'Development'}`);
        
        // DISABLED: Automatic workspace detection to prevent duplicate terminal commands
        this.logger.info('Automatic workspace detection disabled - will be triggered manually when needed');
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
}

module.exports = Application; 