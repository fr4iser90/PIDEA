/**
 * IDE Get File Content Step
 * Gets file content from the IDE using the existing BrowserManager
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('IDEGetFileContentStep');

// Step configuration
const config = {
      name: 'IDE_GET_FILE_CONTENT',
      type: 'ide',
      category: 'ide',
      description: 'Gets file content from the IDE',
      version: '1.0.0',
  dependencies: ['browserManager'],
  settings: {
    timeout: 30000,
    ideType: 'cursor',
    workspacePath: null
  },
  validation: {
        required: ['filePath'],
        optional: ['ideType', 'workspacePath']
      }
};

class IDEGetFileContentStep {
  constructor() {
    this.name = 'IDE_GET_FILE_CONTENT';
    this.description = 'Gets file content from the IDE';
    this.category = 'ide';
    this.dependencies = ['browserManager'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = IDEGetFileContentStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { filePath, ideType, workspacePath } = context;
      
      logger.info('Executing IDE_GET_FILE_CONTENT step', {
        filePath,
        ideType,
        workspacePath
      });

      // Get BrowserManager from global application (like old steps)
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { browserManager } = application;
      if (!browserManager) {
        throw new Error('BrowserManager not available');
      }

      // Get file content using existing BrowserManager
      const content = await browserManager.getFileContent(filePath);

      logger.info('IDE_GET_FILE_CONTENT step completed successfully', {
        filePath,
        contentLength: content?.length || 0
      });

      return {
        success: true,
        filePath,
        ideType,
        content,
        contentLength: content?.length || 0,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('IDE_GET_FILE_CONTENT step failed', {
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

// Create instance for execution
const stepInstance = new IDEGetFileContentStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 