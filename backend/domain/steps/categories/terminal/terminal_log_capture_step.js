/**
 * Terminal Log Capture Step
 * Captures terminal logs with filtering and formatting options
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('terminal_log_capture_step');

// Step configuration
const config = {
  name: 'TerminalLogCaptureStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Capture terminal logs with filtering and formatting options',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 20000,
    maxRetries: 2
  },
  validation: {
    required: ['userId'],
    optional: ['maxLines', 'includeTimestamps', 'filterLevel', 'options', 'sessionId', 'format']
  }
};

class TerminalLogCaptureStep {
  constructor() {
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.dependencies = config.dependencies;
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const stepId = `capture_logs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal log capture', {
        stepId,
        userId: context.userId,
        filterLevel: context.filterLevel,
        maxLines: context.maxLines
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        maxLines = 100,
        includeTimestamps = true,
        filterLevel = 'all',
        options = {},
        sessionId = null,
        format = 'text'
      } = context;
      
      logger.info(`📋 Capturing terminal logs for user ${userId}`, {
        stepId,
        maxLines,
        includeTimestamps,
        filterLevel,
        sessionId,
        format
      });

      // Publish capture event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.logs.capturing', {
          stepId,
          userId,
          maxLines,
          filterLevel,
          sessionId,
          timestamp: new Date()
        });
      }

      // Capture logs
      const result = await this.captureLogs(services, {
        maxLines,
        includeTimestamps,
        filterLevel,
        options,
        sessionId,
        format
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.logs.captured', {
          stepId,
          userId,
          logCount: result.logs.length,
          filterLevel,
          sessionId,
          timestamp: new Date()
        });
      }

      logger.info('Terminal logs captured successfully', {
        stepId,
        userId,
        logCount: result.logs.length,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          logs: result.logs,
          logCount: result.logs.length,
          maxLines,
          includeTimestamps,
          filterLevel,
          sessionId,
          format,
          summary: result.summary
        },
        logCount: result.logs.length,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to capture terminal logs', {
        stepId,
        userId: context.userId,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        try {
          await eventBus.publish('terminal.logs.capture.failed', {
            stepId,
            userId: context.userId,
            error: originalError,
            timestamp: new Date()
          });
        } catch (eventError) {
          logger.error('Failed to publish failure event:', eventError);
        }
      }

      return {
        success: false,
        error: originalError,
        stepId,
        userId: context.userId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Capture terminal logs
   */
  async captureLogs(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.captureTerminalLogs({
        maxLines: options.maxLines,
        includeTimestamps: options.includeTimestamps,
        filterLevel: options.filterLevel,
        sessionId: options.sessionId,
        format: options.format,
        ...options.options
      });

      const duration = Date.now() - startTime;

      return {
        logs: result.logs || [],
        summary: result.summary || {},
        duration,
        raw: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Re-throw the error so the main execute method can handle it
      throw error;
    }
  }

  /**
   * Validate required services
   */
  validateServices(context) {
    const services = {};

    // Required services
    services.ideAutomationService = context.getService('IDEAutomationService');
    if (!services.ideAutomationService) {
      throw new Error('IDEAutomationService not available in context');
    }

    // Optional services
    services.eventBus = context.getService('EventBus');

    return services;
  }

  /**
   * Validate context
   */
  validateContext(context) {
    if (!context.userId) {
      throw new Error('User ID is required');
    }

    // Validate maxLines
    if (context.maxLines && (typeof context.maxLines !== 'number' || context.maxLines < 1 || context.maxLines > 10000)) {
      throw new Error('Max lines must be a number between 1 and 10000');
    }

    // Validate includeTimestamps
    if (context.includeTimestamps && typeof context.includeTimestamps !== 'boolean') {
      throw new Error('Include timestamps must be a boolean');
    }

    // Validate filterLevel
    const validLevels = ['all', 'error', 'warning', 'info', 'debug'];
    if (context.filterLevel && !validLevels.includes(context.filterLevel)) {
      throw new Error(`Invalid filter level: ${context.filterLevel}. Valid levels: ${validLevels.join(', ')}`);
    }

    // Validate options
    if (context.options && typeof context.options !== 'object') {
      throw new Error('Options must be an object');
    }

    // Validate sessionId
    if (context.sessionId && typeof context.sessionId !== 'string') {
      throw new Error('Session ID must be a string');
    }

    // Validate format
    const validFormats = ['text', 'json', 'csv', 'xml'];
    if (context.format && !validFormats.includes(context.format)) {
      throw new Error(`Invalid format: ${context.format}. Valid formats: ${validFormats.join(', ')}`);
    }
  }

  /**
   * Get step configuration
   */
  getConfig() {
    return config;
  }

  /**
   * Validate step parameters
   */
  validate(context) {
    const errors = [];
    const warnings = [];

    if (!context.userId) {
      errors.push('User ID is required');
    }

    if (context.maxLines && (typeof context.maxLines !== 'number' || context.maxLines < 1 || context.maxLines > 10000)) {
      errors.push('Max lines must be a number between 1 and 10000');
    }

    if (context.includeTimestamps && typeof context.includeTimestamps !== 'boolean') {
      errors.push('Include timestamps must be a boolean');
    }

    const validLevels = ['all', 'error', 'warning', 'info', 'debug'];
    if (context.filterLevel && !validLevels.includes(context.filterLevel)) {
      errors.push(`Invalid filter level: ${context.filterLevel}. Valid levels: ${validLevels.join(', ')}`);
    }

    if (context.options && typeof context.options !== 'object') {
      errors.push('Options must be an object');
    }

    if (context.sessionId && typeof context.sessionId !== 'string') {
      errors.push('Session ID must be a string');
    }

    const validFormats = ['text', 'json', 'csv', 'xml'];
    if (context.format && !validFormats.includes(context.format)) {
      errors.push(`Invalid format: ${context.format}. Valid formats: ${validFormats.join(', ')}`);
    }

    // Check for potentially expensive operations
    if (context.maxLines && context.maxLines > 1000) {
      warnings.push('Large max lines value may impact performance');
    }

    if (context.filterLevel === 'all') {
      warnings.push('Capturing all log levels may result in large output');
    }

    if (context.format === 'json' || context.format === 'xml') {
      warnings.push('Structured formats may increase processing time');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = { 
  config, 
  execute: TerminalLogCaptureStep.prototype.execute.bind(new TerminalLogCaptureStep()),
  TerminalLogCaptureStep 
}; 