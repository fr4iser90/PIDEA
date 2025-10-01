/**
 * List Chats Step
 * Lists chat sessions with IDE integration
 * Wrapper for ListChatsHandler (which handles business logic)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('list_chats_step');

// Step configuration
const config = {
  name: 'list_chats_step',
  type: 'ide',
  category: 'ide',
  description: 'List chat sessions with IDE integration',
  version: '1.0.0',
  dependencies: ['listChatsHandler'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId'],
    optional: ['limit', 'offset', 'includeArchived', 'ideType']
  }
};

class ListChatsStep {
  constructor() {
    this.name = 'ListChatsStep';
    this.description = 'List chat sessions with IDE integration';
    this.category = 'ide';
    this.dependencies = ['listChatsHandler'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = ListChatsStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { userId, limit = 10, offset = 0, includeArchived = false, ideType } = context;
      
      logger.info(`📝 Listing chat sessions for user ${userId}`);
      
      // ✅ BUSINESS LOGIC über Handler
      const listChatsHandler = context.getService('listChatsHandler');
      if (!listChatsHandler) {
        throw new Error('ListChatsHandler not available in context');
      }
      
      // Create command for business logic
      const ListChatsCommand = require('@categories/chat/ListChatsCommand');
      const command = new ListChatsCommand({
        userId: userId,
        limit: limit,
        offset: offset,
        includeArchived: includeArchived
      });
      
      // ✅ Handler macht Business Logic
      logger.info('📝 Executing ListChatsHandler (Business Logic)...');
      const result = await listChatsHandler.handle(command);
      
      logger.info(`✅ Chat sessions listed successfully via Handler`, {
        userId: userId,
        sessionCount: result.sessions ? result.sessions.length : 0
      });
      
      return {
        success: true,
        userId: userId,
        sessions: result.sessions || [],
        totalCount: result.totalCount || 0,
        message: 'Chat sessions listed successfully via Handler'
      };
      
    } catch (error) {
      logger.error('❌ Failed to list chat sessions:', error);
      
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
    
    if (context.limit && (typeof context.limit !== 'number' || context.limit < 1)) {
      errors.push('Limit must be a positive number');
    }
    
    if (context.offset && (typeof context.offset !== 'number' || context.offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }
    
    if (context.includeArchived && typeof context.includeArchived !== 'boolean') {
      errors.push('Include archived must be a boolean');
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
    const stepInstance = new ListChatsStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.ListChatsStep = ListChatsStep; 