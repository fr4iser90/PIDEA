/**
 * IDE Get File Content Step
 * Gets file content from the IDE using the existing BrowserManager
 */

const { BaseStep } = require('../../BaseStep');
const Logger = require('@logging/Logger');
const logger = new Logger('IDEGetFileContentStep');

class IDEGetFileContentStep extends BaseStep {
  constructor() {
    super({
      name: 'IDE_GET_FILE_CONTENT',
      type: 'ide',
      category: 'ide',
      description: 'Gets file content from the IDE',
      version: '1.0.0',
      config: {
        required: ['filePath'],
        optional: ['ideType', 'workspacePath']
      }
    });
  }

  async execute(context) {
    try {
      const { filePath, ideType, workspacePath } = context;
      
      logger.info('Executing IDE_GET_FILE_CONTENT step', {
        filePath,
        ideType,
        workspacePath
      });

      // Get BrowserManager from DI container
      const { getServiceRegistry } = require('@/infrastructure/di/ServiceRegistry');
      const serviceRegistry = getServiceRegistry();
      const browserManager = serviceRegistry.getContainer().resolve('browserManager');

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
}

module.exports = IDEGetFileContentStep; 