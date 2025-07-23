/**
 * ListChatsHandler - Application Layer: IDE Chat Handlers
 * Handler for listing available chat sessions
 */

const ListChatsCommand = require('@categories/chat/ListChatsCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ListChatsHandler {
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
    return `list_chats_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle ListChatsCommand
   * @param {ListChatsCommand} command - Chat listing command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Listing result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('Listing chat sessions', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        limit: command.limit,
        offset: command.offset
      });

      // Publish event
      await this.eventBus.publish('chat.listing', {
        commandId: command.commandId,
        userId: command.userId,
        timestamp: new Date()
      });

      // List sessions using ChatSessionService
      const sessions = await this.chatSessionService.listSessions(command.userId, {
        limit: command.limit,
        offset: command.offset,
        includeArchived: command.includeArchived
      });

      // Get session statistics
      const stats = await this.chatSessionService.getSessionStats(command.userId);

      // Publish success event
      await this.eventBus.publish('chat.listed', {
        commandId: command.commandId,
        userId: command.userId,
        sessionCount: sessions.length,
        timestamp: new Date()
      });

      this.logger.info('Chat sessions listed successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        sessionCount: sessions.length
      });

      return {
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          title: session.title,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          isActive: session.isActive || false,
          metadata: session.metadata
        })),
        stats: stats,
        pagination: {
          limit: command.limit,
          offset: command.offset,
          total: sessions.length
        },
        commandId: command.commandId
      };

    } catch (error) {
      this.logger.error('Failed to list chat sessions', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });

      // Publish failure event
      await this.eventBus.publish('chat.listing.failed', {
        commandId: command.commandId,
        userId: command.userId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Validate command
   * @param {ListChatsCommand} command - Chat listing command
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    const errors = [];
    const warnings = [];

    if (!command.userId) {
      errors.push('User ID is required');
    }

    if (command.limit && (typeof command.limit !== 'number' || command.limit < 1 || command.limit > 1000)) {
      errors.push('Limit must be a number between 1 and 1000');
    }

    if (command.offset && (typeof command.offset !== 'number' || command.offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }

    if (typeof command.includeArchived !== 'boolean') {
      errors.push('includeArchived must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = ListChatsHandler; 