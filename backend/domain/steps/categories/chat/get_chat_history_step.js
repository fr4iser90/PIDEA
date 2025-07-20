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
      const chatSessionService = context.getService('ChatSessionService');
      if (!chatSessionService) {
        return {
          success: false,
          error: 'ChatSessionService not available in context',
          stepId
        };
      }

      const eventBus = context.getService('EventBus');
      if (!eventBus) {
        return {
          success: false,
          error: 'EventBus not available in context',
          stepId
        };
      }

      const ideManager = context.getService('IDEManager');
      if (!ideManager) {
        return {
          success: false,
          error: 'IDEManager not available in context',
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

      if (!context.sessionId || (typeof context.sessionId === 'string' && context.sessionId.trim().length === 0)) {
        return {
          success: false,
          error: 'Session ID must be a non-empty string',
          stepId
        };
      }

      if (typeof context.sessionId !== 'string') {
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
        timestamp: new Date()
      });

      // Get chat history using ChatSessionService
      const messages = await chatSessionService.getChatHistory(
        context.userId,
        context.sessionId,
        {
          limit,
          offset
        }
      );

      // Ensure messages is an array
      const messageList = Array.isArray(messages) ? messages : [];

      // Publish success event
      await eventBus.publish('chat.history.retrieved', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        messageCount: messageList.length,
        timestamp: new Date()
      });

      logger.info('Chat history retrieved successfully', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        messageCount: messageList.length
      });

      return {
        success: true,
        stepId,
        sessionId: context.sessionId,
        userId: context.userId,
        timestamp: new Date(),
        data: {
          messages: messageList.map(message => ({
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
            total: messageList.length
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
      const eventBus = context.getService('EventBus');
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