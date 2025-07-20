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
  dependencies: ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService'],
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
    this.dependencies = ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService'];
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
      
      // Get IDE service from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      // Get the appropriate IDE service
      const ideService = this.getIDEService(application, ideType);
      if (!ideService) {
        throw new Error('No IDE service available');
      }
      
      // Get response
      const response = await ideService.getLatestResponse({
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

  getIDEService(application, ideType = null) {
    // If specific IDE type requested, use that
    if (ideType) {
      switch (ideType.toLowerCase()) {
        case 'cursor':
          return application.cursorIDEService;
        case 'vscode':
          return application.vscodeIDEService;
        case 'windsurf':
          return application.windsurfIDEService;
        default:
          throw new Error(`Unknown IDE type: ${ideType}`);
      }
    }
    
    // Auto-detect IDE service (priority order)
    return application.cursorIDEService || 
           application.vscodeIDEService || 
           application.windsurfIDEService;
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