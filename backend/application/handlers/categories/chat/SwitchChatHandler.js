/**
 * SwitchChatHandler - Application Layer: IDE Chat Handlers
 * Handler for switching between chat sessions
 */

const SwitchChatCommand = require('@categories/chat/SwitchChatCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SwitchChatHandler {
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
    return `switch_chat_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle SwitchChatCommand
   * @param {SwitchChatCommand} command - Chat switching command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Switching result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('Switching chat session', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId
      });

      // Publish event
      await this.eventBus.publish('chat.switching', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        timestamp: new Date()
      });

      // Switch session using ChatSessionService
      const session = await this.chatSessionService.switchSession(
        command.userId,
        command.sessionId
      );

      // Publish success event
      await this.eventBus.publish('chat.switched', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: session.id,
        title: session.title,
        timestamp: new Date()
      });

      this.logger.info('Chat session switched successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        sessionId: session.id
      });

      return {
        success: true,
        session: {
          id: session.id,
          title: session.title,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          metadata: session.metadata
        },
        commandId: command.commandId
      };

    } catch (error) {
      this.logger.error('Failed to switch chat session', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });

      // Publish failure event
      await this.eventBus.publish('chat.switching.failed', {
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
   * @param {SwitchChatCommand} command - Chat switching command
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

module.exports = SwitchChatHandler; 