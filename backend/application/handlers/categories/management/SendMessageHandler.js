const SendMessageCommand = require('@categories/management/SendMessageCommand');
const ChatMessage = require('@entities/ChatMessage');
const ChatSession = require('@entities/ChatSession');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


/**
 * SendMessageHandler - Handles task/AI messaging commands
 * Implements the Command Handler pattern for messaging
 */
class SendMessageHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    this.cursorIDEService = dependencies.cursorIDEService;
    this.vscodeIDEService = dependencies.vscodeIDEService;
    this.windsurfIDEService = dependencies.windsurfIDEService;
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.handlerId = this.generateHandlerId();
  }

  /**
   * Validate handler dependencies
   * @param {Object} dependencies - Handler dependencies
   * @throws {Error} If dependencies are invalid
   */
  validateDependencies(dependencies) {
    const required = [
      'cursorIDEService',
      'vscodeIDEService',
      'windsurfIDEService',
      'ideManager',
      'eventBus',
      'logger'
    ];
    for (const dep of required) {
      if (!dependencies[dep]) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
  }

  /**
   * Get the appropriate IDE service based on active port
   * @returns {Object} The appropriate IDE service
   */
  getActiveIDEService() {
    const activePort = this.ideManager.getActivePort();
    logger.log(`[SendMessageHandler] Active port: ${activePort}`);
    
    // Determine IDE type based on port range
    if (activePort >= 9222 && activePort <= 9231) {
      logger.log('[SendMessageHandler] Using Cursor IDE service');
      return this.cursorIDEService;
    } else if (activePort >= 9232 && activePort <= 9241) {
      logger.log('[SendMessageHandler] Using VSCode IDE service');
      return this.vscodeIDEService;
    } else if (activePort >= 9242 && activePort <= 9251) {
      logger.log('[SendMessageHandler] Using Windsurf IDE service');
      return this.windsurfIDEService;
    } else {
      logger.log('[SendMessageHandler] Defaulting to Cursor IDE service');
      return this.cursorIDEService; // fallback
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
   * Handle SendMessageCommand
   * @param {SendMessageCommand} command - Messaging command
   * @returns {Promise<Object>} Messaging result
   */
  async handle(command) {
    // Validate command
    const validationResult = await this.validateCommand(command);
    if (!validationResult.isValid) {
      throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
    }
    try {
      this.logger.info('SendMessageHandler: Sending message', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        requestedBy: command.requestedBy
      });
      await this.eventBus.publish('message.sending', {
        commandId: command.commandId,
        requestedBy: command.requestedBy,
        message: command.message,
        timestamp: new Date()
      });
      // Get the appropriate IDE service and send message
      const activeIDEService = this.getActiveIDEService();
      const result = await activeIDEService.sendMessage(command.message, command.options || {});
      await this.eventBus.publish('message.sent', {
        commandId: command.commandId,
        requestedBy: command.requestedBy,
        message: command.message,
        result,
        timestamp: new Date()
      });
      this.logger.info('SendMessageHandler: Message sent', {
        handlerId: this.handlerId,
        commandId: command.commandId
      });
      return {
        success: true,
        result
      };
    } catch (error) {
      this.logger.error('SendMessageHandler: Message sending failed', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        error: error.message
      });
      await this.eventBus.publish('message.failed', {
        commandId: command.commandId,
        requestedBy: command.requestedBy,
        message: command.message,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Validate command
   * @param {SendMessageCommand} command - Messaging command
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    const errors = [];
    const warnings = [];
    if (!command.message) {
      errors.push('Message is required');
    }
    if (!command.requestedBy) {
      errors.push('Requested by is required');
    }
    // Add more validation as needed
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async handleUserSpecificCommand(command) {
    const { content, userId, sessionId, timestamp, metadata = {} } = command;

    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error('Message content is required');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Create message entity
      const type = content.includes('```') ? 'code' : 'text';
      const message = ChatMessage.createUserMessage(content, type, {
        ...metadata,
        userId: userId,
        timestamp: timestamp
      });

      // Get or create session
      let session;
      if (sessionId) {
        session = await this.chatRepository.findSessionById(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        
        // Check if user can access this session
        if (!session.belongsToUser(userId)) {
          throw new Error('Access denied to this session');
        }
      } else {
        // Create new session for user
        const activePort = this.ideManager.getActivePort();
        session = ChatSession.createSession(
          userId,
          'New Chat',
          {
            ...metadata,
            createdBy: userId,
            idePort: activePort
          }
        );
      }

      // Add message to session
      session.addMessage(message);

      // Save to repository
      await this.chatRepository.saveSession(session);

      // Get the appropriate IDE service
      const activeIDEService = this.getActiveIDEService();

      // Switch to session's IDE if needed
      if (session.idePort) {
        await activeIDEService.switchToSession(session);
      }

      // Send to the appropriate IDE
      await activeIDEService.sendMessage(content);

      // Publish events
      if (this.eventBus) {
        await this.eventBus.publish('MessageSent', {
          sessionId: session.id,
          messageId: message.id,
          userId: userId,
          content: message.content,
          sender: message.sender,
          type: message.type,
          timestamp: message.timestamp
        });
      }

      return {
        success: true,
        sessionId: session.id,
        messageId: message.id,
        response: 'Message sent successfully',
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[SendMessageHandler] Error:', error);
      throw error;
    }
  }

  async handleLegacyCommand(command) {
    // Validate command
    command.validate();

    try {
      // Create message entity
      const type = command.content.includes('```') ? 'code' : 'text';
      const message = ChatMessage.createUserMessage(command.content, type);

      // Get or create session
      let session;
      if (command.sessionId) {
        session = await this.chatRepository.findSessionById(command.sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
      } else {
        // Create new session with IDE port assignment
        const activePort = this.ideManager.getActivePort();
        session = new ChatSession(null, null, {}, activePort);
      }

      // Add message to session
      session.addMessage(message);

      // Save to repository
      await this.chatRepository.saveSession(session);

      // Get the appropriate IDE service
      const activeIDEService = this.getActiveIDEService();

      // Switch to session's IDE if needed
      if (session.idePort) {
        await activeIDEService.switchToSession(session);
      }

      // Send to the appropriate IDE
      await activeIDEService.sendMessage(command.content);

      // Publish events
      if (this.eventBus) {
        await this.eventBus.publish('MessageSent', {
          sessionId: session.id,
          messageId: message.id,
          content: message.content,
          sender: message.sender,
          type: message.type,
          timestamp: message.timestamp
        });
      }

      return {
        success: true,
        sessionId: session.id,
        messageId: message.id,
        message: message
      };

    } catch (error) {
      logger.error('[SendMessageHandler] Error:', error);
      throw error;
    }
  }
}

module.exports = SendMessageHandler; 