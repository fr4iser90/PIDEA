
/**
 * BaseIDE - Common IDE functionality
 * Provides shared functionality and utilities for all IDE implementations
 */
const IDEInterface = require('./IDEInterface');
const IDETypes = require('./IDETypes');

class BaseIDE extends IDEInterface {
  constructor(browserManager, ideManager, eventBus = null, ideType = 'cursor') {
    super();
    
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.ideType = ideType;
    
    // Initialize common services
    this.terminalMonitor = null;
    this.packageJsonAnalyzer = null;
    this.workspacePathDetector = null;
    this.chatMessageHandler = null;
    this.chatHistoryExtractor = null;
    
    // Status tracking
    this.isInitialized = false;
    this.lastError = null;
    this.lastActivity = null;
    
    // Initialize common services
    this.initializeCommonServices();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize common services used by all IDEs
   */
  initializeCommonServices() {
    try {
      // Import common services
      const TerminalMonitor = require('../terminal/TerminalMonitor');
      const PackageJsonAnalyzer = require('../dev-server/PackageJsonAnalyzer');
      const WorkspacePathDetector = require('../workspace/WorkspacePathDetector');
      const ChatHistoryExtractor = require('../chat/ChatHistoryExtractor');
      
      // Initialize services
      this.terminalMonitor = new TerminalMonitor(this.browserManager, this.eventBus);
      this.packageJsonAnalyzer = new PackageJsonAnalyzer(this.eventBus);
      this.workspacePathDetector = new WorkspacePathDetector(this.browserManager, this.ideManager);
      this.chatHistoryExtractor = new ChatHistoryExtractor(this.browserManager, this.ideType);
      
      logger.info(`[BaseIDE] Common services initialized for ${this.ideType}`);
    } catch (error) {
      logger.error(`[BaseIDE] Failed to initialize common services:`, error);
      this.lastError = error;
    }
  }

  /**
   * Set up event listeners for IDE changes
   */
  setupEventListeners() {
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        logger.info(`[BaseIDE] IDE changed for ${this.ideType}, resetting cache`);
        logger.info(`[BaseIDE] Event data:`, eventData);
        
        // Switch browser connection to new IDE
        if (eventData.port) {
          try {
            logger.info(`[BaseIDE] Switching browser connection to port:`, eventData.port);
            await this.browserManager.switchToPort(eventData.port);
            logger.info(`[BaseIDE] Successfully switched browser connection to port:`, eventData.port);
          } catch (error) {
            logger.error(`[BaseIDE] Failed to switch browser connection:`, error.message);
          }
        }
      });
    }
  }

  /**
   * Common error handling
   * @param {Error} error - Error to handle
   * @param {string} context - Error context
   * @returns {Object} Error result
   */
  handleError(error, context = '') {
    this.lastError = error;
    this.lastActivity = new Date();
    
    const errorResult = {
      success: false,
      error: error.message,
      context: context,
      ideType: this.ideType,
      timestamp: new Date(),
      stack: error.stack
    };
    
    logger.error(`[BaseIDE] Error in ${context}:`, error);
    return errorResult;
  }

  /**
   * Common logging utility
   * @param {string} message - Message to log
   * @param {Object} data - Additional data
   */
  log(message, data = {}) {
    const logData = {
      ideType: this.ideType,
      timestamp: new Date(),
      ...data
    };
    
    logger.info(`[BaseIDE] ${message}`, logData);
  }

  /**
   * Update status tracking
   * @param {string} status - Status to set
   * @param {Object} data - Additional status data
   */
  updateStatus(status, data = {}) {
    this.lastActivity = new Date();
    
    const statusData = {
      status,
      ideType: this.ideType,
      timestamp: new Date(),
      ...data
    };
    
    this.log(`Status updated: ${status}`, statusData);
    
    // Emit status change event if event bus is available
    if (this.eventBus) {
      this.eventBus.emit('ideStatusChanged', statusData);
    }
  }

  /**
   * Validate IDE type
   * @param {string} type - IDE type to validate
   * @returns {boolean} True if valid
   */
  validateIDEType(type) {
    return IDETypes.isValid(type);
  }

  /**
   * Get IDE metadata
   * @returns {Object|null} IDE metadata
   */
  getIDEMetadata() {
    return IDETypes.getMetadata(this.ideType);
  }

  /**
   * Check if IDE supports a specific feature
   * @param {string} feature - Feature to check
   * @returns {boolean} True if feature is supported
   */
  supportsFeature(feature) {
    return IDETypes.supportsFeature(this.ideType, feature);
  }

  /**
   * Get supported features for this IDE
   * @returns {Array<string>} Supported features
   */
  getSupportedFeatures() {
    return IDETypes.getSupportedFeatures(this.ideType);
  }

  /**
   * Common workspace path detection
   * @param {number} port - IDE port
   * @returns {Promise<string|null>} Workspace path
   */
  async detectWorkspacePath(port) {
    try {
      if (this.workspacePathDetector) {
        return await this.workspacePathDetector.detectWorkspacePath(port);
      }
      return null;
    } catch (error) {
      this.handleError(error, 'detectWorkspacePath');
      return null;
    }
  }

  /**
   * Common terminal monitoring
   * @returns {Promise<string|null>} Terminal output URL
   */
  async monitorTerminalOutput() {
    try {
      if (this.terminalMonitor) {
        return await this.terminalMonitor.monitorTerminalOutput();
      }
      return null;
    } catch (error) {
      this.handleError(error, 'monitorTerminalOutput');
      return null;
    }
  }

  /**
   * Common package.json analysis
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<string|null>} Dev server URL
   */
  async detectDevServerFromPackageJson(workspacePath = null) {
    try {
      if (this.packageJsonAnalyzer) {
        return await this.packageJsonAnalyzer.analyzePackageJsonInPath(workspacePath);
      }
      return null;
    } catch (error) {
      this.handleError(error, 'detectDevServerFromPackageJson');
      return null;
    }
  }

  /**
   * Common chat history extraction
   * @returns {Promise<Array>} Chat history
   */
  async getChatHistory() {
    try {
      if (this.chatHistoryExtractor) {
        return await this.chatHistoryExtractor.extractChatHistory();
      }
      return [];
    } catch (error) {
      this.handleError(error, 'getChatHistory');
      return [];
    }
  }

  /**
   * Common browser page access
   * @returns {Promise<Object|null>} Browser page
   */
  async getPage() {
    try {
      if (this.browserManager) {
        return await this.browserManager.getPage();
      }
      return null;
    } catch (error) {
      this.handleError(error, 'getPage');
      return null;
    }
  }

  /**
   * Common element interaction
   * @param {string} selector - Element selector
   * @param {string} action - Action to perform
   * @param {Object} options - Interaction options
   * @returns {Promise<Object>} Interaction result
   */
  async interact(selector, action, options = {}) {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      let result = null;
      
      switch (action) {
        case 'click':
          await page.click(selector, options);
          result = { success: true, action: 'click', selector };
          break;
        case 'type':
          const text = options.text || '';
          await page.type(selector, text, options);
          result = { success: true, action: 'type', selector, text };
          break;
        case 'focus':
          await page.focus(selector);
          result = { success: true, action: 'focus', selector };
          break;
        case 'hover':
          await page.hover(selector);
          result = { success: true, action: 'hover', selector };
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      this.updateStatus('interaction_completed', { action, selector });
      return result;
    } catch (error) {
      return this.handleError(error, `interact(${selector}, ${action})`);
    }
  }

  /**
   * Common DOM structure retrieval
   * @returns {Promise<Object>} DOM structure
   */
  async getDOM() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No browser page available');
      }

      const dom = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          elements: document.querySelectorAll('*').length,
          body: document.body.innerHTML.substring(0, 1000) // Limit size
        };
      });

      return {
        success: true,
        dom,
        ideType: this.ideType,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'getDOM');
    }
  }

  /**
   * Common file operations
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Promise<Object>} File operation result
   */
  async writeFile(filePath, content) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content);
      
      return {
        success: true,
        filePath,
        contentLength: content.length,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, `writeFile(${filePath})`);
    }
  }

  /**
   * Common file reading
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File read result
   */
  async readFile(filePath) {
    try {
      const fs = require('fs');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        success: true,
        filePath,
        content,
        contentLength: content.length,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, `readFile(${filePath})`);
    }
  }

  /**
   * Get IDE status information
   * @returns {Promise<Object>} IDE status
   */
  async getStatus() {
    try {
      const isRunning = await this.detect();
      const metadata = this.getIDEMetadata();
      
      return {
        success: true,
        ideType: this.ideType,
        isRunning,
        isInitialized: this.isInitialized,
        lastActivity: this.lastActivity,
        lastError: this.lastError?.message || null,
        metadata,
        supportedFeatures: this.getSupportedFeatures(),
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError(error, 'getStatus');
    }
  }

  /**
   * Get IDE version (to be implemented by specific IDEs)
   * @returns {Promise<string>} IDE version
   */
  async getVersion() {
    const metadata = this.getIDEMetadata();
    return metadata?.version || 'unknown';
  }

  /**
   * Execute IDE command (to be implemented by specific IDEs)
   * @param {string} command - Command to execute
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  async executeCommand(command, options = {}) {
    return this.handleError(new Error('executeCommand not implemented'), 'executeCommand');
  }

  /**
   * Get workspace path (to be implemented by specific IDEs)
   * @returns {Promise<string>} Workspace path
   */
  async getWorkspacePath() {
    return this.handleError(new Error('getWorkspacePath not implemented'), 'getWorkspacePath');
  }

  /**
   * Switch to different IDE session/port (to be implemented by specific IDEs)
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Switch result
   */
  async switchToPort(port) {
    return this.handleError(new Error('switchToPort not implemented'), 'switchToPort');
  }

  /**
   * Get active port (to be implemented by specific IDEs)
   * @returns {number|null} Active port number
   */
  getActivePort() {
    return null;
  }

  /**
   * Send message to IDE chat (to be implemented by specific IDEs)
   * @param {string} message - Message to send
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Message result
   */
  async sendMessage(message, options = {}) {
    return this.handleError(new Error('sendMessage not implemented'), 'sendMessage');
  }

  /**
   * Get user app URL (to be implemented by specific IDEs)
   * @param {number} port - IDE port
   * @returns {Promise<string|null>} User app URL
   */
  async getUserAppUrlForPort(port = null) {
    return this.handleError(new Error('getUserAppUrlForPort not implemented'), 'getUserAppUrlForPort');
  }

  /**
   * Apply refactoring to file (to be implemented by specific IDEs)
   * @param {string} filePath - File path
   * @param {string} refactoredCode - Refactored code content
   * @returns {Promise<Object>} Refactoring result
   */
  async applyRefactoring(filePath, refactoredCode) {
    return this.handleError(new Error('applyRefactoring not implemented'), 'applyRefactoring');
  }

  /**
   * Send task to IDE (to be implemented by specific IDEs)
   * @param {Object} task - Task object
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Task result
   */
  async sendTask(task, workspacePath = null) {
    return this.handleError(new Error('sendTask not implemented'), 'sendTask');
  }

  /**
   * Send auto mode tasks to IDE (to be implemented by specific IDEs)
   * @param {Array} tasks - Array of tasks
   * @param {Object} projectAnalysis - Project analysis
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Auto mode result
   */
  async sendAutoModeTasks(tasks, projectAnalysis, workspacePath = null) {
    return this.handleError(new Error('sendAutoModeTasks not implemented'), 'sendAutoModeTasks');
  }
}

module.exports = BaseIDE; 