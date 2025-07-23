/**
 * Switch Chat Step
 * Switches to different chat session with IDE integration
 * Wrapper for SwitchChatHandler (which handles both business logic AND browser automation)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('switch_chat_step');

// Step configuration
const config = {
  name: 'SwitchChatStep',
  type: 'ide',
  category: 'ide',
  description: 'Switch to different chat session with IDE integration',
  version: '1.0.0',
  dependencies: ['switchChatHandler'],
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

class SwitchChatStep {
  constructor() {
    this.name = 'SwitchChatStep';
    this.description = 'Switch to different chat session with IDE integration';
    this.category = 'ide';
    this.dependencies = ['switchChatHandler'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = SwitchChatStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { userId, sessionId, ideType } = context;
      
      logger.info(`📝 Switching to chat session ${sessionId} for user ${userId}`);
      
      // ✅ 1. BUSINESS LOGIC + BROWSER AUTOMATION über Handler
      const switchChatHandler = context.getService('switchChatHandler');
      if (!switchChatHandler) {
        throw new Error('SwitchChatHandler not available in context');
      }
      
      // Create command for business logic
      const SwitchChatCommand = require('@categories/chat/SwitchChatCommand');
      const command = new SwitchChatCommand({
        userId: userId,
        sessionId: sessionId
      });
      
      // ✅ Handler macht BEIDES: Business Logic + Browser Automation
      logger.info('📝 Executing SwitchChatHandler (Business Logic + Browser Automation)...');
      const result = await switchChatHandler.handle(command);
      
      logger.info(`✅ Switched to chat session successfully via Handler`, {
        sessionId: sessionId
      });
      
      return {
        success: true,
        sessionId: sessionId,
        message: 'Switched to chat session successfully via Handler'
      };
      
    } catch (error) {
      logger.error('❌ Failed to switch chat session:', error);
      
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
    const stepInstance = new SwitchChatStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.SwitchChatStep = SwitchChatStep; 