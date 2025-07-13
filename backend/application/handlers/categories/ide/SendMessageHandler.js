/**
 * SendMessageHandler - Application Layer: IDE Chat Handlers
 * Handler for sending messages with IDE integration and session management
 */

const SendMessageCommand = require('@categories/ide/SendMessageCommand');
const ChatMessage = require('@entities/ChatMessage');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SendMessageHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.chatSessionService = dependencies.chatSessionService;
    this.cursorIDEService = dependencies.cursorIDEService;
    this.vscodeIDEService = dependencies.vscodeIDEService;
    this.windsurfIDEService = dependencies.windsurfIDEService;
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
    const required = [
      'chatSessionService',
      'cursorIDEService',
      'vscodeIDEService', 
      'windsurfIDEService',
      'ideManager',
      'eventBus'
    ];
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
    return `send_message_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the appropriate IDE service based on active port
   * @returns {Object} The appropriate IDE service
   */
  getActiveIDEService() {
    const activePort = this.ideManager.getActivePort();
    this.logger.log('[SendMessageHandler] Active port:', activePort);
    
    // Determine IDE type based on port range
    if (activePort >= 9222 && activePort <= 9231) {
      this.logger.log('[SendMessageHandler] Using Cursor IDE service');
      return this.cursorIDEService;
    } else if (activePort >= 9232 && activePort <= 9241) {
      this.logger.log('[SendMessageHandler] Using VSCode IDE service');
      return this.vscodeIDEService;
    } else if (activePort >= 9242 && activePort <= 9251) {
      this.logger.log('[SendMessageHandler] Using Windsurf IDE service');
      return this.windsurfIDEService;
    } else {
      this.logger.log('[SendMessageHandler] Defaulting to Cursor IDE service');
      return this.cursorIDEService; // fallback
    }
  }

  /**
   * Handle SendMessageCommand
   * @param {SendMessageCommand} command - Message sending command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Sending result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('[SendMessageHandler] Sending message', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId
      });

      // Publish event
      await this.eventBus.publish('message.sending', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        message: command.message,
        timestamp: new Date()
      });

      // Get or create active session
      let session;
      if (command.sessionId) {
        session = await this.chatSessionService.switchSession(command.userId, command.sessionId);
      } else {
        session = await this.chatSessionService.getActiveSession(command.userId);
      }

      // Get appropriate IDE service and send message
      const activeIDEService = this.getActiveIDEService();
      const ideResult = await activeIDEService.sendMessage(command.message, command.options || {});

      // Create message entity
      const message = ChatMessage.createUserMessage(
        command.message,
        command.messageType,
        {
          ...command.metadata,
          userId: command.userId,
          sessionId: session.id,
          timestamp: new Date()
        }
      );

      // Save message to repository (assuming chatSessionService has access to chatRepository)
      // This would typically be done through the chatSessionService or a separate message service

      // Publish success event
      await this.eventBus.publish('message.sent', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: session.id,
        message: command.message,
        result: ideResult,
        timestamp: new Date()
      });

      this.logger.info('[SendMessageHandler] Message sent successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        sessionId: session.id
      });

      return {
        success: true,
        sessionId: session.id,
        message: {
          id: message.id,
          content: message.content,
          type: message.type,
          timestamp: message.timestamp
        },
        ideResult: ideResult,
        commandId: command.commandId
      };

    } catch (error) {
      this.logger.error('[SendMessageHandler] Failed to send message', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });

      // Publish failure event
      await this.eventBus.publish('message.failed', {
        commandId: command.commandId,
        userId: command.userId,
        sessionId: command.sessionId,
        message: command.message,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Validate command
   * @param {SendMessageCommand} command - Message sending command
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    const errors = [];
    const warnings = [];

    if (!command.userId) {
      errors.push('User ID is required');
    }

    if (!command.message || command.message.trim().length === 0) {
      errors.push('Message content is required');
    }

    if (command.message && command.message.length > 10000) {
      errors.push('Message content too long (max 10000 characters)');
    }

    // Validate message type
    const validTypes = ['text', 'code', 'system', 'error'];
    if (command.messageType && !validTypes.includes(command.messageType)) {
      errors.push(`Invalid message type. Must be one of: ${validTypes.join(', ')}`);
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

module.exports = SendMessageHandler; 