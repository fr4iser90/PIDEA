/**
 * TerminalLogCaptureCommand - Application Layer: IDE Terminal Commands
 * Command for capturing terminal logs
 */

class TerminalLogCaptureCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.maxLines = params.maxLines || 100;
    this.includeTimestamps = params.includeTimestamps || true;
    this.filterLevel = params.filterLevel || 'all'; // all, error, warning, info, debug
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `capture_logs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (this.maxLines && (typeof this.maxLines !== 'number' || this.maxLines < 1 || this.maxLines > 10000)) {
      throw new Error('Max lines must be a number between 1 and 10000');
    }

    if (typeof this.includeTimestamps !== 'boolean') {
      throw new Error('includeTimestamps must be a boolean');
    }

    const validLevels = ['all', 'error', 'warning', 'info', 'debug'];
    if (this.filterLevel && !validLevels.includes(this.filterLevel)) {
      throw new Error(`Filter level must be one of: ${validLevels.join(', ')}`);
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
      type: 'TerminalLogCaptureCommand',
      userId: this.userId,
      maxLines: this.maxLines,
      includeTimestamps: this.includeTimestamps,
      filterLevel: this.filterLevel,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = TerminalLogCaptureCommand; 