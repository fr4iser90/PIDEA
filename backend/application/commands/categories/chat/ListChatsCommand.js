/**
 * ListChatsCommand - Application Layer: IDE Chat Commands
 * Command for listing available chat sessions
 */

class ListChatsCommand {
  constructor(params = {}) {
    this.userId = params.userId;
    this.limit = params.limit || 50;
    this.offset = params.offset || 0;
    this.includeArchived = params.includeArchived || false;
    this.options = params.options || {};
    this.timestamp = new Date();
    this.commandId = this.generateCommandId();
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   */
  generateCommandId() {
    return `list_chats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command parameters
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.userId) {
      throw new Error('User ID is required');
    }

    if (this.limit && (typeof this.limit !== 'number' || this.limit < 1 || this.limit > 1000)) {
      throw new Error('Limit must be a number between 1 and 1000');
    }

    if (this.offset && (typeof this.offset !== 'number' || this.offset < 0)) {
      throw new Error('Offset must be a non-negative number');
    }

    if (typeof this.includeArchived !== 'boolean') {
      throw new Error('includeArchived must be a boolean');
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
      type: 'ListChatsCommand',
      userId: this.userId,
      limit: this.limit,
      offset: this.offset,
      includeArchived: this.includeArchived,
      options: { ...this.options, ...options },
      timestamp: this.timestamp,
      status: 'pending'
    };
  }
}

module.exports = ListChatsCommand; 