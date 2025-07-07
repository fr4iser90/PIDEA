const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');

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
const TaskSessionRepository = require('./infrastructure/database/TaskSessionRepository');

// Application
const SendMessageCommand = require('./application/commands/SendMessageCommand');
const GetChatHistoryQuery = require('./application/queries/GetChatHistoryQuery');
const SendMessageHandler = require('./application/handlers/SendMessageHandler');
const GetChatHistoryHandler = require('./application/handlers/GetChatHistoryHandler');
const CreateTaskHandler = require('./application/handlers/CreateTaskHandler');
const ProcessTodoListCommand = require('./application/commands/ProcessTodoListCommand');
const ProcessTodoListHandler = require('./application/handlers/ProcessTodoListHandler');

// Analyze Commands and Handlers
const AnalyzeArchitectureCommand = require('./application/commands/analyze/AnalyzeArchitectureCommand');
const AnalyzeCodeQualityCommand = require('./application/commands/analyze/AnalyzeCodeQualityCommand');
const AnalyzeDependenciesCommand = require('./application/commands/analyze/AnalyzeDependenciesCommand');
const VibeCoderAnalyzeCommand = require('./application/commands/vibecoder/VibeCoderAnalyzeCommand');

const AnalyzeArchitectureHandler = require('./application/handlers/analyze/AnalyzeArchitectureHandler');
const AnalyzeCodeQualityHandler = require('./application/handlers/analyze/AnalyzeCodeQualityHandler');
const AnalyzeDependenciesHandler = require('./application/handlers/analyze/AnalyzeDependenciesHandler');
const AnalyzeRepoStructureHandler = require('./application/handlers/analyze/AnalyzeRepoStructureHandler');
const AnalyzeTechStackHandler = require('./application/handlers/analyze/AnalyzeTechStackHandler');
const VibeCoderAnalyzeHandler = require('./application/handlers/vibecoder/VibeCoderAnalyzeHandler');

// Refactor Commands and Handlers
const SplitLargeFilesCommand = require('./application/commands/refactor/SplitLargeFilesCommand');
const OrganizeModulesCommand = require('./application/commands/refactor/OrganizeModulesCommand');
const CleanDependenciesCommand = require('./application/commands/refactor/CleanDependenciesCommand');
const RestructureArchitectureCommand = require('./application/commands/refactor/RestructureArchitectureCommand');
const VibeCoderRefactorCommand = require('./application/commands/vibecoder/VibeCoderRefactorCommand');

const SplitLargeFilesHandler = require('./application/handlers/refactor/SplitLargeFilesHandler');
const OrganizeModulesHandler = require('./application/handlers/refactor/OrganizeModulesHandler');
const CleanDependenciesHandler = require('./application/handlers/refactor/CleanDependenciesHandler');
const RestructureArchitectureHandler = require('./application/handlers/refactor/RestructureArchitectureHandler');
const VibeCoderRefactorHandler = require('./application/handlers/vibecoder/VibeCoderRefactorHandler');

// Generate Commands and Handlers
const GenerateTestsCommand = require('./application/commands/generate/GenerateTestsCommand');
const GenerateDocumentationCommand = require('./application/commands/generate/GenerateDocumentationCommand');
const GenerateConfigsCommand = require('./application/commands/generate/GenerateConfigsCommand');
const GenerateScriptsCommand = require('./application/commands/generate/GenerateScriptsCommand');
const VibeCoderGenerateCommand = require('./application/commands/vibecoder/VibeCoderGenerateCommand');

const GenerateTestsHandler = require('./application/handlers/generate/GenerateTestsHandler');
const GenerateDocumentationHandler = require('./application/handlers/generate/GenerateDocumentationHandler');
const GenerateConfigsHandler = require('./application/handlers/generate/GenerateConfigsHandler');
const GenerateScriptsHandler = require('./application/handlers/generate/GenerateScriptsHandler');
const VibeCoderGenerateHandler = require('./application/handlers/vibecoder/VibeCoderGenerateHandler');

// VibeCoder Mode Command and Handler
const VibeCoderModeCommand = require('./application/commands/vibecoder/VibeCoderModeCommand');
const VibeCoderModeHandler = require('./application/handlers/vibecoder/VibeCoderModeHandler');

