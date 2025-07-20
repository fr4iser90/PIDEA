
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
const CursorIDEService = require('./domain/services/CursorIDEService');
const AuthService = require('./domain/services/AuthService');
const TaskService = require('./domain/services/TaskService');
const TaskRepository = require('./domain/repositories/TaskRepository');
const TaskValidationService = require('./domain/services/TaskValidationService');

// Auto-Finish System
const AutoFinishSystem = require('./domain/services/auto-finish/AutoFinishSystem');
const TaskSession = require('./domain/entities/TaskSession');
const TodoTask = require('./domain/entities/TodoTask');

// Auto Test Fix System
const AutoTestFixSystem = require('./domain/services/auto-test/AutoTestFixSystem');

// Application
const SendMessageCommand = require('@categories/management/SendMessageCommand');
const GetChatHistoryQuery = require('@application/queries/GetChatHistoryQuery');
const SendMessageHandler = require('@handler-categories/management/SendMessageHandler');
const GetChatHistoryHandler = require('@handler-categories/management/GetChatHistoryHandler');
const CreateTaskHandler = require('@handler-categories/management/CreateTaskHandler');
const ProcessTodoListCommand = require('@categories/management/ProcessTodoListCommand');
const ProcessTodoListHandler = require('@handler-categories/management/ProcessTodoListHandler');

// Application handlers - Categories-based only

// Infrastructure - Only keep what's not in DI
const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
const AuthMiddleware = require('./infrastructure/auth/AuthMiddleware');

