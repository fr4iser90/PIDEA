/**
 * List Chats Step
 * Lists available chat sessions with pagination and filtering
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('list_chats_step');

// Step configuration
const config = {
  name: 'ListChatsStep',
  type: 'ide',
  category: 'ide',
  description: 'List available chat sessions with pagination and filtering',
  version: '1.0.0',
  dependencies: ['chatSessionService', 'eventBus', 'ideManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId'],
    optional: ['limit', 'offset', 'includeArchived', 'options']
  }
};

class ListChatsStep {
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
   * Execute the list chats step
   * @param {Object} context - Step execution context
   * @returns {Promise<Object>} Step execution result
   */
  async execute(context) {
    const stepId = `list_chats_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting list chats step', {
        stepId,
        userId: context.userId,
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

      // Validate optional parameters
      const limit = context.limit || 50;
      const offset = context.offset || 0;
      const includeArchived = context.includeArchived || false;

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

      if (typeof includeArchived !== 'boolean') {
        return {
          success: false,
          error: 'includeArchived must be a boolean',
          stepId
        };
      }

      // Publish listing event
      await eventBus.publish('chat.listing', {
        stepId,
        userId: context.userId,
        timestamp: new Date()
      });

      // List sessions using ChatSessionService
      const sessions = await chatSessionService.listSessions(context.userId, {
        limit,
        offset,
        includeArchived
      });

      // Get session statistics
      const stats = await chatSessionService.getSessionStats(context.userId);

      // Ensure sessions is an array
      const sessionList = Array.isArray(sessions) ? sessions : [];

      // Publish success event
      await eventBus.publish('chat.listed', {
        stepId,
        userId: context.userId,
        sessionCount: sessionList.length,
        timestamp: new Date()
      });

      logger.info('Chat sessions listed successfully', {
        stepId,
        userId: context.userId,
        sessionCount: sessionList.length
      });

      return {
        success: true,
        stepId,
        userId: context.userId,
        timestamp: new Date(),
        data: {
          sessions: sessionList.map(session => ({
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
            limit,
            offset,
            total: sessionList.length
          }
        }
      };

    } catch (error) {
      logger.error('Failed to list chat sessions', {
        stepId,
        userId: context.userId,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        eventBus.publish('chat.listing.failed', {
          stepId,
          userId: context.userId,
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

    const limit = context.limit || 50;
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      errors.push('Limit must be a number between 1 and 1000');
    }

    const offset = context.offset || 0;
    if (typeof offset !== 'number' || offset < 0) {
      errors.push('Offset must be a non-negative number');
    }

    const includeArchived = context.includeArchived || false;
    if (typeof includeArchived !== 'boolean') {
      errors.push('includeArchived must be a boolean');
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
    const stepInstance = new ListChatsStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.ListChatsStep = ListChatsStep; 