// Infrastructure
const BrowserManager = require('./infrastructure/external/BrowserManager');
const IDEManager = require('./infrastructure/external/IDEManager');
const AIService = require('./infrastructure/external/AIService');
const ProjectAnalyzer = require('./infrastructure/external/ProjectAnalyzer');
const CodeQualityAnalyzer = require('./infrastructure/external/CodeQualityAnalyzer');
const SecurityAnalyzer = require('./infrastructure/external/SecurityAnalyzer');
const PerformanceAnalyzer = require('./infrastructure/external/PerformanceAnalyzer');
const ArchitectureAnalyzer = require('./infrastructure/external/ArchitectureAnalyzer');
const IDEWorkspaceDetectionService = require('./domain/services/IDEWorkspaceDetectionService');
const InMemoryChatRepository = require('./infrastructure/database/InMemoryChatRepository');
const InMemoryTaskRepository = require('./infrastructure/database/InMemoryTaskRepository');
const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
const PostgreSQLUserRepository = require('./infrastructure/database/PostgreSQLUserRepository');
const PostgreSQLUserSessionRepository = require('./infrastructure/database/PostgreSQLUserSessionRepository');
const EventBus = require('./infrastructure/messaging/EventBus');
const CommandBus = require('./infrastructure/messaging/CommandBus');
const QueryBus = require('./infrastructure/messaging/QueryBus');
const AuthMiddleware = require('./infrastructure/auth/AuthMiddleware');

// Presentation
const ChatController = require('./presentation/api/ChatController');
const IDEController = require('./presentation/api/IDEController');
const IDEMirrorController = require('./presentation/api/IDEMirrorController');
const ContentLibraryController = require('./presentation/api/ContentLibraryController');
const AuthController = require('./presentation/api/AuthController');
const TaskController = require('./presentation/api/TaskController');
const AutoModeController = require('./presentation/api/AutoModeController');
const AutoFinishController = require('./presentation/api/AutoFinishController');
const AnalysisController = require('./presentation/api/AnalysisController');
const GitController = require('./presentation/api/GitController');
const DocumentationController = require('./presentation/api/DocumentationController');
const WebSocketManager = require('./presentation/websocket/WebSocketManager');

class Application {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3000,
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
    return winston.createLogger({
      level: this.autoSecurityManager.isProduction() ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'cursor-chat-agent' },
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  async initialize() {
    this.logger.info('[Application] Initializing...');

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
      await this.ideManager.initialize();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup cleanup tasks
      this.setupCleanupTasks();

      // Make application instance globally available
      global.application = this;

      this.logger.info('[Application] Initialization complete');
    } catch (error) {
      this.logger.error('[Application] Initialization failed:', error);
      throw error;
    }
  }

  async initializeDatabase() {
    this.logger.info('[Application] Initializing database...');
    
    this.databaseConnection = new DatabaseConnection(this.securityConfig.database);
    await this.databaseConnection.connect();
    
    this.logger.info(`[Application] Database connected: ${this.databaseConnection.getType()}`);
  }

  async initializeInfrastructure() {
    this.logger.info('[Application] Initializing infrastructure...');

    // Initialize DI system first
    const { getServiceRegistry } = require('./infrastructure/di/ServiceRegistry');
    const { getProjectContextService } = require('./infrastructure/di/ProjectContextService');
    
    this.serviceRegistry = getServiceRegistry();
    this.projectContext = getProjectContextService();
    
    // Register all services (including handlers)
    this.serviceRegistry.registerAllServices();
    
    // Register the logger service with the actual logger instance
    this.serviceRegistry.getContainer().registerSingleton('logger', this.logger);
    
    // Replace the DI container's database connection with the properly configured one
    this.serviceRegistry.getContainer().registerSingleton('databaseConnection', this.databaseConnection);

    // Get services from DI container to ensure consistency
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

    // Register remaining services
    this.serviceRegistry.registerRepositoryServices();
    this.serviceRegistry.registerDomainServices();
    this.serviceRegistry.registerExternalServices();
    this.serviceRegistry.registerStrategyServices();

    // Get strategies through DI
    this.monorepoStrategy = this.serviceRegistry.getService('monorepoStrategy');
    this.singleRepoStrategy = this.serviceRegistry.getService('singleRepoStrategy');

    this.logger.info('[Application] Infrastructure initialized with DI');
  }

