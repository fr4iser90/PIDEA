/**
 * WebChatApplicationService - Application layer service for web chat operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate chat message handling use cases
 * ✅ Handle chat session management
 * ✅ Manage message authentication and authorization
 * ✅ Orchestrate chat history and message processing
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class WebChatApplicationService {
  constructor({
    stepRegistry,
    cursorIDEService,
    authService,
    chatSessionService,
    eventBus,
    logger
  }) {
    // Step Registry for chat operations
    this.stepRegistry = stepRegistry;
    
    // Domain services
    this.cursorIDEService = cursorIDEService;
    this.authService = authService;
    this.chatSessionService = chatSessionService;
    this.eventBus = eventBus;
    
    // Application services
    this.logger = logger || new ServiceLogger('WebChatApplicationService');
  }

  /**
   * Send message through chat system
   * @param {Object} messageData - Message data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(messageData, userContext) {
    try {
      const { message, requestedBy, sessionId, metadata } = messageData;
      
      this.logger.info('Processing chat message:', { 
        messageLength: message?.length,
        requestedBy,
        sessionId: sessionId?.substring(0, 8) + '...',
        userRole: userContext.role
      });
      
      // Validate required fields
      if (!message || message.trim().length === 0) {
        throw new Error('Message content is required');
      }
      
      if (!requestedBy) {
        throw new Error('Requested by is required');
      }
      
      // Authenticate user if auth service is available
      if (this.authService && userContext.userId) {
        const isAuthorized = await this.authService.authorizeUser(userContext.userId, 'chat:send');
        if (!isAuthorized) {
          throw new Error('User not authorized to send chat messages');
        }
      }
      
      // Execute chat message step
      const step = this.stepRegistry.getStep('chat', 'ide_send_message_enhanced');
      if (!step) {
        throw new Error('Chat message step not found');
      }
      
      const stepData = {
        message: message.trim(),
        requestedBy: requestedBy,
        sessionId: sessionId,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          userAgent: userContext.userAgent,
          ipAddress: userContext.ipAddress,
          userRole: userContext.role,
          userId: userContext.userId
        }
      };
      
      const result = await step.execute(stepData);
      
      // Publish event if event bus is available
      if (this.eventBus) {
        await this.eventBus.publish('chat:messageSent', {
          messageId: result.messageId,
          sessionId: result.sessionId,
          userId: userContext.userId,
          timestamp: result.timestamp
        });
      }
      
      return {
        messageId: result.messageId,
        response: result.response,
        sessionId: result.sessionId,
        timestamp: result.timestamp,
        codeBlocks: result.codeBlocks || []
      };
    } catch (error) {
      this.logger.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Get chat history for session
   * @param {Object} queryData - Query parameters
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Chat history
   */
  async getChatHistory(queryData, userContext) {
    try {
      const { sessionId, limit = 50, offset = 0 } = queryData;
      
      this.logger.info('Getting chat history:', { 
        sessionId: sessionId?.substring(0, 8) + '...',
        limit,
        offset,
        userId: userContext.userId
      });
      
      // Execute chat history step
      const step = this.stepRegistry.getStep('chat', 'get_chat_history_step');
      if (!step) {
        throw new Error('Chat history step not found');
      }
      
      const stepData = {
        sessionId: sessionId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userContext.userId,
        includeUserData: userContext.isAdmin || false
      };
      
      const result = await step.execute(stepData);
      
      return {
        messages: result.messages,
        sessionId: result.sessionId,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      };
    } catch (error) {
      this.logger.error('Get chat history error:', error);
      throw error;
    }
  }

  /**
   * Create new chat session
   * @param {Object} sessionData - Session creation data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} New session
   */
  async createChatSession(sessionData, userContext) {
    try {
      this.logger.info('Creating new chat session:', { userId: userContext.userId });
      
      if (!this.chatSessionService) {
        throw new Error('Chat session service not available');
      }
      
      // Authenticate user if auth service is available
      if (this.authService && userContext.userId) {
        const isAuthorized = await this.authService.authorizeUser(userContext.userId, 'chat:create');
        if (!isAuthorized) {
          throw new Error('User not authorized to create chat sessions');
        }
      }
      
      const { title, metadata } = sessionData;
      
      // Create session through domain service
      const session = await this.chatSessionService.createSession({
        title: title || 'New Chat',
        userId: userContext.userId,
        metadata: {
          ...metadata,
          createdBy: userContext.userId,
          userAgent: userContext.userAgent,
          ipAddress: userContext.ipAddress
        }
      });
      
      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('chat:sessionCreated', {
          sessionId: session.sessionId,
          userId: userContext.userId,
          timestamp: session.createdAt
        });
      }
      
      this.logger.info('✅ Chat session created successfully:', { 
        sessionId: session.sessionId?.substring(0, 8) + '...'
      });
      
      return {
        success: true,
        data: {
          sessionId: session.sessionId,
          title: session.title,
          createdAt: session.createdAt
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to create chat session:', error);
      throw new Error(`Failed to create chat session: ${error.message}`);
    }
  }

  /**
   * Get user's chat sessions
   * @param {Object} queryData - Query parameters
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} User sessions
   */
  async getUserSessions(queryData, userContext) {
    try {
      const { limit = 20, offset = 0 } = queryData;
      
      this.logger.info('Getting user chat sessions:', { 
        userId: userContext.userId,
        limit,
        offset
      });
      
      if (!this.chatSessionService) {
        throw new Error('Chat session service not available');
      }
      
      // Authenticate user
      if (this.authService && userContext.userId) {
        const isAuthorized = await this.authService.authorizeUser(userContext.userId, 'chat:read');
        if (!isAuthorized) {
          throw new Error('User not authorized to read chat sessions');
        }
      }
      
      // Get sessions through domain service
      const sessions = await this.chatSessionService.getUserSessions(userContext.userId, {
        limit,
        offset
      });
      
      this.logger.info('✅ User sessions retrieved successfully:', { 
        sessionCount: sessions.length
      });
      
      return {
        success: true,
        data: {
          sessions: sessions.map(session => ({
            sessionId: session.sessionId,
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messageCount
          })),
          totalCount: sessions.length,
          hasMore: sessions.length === limit
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get user sessions:', error);
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Send IDE command through chat
   * @param {Object} commandData - IDE command data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Command result
   */
  async sendIDECommand(commandData, userContext) {
    try {
      const { command, sessionId } = commandData;
      
      this.logger.info('Sending IDE command through chat:', { 
        commandLength: command?.length,
        sessionId: sessionId?.substring(0, 8) + '...'
      });
      
      if (!this.cursorIDEService) {
        throw new Error('Cursor IDE Service not available');
      }
      
      // Authenticate user for IDE access
      if (this.authService && userContext.userId) {
        const isAuthorized = await this.authService.authorizeUser(userContext.userId, 'ide:control');
        if (!isAuthorized) {
          throw new Error('User not authorized for IDE control');
        }
      }
      
      // Send command to IDE
      const result = await this.cursorIDEService.sendCommand(command, {
        sessionId,
        userId: userContext.userId
      });
      
      this.logger.info('✅ IDE command sent successfully');
      
      return {
        success: true,
        data: {
          commandId: result.commandId,
          response: result.response,
          timestamp: result.timestamp
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to send IDE command:', error);
      throw new Error(`Failed to send IDE command: ${error.message}`);
    }
  }

  /**
   * Get chat session health status
   * @param {string} sessionId - Session ID to check
   * @returns {Promise<Object>} Health status
   */
  async getSessionHealth(sessionId) {
    try {
      if (!this.chatSessionService) {
        return {
          healthy: false,
          error: 'Chat session service not available'
        };
      }
      
      const session = await this.chatSessionService.getSession(sessionId);
      
      return {
        healthy: !!session,
        sessionId,
        active: session?.active || false,
        lastActivity: session?.updatedAt,
        services: {
          sendMessageHandler: !!this.sendMessageHandler,
          getChatHistoryHandler: !!this.getChatHistoryHandler,
          chatSessionService: !!this.chatSessionService,
          authService: !!this.authService,
          cursorIDEService: !!this.cursorIDEService
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get session health:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = WebChatApplicationService; 