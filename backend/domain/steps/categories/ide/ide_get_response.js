/**
 * IDE Get Response Step
 * Gets response from any IDE (Cursor, VSCode, Windsurf)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ide_get_response');

// Step configuration
const config = {
  name: 'IDEGetResponseStep',
  type: 'ide',
  category: 'ide',
  description: 'Get response from any IDE',
  version: '1.0.0',
  dependencies: ['browserManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'messageId', 'ideType']
  }
};

class IDEGetResponseStep {
  constructor() {
    this.name = 'IDEGetResponseStep';
    this.description = 'Get response from any IDE';
    this.category = 'ide';
    this.dependencies = ['browserManager'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = IDEGetResponseStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, messageId, ideType } = context;
      
      logger.info(`📨 Getting response from IDE for project ${projectId}${ideType ? ` (${ideType})` : ''}${messageId ? `, message ${messageId}` : ''}`);
      
      // Get services via dependency injection
      const browserManager = context.getService('browserManager');
      
      if (!browserManager) {
        throw new Error('BrowserManager not available in context');
      }
      
      // Switch to active port first
      const idePortManager = context.getService('idePortManager');
      if (idePortManager) {
        const activePort = idePortManager.getActivePort();
        if (activePort) {
          await browserManager.switchToPort(activePort);
        }
      }
      
      // Get response using BrowserManager
      const response = await browserManager.getLatestResponse({
        timeout: config.settings.timeout
      });
      
      logger.info(`✅ Response received from IDE`);
      
      return {
        success: true,
        message: 'Response received from IDE',
        data: response,
        ideType: ideType || 'auto-detected'
      };
      
    } catch (error) {
      logger.error('❌ Failed to get response from IDE:', error);
      
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

// Create instance for execution
const stepInstance = new IDEGetResponseStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 