  async initializeDomainServices() {
    this.logger.info('[Application] Initializing domain services with DI...');

    // Set up project context
    await this.setupProjectContext();

    // Get services through DI container
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
    this.taskExecutionService = this.serviceRegistry.getService('taskExecutionService');
    this.taskValidationService = this.serviceRegistry.getService('taskValidationService');
    this.taskAnalysisService = this.serviceRegistry.getService('taskAnalysisService');
    this.codeQualityService = this.serviceRegistry.getService('codeQualityService');
    this.securityService = this.serviceRegistry.getService('securityService');
    this.performanceService = this.serviceRegistry.getService('performanceService');
    this.architectureService = this.serviceRegistry.getService('architectureService');
    this.dependencyAnalyzer = this.serviceRegistry.getService('dependencyAnalyzer');
    this.monorepoStrategy = this.serviceRegistry.getService('monorepoStrategy');
    this.singleRepoStrategy = this.serviceRegistry.getService('singleRepoStrategy');

    // Initialize Auto-Finish System
    this.taskSessionRepository = new TaskSessionRepository(this.databaseConnection);
    await this.taskSessionRepository.initialize();
    
    this.autoFinishSystem = new AutoFinishSystem(
      this.cursorIDEService,
      this.browserManager,
      this.ideManager,
      this.webSocketManager
    );
    await this.autoFinishSystem.initialize();

    this.logger.info('[Application] Domain services initialized with DI');
  }

