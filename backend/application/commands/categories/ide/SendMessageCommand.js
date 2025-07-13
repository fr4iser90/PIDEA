/**
 * SendMessageCommand - Application Layer: IDE Chat Commands
 * Command for sending messages to IDE chat with session management
 */

class SendMessageCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.sessionId = params.sessionId;
    this.message = params.message;
    this.messageType = params.messageType || 'text';
    this.metadata = params.metadata || {};
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `send_message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (!this.message || this.message.trim().length === 0) {
      throw new Error('Message content is required');
    }

    if (this.message.length > 10000) {
      throw new Error('Message content too long (max 10000 characters)');
    }

    // Validate message type
    const validTypes = ['text', 'code', 'system', 'error'];
    if (this.messageType && !validTypes.includes(this.messageType)) {
      throw new Error(`Invalid message type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate metadata
    if (this.metadata && typeof this.metadata !== 'object') {
      throw new Error('Metadata must be an object');
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
      type: 'SendMessageCommand',
      userId: this.userId,
      sessionId: this.sessionId,
      message: this.message,
      messageType: this.messageType,
      metadata: this.metadata,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = SendMessageCommand; 