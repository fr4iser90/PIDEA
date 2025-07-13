/**
 * MonitorTerminalOutputCommand - Application Layer: IDE Terminal Commands
 * Command for monitoring terminal output
 */

class MonitorTerminalOutputCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.duration = params.duration || 5000;
    this.interval = params.interval || 1000;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `monitor_terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (this.duration && (typeof this.duration !== 'number' || this.duration < 1000 || this.duration > 60000)) {
      throw new Error('Duration must be a number between 1000 and 60000 milliseconds');
    }

    if (this.interval && (typeof this.interval !== 'number' || this.interval < 100 || this.interval > 10000)) {
      throw new Error('Interval must be a number between 100 and 10000 milliseconds');
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
      type: 'MonitorTerminalOutputCommand',
      userId: this.userId,
      duration: this.duration,
      interval: this.interval,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = MonitorTerminalOutputCommand; 