  async setupProjectContext() {
    this.logger.info('[Application] Setting up project context...');
    
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
      this.logger.warn('[Application] Project context validation warnings:', validation.warnings);
    } else {
      this.logger.info('[Application] Project context validated successfully');
    }
  }

  async initializeApplicationHandlers() {
    this.logger.info('[Application] Initializing application handlers with DI...');

    // Get handlers through DI container
    this.sendMessageHandler = this.serviceRegistry.getService('sendMessageHandler');
    this.getChatHistoryHandler = this.serviceRegistry.getService('getChatHistoryHandler');
    this.createTaskHandler = this.serviceRegistry.getService('createTaskHandler');

    // Initialize Analyze Handlers
    this.analyzeArchitectureHandler = new AnalyzeArchitectureHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      architectureAnalyzer: this.architectureAnalyzer,
      cursorIDEService: this.cursorIDEService,
      taskRepository: this.taskRepository,
      fileSystemService: this.fileSystemService,
      logger: this.logger
    });

    this.analyzeCodeQualityHandler = new AnalyzeCodeQualityHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      codeQualityAnalyzer: this.codeQualityAnalyzer,
      cursorIDEService: this.cursorIDEService,
      taskRepository: this.taskRepository,
      fileSystemService: this.fileSystemService,
      logger: this.logger
    });

    this.analyzeDependenciesHandler = new AnalyzeDependenciesHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      dependencyAnalyzer: this.dependencyAnalyzer,
      cursorIDEService: this.cursorIDEService,
      taskRepository: this.taskRepository,
      fileSystemService: this.fileSystemService,
      logger: this.logger
    });

    this.analyzeRepoStructureHandler = new AnalyzeRepoStructureHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      projectAnalyzer: this.projectAnalyzer,
      cursorIDEService: this.cursorIDEService,
      taskRepository: this.taskRepository,
      fileSystemService: this.fileSystemService,
      logger: this.logger
    });

    this.analyzeTechStackHandler = new AnalyzeTechStackHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      projectAnalyzer: this.projectAnalyzer,
      cursorIDEService: this.cursorIDEService,
      taskRepository: this.taskRepository,
      fileSystemService: this.fileSystemService,
      logger: this.logger
    });

    // Initialize Refactor Handlers
    this.splitLargeFilesHandler = new SplitLargeFilesHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    this.organizeModulesHandler = new OrganizeModulesHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    this.cleanDependenciesHandler = new CleanDependenciesHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    this.restructureArchitectureHandler = new RestructureArchitectureHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    // Initialize Generate Handlers
    this.generateTestsHandler = new GenerateTestsHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    this.generateDocumentationHandler = new GenerateDocumentationHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    this.generateConfigsHandler = new GenerateConfigsHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    this.generateScriptsHandler = new GenerateScriptsHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger
    });

    // Initialize VibeCoder Wrapper Handlers
    this.vibeCoderAnalyzeHandler = new VibeCoderAnalyzeHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      commandBus: this.commandBus,
      taskRepository: this.taskRepository,
      cursorIDEService: this.cursorIDEService,
      logger: this.logger
    });

    this.vibeCoderRefactorHandler = new VibeCoderRefactorHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      commandBus: this.commandBus,
      logger: this.logger
    });

    this.vibeCoderGenerateHandler = new VibeCoderGenerateHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      commandBus: this.commandBus,
      logger: this.logger
    });

    this.vibeCoderModeHandler = new VibeCoderModeHandler({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      commandBus: this.commandBus,
      logger: this.logger,
      analysisOutputService: this.analysisOutputService,
      projectAnalyzer: this.projectAnalyzer,
      cursorIDEService: this.cursorIDEService,
      taskRepository: this.taskRepository,
      fileSystemService: this.fileSystemService
    });

    // Initialize Auto-Finish Handler
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

    this.vibeCoderAutoRefactorHandler = this.serviceRegistry.getService('vibeCoderAutoRefactorHandler');

    this.taskExecutionEngine = new (require('./infrastructure/external/TaskExecutionEngine'))({
      aiService: this.aiService,
      scriptExecutor: new (require('./infrastructure/external/ScriptExecutor'))(this.logger),
      fileSystemService: this.fileSystemService,
      gitService: this.gitService,
      dockerService: this.dockerService,
      taskRepository: this.taskRepository,
      analysisRepository: this.analysisRepository,
      logger: this.logger,
      eventBus: this.eventBus
    });

    // Register all command handlers
    this.commandBus.register('AnalyzeArchitectureCommand', this.analyzeArchitectureHandler);
    this.commandBus.register('AnalyzeCodeQualityCommand', this.analyzeCodeQualityHandler);
    this.commandBus.register('AnalyzeDependenciesCommand', this.analyzeDependenciesHandler);
    this.commandBus.register('AnalyzeRepoStructureCommand', this.analyzeRepoStructureHandler);
    this.commandBus.register('AnalyzeTechStackCommand', this.analyzeTechStackHandler);
    this.commandBus.register('VibeCoderAnalyzeCommand', this.vibeCoderAnalyzeHandler);

    // Register Refactor Commands
    this.commandBus.register('SplitLargeFilesCommand', this.splitLargeFilesHandler);
    this.commandBus.register('OrganizeModulesCommand', this.organizeModulesHandler);
    this.commandBus.register('CleanDependenciesCommand', this.cleanDependenciesHandler);
    this.commandBus.register('RestructureArchitectureCommand', this.restructureArchitectureHandler);
    this.commandBus.register('VibeCoderRefactorCommand', this.vibeCoderRefactorHandler);

    // Register Generate Commands
    this.commandBus.register('GenerateTestsCommand', this.generateTestsHandler);
    this.commandBus.register('GenerateDocumentationCommand', this.generateDocumentationHandler);
    this.commandBus.register('GenerateConfigsCommand', this.generateConfigsHandler);
    this.commandBus.register('GenerateScriptsCommand', this.generateScriptsHandler);
    this.commandBus.register('VibeCoderGenerateCommand', this.vibeCoderGenerateHandler);

    // Register VibeCoder Mode Command
    this.commandBus.register('VibeCoderModeCommand', this.vibeCoderModeHandler);
    this.commandBus.register('VibeCoderAutoRefactorCommand', this.vibeCoderAutoRefactorHandler);

    // Register Auto-Finish Commands
    this.commandBus.register('ProcessTodoListCommand', this.processTodoListHandler);

    this.logger.info('[Application] Application handlers initialized');
  }

  async initializePresentationLayer() {
    this.logger.info('[Application] Initializing presentation layer...');

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

    this.ideController = new IDEController(
      this.ideManager,
      this.eventBus,
      this.cursorIDEService,
      this.taskRepository
    );

    this.ideMirrorController = new IDEMirrorController();

    this.ContentLibraryController = new ContentLibraryController();

    this.taskController = new TaskController(
      this.taskService,
      this.taskRepository,
      this.aiService,
      this.projectAnalyzer
    );

    this.autoModeController = new AutoModeController({
      commandBus: this.commandBus,
      queryBus: this.queryBus,
      logger: this.logger,
      eventBus: this.eventBus,
      application: this,
      ideManager: this.ideManager
    });

    this.vibeCoderAutoRefactorController = new (require('./presentation/api/VibeCoderAutoRefactorController'))(this.commandBus);

    this.projectAnalysisController = new (require('./presentation/api/ProjectAnalysisController'))(
      this.serviceRegistry.getService('projectAnalysisRepository'),
      this.logger
    );

    this.analysisController = new AnalysisController(
      this.codeQualityService,
      this.securityService,
      this.performanceService,
      this.architectureService,
      this.logger,
      this.analysisOutputService,
      this.analysisRepository
    );

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

    this.documentationController = new DocumentationController(
      this.taskService,
      this.cursorIDEService,
      this.logger,
      this.ideManager
    );

    this.logger.info('[Application] Presentation layer initialized');
  }

  setupMiddleware() {
    this.logger.info('[Application] Setting up middleware...');

    // Security middleware
    this.app.use(helmet(this.securityConfig.helmet));
    this.app.use(cors(this.securityConfig.cors));

    // Rate limiting
    const limiter = rateLimit(this.securityConfig.rateLimiting);
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '2mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });
      next();
    });

    // Serve static files
    this.app.use('/web', express.static(path.join(__dirname, '../web'), {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));

    this.app.use('/framework', require('express').static(path.join(__dirname, '../framework')));
  }

  setupRoutes() {
    this.logger.info('[Application] Setting up routes...');

    // Serve the main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index2.html'));
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

    // Auth routes (public)
    this.app.post('/api/auth/register', (req, res) => this.authController.register(req, res));
    this.app.post('/api/auth/login', (req, res) => this.authController.login(req, res));
    this.app.post('/api/auth/refresh', (req, res) => this.authController.refresh(req, res));

    // Protected routes
    this.app.use('/api/auth/profile', this.authMiddleware.authenticate());
    this.app.get('/api/auth/profile', (req, res) => this.authController.getProfile(req, res));
    this.app.put('/api/auth/profile', (req, res) => this.authController.updateProfile(req, res));
    this.app.get('/api/auth/sessions', (req, res) => this.authController.getSessions(req, res));
    this.app.post('/api/auth/logout', this.authMiddleware.authenticate(), (req, res) => this.authController.logout(req, res));
    
    // Token validation route (protected)
    this.app.use('/api/auth/validate', this.authMiddleware.authenticate());
    this.app.get('/api/auth/validate', (req, res) => this.authController.validateToken(req, res));

    // Chat routes (protected)
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
        this.logger.error('[Application] Error getting file tree:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file tree'
        });
      }
    });

    this.app.get('/api/files/content', async (req, res) => {
      try {
        const filePath = req.query.path;
        this.logger.info('[API] /api/files/content called with path:', filePath);
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
        this.logger.error('[Application] Error getting file content:', error);
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
    this.app.use('/api/projects/:projectId/analysis', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/analysis', (req, res) => this.taskController.analyzeProject(req, res));
    this.app.get('/api/projects/:projectId/analysis/:analysisId', (req, res) => this.taskController.getProjectAnalysis(req, res));
    this.app.post('/api/projects/:projectId/analysis/ai', (req, res) => this.taskController.aiAnalysis(req, res));

    // Auto Mode routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/auto', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/auto/execute', (req, res) => this.autoModeController.executeAutoMode(req, res));
    this.app.get('/api/projects/:projectId/auto/status', (req, res) => this.autoModeController.getAutoModeStatus(req, res));
    this.app.post('/api/projects/:projectId/auto/stop', (req, res) => this.autoModeController.stopAutoMode(req, res));

    // VibeCoder Auto Refactor routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/auto-refactor', this.authMiddleware.authenticate());
    this.app.post('/api/projects/:projectId/auto-refactor/execute', (req, res) => this.vibeCoderAutoRefactorController.startAutoRefactor(req, res));

    // Project analysis routes (protected)
    this.app.use('/api/projects/:projectId/analyses', this.authMiddleware.authenticate());
    this.app.get('/api/projects/:projectId/analyses', (req, res) => this.projectAnalysisController.getProjectAnalyses(req, res));
    this.app.get('/api/projects/:projectId/analyses/stats', (req, res) => this.projectAnalysisController.getAnalysisStats(req, res));
    this.app.get('/api/projects/:projectId/analyses/:analysisType', (req, res) => this.projectAnalysisController.getAnalysesByType(req, res));
    this.app.get('/api/projects/:projectId/analyses/:analysisType/latest', (req, res) => this.projectAnalysisController.getLatestAnalysisByType(req, res));
    this.app.post('/api/projects/:projectId/analyses', (req, res) => this.projectAnalysisController.createAnalysis(req, res));
    this.app.put('/api/projects/:projectId/analyses/:id', (req, res) => this.projectAnalysisController.updateAnalysis(req, res));
    this.app.delete('/api/projects/:projectId/analyses/:id', (req, res) => this.projectAnalysisController.deleteAnalysis(req, res));

    // Specialized Analysis routes (protected) - PROJECT-BASED
    this.app.use('/api/projects/:projectId/analysis', this.authMiddleware.authenticate());
    this.app.get('/api/projects/:projectId/analysis/status', (req, res) => this.analysisController.getAnalysisStatus(req, res));
    this.app.post('/api/projects/:projectId/analysis/code-quality', (req, res) => this.analysisController.analyzeCodeQuality(req, res));
    this.app.post('/api/projects/:projectId/analysis/security', (req, res) => this.analysisController.analyzeSecurity(req, res));
    this.app.post('/api/projects/:projectId/analysis/performance', (req, res) => this.analysisController.analyzePerformance(req, res));
    this.app.post('/api/projects/:projectId/analysis/architecture', (req, res) => this.analysisController.analyzeArchitecture(req, res));
    this.app.post('/api/projects/:projectId/analysis/comprehensive', (req, res) => this.analysisController.analyzeComprehensive(req, res));
    
    // Documentation Framework routes (protected) - PROJECT-BASED
    this.app.post('/api/projects/:projectId/documentation/analyze', (req, res) => this.documentationController.analyzeDocumentation(req, res));
    
    // Analysis output and history routes
    this.app.get('/api/projects/:projectId/analysis/history', (req, res) => this.analysisController.getAnalysisHistory(req, res));
    this.app.get('/api/projects/:projectId/analysis/files/:filename', (req, res) => this.analysisController.getAnalysisFile(req, res));
    this.app.get('/api/projects/:projectId/analysis/database', (req, res) => this.analysisController.getAnalysisFromDatabase(req, res));
    this.app.post('/api/projects/:projectId/analysis/report', (req, res) => this.analysisController.generateComprehensiveReport(req, res));

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

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      this.logger.error('[Application] Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: this.autoSecurityManager.isProduction() ? 'Internal server error' : error.message
      });
    });

    this.logger.info('[Application] Routes setup complete');
  }

  setupEventHandlers() {
    this.logger.info('[Application] Setting up event handlers...');

    if (this.eventBus) {
      this.logger.info('[Application] EventBus available, setting up subscriptions...');
      this.eventBus.subscribe('ide-started', (data) => {
        this.logger.info('[Application] IDE started:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('ide-started', data);
        }
      });

      this.eventBus.subscribe('ide-stopped', (data) => {
        this.logger.info('[Application] IDE stopped:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('ide-stopped', data);
        }
      });

      this.eventBus.subscribe('chat-message', (data) => {
        this.logger.info('[Application] Chat message:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('chat-message', data);
        }
      });

      this.eventBus.subscribe('MessageSent', (data) => {
        this.logger.info('[Application] Message sent event:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('chat-message', data);
        }
      });

      this.eventBus.subscribe('ChatHistoryUpdated', (data) => {
        this.logger.info('[Application] Chat history updated event:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('chat-history-updated', data);
        }
      });

      this.eventBus.subscribe('userAppDetected', (data) => {
        this.logger.info('[Application] User app detected event:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToAll('userAppUrl', data);
        }
      });

      this.eventBus.subscribe('activeIDEChanged', (data) => {
        this.logger.info('[Application] Active IDE changed event:', data);
        if (this.webSocketManager) {
          this.logger.info('[Application] Broadcasting activeIDEChanged to all clients');
          this.webSocketManager.broadcastToAll('activeIDEChanged', data);
        } else {
          this.logger.warn('[Application] No WebSocket manager available for broadcasting activeIDEChanged');
        }
      });
    } else {
      this.logger.warn('[Application] No EventBus available for setting up event handlers');
    }

    this.logger.info('[Application] Event handlers setup complete');
  }

  setupCleanupTasks() {
    this.logger.info('[Application] Setting up cleanup tasks...');

    // Cleanup expired sessions every hour
    setInterval(async () => {
      try {
        await this.authService.cleanupExpiredSessions();
        this.logger.info('[Application] Cleaned up expired sessions');
      } catch (error) {
        this.logger.error('[Application] Failed to cleanup expired sessions:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Cleanup old secrets every day
    setInterval(async () => {
      try {
        await this.autoSecurityManager.cleanupOldSecrets();
        this.logger.info('[Application] Cleaned up old secrets');
      } catch (error) {
        this.logger.error('[Application] Failed to cleanup old secrets:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Cleanup old Auto-Finish sessions every 6 hours
    setInterval(async () => {
      try {
        if (this.taskSessionRepository) {
          await this.taskSessionRepository.cleanupOldSessions(7); // Keep sessions for 7 days
          this.logger.info('[Application] Cleaned up old Auto-Finish sessions');
        }
      } catch (error) {
        this.logger.error('[Application] Failed to cleanup old Auto-Finish sessions:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    this.logger.info('[Application] Cleanup tasks setup complete');
  }

  async start() {
    try {
      this.logger.info('[Application] Starting...');
      
      if (!this.app) {
        await this.initialize();
      }

      this.server.listen(this.config.port, async () => {
        this.isRunning = true;
        this.logger.info(`[Application] Server running on port ${this.config.port}`);
        this.logger.info(`[Application] Environment: ${this.autoSecurityManager.getEnvironment()}`);
        this.logger.info(`[Application] Database: ${this.databaseConnection.getType()}`);
        this.logger.info(`[Application] Auto-security: ${this.autoSecurityManager.isProduction() ? 'Production' : 'Development'}`);
        
        // Start workspace detection after server is running (only if no existing data)
        try {
          this.logger.info('[Application] Checking if workspace detection is needed...');
          const stats = this.ideWorkspaceDetectionService.getDetectionStats();
          
          if (stats.total === 0) {
            this.logger.info('[Application] No existing detection data found, starting workspace detection...');
            await this.ideWorkspaceDetectionService.detectAllWorkspaces();
            const newStats = this.ideWorkspaceDetectionService.getDetectionStats();
            this.logger.info(`[Application] Workspace detection completed: ${newStats.successful}/${newStats.total} successful`);
          } else {
            this.logger.info(`[Application] Found existing detection data (${stats.total} results), skipping workspace detection`);
          }
        } catch (error) {
          this.logger.error('[Application] Workspace detection failed:', error);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      this.logger.error('[Application] Failed to start:', error);
      throw error;
    }
  }

  async stop() {
    this.logger.info('[Application] Stopping...');
    
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

    this.logger.info('[Application] Stopped');
    process.exit(0);
  }

  async cleanup() {
    this.logger.info('[Application] Cleaning up...');
    
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

    this.logger.info('[Application] Cleanup completed');
  }

  async reset() {
    this.logger.info('[Application] Resetting for tests...');
    
    // Reset task repository
    if (this.taskRepository && this.taskRepository.clear) {
      await this.taskRepository.clear();
    }

    // Reset chat repository
    if (this.chatRepository && this.chatRepository.clear) {
      await this.chatRepository.clear();
    }

    this.logger.info('[Application] Reset completed');
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
}

module.exports = Application; 