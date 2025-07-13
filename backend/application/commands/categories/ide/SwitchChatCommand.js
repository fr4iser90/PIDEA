/**
 * SwitchChatCommand - Application Layer: IDE Chat Commands
 * Command for switching between chat sessions
 */

class SwitchChatCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.sessionId = params.sessionId;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `switch_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (!this.sessionId) {
      throw new Error('Session ID is required');
    }

    if (typeof this.sessionId !== 'string' || this.sessionId.trim().length === 0) {
      throw new Error('Session ID must be a non-empty string');
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
      type: 'SwitchChatCommand',
      userId: this.userId,
      sessionId: this.sessionId,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = SwitchChatCommand; 