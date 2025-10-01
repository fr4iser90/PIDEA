/**
 * Close Chat Step
 * Closes chat session with IDE integration
 * Wrapper for CloseChatHandler (which handles both business logic AND browser automation)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('close_chat_step');

// Step configuration
const config = {
  name: 'close_chat_step',
  type: 'ide',
  category: 'ide',
  description: 'Close chat session with IDE integration',
  version: '1.0.0',
  dependencies: ['closeChatHandler'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId', 'sessionId'],
    optional: ['ideType']
  }
};

class CloseChatStep {
  constructor() {
    this.name = 'CloseChatStep';
    this.description = 'Close chat session with IDE integration';
    this.category = 'ide';
    this.dependencies = ['closeChatHandler'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CloseChatStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { userId, sessionId, ideType } = context;
      
      logger.info(`📝 Closing chat session ${sessionId} for user ${userId}`);
      
      // ✅ 1. BUSINESS LOGIC + BROWSER AUTOMATION über Handler
      const closeChatHandler = context.getService('closeChatHandler');
      if (!closeChatHandler) {
        throw new Error('CloseChatHandler not available in context');
      }
      
      // Create command for business logic
      const CloseChatCommand = require('@categories/chat/CloseChatCommand');
      const command = new CloseChatCommand({
        userId: userId,
        sessionId: sessionId
      });
      
      // ✅ Handler macht BEIDES: Business Logic + Browser Automation
      logger.info('📝 Executing CloseChatHandler (Business Logic + Browser Automation)...');
      const result = await closeChatHandler.handle(command);
      
      logger.info(`✅ Chat session closed successfully via Handler`, {
        sessionId: sessionId
      });
      
      return {
        success: true,
        sessionId: sessionId,
        message: 'Chat session closed successfully via Handler'
      };
      
    } catch (error) {
      logger.error('❌ Failed to close chat session:', error);
      
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
    
    if (!context.sessionId) {
      errors.push('Session ID is required');
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
    const stepInstance = new CloseChatStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.CloseChatStep = CloseChatStep; 