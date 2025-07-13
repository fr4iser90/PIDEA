/**
 * OpenTerminalCommand - Application Layer: IDE Terminal Commands
 * Command for opening IDE terminal
 */

class OpenTerminalCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.ideType = params.ideType;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `open_terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    // Validate IDE type if provided
    if (this.ideType) {
      const validTypes = ['cursor', 'vscode', 'windsurf'];
      if (!validTypes.includes(this.ideType)) {
        throw new Error(`Invalid IDE type. Must be one of: ${validTypes.join(', ')}`);
      }
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
      type: 'OpenTerminalCommand',
      userId: this.userId,
      ideType: this.ideType,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = OpenTerminalCommand; 