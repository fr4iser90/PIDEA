/**
 * Create Chat Step
 * Creates new chat session with IDE integration
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('create_chat_step');

// Step configuration
const config = {
  name: 'CreateChatStep',
  type: 'ide',
  category: 'ide',
  description: 'Create new chat session with IDE integration',
  version: '1.0.0',
  dependencies: ['chatSessionService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId', 'title'],
    optional: ['metadata', 'ideType']
  }
};

class CreateChatStep {
  constructor() {
    this.name = 'CreateChatStep';
    this.description = 'Create new chat session with IDE integration';
    this.category = 'ide';
    this.dependencies = ['chatSessionService', 'eventBus'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CreateChatStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { userId, title, metadata = {}, ideType } = context;
      
      logger.info(`📝 Creating chat session for user ${userId} with title: ${title}`);
      
      // Get services via dependency injection
      const chatSessionService = context.getService('chatSessionService');
      const eventBus = context.getService('eventBus');
      
      if (!chatSessionService) {
        throw new Error('ChatSessionService not available in context');
      }
      if (!eventBus) {
        throw new Error('EventBus not available in context');
      }
      
      // Generate unique step ID
      const stepId = this.generateStepId();
      
      // Publish creating event
      await eventBus.publish('chat.creating', {
        stepId: stepId,
        userId: userId,
        title: title,
        timestamp: new Date()
      });
      
      // Create session using ChatSessionService (NO BROWSER ACTIONS!)
      logger.info('📝 Creating chat session in database...');
      const session = await chatSessionService.createSession(
        userId,
        title,
        metadata
      );
      
      // Publish success event
      await eventBus.publish('chat.created', {
        stepId: stepId,
        userId: userId,
        sessionId: session.id,
        title: session.title,
        timestamp: new Date()
      });
      
      logger.info(`✅ Chat session created successfully`, {
        stepId: stepId,
        sessionId: session.id
      });
      
      return {
        success: true,
        session: {
          id: session.id,
          title: session.title,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          metadata: session.metadata
        },
        stepId: stepId,
        message: 'Chat session created successfully'
      };
      
    } catch (error) {
      logger.error('❌ Failed to create chat session:', error);
      
      // Publish failure event
      try {
        const eventBus = context.getService('EventBus');
        if (eventBus) {
          await eventBus.publish('chat.creation.failed', {
            userId: context.userId,
            error: error.message,
            timestamp: new Date()
          });
        }
      } catch (eventError) {
        logger.error('Failed to publish failure event:', eventError);
      }
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate unique step ID
   * @returns {string} Unique step ID
   */
  generateStepId() {
    return `create_chat_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate context parameters
   * @param {Object} context - Execution context
   * @throws {Error} If validation fails
   */
  validateContext(context) {
    const errors = [];
    
    if (!context.userId) {
      errors.push('User ID is required');
    }
    
    if (!context.title || context.title.trim().length === 0) {
      errors.push('Chat title is required');
    }
    
    if (context.title && context.title.length > 200) {
      errors.push('Chat title too long (max 200 characters)');
    }
    
    if (context.metadata && typeof context.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }
    
    if (errors.length > 0) {
      throw new Error(`Context validation failed: ${errors.join(', ')}`);
    }
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new CreateChatStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.CreateChatStep = CreateChatStep; 