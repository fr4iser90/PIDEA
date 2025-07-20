/**
 * Cursor Send Message Step
 * Sends message to Cursor IDE
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('cursor_send_message');

// Step configuration
const config = {
  name: 'CursorSendMessageStep',
  type: 'cursor',
  category: 'cursor',
  description: 'Send message to Cursor IDE',
  version: '1.0.0',
  dependencies: [],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId', 'message'],
    optional: ['workspacePath']
  }
};

class CursorSendMessageStep {
  constructor() {
    this.name = 'CursorSendMessageStep';
    this.description = 'Send message to Cursor IDE';
    this.category = 'cursor';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CursorSendMessageStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, message } = context;
      
      logger.info(`📤 Sending message to Cursor IDE for project ${projectId}`);
      
      // Get Cursor IDE service from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const cursorIDEService = application.cursorIDEService;
      if (!cursorIDEService) {
        throw new Error('Cursor IDE service not available');
      }
      
      // Send message
      const result = await cursorIDEService.sendMessage(message, {
        timeout: config.settings.timeout
      });
      
      logger.info(`✅ Message sent to Cursor IDE`);
      
      return {
        success: true,
        message: 'Message sent to Cursor IDE',
        data: result
      };
      
    } catch (error) {
      logger.error('❌ Failed to send message to Cursor IDE:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
    if (!context.message) {
      throw new Error('Message is required');
    }
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new CursorSendMessageStep();
    return await stepInstance.execute(context);
  }
}; 