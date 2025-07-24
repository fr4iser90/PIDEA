/**
 * CreateChatHandler - Application Layer: IDE Chat Handlers
 * Handler for creating new chat sessions with IDE integration
 */

const CreateChatCommand = require('@categories/chat/CreateChatCommand');
const ChatSession = require('@entities/ChatSession');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class CreateChatHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.chatSessionService = dependencies.chatSessionService;
    this.ideManager = dependencies.ideManager;
    this.browserManager = dependencies.browserManager;
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
    const required = ['chatSessionService', 'ideManager', 'eventBus', 'browserManager'];
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
    return `create_chat_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle CreateChatCommand
   * @param {CreateChatCommand} command - Chat creation command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Creation result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('Creating chat session', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        title: command.title
      });

      // Publish event
      await this.eventBus.publish('chat.creating', {
        commandId: command.commandId,
        userId: command.userId,
        title: command.title,
        timestamp: new Date()
      });

      // First, click New Chat button in the IDE using BrowserManager
      this.logger.info('Clicking New Chat button in IDE...');
      const browserResult = await this.browserManager.clickNewChat();
      
      if (!browserResult) {
        throw new Error('Failed to click New Chat button in IDE');
      }
      
      this.logger.info('New Chat button clicked successfully');
      
      // Wait a bit for the new chat to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then create session using ChatSessionService
      const session = await this.chatSessionService.createSession(
        command.userId,
        command.title,
        command.metadata
      );

      // Publish success event
      await this.eventBus.publish('chat.created', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: session.id,
        title: session.title,
        timestamp: new Date()
      });

      this.logger.info('Chat session created successfully', {
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
      this.logger.error('Failed to create chat session', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });

      // Publish failure event
      await this.eventBus.publish('chat.creation.failed', {
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
   * @param {CreateChatCommand} command - Chat creation command
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    const errors = [];
    const warnings = [];

    if (!command.userId) {
      errors.push('User ID is required');
    }

    if (!command.title || command.title.trim().length === 0) {
      errors.push('Chat title is required');
    }

    if (command.title && command.title.length > 200) {
      errors.push('Chat title too long (max 200 characters)');
    }

    if (command.metadata && typeof command.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = CreateChatHandler; 