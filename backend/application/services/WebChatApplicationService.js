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
      
      this.logger.info('🔍 Debugging projectId retrieval:', { 
        activePort,
        hasIDEManager: !!this.cursorIDEService?.ideManager,
        hasGetActivePort: !!this.cursorIDEService?.ideManager?.getActivePort
      });
      
      if (activePort) {
        // Get workspace path from IDE Manager
        const workspacePath = this.cursorIDEService?.ideManager?.getWorkspacePath?.(activePort);
        
        this.logger.info('🔍 Workspace path detection:', { 
          activePort,
          workspacePath,
          hasGetWorkspacePath: !!this.cursorIDEService?.ideManager?.getWorkspacePath
        });
        
        if (workspacePath) {
          // Get project repository from DI container
          const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
          const container = getServiceContainer();
          const projectRepository = container?.resolve('projectRepository');
          
          this.logger.info('🔍 Project repository access:', { 
            hasContainer: !!container,
            hasProjectRepository: !!projectRepository
          });
          
          if (projectRepository) {
            try {
              const project = await projectRepository.findByWorkspacePath(workspacePath);
              if (project) {
                projectId = project.id;
                this.logger.info('✅ Project found:', { projectId, workspacePath });
              } else {
                this.logger.warn('⚠️ No project found for workspace path:', workspacePath);
              }
            } catch (error) {
              this.logger.error('❌ Error finding project:', error.message);
            }
          } else {
            this.logger.warn('⚠️ Project repository not available');
          }
        } else {
          this.logger.warn('⚠️ No workspace path found for active port:', activePort);
        }
      } else {
        this.logger.warn('⚠️ No active port found');
      }
      
      // Fallback: try to get project ID from active IDE directly
      if (!projectId && this.cursorIDEService?.ideManager) {
        try {
          const activeIDE = await this.cursorIDEService.ideManager.getActiveIDE();
          if (activeIDE && activeIDE.workspacePath) {
            const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
            const container = getServiceContainer();
            const projectRepository = container?.resolve('projectRepository');
            
            if (projectRepository) {
              const project = await projectRepository.findByWorkspacePath(activeIDE.workspacePath);
              if (project) {
                projectId = project.id;
                this.logger.info('✅ Project found via fallback:', { projectId, workspacePath: activeIDE.workspacePath });
              }
            }
          }
        } catch (error) {
          this.logger.error('❌ Fallback project retrieval failed:', error.message);
        }
      }
      
      this.logger.info('🔍 Final projectId:', { projectId });
      
      // If no projectId found, provide a more helpful error
      if (!projectId) {
        this.logger.error('❌ No project ID found. This might be due to:');
        this.logger.error('  - No active IDE detected');
        this.logger.error('  - IDE workspace path not detected');
        this.logger.error('  - Project not found in database for workspace path');
        this.logger.error('  - Project repository not available');
        throw new Error('Project ID is required but could not be determined. Please ensure an IDE is active and the project is properly registered.');
      }
      
      // Execute send message step
      const step = this.stepRegistry.getStep('ide_send_message_enhanced');
      if (!step) {
        throw new Error('Send message step not found');
      }
      
      // Get active IDE information
      const activeIDE = await this.cursorIDEService?.ideManager?.getActiveIDE?.();
      
      const stepData = {
        message: message,
        sessionId: sessionId,
        requestedBy: userContext.userId,
        userId: userContext.userId,
        port: port,
        projectId: projectId,
        activeIDE: activeIDE,
        metadata: {
          ...metadata,
          timestamp: new Date(),
          userId: userContext.userId
        }
      };
      
      const result = await this.stepRegistry.executeStep('ide_send_message', stepData);
      
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
      
      const stepData = {
        sessionId: sessionId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userContext.userId,
        includeUserData: userContext.isAdmin || false
      };
      
      // ✅ FIX: Only ONE step execution (no duplicate)
      const result = await this.stepRegistry.executeStep('get_chat_history_step', stepData);
      
      // Check if step execution was successful
      if (!result.success) {
        throw new Error(`Step execution failed: ${result.error}`);
      }
      
      return {
        messages: result.result.data?.messages || result.result.messages || [],
        sessionId: result.result.sessionId,
        totalCount: result.result.data?.pagination?.total || result.result.totalCount || 0,
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
      
      this.logger.info('Getting chat history via handler for port:', port);
      
      // ✅ USE PROPER HANDLER/COMMAND PATTERN!
      const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
      const container = getServiceContainer();
      const getChatHistoryHandler = container?.resolve('getChatHistoryHandler');
      
      if (!getChatHistoryHandler) {
        throw new Error('GetChatHistoryHandler not available');
      }
      
      // Create query for handler
      const query = {
        userId: userContext.userId,
        port: parseInt(port),
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeUserData: userContext.isAdmin || false
      };
      
      // Execute handler
      const result = await getChatHistoryHandler.handle(query);
      
      this.logger.info(`Handler returned ${result.messages.length} messages for port ${port}`);
      
      return {
        messages: result.messages,
        sessionId: port,
        port: port,
        totalCount: result.totalCount,
        hasMore: result.hasMore
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
      const step = this.stepRegistry.getStep('list_chats_step');
      if (!step) {
        throw new Error('List chats step not found');
      }
      
      const stepData = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userContext.userId
      };
      
      const result = await this.stepRegistry.executeStep('list_chats_step', stepData);
      
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
      const step = this.stepRegistry.getStep('create_chat_step');
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
      
      const result = await this.stepRegistry.executeStep('create_chat_step', stepData);
      
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
      const step = this.stepRegistry.getStep('close_chat_step');
      if (!step) {
        throw new Error('Close chat step not found');
      }
      
      const stepData = {
        sessionId: sessionId,
        userId: userContext.userId
      };
      
      const result = await this.stepRegistry.executeStep('close_chat_step', stepData);
      
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