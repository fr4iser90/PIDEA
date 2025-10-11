/**
 * BaseInterface - Abstract base class for all interface implementations
 * 
 * This abstract class defines the contract that all interface implementations
 * must follow. It provides common functionality and enforces consistent
 * interface lifecycle management across different interface types.
 * 
 * @abstract
 */
class BaseInterface {
  /**
   * Constructor for BaseInterface
   * @param {string} interfaceId - Unique identifier for this interface instance
   * @param {string} interfaceType - Type of interface (e.g., 'ide', 'editor', 'terminal')
   * @param {Object} config - Configuration object for the interface
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(interfaceId, interfaceType, config = {}, dependencies = {}) {
    if (this.constructor === BaseInterface) {
      throw new Error('BaseInterface is abstract and cannot be instantiated directly');
    }

    this.interfaceId = interfaceId;
    this.interfaceType = interfaceType;
    this.interfaceConfig = config;
    this.dependencies = dependencies;
    this.currentStatus = 'created';
    this.createdAt = new Date();
    this.lastActivity = new Date();
    
    // Validate required properties
    this._validateConfiguration();
  }

  /**
   * Initialize the interface
   * @abstract
   * @param {Object} config - Configuration object
   * @returns {Promise<void>}
   */
  async initialize(config) {
    throw new Error('initialize method must be implemented by subclass');
  }

  /**
   * Start the interface
   * @abstract
   * @returns {Promise<void>}
   */
  async start() {
    throw new Error('start method must be implemented by subclass');
  }

  /**
   * Stop the interface
   * @abstract
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop method must be implemented by subclass');
  }

  /**
   * Destroy the interface and clean up resources
   * @abstract
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('destroy method must be implemented by subclass');
  }

  /**
   * Get interface type
   * @returns {string} Interface type
   */
  get type() {
    return this.interfaceType;
  }

  /**
   * Get interface ID
   * @returns {string} Interface ID
   */
  get id() {
    return this.interfaceId;
  }

  /**
   * Get current status
   * @returns {string} Current status
   */
  get status() {
    return this.currentStatus;
  }

  /**
   * Get interface configuration
   * @returns {Object} Interface configuration
   */
  get config() {
    return this.interfaceConfig;
  }

  /**
   * Get creation timestamp
   * @returns {Date} Creation timestamp
   */
  get createdAt() {
    return this.createdAt;
  }

  /**
   * Get last activity timestamp
   * @returns {Date} Last activity timestamp
   */
  get lastActivity() {
    return this.lastActivity;
  }

  /**
   * Update interface status
   * @param {string} status - New status
   * @returns {void}
   */
  setStatus(status) {
    const validStatuses = ['created', 'initialized', 'starting', 'running', 'stopping', 'stopped', 'error', 'destroyed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
    }
    
    this.currentStatus = status;
    this.lastActivity = new Date();
  }

  /**
   * Update last activity timestamp
   * @returns {void}
   */
  updateActivity() {
    this.lastActivity = new Date();
  }

  /**
   * Check if interface is running
   * @returns {boolean} True if interface is running
   */
  isRunning() {
    return this.currentStatus === 'running';
  }

  /**
   * Check if interface is stopped
   * @returns {boolean} True if interface is stopped
   */
  isStopped() {
    return this.currentStatus === 'stopped';
  }

  /**
   * Check if interface is in error state
   * @returns {boolean} True if interface is in error state
   */
  isError() {
    return this.currentStatus === 'error';
  }

  /**
   * Get interface metadata
   * @returns {Object} Interface metadata
   */
  getMetadata() {
    return {
      id: this.interfaceId,
      type: this.interfaceType,
      status: this.currentStatus,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      config: this.interfaceConfig
    };
  }

  /**
   * Validate interface configuration
   * @protected
   * @returns {void}
   * @throws {Error} If configuration is invalid
   */
  _validateConfiguration() {
    if (!this.interfaceId || typeof this.interfaceId !== 'string') {
      throw new Error('interfaceId must be a non-empty string');
    }
    
    if (!this.interfaceType || typeof this.interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    if (typeof this.interfaceConfig !== 'object' || this.interfaceConfig === null) {
      throw new Error('interfaceConfig must be an object');
    }
  }

  /**
   * Log interface operation
   * @protected
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {void}
   */
  _log(level, message, meta = {}) {
    const logger = this.dependencies.logger || console;
    const logData = {
      interfaceId: this.interfaceId,
      interfaceType: this.interfaceType,
      status: this.currentStatus,
      ...meta
    };
    
    if (typeof logger[level] === 'function') {
      logger[level](message, logData);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, logData);
    }
  }

  /**
   * Handle interface error
   * @protected
   * @param {Error} error - Error object
   * @param {string} operation - Operation that failed
   * @returns {void}
   */
  _handleError(error, operation) {
    this.setStatus('error');
    this._log('error', `Interface ${operation} failed`, {
      error: error.message,
      stack: error.stack,
      operation
    });
  }

  /**
   * Create a standardized error response
   * @protected
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} Error response object
   */
  _createErrorResponse(message, code = 'INTERFACE_ERROR', details = {}) {
    return {
      success: false,
      error: {
        message,
        code,
        interfaceId: this.interfaceId,
        interfaceType: this.interfaceType,
        timestamp: new Date().toISOString(),
        ...details
      }
    };
  }

  /**
   * Create a standardized success response
   * @protected
   * @param {any} data - Response data
   * @param {Object} meta - Additional metadata
   * @returns {Object} Success response object
   */
  _createSuccessResponse(data = null, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        interfaceId: this.interfaceId,
        interfaceType: this.interfaceType,
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }
}

module.exports = BaseInterface;
