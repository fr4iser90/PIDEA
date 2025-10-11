/**
 * IDEInterface - IDE-specific interface implementation
 * 
 * This interface extends BaseInterface to provide IDE-specific functionality,
 * including workspace management, port handling, and IDE-specific operations.
 * It serves as a concrete implementation for IDE interfaces.
 */
const BaseInterface = require('./BaseInterface');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class IDEInterface extends BaseInterface {
  /**
   * Constructor for IDEInterface
   * @param {string} interfaceId - Unique identifier for this interface instance
   * @param {string} interfaceType - Type of interface (should be 'ide')
   * @param {Object} config - Configuration object for the interface
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(interfaceId, interfaceType, config = {}, dependencies = {}) {
    super(interfaceId, interfaceType, config, dependencies);
    
    // IDE-specific properties
    this.workspacePath = config.workspacePath || null;
    this.port = config.port || null;
    this.ideType = config.ideType || 'unknown';
    this.processId = null;
    this.isConnected = false;
    this.lastHeartbeat = null;
    
    // IDE-specific configuration
    this.ideConfig = {
      autoReconnect: config.autoReconnect !== false,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
      maxRetries: config.maxRetries || 3,
      ...config.ideConfig
    };
    
    // Initialize IDE-specific services
    this._initializeIDEServices();
  }

  /**
   * Initialize IDE-specific services
   * @private
   * @returns {void}
   */
  _initializeIDEServices() {
    this.logger = this.dependencies.logger || new ServiceLogger('IDEInterface');
    this.browserManager = this.dependencies.browserManager || null;
    this.portManager = this.dependencies.portManager || null;
    this.workspaceService = this.dependencies.workspaceService || null;
    this.eventBus = this.dependencies.eventBus || null;
    
    // Initialize heartbeat timer
    this.heartbeatTimer = null;
  }

  /**
   * Initialize the IDE interface
   * @param {Object} config - Configuration object
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    try {
      this.setStatus('initializing');
      this._log('info', 'Initializing IDE interface', { config });
      
      // Merge configuration
      this.interfaceConfig = { ...this.interfaceConfig, ...config };
      
      // Validate workspace path
      if (this.workspacePath) {
        await this._validateWorkspacePath();
      }
      
      // Initialize port if provided
      if (this.port) {
        await this._initializePort();
      }
      
      // Initialize IDE-specific components
      await this._initializeIDEComponents();
      
      this.setStatus('initialized');
      this._log('info', 'IDE interface initialized successfully');
      
      this._publishEvent('ide.initialized', {
        interfaceId: this.interfaceId,
        workspacePath: this.workspacePath,
        port: this.port,
        ideType: this.ideType
      });
      
    } catch (error) {
      this._handleError(error, 'initialize');
      throw error;
    }
  }

  /**
   * Start the IDE interface
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.setStatus('starting');
      this._log('info', 'Starting IDE interface');
      
      // Start IDE-specific services
      await this._startIDEServices();
      
      // Establish connection
      await this._establishConnection();
      
      // Start heartbeat monitoring
      this._startHeartbeat();
      
      this.setStatus('running');
      this.isConnected = true;
      this._log('info', 'IDE interface started successfully');
      
      this._publishEvent('ide.started', {
        interfaceId: this.interfaceId,
        workspacePath: this.workspacePath,
        port: this.port,
        ideType: this.ideType
      });
      
    } catch (error) {
      this._handleError(error, 'start');
      throw error;
    }
  }

  /**
   * Stop the IDE interface
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      this.setStatus('stopping');
      this._log('info', 'Stopping IDE interface');
      
      // Stop heartbeat monitoring
      this._stopHeartbeat();
      
      // Disconnect from IDE
      await this._disconnect();
      
      // Stop IDE-specific services
      await this._stopIDEServices();
      
      this.setStatus('stopped');
      this.isConnected = false;
      this._log('info', 'IDE interface stopped successfully');
      
      this._publishEvent('ide.stopped', {
        interfaceId: this.interfaceId,
        workspacePath: this.workspacePath,
        port: this.port,
        ideType: this.ideType
      });
      
    } catch (error) {
      this._handleError(error, 'stop');
      throw error;
    }
  }

  /**
   * Destroy the IDE interface and clean up resources
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.setStatus('destroying');
      this._log('info', 'Destroying IDE interface');
      
      // Stop if running
      if (this.isRunning()) {
        await this.stop();
      }
      
      // Clean up resources
      await this._cleanupResources();
      
      // Clear timers
      this._stopHeartbeat();
      
      this.setStatus('destroyed');
      this._log('info', 'IDE interface destroyed successfully');
      
      this._publishEvent('ide.destroyed', {
        interfaceId: this.interfaceId,
        workspacePath: this.workspacePath,
        port: this.port,
        ideType: this.ideType
      });
      
    } catch (error) {
      this._handleError(error, 'destroy');
      throw error;
    }
  }

  /**
   * Get IDE-specific metadata
   * @returns {Object} IDE metadata
   */
  getIDEMetadata() {
    return {
      ...this.getMetadata(),
      workspacePath: this.workspacePath,
      port: this.port,
      ideType: this.ideType,
      processId: this.processId,
      isConnected: this.isConnected,
      lastHeartbeat: this.lastHeartbeat,
      ideConfig: this.ideConfig
    };
  }

  /**
   * Get workspace information
   * @returns {Promise<Object>} Workspace information
   */
  async getWorkspaceInfo() {
    if (!this.workspacePath) {
      throw new Error('No workspace path configured');
    }
    
    try {
      if (this.workspaceService) {
        return await this.workspaceService.getWorkspaceInfo(this.workspacePath);
      }
      
      // Fallback to basic workspace info
      return {
        path: this.workspacePath,
        exists: true,
        type: 'unknown',
        lastModified: new Date()
      };
      
    } catch (error) {
      this._log('error', 'Failed to get workspace info', {
        workspacePath: this.workspacePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute command in IDE
   * @param {string} command - Command to execute
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  async executeCommand(command, options = {}) {
    if (!this.isConnected) {
      throw new Error('IDE interface is not connected');
    }
    
    try {
      this._log('info', 'Executing IDE command', { command, options });
      
      // Execute command through browser manager if available
      if (this.browserManager) {
        const result = await this.browserManager.executeCommand(command, {
          port: this.port,
          workspacePath: this.workspacePath,
          ...options
        });
        
        this.updateActivity();
        return this._createSuccessResponse(result, { command, options });
      }
      
      // Fallback implementation
      return this._createSuccessResponse(
        { command, executed: true, timestamp: new Date() },
        { command, options }
      );
      
    } catch (error) {
      this._log('error', 'Failed to execute IDE command', {
        command,
        error: error.message
      });
      return this._createErrorResponse(
        `Failed to execute command: ${error.message}`,
        'COMMAND_EXECUTION_FAILED',
        { command, options }
      );
    }
  }

  /**
   * Send message to IDE
   * @param {string} message - Message to send
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Message result
   */
  async sendMessage(message, options = {}) {
    if (!this.isConnected) {
      throw new Error('IDE interface is not connected');
    }
    
    try {
      this._log('info', 'Sending message to IDE', { message, options });
      
      // Send message through browser manager if available
      if (this.browserManager) {
        const result = await this.browserManager.sendMessage(message, {
          port: this.port,
          workspacePath: this.workspacePath,
          ...options
        });
        
        this.updateActivity();
        return this._createSuccessResponse(result, { message, options });
      }
      
      // Fallback implementation
      return this._createSuccessResponse(
        { message, sent: true, timestamp: new Date() },
        { message, options }
      );
      
    } catch (error) {
      this._log('error', 'Failed to send message to IDE', {
        message,
        error: error.message
      });
      return this._createErrorResponse(
        `Failed to send message: ${error.message}`,
        'MESSAGE_SEND_FAILED',
        { message, options }
      );
    }
  }

  /**
   * Validate workspace path
   * @private
   * @returns {Promise<void>}
   */
  async _validateWorkspacePath() {
    if (!this.workspaceService) {
      this._log('warn', 'No workspace service available for validation');
      return;
    }
    
    try {
      const isValid = await this.workspaceService.validateWorkspacePath(this.workspacePath);
      if (!isValid) {
        throw new Error(`Invalid workspace path: ${this.workspacePath}`);
      }
    } catch (error) {
      this._log('error', 'Workspace path validation failed', {
        workspacePath: this.workspacePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize port
   * @private
   * @returns {Promise<void>}
   */
  async _initializePort() {
    if (!this.portManager) {
      this._log('warn', 'No port manager available for port initialization');
      return;
    }
    
    try {
      const portInfo = await this.portManager.initializePort(this.port, {
        interfaceId: this.interfaceId,
        ideType: this.ideType
      });
      
      this._log('info', 'Port initialized', { port: this.port, portInfo });
    } catch (error) {
      this._log('error', 'Port initialization failed', {
        port: this.port,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize IDE-specific components
   * @private
   * @returns {Promise<void>}
   */
  async _initializeIDEComponents() {
    // Initialize browser manager if available
    if (this.browserManager && typeof this.browserManager.initialize === 'function') {
      await this.browserManager.initialize({
        port: this.port,
        workspacePath: this.workspacePath,
        ideType: this.ideType
      });
    }
    
    // Initialize other IDE-specific components
    this._log('info', 'IDE components initialized');
  }

  /**
   * Start IDE-specific services
   * @private
   * @returns {Promise<void>}
   */
  async _startIDEServices() {
    // Start browser manager if available
    if (this.browserManager && typeof this.browserManager.start === 'function') {
      await this.browserManager.start();
    }
    
    // Start other IDE-specific services
    this._log('info', 'IDE services started');
  }

  /**
   * Stop IDE-specific services
   * @private
   * @returns {Promise<void>}
   */
  async _stopIDEServices() {
    // Stop browser manager if available
    if (this.browserManager && typeof this.browserManager.stop === 'function') {
      await this.browserManager.stop();
    }
    
    // Stop other IDE-specific services
    this._log('info', 'IDE services stopped');
  }

  /**
   * Establish connection to IDE
   * @private
   * @returns {Promise<void>}
   */
  async _establishConnection() {
    try {
      // Establish connection through browser manager if available
      if (this.browserManager && typeof this.browserManager.connect === 'function') {
        await this.browserManager.connect({
          port: this.port,
          workspacePath: this.workspacePath,
          ideType: this.ideType
        });
      }
      
      this.isConnected = true;
      this.lastHeartbeat = new Date();
      this._log('info', 'Connection established');
      
    } catch (error) {
      this._log('error', 'Failed to establish connection', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Disconnect from IDE
   * @private
   * @returns {Promise<void>}
   */
  async _disconnect() {
    try {
      // Disconnect through browser manager if available
      if (this.browserManager && typeof this.browserManager.disconnect === 'function') {
        await this.browserManager.disconnect();
      }
      
      this.isConnected = false;
      this._log('info', 'Disconnected from IDE');
      
    } catch (error) {
      this._log('error', 'Failed to disconnect', {
        error: error.message
      });
      // Don't throw error during disconnect
    }
  }

  /**
   * Start heartbeat monitoring
   * @private
   * @returns {void}
   */
  _startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this._performHeartbeat();
    }, this.ideConfig.heartbeatInterval);
    
    this._log('info', 'Heartbeat monitoring started', {
      interval: this.ideConfig.heartbeatInterval
    });
  }

  /**
   * Stop heartbeat monitoring
   * @private
   * @returns {void}
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this._log('info', 'Heartbeat monitoring stopped');
    }
  }

  /**
   * Perform heartbeat check
   * @private
   * @returns {void}
   */
  _performHeartbeat() {
    try {
      // Perform heartbeat check through browser manager if available
      if (this.browserManager && typeof this.browserManager.heartbeat === 'function') {
        this.browserManager.heartbeat({
          port: this.port,
          workspacePath: this.workspacePath
        });
      }
      
      this.lastHeartbeat = new Date();
      this.updateActivity();
      
    } catch (error) {
      this._log('warn', 'Heartbeat check failed', {
        error: error.message
      });
      
      // Handle connection loss
      if (this.ideConfig.autoReconnect) {
        this._attemptReconnection();
      }
    }
  }

  /**
   * Attempt to reconnect
   * @private
   * @returns {void}
   */
  _attemptReconnection() {
    this._log('info', 'Attempting to reconnect');
    
    // Implement reconnection logic
    // This would typically involve retrying the connection
    // with exponential backoff
  }

  /**
   * Clean up resources
   * @private
   * @returns {Promise<void>}
   */
  async _cleanupResources() {
    // Clean up browser manager if available
    if (this.browserManager && typeof this.browserManager.cleanup === 'function') {
      await this.browserManager.cleanup();
    }
    
    // Clean up port if available
    if (this.portManager && this.port) {
      try {
        await this.portManager.releasePort(this.port);
      } catch (error) {
        this._log('warn', 'Failed to release port during cleanup', {
          port: this.port,
          error: error.message
        });
      }
    }
    
    this._log('info', 'Resources cleaned up');
  }

  /**
   * Publish event to event bus
   * @private
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @returns {void}
   */
  _publishEvent(eventName, data) {
    if (this.eventBus && typeof this.eventBus.publish === 'function') {
      try {
        this.eventBus.publish(eventName, {
          source: 'IDEInterface',
          interfaceId: this.interfaceId,
          timestamp: new Date().toISOString(),
          ...data
        });
      } catch (error) {
        this._log('warn', 'Failed to publish event', {
          eventName,
          error: error.message
        });
      }
    }
  }
}

module.exports = IDEInterface;
