/**
 * ExecuteTerminalCommand - Application Layer: IDE Terminal Commands
 * Command for executing terminal commands
 */

class ExecuteTerminalCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.command = params.command;
    this.waitTime = params.waitTime || 2000;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `execute_terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (!this.command || this.command.trim().length === 0) {
      throw new Error('Terminal command is required');
    }

    if (this.command.length > 1000) {
      throw new Error('Terminal command too long (max 1000 characters)');
    }

    if (this.waitTime && (typeof this.waitTime !== 'number' || this.waitTime < 0 || this.waitTime > 30000)) {
      throw new Error('Wait time must be a number between 0 and 30000 milliseconds');
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
      type: 'ExecuteTerminalCommand',
      userId: this.userId,
      command: this.command,
      waitTime: this.waitTime,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = ExecuteTerminalCommand; 