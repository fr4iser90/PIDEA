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

// Application
const SendMessageCommand = require('./application/commands/SendMessageCommand');
const GetChatHistoryQuery = require('./application/queries/GetChatHistoryQuery');
const SendMessageHandler = require('./application/handlers/SendMessageHandler');
const GetChatHistoryHandler = require('./application/handlers/GetChatHistoryHandler');

// Infrastructure
const BrowserManager = require('./infrastructure/external/BrowserManager');
const IDEManager = require('./infrastructure/external/IDEManager');
const InMemoryChatRepository = require('./infrastructure/database/InMemoryChatRepository');
const DatabaseConnection = require('./infrastructure/database/DatabaseConnection');
const PostgreSQLUserRepository = require('./infrastructure/database/PostgreSQLUserRepository');
const PostgreSQLUserSessionRepository = require('./infrastructure/database/PostgreSQLUserSessionRepository');
const EventBus = require('./infrastructure/messaging/EventBus');
const AuthMiddleware = require('./infrastructure/auth/AuthMiddleware');

// Presentation
const ChatController = require('./presentation/api/ChatController');
const IDEController = require('./presentation/api/IDEController');
const IDEMirrorController = require('./presentation/api/IDEMirrorController');
const FrameworkController = require('./presentation/api/FrameworkController');
const AuthController = require('./presentation/api/AuthController');
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

      // Connect IDE Mirror Controller to WebSocket Manager
      this.webSocketManager.setIDEMirrorController(this.ideMirrorController);

      // Initialize IDE Manager
      await this.ideManager.initialize();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup cleanup tasks
      this.setupCleanupTasks();

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

    this.browserManager = new BrowserManager();
    this.ideManager = new IDEManager();
    this.ideManager.browserManager = this.browserManager;
    this.chatRepository = new InMemoryChatRepository();
    this.eventBus = new EventBus();

    // Initialize repositories
    this.userRepository = new PostgreSQLUserRepository(this.databaseConnection);
    this.userSessionRepository = new PostgreSQLUserSessionRepository(this.databaseConnection);

    this.logger.info('[Application] Infrastructure initialized');
  }

  async initializeDomainServices() {
    this.logger.info('[Application] Initializing domain services...');

    this.cursorIDEService = new CursorIDEService(this.browserManager, this.ideManager, this.eventBus);
    
    this.authService = new AuthService(
      this.userRepository,
      this.userSessionRepository,
      this.autoSecurityManager.getJWTSecret(),
      this.autoSecurityManager.getJWTRefreshSecret()
    );

    this.logger.info('[Application] Domain services initialized');
  }

  async initializeApplicationHandlers() {
    this.logger.info('[Application] Initializing application handlers...');

    this.sendMessageHandler = new SendMessageHandler(
      this.chatRepository,
      this.cursorIDEService,
      this.eventBus
    );

    this.getChatHistoryHandler = new GetChatHistoryHandler(
      this.chatRepository,
      this.cursorIDEService
    );

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
      this.cursorIDEService
    );

    this.ideMirrorController = new IDEMirrorController();

    this.frameworkController = new FrameworkController();

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

    // Framework routes (public)
    this.app.get('/api/framework/prompts', (req, res) => this.frameworkController.getPrompts(req, res));
    this.app.get('/api/framework/templates', (req, res) => this.frameworkController.getTemplates(req, res));

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
          this.webSocketManager.broadcastToUser('userAppUrl', data);
        }
      });

      this.eventBus.subscribe('activeIDEChanged', (data) => {
        this.logger.info('[Application] Active IDE changed event:', data);
        if (this.webSocketManager) {
          this.webSocketManager.broadcastToUser('activeIDEChanged', data);
        }
      });
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

    this.logger.info('[Application] Cleanup tasks setup complete');
  }

  async start() {
    try {
      this.logger.info('[Application] Starting...');
      
      if (!this.app) {
        await this.initialize();
      }

      this.server.listen(this.config.port, () => {
        this.isRunning = true;
        this.logger.info(`[Application] Server running on port ${this.config.port}`);
        this.logger.info(`[Application] Environment: ${this.autoSecurityManager.getEnvironment()}`);
        this.logger.info(`[Application] Database: ${this.databaseConnection.getType()}`);
        this.logger.info(`[Application] Auto-security: ${this.autoSecurityManager.isProduction() ? 'Production' : 'Development'}`);
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
}

module.exports = Application; 