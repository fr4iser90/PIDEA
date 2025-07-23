/**
 * GetChatHistoryCommand - Application Layer: IDE Chat Commands
 * Command for retrieving chat history
 */

class GetChatHistoryCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.sessionId = params.sessionId;
    this.limit = params.limit || 100;
    this.offset = params.offset || 0;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `get_chat_history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    if (this.limit && (typeof this.limit !== 'number' || this.limit < 1 || this.limit > 1000)) {
      throw new Error('Limit must be a number between 1 and 1000');
    }

    if (this.offset && (typeof this.offset !== 'number' || this.offset < 0)) {
      throw new Error('Offset must be a non-negative number');
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
      type: 'GetChatHistoryCommand',
      userId: this.userId,
      sessionId: this.sessionId,
      limit: this.limit,
      offset: this.offset,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = GetChatHistoryCommand; 