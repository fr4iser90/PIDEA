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
      const { message, requestedBy, sessionId, metadata, port } = messageData;
      
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

      // Get current project ID from database based on active port
      const activePort = this.cursorIDEService?.ideManager?.getActivePort?.();
      let projectId = null;
      
      if (activePort) {
        // Get workspace path from IDE Manager
        const workspacePath = this.cursorIDEService?.ideManager?.getWorkspacePath?.(activePort);
        
        if (workspacePath) {
          // Get project repository from DI container
          const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
          const container = getServiceContainer();
          const projectRepository = container?.resolve('projectRepository');
          
          if (projectRepository) {
            const project = await projectRepository.findByWorkspacePath(workspacePath);
            if (project) {
              projectId = project.id;
            }
          }
        }
      }
      
      // Execute send message step
      const step = this.stepRegistry.getStep('IDESendMessageStepEnhanced');
      if (!step) {
        throw new Error('Send message step not found');
      }
      
      const stepData = {
        message: message,
        sessionId: sessionId,
        requestedBy: userContext.userId,
        userId: userContext.userId,
        port: port,
        projectId: projectId,
        metadata: {
          ...metadata,
          timestamp: new Date(),
          userId: userContext.userId
        }
      };
      
      const result = await this.stepRegistry.executeStep('IDESendMessageStep', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        messageId: result.result.messageId,
        sessionId: result.result.sessionId,
        timestamp: result.result.timestamp,
        status: result.result.status
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
      const step = this.stepRegistry.getStep('GetChatHistoryStep');
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
      
      const result = await this.stepRegistry.executeStep('GetChatHistoryStep', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        messages: result.result.messages || [],
        sessionId: result.result.sessionId,
        totalCount: result.result.totalCount || 0,
        hasMore: result.result.hasMore || false
      };
    } catch (error) {
      this.logger.error('Get chat history error:', error);
      throw error;
    }
  }

  /**
   * Get chat history for specific port
   * @param {Object} queryData - Query parameters
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Port chat history
   */
  async getPortChatHistory(queryData, userContext) {
    try {
      const { port, limit = 50, offset = 0 } = queryData;
      
      this.logger.info('Getting port chat history:', { 
        port,
        limit,
        offset,
        userId: userContext.userId
      });
      
      // Execute port chat history step
      const step = this.stepRegistry.getStep('GetChatHistoryStep');
      if (!step) {
        throw new Error('Chat history step not found');
      }
      
      const stepData = {
        sessionId: port, // Use port as sessionId for port-based chat history
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userContext.userId,
        includeUserData: userContext.isAdmin || false
      };
      
      const result = await this.stepRegistry.executeStep('GetChatHistoryStep', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        messages: result.result.data?.messages || result.result.messages || [],
        sessionId: result.result.sessionId,
        port: port,
        totalCount: result.result.data?.pagination?.total || result.result.totalCount || 0,
        hasMore: result.result.hasMore || false
      };
    } catch (error) {
      this.logger.error('Get port chat history error:', error);
      throw error;
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
      
      this.logger.info('Getting user sessions:', { 
        limit,
        offset,
        userId: userContext.userId
      });
      
      // Execute list chats step
      const step = this.stepRegistry.getStep('ListChatsStep');
      if (!step) {
        throw new Error('List chats step not found');
      }
      
      const stepData = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userContext.userId
      };
      
      const result = await this.stepRegistry.executeStep('ListChatsStep', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        sessions: result.result.sessions
      };
    } catch (error) {
      this.logger.error('Get user sessions error:', error);
      throw error;
    }
  }

  /**
   * Create new chat session
   * @param {Object} sessionData - Session data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Created session
   */
  async createChatSession(sessionData, userContext) {
    try {
      const { title, metadata } = sessionData;
      
      this.logger.info('Creating chat session:', { 
        title,
        userId: userContext.userId
      });
      
      // Execute create chat step
      const step = this.stepRegistry.getStep('CreateChatStep');
      if (!step) {
        throw new Error('Create chat step not found');
      }
      
      const stepData = {
        title: title,
        metadata: {
          ...metadata,
          userId: userContext.userId
        }
      };
      
      const result = await this.stepRegistry.executeStep('CreateChatStep', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        session: result.result.session
      };
    } catch (error) {
      this.logger.error('Create chat session error:', error);
      throw error;
    }
  }

  /**
   * Delete chat session
   * @param {string} sessionId - Session ID
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Deletion result
   */
  async deleteChatSession(sessionId, userContext) {
    try {
      this.logger.info('Deleting chat session:', { 
        sessionId,
        userId: userContext.userId
      });
      
      // Execute close chat step
      const step = this.stepRegistry.getStep('CloseChatStep');
      if (!step) {
        throw new Error('Close chat step not found');
      }
      
      const stepData = {
        sessionId: sessionId,
        userId: userContext.userId
      };
      
      const result = await this.stepRegistry.executeStep('CloseChatStep', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        success: true,
        message: 'Chat session deleted successfully'
      };
    } catch (error) {
      this.logger.error('Delete chat session error:', error);
      throw error;
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