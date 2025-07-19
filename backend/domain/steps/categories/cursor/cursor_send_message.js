/**
 * Cursor Send Message Step
 * Sends a message to Cursor AI using the existing CursorIDEService
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('CursorSendMessageStep');

// Step configuration
const config = {
  name: 'CURSOR_SEND_MESSAGE',
  type: 'cursor',
  description: 'Sends a message to Cursor AI',
  category: 'cursor',
  version: '1.0.0',
  dependencies: ['cursorIDEService'],
  settings: {
    timeout: 300000,
    waitForResponse: false,
    checkInterval: 5000
  },
  validation: {
    required: ['message'],
    optional: ['waitForResponse', 'timeout', 'checkInterval']
  }
};

class CursorSendMessageStep {
  constructor() {
    this.name = 'CURSOR_SEND_MESSAGE';
    this.description = 'Sends a message to Cursor AI';
    this.category = 'cursor';
    this.dependencies = ['cursorIDEService'];
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
      
      const { 
        message, 
        waitForResponse = false, 
        timeout = 300000, 
        checkInterval = 5000 
      } = context;
      
      logger.info('Executing CURSOR_SEND_MESSAGE step', {
        messageLength: message?.length || 0,
        waitForResponse,
        timeout
      });

      // Get CursorIDEService from global application (like old steps)
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { cursorIDEService } = application;
      if (!cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }

      // Send message using existing CursorIDEService
      const result = await cursorIDEService.sendMessage(message, {
        waitForResponse,
        timeout,
        checkInterval
      });

      logger.info('CURSOR_SEND_MESSAGE step completed successfully', {
        success: result.success,
        responseLength: result.response?.length || 0
      });

      return {
        success: result.success,
        message,
        response: result.response,
        duration: result.duration,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('CURSOR_SEND_MESSAGE step failed', {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  validateContext(context) {
    if (!context.message) {
      throw new Error('Message is required');
    }
  }
}

module.exports = { config, execute: CursorSendMessageStep.prototype.execute.bind(new CursorSendMessageStep()) }; 