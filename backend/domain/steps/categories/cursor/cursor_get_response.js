/**
 * Cursor Get Response Step
 * Gets response from Cursor IDE
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('cursor_get_response');

// Step configuration
const config = {
  name: 'CursorGetResponseStep',
  type: 'cursor',
  category: 'cursor',
  description: 'Get response from Cursor IDE',
  version: '1.0.0',
  dependencies: [],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'messageId']
  }
};

class CursorGetResponseStep {
  constructor() {
    this.name = 'CursorGetResponseStep';
    this.description = 'Get response from Cursor IDE';
    this.category = 'cursor';
    this.dependencies = [];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = CursorGetResponseStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, messageId } = context;
      
      logger.info(`📨 Getting response from Cursor IDE for project ${projectId}${messageId ? `, message ${messageId}` : ''}`);
      
      // Get Cursor IDE service from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const cursorIDEService = application.cursorIDEService;
      if (!cursorIDEService) {
        throw new Error('Cursor IDE service not available');
      }
      
      // Get response
      const response = await cursorIDEService.getLatestResponse({
        timeout: config.settings.timeout
      });
      
      logger.info(`✅ Response received from Cursor IDE`);
      
      return {
        success: true,
        message: 'Response received from Cursor IDE',
        data: response
      };
      
    } catch (error) {
      logger.error('❌ Failed to get response from Cursor IDE:', error);
      
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
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new CursorGetResponseStep();
    return await stepInstance.execute(context);
  }
}; 