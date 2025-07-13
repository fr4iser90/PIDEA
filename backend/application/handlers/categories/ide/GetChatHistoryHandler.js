/**
 * GetChatHistoryHandler - Application Layer: IDE Chat Handlers
 * Handler for retrieving chat history
 */

const GetChatHistoryCommand = require('@categories/ide/GetChatHistoryCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GetChatHistoryHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.chatSessionService = dependencies.chatSessionService;
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || logger;
    
    this.handlerId = this.generateHandlerId();
  }

  /**
   * Validate handler dependencies
   * @param {Object} dependencies - Handler dependencies
   * @throws {Error} If dependencies are invalid
   */
  validateDependencies(dependencies) {
    const required = ['chatSessionService', 'ideManager', 'eventBus'];
    for (const dep of required) {
      if (!dependencies[dep]) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
  }

  /**
   * Generate unique handler ID
   * @returns {string} Unique handler ID
   */
  generateHandlerId() {
    return `get_chat_history_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle GetChatHistoryCommand
   * @param {GetChatHistoryCommand} command - Chat history command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} History retrieval result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('[GetChatHistoryHandler] Retrieving chat history', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        limit: command.limit,
        offset: command.offset
      });

      // Publish event
      await this.eventBus.publish('chat.history.retrieving', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        timestamp: new Date()
      });

      // Get chat history using ChatSessionService
      const messages = await this.chatSessionService.getChatHistory(
        command.userId,
        command.sessionId,
        {
          limit: command.limit,
          offset: command.offset
        }
      );

      // Publish success event
      await this.eventBus.publish('chat.history.retrieved', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        messageCount: messages.length,
        timestamp: new Date()
      });

      this.logger.info('[GetChatHistoryHandler] Chat history retrieved successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        sessionId: command.sessionId,
        messageCount: messages.length
      });

      return {
        success: true,
        sessionId: command.sessionId,
        messages: messages.map(message => ({
          id: message.id,
          content: message.content,
          type: message.type,
          sender: message.sender,
          timestamp: message.timestamp,
          metadata: message.metadata
        })),
        pagination: {
          limit: command.limit,
          offset: command.offset,
          total: messages.length
        },
        commandId: command.commandId
      };

    } catch (error) {
      this.logger.error('[GetChatHistoryHandler] Failed to retrieve chat history', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });

      // Publish failure event
      await this.eventBus.publish('chat.history.retrieval.failed', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Validate command
   * @param {GetChatHistoryCommand} command - Chat history command
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    const errors = [];
    const warnings = [];

    if (!command.userId) {
      errors.push('User ID is required');
    }

    if (!command.sessionId) {
      errors.push('Session ID is required');
    }

    if (command.sessionId && (typeof command.sessionId !== 'string' || command.sessionId.trim().length === 0)) {
      errors.push('Session ID must be a non-empty string');
    }

    if (command.limit && (typeof command.limit !== 'number' || command.limit < 1 || command.limit > 1000)) {
      errors.push('Limit must be a number between 1 and 1000');
    }

    if (command.offset && (typeof command.offset !== 'number' || command.offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = GetChatHistoryHandler; 