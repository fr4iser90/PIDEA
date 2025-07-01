const express = require('express');
const path = require('path');
const http = require('http');

// Domain
const ChatMessage = require('./domain/entities/ChatMessage');
const ChatSession = require('./domain/entities/ChatSession');
const ChatRepository = require('./domain/repositories/ChatRepository');
const CursorIDEService = require('./domain/services/CursorIDEService');

// Application
const SendMessageCommand = require('./application/commands/SendMessageCommand');
const GetChatHistoryQuery = require('./application/queries/GetChatHistoryQuery');
const SendMessageHandler = require('./application/handlers/SendMessageHandler');
const GetChatHistoryHandler = require('./application/handlers/GetChatHistoryHandler');

// Infrastructure
const BrowserManager = require('./infrastructure/external/BrowserManager');
const InMemoryChatRepository = require('./infrastructure/database/InMemoryChatRepository');
const EventBus = require('./infrastructure/messaging/EventBus');

// Presentation
const ChatController = require('./presentation/api/ChatController');
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
  }

  async initialize() {
    console.log('[Application] Initializing...');

    // Initialize infrastructure
    this.browserManager = new BrowserManager();
    this.chatRepository = new InMemoryChatRepository();
    this.eventBus = new EventBus();

    // Initialize domain services
    this.cursorIDEService = new CursorIDEService(this.browserManager);

    // Initialize application handlers
    this.sendMessageHandler = new SendMessageHandler(
      this.chatRepository,
      this.cursorIDEService,
      this.eventBus
    );

    this.getChatHistoryHandler = new GetChatHistoryHandler(
      this.chatRepository,
      this.cursorIDEService
    );

    // Initialize presentation layer
    this.chatController = new ChatController(
      this.sendMessageHandler,
      this.getChatHistoryHandler,
      this.cursorIDEService
    );

    // Setup Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    // Create HTTP server
    this.server = http.createServer(this.app);

    // Initialize WebSocket manager
    this.webSocketManager = new WebSocketManager(this.server, this.eventBus);

    // Setup event handlers
    this.setupEventHandlers();

    console.log('[Application] Initialization complete');
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '2mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files with cache busting for development
    this.app.use('/web', express.static(path.join(__dirname, '../web'), {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setupRoutes() {
    // Serve the main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/index.html'));
    });

    // API routes
    this.app.post('/api/chat', (req, res) => this.chatController.sendMessage(req, res));
    this.app.get('/api/chat/history', (req, res) => this.chatController.getChatHistory(req, res));
    this.app.get('/api/chat/status', (req, res) => this.chatController.getConnectionStatus(req, res));
    this.app.get('/api/health', (req, res) => this.chatController.healthCheck(req, res));

    // CodeExplorer API routes
    this.app.get('/api/files', async (req, res) => {
      try {
        const fileTree = await this.browserManager.getFileExplorerTree();
        res.json({
          success: true,
          data: fileTree
        });
      } catch (error) {
        console.error('[Application] Error getting file tree:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file tree'
        });
      }
    });

    this.app.get('/api/files/content', async (req, res) => {
      try {
        const filePath = req.query.path;
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
        console.error('[Application] Error getting file content:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file content'
        });
      }
    });

    // WebSocket status
    this.app.get('/api/websocket/status', (req, res) => {
      res.json({
        success: true,
        data: this.webSocketManager.getHealthStatus()
      });
    });
  }

  setupEventHandlers() {
    // Log all events
    this.eventBus.use(async (eventName, eventData) => {
      console.log(`[EventBus] Processing event: ${eventName}`);
      return eventData;
    });

    // Handle message sent events
    this.eventBus.subscribe('MessageSent', async (eventData) => {
      console.log('[Application] Message sent event:', eventData);
      // Could trigger notifications, analytics, etc.
    });

    // Handle chat history updates
    this.eventBus.subscribe('ChatHistoryUpdated', async (eventData) => {
      console.log('[Application] Chat history updated event:', eventData);
      // Could trigger caching, indexing, etc.
    });
  }

  async start() {
    if (this.isRunning) {
      console.log('[Application] Already running');
      return;
    }

    try {
      await this.initialize();
      
      this.server.listen(this.config.port, () => {
        console.log(`[Application] Server running at http://localhost:${this.config.port}/`);
        console.log(`[Application] Web-UI: http://localhost:${this.config.port}/`);
        console.log(`[Application] API: http://localhost:${this.config.port}/api/`);
        this.isRunning = true;
      });

    } catch (error) {
      console.error('[Application] Failed to start:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[Application] Stopping...');

    try {
      // Close WebSocket connections
      if (this.webSocketManager) {
        this.webSocketManager.wss.close();
      }

      // Disconnect browser
      if (this.browserManager) {
        await this.browserManager.disconnect();
      }

      // Close HTTP server
      if (this.server) {
        this.server.close();
      }

      this.isRunning = false;
      console.log('[Application] Stopped successfully');

    } catch (error) {
      console.error('[Application] Error stopping:', error);
      throw error;
    }
  }

  // Development helpers
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
}

module.exports = Application; 