// Presentation - Only keep what's not in DI
const ChatController = require('./presentation/api/ChatController');
const IDEController = require('./presentation/api/IDEController');
const IDEFeatureController = require('./presentation/api/ide/IDEFeatureController');
const IDEMirrorController = require('./presentation/api/IDEMirrorController');
const ContentLibraryController = require('./presentation/api/ContentLibraryController');
const AuthController = require('./presentation/api/AuthController');
const TaskController = require('./presentation/api/TaskController');
const WorkflowController = require('./presentation/api/WorkflowController');
const AutoFinishController = require('./presentation/api/AutoFinishController');
const AnalysisController = require('./presentation/api/AnalysisController');
const GitController = require('./presentation/api/GitController');
const DocumentationController = require('./presentation/api/DocumentationController');
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
    
    // Initialize auto-security manager
    this.autoSecurityManager = new AutoSecurityManager();
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
    
    this.databaseConnection = new DatabaseConnection(this.securityConfig.database);
    await this.databaseConnection.connect();
    
    this.logger.info(`✅ Database connected: ${this.databaseConnection.getType()}`);
    
    // Check if default user exists
    await this.checkDefaultUser();
  }

  async checkDefaultUser() {
    try {
      const dbType = this.databaseConnection.getType();
      const param = dbType === 'postgresql' ? '$1' : '?';
      
      const checkResult = await this.databaseConnection.query(
        `SELECT id, email, username FROM users WHERE id = ${param}`,
        ['me']
      );
      
      if (!checkResult || checkResult.length === 0) {
        this.logger.error('❌ No default user found in database!');
        this.logger.error('📝 To create the default user, run:');
        this.logger.error('   node scripts/create-default-user.js');
        this.logger.error('');
        this.logger.error('🛑 Server cannot start without default user due to foreign key constraints.');
        process.exit(0);
      } else {
        this.logger.info('✅ Default user found in database');
      }
    } catch (error) {
      this.logger.error('❌ Could not check for default user:', error.message);
      this.logger.error('🛑 Server cannot start. Please run: node scripts/create-default-user.js');
      process.exit(0);
    }
  }

  async initializeInfrastructure() {
    this.logger.info('🏗️ Initializing infrastructure...');

    // Initialize DI system first
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
    this.logger.info('🔧 Initializing domain services with DI...');

    // Get services through DI container with consistent error handling
    try {
        this.cursorIDEService = this.serviceRegistry.getService('cursorIDEService');
        this.authService = this.serviceRegistry.getService('authService');
        this.aiService = this.serviceRegistry.getService('aiService');
        this.projectAnalyzer = this.serviceRegistry.getService('projectAnalyzer');
        this.codeQualityAnalyzer = this.serviceRegistry.getService('codeQualityAnalyzer');
        this.securityAnalyzer = this.serviceRegistry.getService('securityAnalyzer');
        this.performanceAnalyzer = this.serviceRegistry.getService('performanceAnalyzer');
        this.architectureAnalyzer = this.serviceRegistry.getService('architectureAnalyzer');
        this.techStackAnalyzer = this.serviceRegistry.getService('techStackAnalyzer');
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
        this.codeQualityService = this.serviceRegistry.getService('codeQualityService');
        this.securityService = this.serviceRegistry.getService('securityService');
        this.performanceService = this.serviceRegistry.getService('performanceService');
        this.architectureService = this.serviceRegistry.getService('architectureService');
        this.dependencyAnalyzer = this.serviceRegistry.getService('dependencyAnalyzer');
        this.monorepoStrategy = this.serviceRegistry.getService('monorepoStrategy');
        this.singleRepoStrategy = this.serviceRegistry.getService('singleRepoStrategy');
    } catch (error) {
        this.logger.error('Failed to get domain services:', error.message);
        throw error; // Re-throw because these are critical services
    }

    // Set up project context AFTER repositories are available
    await this.setupProjectContext();

    // Get Workflow Orchestration Service
    try {
        this.workflowOrchestrationService = this.serviceRegistry.getService('workflowOrchestrationService');
    } catch (error) {
        this.logger.warn('WorkflowOrchestrationService not available:', error.message);
        this.workflowOrchestrationService = { orchestrate: () => ({}) };
    }

    // Get Git Service
    try {
        this.gitService = this.serviceRegistry.getService('gitService');
    } catch (error) {
        this.logger.warn('GitService not available:', error.message);
        this.gitService = { status: () => ({}) };
    }

    // Get Test Analyzer Tools
    try {
        this.testAnalyzer = this.serviceRegistry.getService('testAnalyzer');
        this.testFixer = this.serviceRegistry.getService('testFixer');
        this.coverageAnalyzer = this.serviceRegistry.getService('coverageAnalyzer');
        this.testReportParser = this.serviceRegistry.getService('testReportParser');
        this.testFixTaskGenerator = this.serviceRegistry.getService('testFixTaskGenerator');
        this.testCorrectionService = this.serviceRegistry.getService('testCorrectionService');
        this.generateTestsHandler = this.serviceRegistry.getService('generateTestsHandler');
    } catch (error) {
        this.logger.warn('Some test services not available:', error.message);
        // Create fallback services
        this.testAnalyzer = { analyze: () => ({}) };
        this.testFixer = { fix: () => ({}) };
        this.coverageAnalyzer = { analyze: () => ({}) };
        this.testReportParser = { parse: () => ({}) };
        this.testFixTaskGenerator = { generate: () => ({}) };
        this.testCorrectionService = { correct: () => ({}) };
        this.generateTestsHandler = { handle: () => ({}) };
    }

    // Initialize Auto-Finish System
    this.taskSessionRepository = this.databaseConnection.getRepository('TaskSession');
    await this.taskSessionRepository.initialize();
    
    this.autoFinishSystem = new AutoFinishSystem(
      this.cursorIDEService,
      this.browserManager,
      this.ideManager,
      this.webSocketManager
    );
    await this.autoFinishSystem.initialize();

    // Initialize Auto Test Fix System
    this.autoTestFixSystem = new AutoTestFixSystem({
      cursorIDE: this.cursorIDEService,
      browserManager: this.browserManager,
      ideManager: this.ideManager,
      webSocketManager: this.webSocketManager,
      taskRepository: this.taskRepository,
      workflowOrchestrationService: this.workflowOrchestrationService,
      gitService: this.gitService,
      eventBus: this.eventBus,
      logger: this.logger,
      testAnalyzer: this.testAnalyzer,
      testFixer: this.testFixer,
      coverageAnalyzer: this.coverageAnalyzer,
      testReportParser: this.testReportParser,
      testFixTaskGenerator: this.testFixTaskGenerator
    });
    await this.autoTestFixSystem.initialize();

    // Initialize Step Registry with DI container
    const { initializeSteps } = require('./domain/steps');
    await initializeSteps(this.serviceRegistry);
    this.stepRegistry = require('./domain/steps').getStepRegistry();
    this.logger.info('Step Registry initialized');

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

    // Get handlers through DI container
    this.sendMessageHandler = this.serviceRegistry.getService('sendMessageHandler');
    this.getChatHistoryHandler = this.serviceRegistry.getService('getChatHistoryHandler');
    this.createTaskHandler = this.serviceRegistry.getService('createTaskHandler');

    // Legacy handlers removed - using new workflow system instead
    
    // Initialize Auto-Finish Handler (still needed)
    this.processTodoListHandler = new ProcessTodoListHandler({
      autoFinishSystem: this.autoFinishSystem,
      cursorIDE: this.cursorIDEService,
      browserManager: this.browserManager,
      ideManager: this.ideManager,
      webSocketManager: this.webSocketManager,
      taskSessionRepository: this.taskSessionRepository,
      eventBus: this.eventBus,
      logger: this.logger
    });

    // TaskExecutionEngine removed - functionality moved to WorkflowController + StepRegistry

    // Register only non-legacy command handlers
    this.commandBus.register('ProcessTodoListCommand', this.processTodoListHandler);

    this.logger.info('Application handlers initialized (legacy removed)');
  }

  async initializePresentationLayer() {
    this.logger.info('Initializing presentation layer...');

    // Initialize auth middleware
    this.authMiddleware = new AuthMiddleware(this.authService);

    // Initialize controllers
    this.authController = new AuthController(this.authService, this.userRepository);
    
    this.chatController = new ChatController(
      this.sendMessageHandler,
      this.getChatHistoryHandler,
      this.cursorIDEService,
      this.authService
    );

    // Use DI container for IDEController
    this.ideController = this.serviceRegistry.getService('ideController');

    // Initialize IDE Feature Controller
    const IDEFeatureController = require('./presentation/api/ide/IDEFeatureController');
    this.ideFeatureController = new IDEFeatureController({
      ideManager: this.ideManager,
      eventBus: this.eventBus,
      logger: this.logger,
      serviceRegistry: this.serviceRegistry
    });

    this.ideMirrorController = new IDEMirrorController();

    this.ContentLibraryController = new ContentLibraryController();

    this.taskController = new TaskController(
      this.taskService,
      this.taskRepository,
      this.aiService,
      this.projectAnalyzer,
      this.projectMappingService,
      this.ideManager,
      this.serviceRegistry.getService('docsImportService')
    );

            this.workflowController = new WorkflowController({
      commandBus: this.commandBus,
      queryBus: this.queryBus,
      logger: this.logger,
      eventBus: this.eventBus,
      application: this,
      ideManager: this.ideManager
    });

    this.projectAnalysisController = new (require('./presentation/api/ProjectAnalysisController'))(
      this.serviceRegistry.getService('projectAnalysisRepository'),
      this.logger
    );

    // Get AnalysisController from DI container to ensure all dependencies are available
    this.analysisController = this.serviceRegistry.getService('analysisController');

    this.gitController = new GitController({
      gitService: this.gitService,
      logger: this.logger,
      eventBus: this.eventBus
    });

    this.autoFinishController = new AutoFinishController({
      commandBus: this.commandBus,
      taskSessionRepository: this.taskSessionRepository,
      autoFinishSystem: this.autoFinishSystem,
      logger: this.logger
    });

    this.autoTestFixController = new (require('./presentation/api/controllers/AutoTestFixController'))({
      autoTestFixSystem: this.autoTestFixSystem,
      commandBus: this.commandBus,
      taskService: this.taskService,
      taskRepository: this.taskRepository,
      aiService: this.aiService,
      projectAnalyzer: this.projectAnalyzer,
      cursorIDEService: this.cursorIDEService,
      ideManager: this.ideManager,
      webSocketManager: this.webSocketManager,
      eventBus: this.eventBus,
      logger: this.logger
    });

    this.documentationController = new DocumentationController(
      this.taskService,
      this.cursorIDEService,
      this.logger,
      this.ideManager,
      this.chatRepository
    );

    this.projectController = new ProjectController();

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
    //this.app.post('/api/auth/register', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.register(req, res));
    this.app.post('/api/auth/login', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.login(req, res));
    this.app.post('/api/auth/refresh', this.authMiddleware.bruteForceProtection(), (req, res) => this.authController.refresh(req, res));

    // Protected routes
    this.app.use('/api/auth/profile', this.authMiddleware.authenticate());
    this.app.get('/api/auth/profile', (req, res) => this.authController.getProfile(req, res));
    this.app.put('/api/auth/profile', (req, res) => this.authController.updateProfile(req, res));
    this.app.get('/api/auth/sessions', (req, res) => this.authController.getSessions(req, res));
    this.app.post('/api/auth/logout', this.authMiddleware.authenticate(), (req, res) => this.authController.logout(req, res));
    
    // Token validation route (protected)
    this.app.use('/api/auth/validate', this.authMiddleware.authenticate());
    this.app.get('/api/auth/validate', (req, res) => this.authController.validateToken(req, res));

    // Chat routes (protected) - no rate limiting for authenticated users
    this.app.use('/api/chat', this.authMiddleware.authenticate());
    this.app.post('/api/chat', (req, res) => this.chatController.sendMessage(req, res));
    this.app.get('/api/chat/history', (req, res) => this.chatController.getChatHistory(req, res));
    this.app.get('/api/chat/port/:port/history', (req, res) => this.chatController.getPortChatHistory(req, res));
    this.app.get('/api/chat/status', (req, res) => this.chatController.getConnectionStatus(req, res));

    // Settings routes (protected)
    this.app.use('/api/settings', this.authMiddleware.authenticate());
    this.app.get('/api/settings', (req, res) => this.chatController.getSettings(req, res));

    // Prompts routes (protected)
    this.app.use('/api/prompts', this.authMiddleware.authenticate());
    this.app.get('/api/prompts/quick', (req, res) => this.chatController.getQuickPrompts(req, res));

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

    // Content Library routes (public)
    this.app.get('/api/frameworks', (req, res) => this.ContentLibraryController.getFrameworks(req, res));
    this.app.get('/api/frameworks/:frameworkId/prompts', (req, res) => this.ContentLibraryController.getFrameworkPrompts(req, res));
    this.app.get('/api/frameworks/:frameworkId/templates', (req, res) => this.ContentLibraryController.getFrameworkTemplates(req, res));
    this.app.get('/api/frameworks/:frameworkId/prompts/:filename', (req, res) => this.ContentLibraryController.getFrameworkPromptFile(req, res));
    this.app.get('/api/frameworks/:frameworkId/templates/:filename', (req, res) => this.ContentLibraryController.getFrameworkTemplateFile(req, res));
    this.app.get('/api/prompts', (req, res) => this.ContentLibraryController.getPrompts(req, res));
    this.app.get('/api/prompts/:category/:filename', (req, res) => this.ContentLibraryController.getPromptFile(req, res));
    this.app.get('/api/templates', (req, res) => this.ContentLibraryController.getTemplates(req, res));
    this.app.get('/api/templates/:category/:filename', (req, res) => this.ContentLibraryController.getTemplateFile(req, res));

    // Task Management routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/tasks', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/tasks', (req, res) => this.taskController.createTask(req, res));
    this.app.get('/api/projects/:projectId/tasks', (req, res) => this.taskController.getTasks(req, res));
    this.app.get('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.getTaskById(req, res));
    this.app.put('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.updateTask(req, res));
    this.app.delete('/api/projects/:projectId/tasks/:id', (req, res) => this.taskController.deleteTask(req, res));
    this.app.post('/api/projects/:projectId/tasks/:id/execute', (req, res) => this.taskController.executeTask(req, res));
    this.app.get('/api/projects/:projectId/tasks/:id/execution', (req, res) => this.taskController.getTaskExecution(req, res));
    this.app.post('/api/projects/:projectId/tasks/:id/cancel', (req, res) => this.taskController.cancelTask(req, res));
    
    // NEW: Sync docs tasks route
    this.app.post('/api/projects/:projectId/tasks/sync-docs', (req, res) => this.taskController.syncDocsTasks(req, res));
    // NEW: Clean docs tasks route
    this.app.post('/api/projects/:projectId/tasks/clean-docs', (req, res) => this.taskController.cleanDocsTasks(req, res));

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
    this.app.post('/api/projects/:projectId/documentation/analyze', (req, res) => this.documentationController.analyzeDocumentation(req, res));
    
    // Bulk Documentation Analysis route (protected)
    this.app.use('/api/projects/analyze-all', this.authMiddleware.authenticate());
    this.app.post('/api/projects/analyze-all/documentation', (req, res) => this.documentationController.analyzeAllProjects(req, res));

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

    // Documentation Tasks routes (protected)
    this.app.use('/api/projects/:projectId/docs-tasks', this.authMiddleware.authenticate());
    this.app.get('/api/projects/:projectId/docs-tasks', (req, res) => this.ideController.getDocsTasks(req, res));
    this.app.get('/api/projects/:projectId/docs-tasks/:id', (req, res) => this.ideController.getDocsTaskDetails(req, res));

    // Auto Finish routes (protected)
    this.app.use('/api/projects/:projectId/auto-finish', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/auto-finish/process', (req, res) => this.autoFinishController.processTodoList(req, res));
    this.app.get('/api/projects/:projectId/auto-finish/status', (req, res) => this.autoFinishController.getSessionStatus(req, res));
    this.app.post('/api/projects/:projectId/auto-finish/cancel', (req, res) => this.autoFinishController.cancelSession(req, res));
    this.app.get('/api/projects/:projectId/auto-finish/stats', (req, res) => this.autoFinishController.getProjectStats(req, res));
    this.app.get('/api/projects/:projectId/auto-finish/patterns', (req, res) => this.autoFinishController.getSupportedPatterns(req, res));
    this.app.get('/api/projects/:projectId/auto-finish/health', (req, res) => this.autoFinishController.healthCheck(req, res));

    // Auto Test Fix routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/auto/tests', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/auto/tests/analyze', (req, res) => this.autoTestFixController.analyzeProjectTests(req, res));
    this.app.post('/api/projects/:projectId/auto/tests/fix', (req, res) => {
          this.logger.info('Auto test fix route hit', {
      projectId: '[REDACTED_PROJECT_ID]', 
      method: req.method,
      url: '[REDACTED_URL]' 
    });
      this.autoTestFixController.executeAutoTestFix(req, res);
    });
    this.app.get('/api/projects/:projectId/auto/tests/load-tasks', (req, res) => this.autoTestFixController.loadExistingTasks(req, res));
    this.app.get('/api/projects/:projectId/auto/tests/status/:sessionId', (req, res) => this.autoTestFixController.getSessionStatus(req, res));
    this.app.post('/api/projects/:projectId/auto/tests/cancel/:sessionId', (req, res) => this.autoTestFixController.cancelSession(req, res));
    this.app.get('/api/projects/:projectId/auto/tests/stats', (req, res) => this.autoTestFixController.getStats(req, res));
    this.app.get('/api/projects/:projectId/auto/tests/tasks', (req, res) => this.autoTestFixController.getAutoTestTasks(req, res));
    this.app.get('/api/projects/:projectId/auto/tests/tasks/:taskId', (req, res) => this.autoTestFixController.getAutoTestTaskDetails(req, res));
    this.app.post('/api/projects/:projectId/auto/tests/tasks/:taskId/retry', (req, res) => this.autoTestFixController.retryAutoTestTask(req, res));

    // Workflow routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/workflow', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/workflow/execute', (req, res) => this.workflowController.executeWorkflow(req, res));
    this.app.get('/api/projects/:projectId/workflow/status', (req, res) => this.workflowController.getWorkflowStatus(req, res));
    this.app.post('/api/projects/:projectId/workflow/stop', (req, res) => this.workflowController.stopWorkflow(req, res));
    this.app.get('/api/projects/:projectId/workflow/health', (req, res) => this.workflowController.healthCheck(req, res));



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
    } else {
      this.logger.warn('No EventBus available for setting up event handlers');
    }

    this.logger.info('Event handlers setup complete');
  }

  setupCleanupTasks() {
    this.logger.info('Setting up cleanup tasks...');

    // Cleanup expired sessions every hour
    setInterval(async () => {
      try {
        await this.authService.cleanupExpiredSessions();
        this.logger.info('Cleaned up expired sessions');
      } catch (error) {
        this.logger.error('Failed to cleanup expired sessions:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

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
        
        // Start workspace detection after server is running (only if no existing data)
        try {
          this.logger.info('Checking if workspace detection is needed...');
          const stats = this.ideWorkspaceDetectionService.getDetectionStats();
          
          if (stats.total === 0) {
            this.logger.info('No existing detection data found, starting workspace detection...');
            await this.ideWorkspaceDetectionService.detectAllWorkspaces();
            const newStats = this.ideWorkspaceDetectionService.getDetectionStats();
            this.logger.info(`Workspace detection completed: ${newStats.successful}/${newStats.total} successful`);
          } else {
            this.logger.info(`Found existing detection data (${stats.total} results), skipping workspace detection`);
          }
        } catch (error) {
          this.logger.error('Workspace detection failed:', error);
        }
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
    if (this.autoFinishSystem) {
      await this.autoFinishSystem.cleanup();
    }

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