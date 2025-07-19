/**
 * Cursor Get Response Step
 * Gets the latest response from Cursor AI using the existing CursorIDEService
 */

const { BaseStep } = require('../../BaseStep');
const Logger = require('@logging/Logger');
const logger = new Logger('CursorGetResponseStep');

class CursorGetResponseStep extends BaseStep {
  constructor() {
    super({
      name: 'CURSOR_GET_RESPONSE',
      type: 'cursor',
      category: 'cursor',
      description: 'Gets the latest response from Cursor AI',
      version: '1.0.0',
      config: {
        required: [],
        optional: ['timeout', 'checkInterval', 'maxRetries']
      }
    });
  }

  async execute(context) {
    try {
      const { 
        timeout = 300000, 
        checkInterval = 5000, 
        maxRetries = 60 
      } = context;
      
      logger.info('Executing CURSOR_GET_RESPONSE step', {
        timeout,
        checkInterval,
        maxRetries
      });

      // Get CursorIDEService from DI container
      const { getServiceRegistry } = require('@/infrastructure/di/ServiceRegistry');
      const serviceRegistry = getServiceRegistry();
      const cursorIDEService = serviceRegistry.getContainer().resolve('cursorIDEService');

      if (!cursorIDEService) {
        throw new Error('CursorIDEService not available');
      }

      // Get response using existing CursorIDEService
      const result = await cursorIDEService.getLatestResponse({
        timeout,
        checkInterval,
        maxRetries
      });

      logger.info('CURSOR_GET_RESPONSE step completed successfully', {
        success: result.success,
        responseLength: result.response?.length || 0,
        hasCodeBlocks: result.hasCodeBlocks
      });

      return {
        success: result.success,
        response: result.response,
        hasCodeBlocks: result.hasCodeBlocks,
        codeBlocks: result.codeBlocks,
        duration: result.duration,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('CURSOR_GET_RESPONSE step failed', {
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

module.exports = CursorGetResponseStep; 