/**
 * Get Chat History Step
 * Retrieves chat history with pagination and filtering
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('get_chat_history_step');

// Step configuration
const config = {
  name: 'GetChatHistoryStep',
  type: 'ide',
  category: 'ide',
  description: 'Retrieve chat history with pagination and filtering',
  version: '1.0.0',
  dependencies: ['chatSessionService', 'eventBus', 'ideManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId', 'sessionId'],
    optional: ['limit', 'offset', 'options']
  }
};

class GetChatHistoryStep {
  constructor() {
    this.name = config.name;
    this.type = config.type;
    this.category = config.category;
    this.description = config.description;
    this.version = config.version;
    this.dependencies = config.dependencies;
    this.settings = config.settings;
    this.validation = config.validation;
    
    // Chat cache service will be injected via DI
    this.chatCacheService = null;
  }

  /**
   * Execute the get chat history step
   * @param {Object} context - Step execution context
   * @returns {Promise<Object>} Step execution result
   */
  async execute(context) {
    const stepId = `get_chat_history_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting get chat history step', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        limit: context.limit,
        offset: context.offset
      });

      // Validate required services
      const chatSessionService = context.getService('chatSessionService');
      if (!chatSessionService) {
        return {
          success: false,
          error: 'chatSessionService not available in context',
          stepId
        };
      }

      const eventBus = context.getService('eventBus');
      if (!eventBus) {
        return {
          success: false,
          error: 'eventBus not available in context',
          stepId
        };
      }

      const ideManager = context.getService('ideManager');
      if (!ideManager) {
        return {
          success: false,
          error: 'ideManager not available in context',
          stepId
        };
      }

      // Validate required parameters
      if (!context.userId) {
        return {
          success: false,
          error: 'User ID is required',
          stepId
        };
      }

      // Check if we have either sessionId or port
      if (!context.sessionId && !context.port) {
        return {
          success: false,
          error: 'Either Session ID or Port is required',
          stepId
        };
      }

      // If sessionId is provided, validate it
      if (context.sessionId && (typeof context.sessionId !== 'string' || context.sessionId.trim().length === 0)) {
        return {
          success: false,
          error: 'Session ID must be a non-empty string',
          stepId
        };
      }

      // Validate optional parameters
      const limit = context.limit || 100;
      const offset = context.offset || 0;

      if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
        return {
          success: false,
          error: 'Limit must be a number between 1 and 1000',
          stepId
        };
      }

      if (typeof offset !== 'number' || offset < 0) {
        return {
          success: false,
          error: 'Offset must be a non-negative number',
          stepId
        };
      }

      // Publish retrieving event
      await eventBus.publish('chat.history.retrieving', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        port: context.port,
        timestamp: new Date()
      });

      let messages = [];
      let fromCache = false; // Initialize fromCache variable
      
      // Check if sessionId is actually a port number (not a real session ID)
      const isPortNumber = /^\d+$/.test(context.sessionId);
      
      if (context.sessionId && !isPortNumber && context.sessionId !== context.port) {
        // Get chat history for specific session (not port-based)
        try {
          messages = await chatSessionService.getChatHistory(
            context.userId,
            context.sessionId,
            {
              limit,
              offset
            }
          );
        } catch (error) {
          logger.warn(`Session ${context.sessionId} not found, falling back to IDE extraction`);
          messages = [];
        }
      }
      
      // If no messages from session or if sessionId is a port number, try IDE extraction
      if (messages.length === 0 || isPortNumber || context.sessionId === context.port) {
        const port = context.port || context.sessionId;
        let fromCache = false;
        
        // Get cache service from DI container
        const chatCacheService = context.getService('chatCacheService');
        
        // Check cache first for performance optimization
        const cachedMessages = chatCacheService ? chatCacheService.getChatHistory(port) : null;
        if (cachedMessages) {
          logger.info(`Cache hit: Retrieved ${cachedMessages.length} messages from cache for port ${port}`);
          messages = cachedMessages;
          fromCache = true;
        } else {
          // Cache miss - extract from IDE
          logger.info(`Cache miss: Extracting live chat from IDE for port ${port}`);
          const cursorIDEService = context.getService('cursorIDEService');
          if (cursorIDEService) {
            try {
              // Extract live chat from IDE
              messages = await cursorIDEService.extractChatHistory();
              logger.info(`Extracted ${messages.length} messages from IDE on port ${port}`);
              
              // Cache the extracted messages for future requests
              if (messages && messages.length > 0 && chatCacheService) {
                chatCacheService.setChatHistory(port, messages, {
                  extractedAt: new Date().toISOString(),
                  source: 'ide_extraction'
                });
                logger.info(`Cached ${messages.length} messages for port ${port}`);
              }
            } catch (error) {
              logger.error(`Failed to extract chat from IDE on port ${port}:`, error);
              messages = [];
            }
          } else {
            logger.warn(`No cursorIDEService available for port ${port}`);
            messages = [];
          }
        }
      }

      // Ensure messages is an array
      const messageList = Array.isArray(messages) ? messages : [];

      // Add IDs to messages that don't have them
      const messagesWithIds = messageList.map((message, index) => ({
        ...message,
        id: message.id || `extracted_${Date.now()}_${index}`,
        timestamp: message.timestamp || new Date().toISOString(),
        type: message.type || 'text',
        sender: message.sender || 'assistant'
      }));

      // Publish success event
      await eventBus.publish('chat.history.retrieved', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        port: context.port,
        messageCount: messagesWithIds.length,
        timestamp: new Date()
      });

      logger.info('Chat history retrieved successfully', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        port: context.port,
        messageCount: messagesWithIds.length
      });

      // Add cache metadata to response
      const chatCacheService = context.getService('chatCacheService');
      const cacheStats = chatCacheService ? chatCacheService.getStats() : {};
      
      return {
        success: true,
        stepId,
        sessionId: context.sessionId,
        port: context.port,
        userId: context.userId,
        timestamp: new Date(),
        data: {
          messages: messagesWithIds.map(message => ({
            id: message.id,
            content: message.content,
            type: message.type,
            sender: message.sender,
            timestamp: message.timestamp,
            metadata: message.metadata
          })),
          pagination: {
            limit,
            offset,
            total: messagesWithIds.length
          },
          cache: {
            hit: fromCache,
            stats: cacheStats
          }
        }
      };

    } catch (error) {
      logger.error('Failed to retrieve chat history', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('eventBus');
      if (eventBus) {
        eventBus.publish('chat.history.retrieval.failed', {
          stepId,
          userId: context.userId,
          sessionId: context.sessionId,
          error: originalError,
          timestamp: new Date()
        }).catch(eventError => {
          logger.error('Failed to publish failure event:', eventError);
          // Don't let event bus errors override the original error
        });
      }

      return {
        success: false,
        error: originalError,
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get step configuration
   * @returns {Object} Step configuration
   */
  getConfig() {
    return config;
  }

  /**
   * Invalidate cache for a specific port
   * @param {string|number} port - The port to invalidate cache for
   */
  invalidateCache(port) {
    // This method is deprecated - use DI container to get cache service
    logger.warn('invalidateCache method is deprecated - use DI container instead');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    // This method is deprecated - use DI container to get cache service
    logger.warn('getCacheStats method is deprecated - use DI container instead');
    return {};
  }

  /**
   * Validate step parameters
   * @param {Object} context - Step context
   * @returns {Object} Validation result
   */
  validate(context) {
    const errors = [];
    const warnings = [];

    if (!context.userId) {
      errors.push('User ID is required');
    }

    if (!context.sessionId || (typeof context.sessionId === 'string' && context.sessionId.trim().length === 0)) {
      errors.push('Session ID must be a non-empty string');
    } else if (typeof context.sessionId !== 'string') {
      errors.push('Session ID must be a non-empty string');
    }

    const limit = context.limit || 100;
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      errors.push('Limit must be a number between 1 and 1000');
    }

    const offset = context.offset || 0;
    if (typeof offset !== 'number' || offset < 0) {
      errors.push('Offset must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new GetChatHistoryStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.GetChatHistoryStep = GetChatHistoryStep; 