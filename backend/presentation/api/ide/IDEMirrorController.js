const Logger = require("@logging/Logger");
const logger = new Logger("Logger");
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

    // All IDE-specific services removed - using interfaceManager instead
    this.interfaceManager =
      this.serviceRegistry?.getService("interfaceManager");

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
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.badRequest("No active IDE port specified");
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.notFound("No IDE service found for port ${activePort}");
      }

      const domData = await this.captureIDEDOM(ideService, activePort);

      res.success({
        port: activePort,
        dom: domData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Error getting IDE DOM:", error);
      res.error("Failed to get IDE DOM", 500, { details: error.message });
    }
  }

  /**
   * Interact with IDE
   * POST /api/ide/mirror/interact
   */
  async interactWithIDE(req, res) {
    try {
      const { port, action, selector, data } = req.body;
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.badRequest("No active IDE port specified");
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.notFound("No IDE service found for port ${activePort}");
      }

      const result = await this.performIDEInteraction(
        ideService,
        activePort,
        action,
        selector,
        data,
      );

      res.success({
        port: activePort,
        action: action,
        result: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Error interacting with IDE:", error);
      res.error("Failed to interact with IDE", 500, { details: error.message });
    }
  }

  /**
   * Get mirror status
   * GET /api/ide/mirror/status
   */
  async getMirrorStatus(req, res) {
    try {
      const { port } = req.query;
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.success({
          data: {
            connected: false,
            activePort: null,
            availablePorts: [],
            mirrorState: {},
          },
        });
      }

      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const targetIDE = availableIDEs.find((ide) => ide.port === activePort);

      const status = {
        connected: !!targetIDE && targetIDE.status === "running",
        activePort: activePort,
        availablePorts: availableIDEs.map((ide) => ide.port),
        mirrorState: this.mirrorState.get(activePort) || {},
        ideType: targetIDE?.ideType || "unknown",
        workspacePath: targetIDE?.workspacePath,
        lastActivity: new Date().toISOString(),
      };

      res.success(status);
    } catch (error) {
      this.logger.error("Error getting mirror status:", error);
      res.error("Failed to get mirror status", 500, { details: error.message });
    }
  }

  /**
   * Connect to IDE mirror
   * POST /api/ide/mirror/connect
   */
  async connectToIDEMirror(req, res) {
    try {
      const { port } = req.body;
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.badRequest("No active IDE port specified");
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.notFound("No IDE service found for port ${activePort}");
      }

      // Initialize mirror state
      this.mirrorState.set(activePort, {
        connected: true,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        interactions: 0,
      });

      // Capture initial DOM
      const initialDOM = await this.captureIDEDOM(ideService, activePort);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish("ideMirrorConnected", {
          port: activePort,
          timestamp: new Date().toISOString(),
        });
      }

      res.success({
        port: activePort,
        connected: true,
        initialDOM: initialDOM,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Error connecting to IDE mirror:", error);
      res.error("Failed to connect to IDE mirror", 500, {
        details: error.message,
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
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.badRequest("No active IDE port specified");
      }

      // Clear mirror state
      this.mirrorState.delete(activePort);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish("ideMirrorDisconnected", {
          port: activePort,
          timestamp: new Date().toISOString(),
        });
      }

      res.success({
        port: activePort,
        connected: false,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Error disconnecting from IDE mirror:", error);
      res.error("Failed to disconnect from IDE mirror", 500, {
        details: error.message,
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
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.badRequest("No active IDE port specified");
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.notFound("No IDE service found for port ${activePort}");
      }

      const mirrorData = {
        port: activePort,
        state: this.mirrorState.get(activePort) || {},
        timestamp: new Date().toISOString(),
      };

      if (includeDOM === "true") {
        mirrorData.dom = await this.captureIDEDOM(ideService, activePort);
      }

      res.success(mirrorData);
    } catch (error) {
      this.logger.error("Error getting mirror data:", error);
      res.error("Failed to get mirror data", 500, { details: error.message });
    }
  }

  /**
   * Send chat message to IDE
   * POST /api/ide/mirror/chat
   */
  async sendChatMessage(req, res) {
    try {
      const { port, message } = req.body;
      const activePort = port
        ? parseInt(port)
        : this.ideManager.getActivePort();

      if (!activePort) {
        return res.badRequest("No active IDE port specified");
      }

      if (!message) {
        return res.badRequest("Message is required");
      }

      const ideService = this.getIDEServiceForPort(activePort);
      if (!ideService) {
        return res.notFound("No IDE service found for port ${activePort}");
      }

      const result = await this.sendMessageToIDE(
        ideService,
        activePort,
        message,
      );

      res.success({
        port: activePort,
        message: message,
        result: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Error sending chat message:", error);
      res.error("Failed to send chat message", 500, { details: error.message });
    }
  }

  // Helper methods

  /**
   * Get IDE service for specific port
   */
  getIDEServiceForPort(port) {
    const availableIDEs = this.ideManager.getAvailableIDEsSync();
    const targetIDE = availableIDEs.find((ide) => ide.port === port);

    if (!targetIDE) {
      return null;
    }

    const ideType = targetIDE.ideType || "cursor";

    // All IDE services removed - using interfaceManager instead
    return this.interfaceManager;
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
          css: { inline: [], external: [] },
        };
      }
    } catch (error) {
      this.logger.error(`Error capturing DOM for port ${port}:`, error);
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
        case "click":
          return await this.performClick(ideService, selector);
        case "type":
          return await this.performType(ideService, selector, data);
        case "focus":
          return await this.performFocus(ideService, selector);
        case "scroll":
          return await this.performScroll(ideService, data);
        case "key":
          return await this.performKeyPress(ideService, data);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.logger.error(
        `Error performing interaction for port ${port}:`,
        error,
      );
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
      return { action: "click", selector };
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
      return { action: "type", selector, text };
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
      return { action: "focus", selector };
    }
  }

  /**
   * Perform scroll interaction
   */
  async performScroll(ideService, scrollData) {
    // Generic scroll implementation
    return { action: "scroll", data: scrollData };
  }

  /**
   * Perform key press interaction
   */
  async performKeyPress(ideService, keyData) {
    // Generic key press implementation
    return { action: "key", data: keyData };
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
        return { message: message, sent: true };
      }
    } catch (error) {
      this.logger.error(`Error sending message to IDE port ${port}:`, error);
      throw error;
    }
  }

  /**
   * Setup routes for this controller
   */
  setupRoutes(app) {
    // IDE mirror routes
    app.get("/api/ide/mirror/dom", this.getIDEDOM.bind(this));
    app.post("/api/ide/mirror/interact", this.interactWithIDE.bind(this));
    app.get("/api/ide/mirror/status", this.getMirrorStatus.bind(this));
    app.post("/api/ide/mirror/connect", this.connectToIDEMirror.bind(this));
    app.post(
      "/api/ide/mirror/disconnect",
      this.disconnectFromIDEMirror.bind(this),
    );
    app.get("/api/ide/mirror/data", this.getMirrorData.bind(this));
    app.post("/api/ide/mirror/chat", this.sendChatMessage.bind(this));
  }
}

module.exports = IDEMirrorController;
