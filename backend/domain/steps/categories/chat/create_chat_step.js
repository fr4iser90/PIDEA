/**
 * Create Chat Step
 * Creates new chat session with IDE integration
 * Wrapper for CreateChatHandler (which handles both business logic AND browser automation)
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
  dependencies: ['createChatHandler'],
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
    this.dependencies = ['createChatHandler'];
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
      
      const { userId, title, metadata = {}, ideType, activeIDE } = context;
      
      logger.info(`📝 Creating chat session for user ${userId} with title: ${title}`);
      
      // ✅ 1. BUSINESS LOGIC + BROWSER AUTOMATION über Handler
      const createChatHandler = context.getService('createChatHandler');
      if (!createChatHandler) {
        throw new Error('CreateChatHandler not available in context');
      }
      
      // Create command for business logic
      const CreateChatCommand = require('@categories/chat/CreateChatCommand');
      const command = new CreateChatCommand({
        userId: userId,
        title: title,
        metadata: metadata
      });
      
      // ✅ Handler macht BEIDES: Business Logic + Browser Automation
      logger.info('📝 Executing CreateChatHandler (Business Logic + Browser Automation)...');
      const port = activeIDE?.port;
      if (!port) {
        throw new Error('No active IDE port available in context');
      }
      const result = await createChatHandler.handle(command, {}, port);
      
      logger.info(`✅ Chat session created successfully via Handler`, {
        sessionId: result.session.id
      });
      
      return {
        success: true,
        session: result.session,
        message: 'Chat session created successfully via Handler'
      };
      
    } catch (error) {
      logger.error('❌ Failed to create chat session:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
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