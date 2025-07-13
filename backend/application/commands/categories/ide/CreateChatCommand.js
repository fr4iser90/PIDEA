/**
 * CreateChatCommand - Application Layer: IDE Chat Commands
 * Command for creating new chat sessions with IDE integration
 */

class CreateChatCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.title = params.title || 'New Chat';
    this.metadata = params.metadata || {};
    this.options = params.options || {};
    this.clickNewChat = params.clickNewChat !== false; // Default to true
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `create_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (this.title && this.title.trim().length === 0) {
      throw new Error('Chat title cannot be empty');
    }

    if (this.title && this.title.length > 200) {
      throw new Error('Chat title too long (max 200 characters)');
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
      type: 'CreateChatCommand',
      userId: this.userId,
      title: this.title,
      metadata: this.metadata,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = CreateChatCommand; 