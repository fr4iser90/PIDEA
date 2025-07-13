/**
 * RestartUserAppCommand - Application Layer: IDE Terminal Commands
 * Command for restarting user applications
 */

class RestartUserAppCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.appName = params.appName;
    this.forceRestart = params.forceRestart || false;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `restart_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (this.appName && typeof this.appName !== 'string') {
      throw new Error('App name must be a string');
    }

    if (this.appName && this.appName.length > 200) {
      throw new Error('App name too long (max 200 characters)');
    }

    if (typeof this.forceRestart !== 'boolean') {
      throw new Error('forceRestart must be a boolean');
    }

    // Validate options
    if (this.options && typeof this.options !== 'object') {
      throw new Error('Options must be an object');
    }
  }

  /**
   * Execute command
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context = {}, options = {}) {
    this.validate();
    
    return {
      commandId: this.commandId,
      type: 'RestartUserAppCommand',
      userId: this.userId,
      appName: this.appName,
      forceRestart: this.forceRestart,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = RestartUserAppCommand; 