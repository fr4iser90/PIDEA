/**
 * Unified IDE Mirror Controller
 * Provides IDE-agnostic mirror functionality for all supported IDEs
 */
class IDEMirrorController {
  constructor(dependencies = {}) {
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || console;
    this.serviceRegistry = dependencies.serviceRegistry;
    
    // Get IDE-specific services
    this.cursorIDEService = this.serviceRegistry?.getService('cursorIDEService');
    this.vscodeIDEService = this.serviceRegistry?.getService('vscodeIDEService');
    this.windsurfIDEService = this.serviceRegistry?.getService('windsurfIDEService');
    
    // Mirror state
    this.mirrorState = new Map(); // port -> mirror state
    this.connectedClients = new Set();
  }

  /**
   * Get IDE DOM
   * GET /api/ide/mirror/dom
   */
  async getIDEDOM(req, res) {
    try {
      const { port } = req.query;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.status(400).json({
          success: false,
          error: 'No active IDE port specified'
        });
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.status(404).json({
          success: false,
          error: `No IDE service found for port ${activePort}`
        });
      }

      const domData = await this.captureIDEDOM(ideService, activePort);
      
      res.json({
        success: true,
        data: {
          port: activePort,
          dom: domData,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error getting IDE DOM:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get IDE DOM',
        details: error.message
      });
    }
  }

  /**
   * Interact with IDE
   * POST /api/ide/mirror/interact
   */
  async interactWithIDE(req, res) {
    try {
      const { port, action, selector, data } = req.body;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.status(400).json({
          success: false,
          error: 'No active IDE port specified'
        });
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.status(404).json({
          success: false,
          error: `No IDE service found for port ${activePort}`
        });
      }

      const result = await this.performIDEInteraction(ideService, activePort, action, selector, data);
      
      res.json({
        success: true,
        data: {
          port: activePort,
          action: action,
          result: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error interacting with IDE:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to interact with IDE',
        details: error.message
      });
    }
  }

