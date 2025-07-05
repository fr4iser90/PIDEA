const SendMessageCommand = require('@application/commands/SendMessageCommand');
const ChatMessage = require('@domain/entities/ChatMessage');
const ChatSession = require('@domain/entities/ChatSession');

/**
 * SendMessageHandler - Handles task/AI messaging commands
 * Implements the Command Handler pattern for messaging
 */
class SendMessageHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    this.messagingService = dependencies.messagingService;
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
      'messagingService',
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
      // Call messaging service
      const result = await this.messagingService.send(command.message, {
        requestedBy: command.requestedBy,
        options: command.options || {}
      });
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
        const activePort = this.cursorIDEService.getActivePort();
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

      // Switch to session's IDE if needed
      if (session.idePort) {
        await this.cursorIDEService.switchToSession(session);
      }

      // Send to Cursor IDE
      await this.cursorIDEService.sendMessage(content);

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
      console.error('[SendMessageHandler] Error:', error);
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
        const activePort = this.cursorIDEService.getActivePort();
        session = new ChatSession(null, null, {}, activePort);
      }

      // Add message to session
      session.addMessage(message);

      // Save to repository
      await this.chatRepository.saveSession(session);

      // Switch to session's IDE if needed
      if (session.idePort) {
        await this.cursorIDEService.switchToSession(session);
      }

      // Send to Cursor IDE
      await this.cursorIDEService.sendMessage(command.content);

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
      console.error('[SendMessageHandler] Error:', error);
      throw error;
    }
  }
}

module.exports = SendMessageHandler; 