/**
 * Close Chat Step
 * Closes existing chat session with IDE integration
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('close_chat_step');

// Step configuration
const config = {
  name: 'CloseChatStep',
  type: 'ide',
  category: 'ide',
  description: 'Close existing chat session with IDE integration',
  version: '1.0.0',
  dependencies: ['chatSessionService', 'eventBus', 'ideManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId', 'sessionId'],
    optional: ['options']
  }
};

class CloseChatStep {
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
   * Execute the close chat step
   * @param {Object} context - Step execution context
   * @returns {Promise<Object>} Step execution result
   */
  async execute(context) {
    const stepId = `close_chat_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting close chat step', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId
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

      // Publish closing event
      await eventBus.publish('chat.closing', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        timestamp: new Date()
      });

      // Close session using ChatSessionService
      const success = await chatSessionService.closeSession(
        context.userId,
        context.sessionId
      );

      if (!success) {
        throw new Error('Failed to close chat session');
      }

      // Publish success event
      await eventBus.publish('chat.closed', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId,
        timestamp: new Date()
      });

      logger.info('Chat session closed successfully', {
        stepId,
        userId: context.userId,
        sessionId: context.sessionId
      });

      return {
        success: true,
        stepId,
        sessionId: context.sessionId,
        userId: context.userId,
        timestamp: new Date(),
        data: {
          sessionClosed: true,
          sessionId: context.sessionId
        }
      };

    } catch (error) {
      logger.error('Failed to close chat session', {
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
        eventBus.publish('chat.closing.failed', {
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
    const stepInstance = new CloseChatStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.CloseChatStep = CloseChatStep; 