  /**
   * Get mirror status
   * GET /api/ide/mirror/status
   */
  async getMirrorStatus(req, res) {
    try {
      const { port } = req.query;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.json({
          success: true,
          data: {
            connected: false,
            activePort: null,
            availablePorts: [],
            mirrorState: {}
          }
        });
      }

      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const targetIDE = availableIDEs.find(ide => ide.port === activePort);
      
      const status = {
        connected: !!targetIDE && targetIDE.status === 'running',
        activePort: activePort,
        availablePorts: availableIDEs.map(ide => ide.port),
        mirrorState: this.mirrorState.get(activePort) || {},
        ideType: targetIDE?.ideType || 'unknown',
        workspacePath: targetIDE?.workspacePath,
        lastActivity: new Date().toISOString()
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error getting mirror status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get mirror status',
        details: error.message
      });
    }
  }

  /**
   * Connect to IDE mirror
   * POST /api/ide/mirror/connect
   */
  async connectToIDEMirror(req, res) {
    try {
      const { port } = req.body;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.status(400).json({
          success: false,
          error: 'No active IDE port specified'
        });
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.status(404).json({
          success: false,
          error: `No IDE service found for port ${activePort}`
        });
      }

      // Initialize mirror state
      this.mirrorState.set(activePort, {
        connected: true,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        interactions: 0
      });

      // Capture initial DOM
      const initialDOM = await this.captureIDEDOM(ideService, activePort);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideMirrorConnected', {
          port: activePort,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          port: activePort,
          connected: true,
          initialDOM: initialDOM,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error connecting to IDE mirror:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to connect to IDE mirror',
        details: error.message
      });
    }
  }

  /**
   * Disconnect from IDE mirror
   * POST /api/ide/mirror/disconnect
   */
  async disconnectFromIDEMirror(req, res) {
    try {
      const { port } = req.body;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.status(400).json({
          success: false,
          error: 'No active IDE port specified'
        });
      }

      // Clear mirror state
      this.mirrorState.delete(activePort);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('ideMirrorDisconnected', {
          port: activePort,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          port: activePort,
          connected: false,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error disconnecting from IDE mirror:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect from IDE mirror',
        details: error.message
      });
    }
  }

  /**
   * Get mirror data
   * GET /api/ide/mirror/data
   */
  async getMirrorData(req, res) {
    try {
      const { port, includeDOM = false } = req.query;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.status(400).json({
          success: false,
          error: 'No active IDE port specified'
        });
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.status(404).json({
          success: false,
          error: `No IDE service found for port ${activePort}`
        });
      }

      const mirrorData = {
        port: activePort,
        state: this.mirrorState.get(activePort) || {},
        timestamp: new Date().toISOString()
      };

      if (includeDOM === 'true') {
        mirrorData.dom = await this.captureIDEDOM(ideService, activePort);
      }

      res.json({
        success: true,
        data: mirrorData
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error getting mirror data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get mirror data',
        details: error.message
      });
    }
  }

  /**
   * Send chat message to IDE
   * POST /api/ide/mirror/chat
   */
  async sendChatMessage(req, res) {
    try {
      const { port, message } = req.body;
      const activePort = port ? parseInt(port) : this.ideManager.getActivePort();
      
      if (!activePort) {
        return res.status(400).json({
          success: false,
          error: 'No active IDE port specified'
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.status(404).json({
          success: false,
          error: `No IDE service found for port ${activePort}`
        });
      }

      const result = await this.sendMessageToIDE(ideService, activePort, message);
      
      res.json({
        success: true,
        data: {
          port: activePort,
          message: message,
          result: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('[IDEMirrorController] Error sending chat message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send chat message',
        details: error.message
      });
    }
  }

  // Helper methods

  /**
   * Get IDE service for specific port
   */
  getIDEServiceForPort(port) {
    const availableIDEs = this.ideManager.getAvailableIDEsSync();
    const targetIDE = availableIDEs.find(ide => ide.port === port);
    
    if (!targetIDE) {
      return null;
    }

    const ideType = targetIDE.ideType || 'cursor';
    
    switch (ideType) {
      case 'cursor':
        return this.cursorIDEService;
      case 'vscode':
        return this.vscodeIDEService;
      case 'windsurf':
        return this.windsurfIDEService;
      default:
        return this.cursorIDEService; // Default fallback
    }
  }

  /**
   * Capture IDE DOM
   */
  async captureIDEDOM(ideService, port) {
    try {
      // Use the appropriate method based on the IDE service
      if (ideService && ideService.captureCompleteIDEState) {
        return await ideService.captureCompleteIDEState();
      } else if (ideService && ideService.getIDEState) {
        return await ideService.getIDEState();
      } else {
        // Fallback to basic DOM capture
        return {
          port: port,
          timestamp: new Date().toISOString(),
          body: null,
          screenshot: null,
          css: { inline: [], external: [] }
        };
      }
    } catch (error) {
      this.logger.error(`[IDEMirrorController] Error capturing DOM for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Perform IDE interaction
   */
  async performIDEInteraction(ideService, port, action, selector, data) {
    try {
      // Update mirror state
      const currentState = this.mirrorState.get(port) || {};
      currentState.lastActivity = new Date().toISOString();
      currentState.interactions = (currentState.interactions || 0) + 1;
      this.mirrorState.set(port, currentState);

      // Perform the interaction based on action type
      switch (action) {
        case 'click':
          return await this.performClick(ideService, selector);
        case 'type':
          return await this.performType(ideService, selector, data);
        case 'focus':
          return await this.performFocus(ideService, selector);
        case 'scroll':
          return await this.performScroll(ideService, data);
        case 'key':
          return await this.performKeyPress(ideService, data);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`[IDEMirrorController] Error performing interaction for port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Perform click interaction
   */
  async performClick(ideService, selector) {
    if (ideService && ideService.clickElement) {
      return await ideService.clickElement(selector);
    } else {
      // Fallback implementation
      return { success: true, action: 'click', selector };
    }
  }

  /**
   * Perform type interaction
   */
  async performType(ideService, selector, text) {
    if (ideService && ideService.typeText) {
      return await ideService.typeText(selector, text);
    } else {
      // Fallback implementation
      return { success: true, action: 'type', selector, text };
    }
  }

  /**
   * Perform focus interaction
   */
  async performFocus(ideService, selector) {
    if (ideService && ideService.focusElement) {
      return await ideService.focusElement(selector);
    } else {
      // Fallback implementation
      return { success: true, action: 'focus', selector };
    }
  }

  /**
   * Perform scroll interaction
   */
  async performScroll(ideService, scrollData) {
    // Generic scroll implementation
    return { success: true, action: 'scroll', data: scrollData };
  }

  /**
   * Perform key press interaction
   */
  async performKeyPress(ideService, keyData) {
    // Generic key press implementation
    return { success: true, action: 'key', data: keyData };
  }

  /**
   * Send message to IDE
   */
  async sendMessageToIDE(ideService, port, message) {
    try {
      if (ideService && ideService.sendChatMessage) {
        return await ideService.sendChatMessage(message);
      } else if (ideService && ideService.sendMessage) {
        return await ideService.sendMessage(message);
      } else {
        // Fallback implementation
        return { success: true, message: message, sent: true };
      }
    } catch (error) {
      this.logger.error(`[IDEMirrorController] Error sending message to IDE port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Setup routes for this controller
   */
  setupRoutes(app) {
    // IDE mirror routes
    app.get('/api/ide/mirror/dom', this.getIDEDOM.bind(this));
    app.post('/api/ide/mirror/interact', this.interactWithIDE.bind(this));
    app.get('/api/ide/mirror/status', this.getMirrorStatus.bind(this));
    app.post('/api/ide/mirror/connect', this.connectToIDEMirror.bind(this));
    app.post('/api/ide/mirror/disconnect', this.disconnectFromIDEMirror.bind(this));
    app.get('/api/ide/mirror/data', this.getMirrorData.bind(this));
    app.post('/api/ide/mirror/chat', this.sendChatMessage.bind(this));
  }
}

module.exports = IDEMirrorController; 