/**
 * IDE Open File Step
 * Opens a file in the IDE using the existing BrowserManager
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('IDEOpenFileStep');

// Step configuration
const config = {
  name: 'IDE_OPEN_FILE',
  type: 'ide',
  description: 'Opens a file in the IDE',
  category: 'ide',
  version: '1.0.0',
  dependencies: ['browserManager'],
  settings: {
    timeout: 10000,
    ideType: null,
    workspacePath: null
  },
  validation: {
    required: ['filePath'],
    optional: ['ideType', 'workspacePath']
  }
};

class IDEOpenFileStep {
  constructor() {
    this.name = 'IDE_OPEN_FILE';
    this.description = 'Opens a file in the IDE';
    this.category = 'ide';
    this.dependencies = ['browserManager'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = IDEOpenFileStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { filePath, ideType, workspacePath } = context;
      
      logger.info('Executing IDE_OPEN_FILE step', {
        filePath,
        ideType,
        workspacePath
      });

      // Get services via dependency injection
      const fileService = context.getService('FileService');
      const ideService = context.getService('IDEService');
      
      if (!fileService) {
        throw new Error('FileService not available in context');
      }
      if (!ideService) {
        throw new Error('IDEService not available in context');
      }

      // Open file using existing BrowserManager
      const result = await fileService.openFile(filePath);

      logger.info('IDE_OPEN_FILE step completed successfully', {
        filePath,
        result
      });

      return {
        success: true,
        filePath,
        ideType,
        result,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('IDE_OPEN_FILE step failed', {
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
    if (!context.filePath) {
      throw new Error('File path is required');
    }
  }
}

module.exports = { config, execute: IDEOpenFileStep.prototype.execute.bind(new IDEOpenFileStep()) }; 