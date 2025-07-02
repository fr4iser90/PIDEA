const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

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
const IDEManager = require('./infrastructure/external/IDEManager');
const InMemoryChatRepository = require('./infrastructure/database/InMemoryChatRepository');
const EventBus = require('./infrastructure/messaging/EventBus');

// Presentation
const ChatController = require('./presentation/api/ChatController');
const IDEController = require('./presentation/api/IDEController');
const IDEMirrorController = require('./presentation/api/IDEMirrorController');
const FrameworkController = require('./presentation/api/FrameworkController');
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
    this.ideManager = new IDEManager();
    this.chatRepository = new InMemoryChatRepository();
    this.eventBus = new EventBus();

    // Initialize domain services
    this.cursorIDEService = new CursorIDEService(this.browserManager, this.ideManager, this.eventBus);

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

    this.ideController = new IDEController(
      this.ideManager,
      this.eventBus,
      this.cursorIDEService
    );

    this.ideMirrorController = new IDEMirrorController();

    // Initialize Framework Controller
    this.frameworkController = new FrameworkController();

    // Setup Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    // Create HTTP server
    this.server = http.createServer(this.app);

    // Initialize WebSocket manager
    this.webSocketManager = new WebSocketManager(this.server, this.eventBus);

    // Connect IDE Mirror Controller to WebSocket Manager
    this.webSocketManager.setIDEMirrorController(this.ideMirrorController);

    // Initialize IDE Manager
    await this.ideManager.initialize();

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

    this.app.use('/framework', require('express').static(path.join(__dirname, '../framework')));
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
        console.log('[API] /api/files/content aufgerufen mit path:', filePath);
        if (!filePath) {
          return res.status(400).json({
            success: false,
            error: 'File path is required'
          });
        }
        console.log('[API] Rufe BrowserManager.getFileContent auf mit:', filePath);
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

    // IDE Management API routes
    this.app.get('/api/ide/available', (req, res) => this.ideController.getAvailableIDEs(req, res));
    this.app.post('/api/ide/start', (req, res) => this.ideController.startIDE(req, res));
    this.app.post('/api/ide/switch/:port', (req, res) => this.ideController.switchIDE(req, res));
    this.app.delete('/api/ide/stop/:port', (req, res) => this.ideController.stopIDE(req, res));
    this.app.get('/api/ide/status', (req, res) => this.ideController.getStatus(req, res));
    this.app.post('/api/ide/restart-app', (req, res) => this.ideController.restartUserApp(req, res));
    this.app.get('/api/ide/user-app-url', (req, res) => this.ideController.getUserAppUrl(req, res));
    this.app.post('/api/ide/monitor-terminal', (req, res) => this.ideController.monitorTerminal(req, res));
    this.app.post('/api/ide/set-workspace/:port', (req, res) => this.ideController.setWorkspacePath(req, res));

    // Framework API routes
    this.frameworkController.registerRoutes(this.app);
    this.app.get('/api/ide/workspace-info', (req, res) => this.ideController.getWorkspaceInfo(req, res));
    this.app.get('/api/ide/debug-dom', (req, res) => this.ideController.debugDOM(req, res));

    // Port-specific Chat API
    this.app.get('/api/chat/port/:port/history', (req, res) => this.chatController.getChatHistoryForPort(req, res));
    this.app.post('/api/chat/port/:port/switch', (req, res) => this.chatController.switchToPortEndpoint(req, res));

    // IDE Mirror API routes
    this.ideMirrorController.setupRoutes(this.app);

    // WebSocket status
    this.app.get('/api/websocket/status', (req, res) => {
      res.json({
        success: true,
        data: this.webSocketManager.getHealthStatus()
      });
    });

    // New API route for frameworks
    const frameworkDir = path.join(__dirname, '../framework');
    this.app.get('/api/frameworks', (req, res) => {
      fs.readdir(frameworkDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const mdFiles = files.filter(f => f.endsWith('.md'));
        res.json(mdFiles);
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

    // Handle user app detection
    this.eventBus.subscribe('userAppDetected', async (eventData) => {
      console.log('[Application] User app detected event:', eventData);
      // Broadcast to frontend via WebSocket
      if (this.webSocketManager) {
        this.webSocketManager.broadcastToClients('userAppUrl', eventData);
      }
    });

    // Handle IDE changes to trigger workspace path detection
    this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
      console.log('[Application] Active IDE changed event:', eventData);
      
      // Use cached workspace path for the new active IDE
      if (eventData.port && this.cursorIDEService && this.ideManager) {
        try {
          const workspacePath = this.ideManager.getWorkspacePath(eventData.port);
          if (workspacePath) {
            console.log('[Application] Using cached workspace path for new active IDE:', workspacePath);
            
            // Trigger dev server detection with the cached workspace path
            const devServerUrl = await this.cursorIDEService.detectDevServerFromPackageJson(workspacePath);
            if (devServerUrl) {
              console.log('[Application] Detected dev server for new IDE:', devServerUrl);
              // Broadcast the new dev server URL
              if (this.webSocketManager) {
                this.webSocketManager.broadcastToClients('userAppUrl', { url: devServerUrl });
              }
            }
          } else {
            console.log('[Application] No cached workspace path for new IDE, detecting...');
            // Only detect if not cached
            const detectedPath = await this.cursorIDEService.addWorkspacePathDetectionViaPlaywright();
            if (detectedPath) {
              console.log('[Application] Detected workspace path for new active IDE:', detectedPath);
              
              // Trigger dev server detection with the detected workspace path
              const devServerUrl = await this.cursorIDEService.detectDevServerFromPackageJson(detectedPath);
              if (devServerUrl) {
                console.log('[Application] Detected dev server for new IDE:', devServerUrl);
                // Broadcast the new dev server URL
                if (this.webSocketManager) {
                  this.webSocketManager.broadcastToClients('userAppUrl', { url: devServerUrl });
                }
              }
            }
          }
        } catch (error) {
          console.error('[Application] Error handling workspace path for new IDE:', error.message);
        }
      }
    });
  }

  async start() {
    if (this.isRunning) {
      console.log('[Application] Already running');
      return;
    }

    try {
      await this.initialize();
      
      // Workspace-Erkennung für ALLE IDEs beim Start
      if (this.cursorIDEService && this.ideManager) {
        const availableIDEs = await this.ideManager.getAvailableIDEs();
        console.log('[Application] Checking workspace paths for all IDEs:', availableIDEs.length);
        
        for (const ide of availableIDEs) {
          const port = ide.port;
          const existingPath = this.ideManager.getWorkspacePath(port);
          
          if (!existingPath) {
            console.log(`[Application] No workspace path for IDE ${port}, detecting...`);
            try {
              // Temporär zu dieser IDE wechseln
              await this.ideManager.switchToIDE(port);
              await this.cursorIDEService.browserManager.switchToPort(port);
              
              // Workspace-Pfad erkennen
              const workspacePath = await this.cursorIDEService.addWorkspacePathDetectionViaPlaywright();
              if (workspacePath) {
                console.log(`[Application] Detected workspace path for IDE ${port}:`, workspacePath);
              }
            } catch (error) {
              console.error(`[Application] Error detecting workspace for IDE ${port}:`, error.message);
            }
          } else {
            console.log(`[Application] IDE ${port} already has workspace path:`, existingPath);
          }
        }
        
        // Zurück zur ursprünglichen aktiven IDE
        const activePort = this.ideManager.getActivePort();
        if (activePort) {
          await this.ideManager.switchToIDE(activePort);
          await this.cursorIDEService.browserManager.switchToPort(activePort);
        }
      }
      
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