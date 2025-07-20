/**
 * IDE Send Message Step
 * Sends message to any IDE (Cursor, VSCode, Windsurf)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ide_send_message');

// Step configuration
const config = {
  name: 'IDESendMessageStep',
  type: 'ide',
  category: 'ide',
  description: 'Send message to any IDE',
  version: '1.0.0',
  dependencies: ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId', 'message'],
    optional: ['workspacePath', 'ideType']
  }
};

class IDESendMessageStep {
  constructor() {
    this.name = 'IDESendMessageStep';
    this.description = 'Send message to any IDE';
    this.category = 'ide';
    this.dependencies = ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = IDESendMessageStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, message, ideType } = context;
      
      logger.info(`📤 Sending message to IDE for project ${projectId}${ideType ? ` (${ideType})` : ''}`);
      
      // Get services via dependency injection
      const cursorIDEService = context.getService('cursorIDEService');
      const chatSessionService = context.getService('chatSessionService');
      
      if (!cursorIDEService) {
        throw new Error('CursorIDEService not available in context');
      }
      if (!chatSessionService) {
        throw new Error('ChatSessionService not available in context');
      }
      
      // Send message directly to Browser Manager (avoid infinite loop with CursorIDEService)
      const browserManager = context.getService('browserManager');
      if (!browserManager) {
        throw new Error('BrowserManager not available in context');
      }
      
      const result = await browserManager.typeMessage(message, true);
      
      logger.info(`✅ Message sent to IDE`);
      
      return {
        success: true,
        message: 'Message sent to IDE',
        data: result,
        ideType: ideType || 'auto-detected'
      };
      
    } catch (error) {
      logger.error('❌ Failed to send message to IDE:', error);
      
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
    if (!context.message) {
      throw new Error('Message is required');
    }
  }
}

// Create instance for execution
const stepInstance = new IDESendMessageStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 