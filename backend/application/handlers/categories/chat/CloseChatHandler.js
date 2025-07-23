/**
 * CloseChatHandler - Application Layer: IDE Chat Handlers
 * Handler for closing chat sessions
 */

const CloseChatCommand = require('@categories/chat/CloseChatCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class CloseChatHandler {
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
    return `close_chat_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle CloseChatCommand
   * @param {CloseChatCommand} command - Chat closing command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Closing result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('Closing chat session', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId
      });

      // Publish event
      await this.eventBus.publish('chat.closing', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        timestamp: new Date()
      });

      // Close session using ChatSessionService
      const success = await this.chatSessionService.closeSession(
        command.userId,
        command.sessionId
      );

      // Publish success event
      await this.eventBus.publish('chat.closed', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        timestamp: new Date()
      });

      this.logger.info('Chat session closed successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        sessionId: command.sessionId
      });

      return {
        success: true,
        sessionId: command.sessionId,
        commandId: command.commandId
      };

    } catch (error) {
      this.logger.error('Failed to close chat session', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });

      // Publish failure event
      await this.eventBus.publish('chat.closing.failed', {
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
   * @param {CloseChatCommand} command - Chat closing command
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

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = CloseChatHandler; 