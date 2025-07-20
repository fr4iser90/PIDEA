/**
 * Monitor Terminal Output Step
 * Monitors terminal output with real-time streaming and filtering
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('monitor_terminal_output_step');

// Step configuration
const config = {
  name: 'MonitorTerminalOutputStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Monitor terminal output with real-time streaming and filtering',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000,
    maxRetries: 2
  },
  validation: {
    required: ['userId', 'processId'],
    optional: ['filters', 'maxLines', 'includeStderr', 'realTime', 'callback']
  }
};

class MonitorTerminalOutputStep {
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
    const stepId = `monitor_output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal output monitoring', {
        stepId,
        userId: context.userId,
        processId: context.processId,
        realTime: context.realTime
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        processId, 
        filters = [], 
        maxLines = 1000,
        includeStderr = true,
        realTime = false,
        callback = null
      } = context;
      
      logger.info(`📺 Monitoring output for process ${processId} (user: ${userId})`, {
        stepId,
        processId,
        filters: filters.length,
        maxLines,
        includeStderr,
        realTime
      });

      // Publish monitoring event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.output.monitoring', {
          stepId,
          userId,
          processId,
          filters,
          maxLines,
          realTime,
          timestamp: new Date()
        });
      }

      // Monitor output
      const result = await this.monitorOutput(services, {
        processId,
        filters,
        maxLines,
        includeStderr,
        realTime,
        callback
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.output.monitored', {
          stepId,
          userId,
          processId,
          lineCount: result.lines.length,
          filters: filters.length,
          realTime,
          timestamp: new Date()
        });
      }

      logger.info('Terminal output monitoring completed', {
        stepId,
        userId,
        processId,
        lineCount: result.lines.length,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          processId,
          lines: result.lines,
          totalLines: result.totalLines,
          filteredLines: result.filteredLines,
          filters,
          includeStderr,
          realTime
        },
        processId,
        lineCount: result.lines.length,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to monitor terminal output', {
        stepId,
        userId: context.userId,
        processId: context.processId,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        try {
          await eventBus.publish('terminal.output.monitoring.failed', {
            stepId,
            userId: context.userId,
            processId: context.processId,
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
        processId: context.processId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Monitor terminal output
   */
  async monitorOutput(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.monitorTerminalOutput({
        processId: options.processId,
        filters: options.filters,
        maxLines: options.maxLines,
        includeStderr: options.includeStderr,
        realTime: options.realTime,
        callback: options.callback
      });

      const duration = Date.now() - startTime;

      return {
        lines: result.lines || [],
        totalLines: result.totalLines || 0,
        filteredLines: result.filteredLines || 0,
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

    if (!context.processId) {
      throw new Error('Process ID is required');
    }

    if (typeof context.processId !== 'number' && typeof context.processId !== 'string') {
      throw new Error('Process ID must be a number or string');
    }

    // Validate filters
    if (context.filters && !Array.isArray(context.filters)) {
      throw new Error('Filters must be an array');
    }

    if (context.filters) {
      for (const filter of context.filters) {
        if (typeof filter !== 'object' || !filter.pattern) {
          throw new Error('Each filter must be an object with a pattern property');
        }
        if (typeof filter.pattern !== 'string' && !(filter.pattern instanceof RegExp)) {
          throw new Error('Filter pattern must be a string or RegExp');
        }
      }
    }

    // Validate maxLines
    if (context.maxLines && (typeof context.maxLines !== 'number' || context.maxLines < 1 || context.maxLines > 10000)) {
      throw new Error('Max lines must be a number between 1 and 10000');
    }

    // Validate includeStderr
    if (context.includeStderr && typeof context.includeStderr !== 'boolean') {
      throw new Error('Include stderr must be a boolean');
    }

    // Validate realTime
    if (context.realTime && typeof context.realTime !== 'boolean') {
      throw new Error('Real time must be a boolean');
    }

    // Validate callback
    if (context.callback && typeof context.callback !== 'function') {
      throw new Error('Callback must be a function');
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

    if (!context.processId) {
      errors.push('Process ID is required');
    }

    if (context.processId && typeof context.processId !== 'number' && typeof context.processId !== 'string') {
      errors.push('Process ID must be a number or string');
    }

    if (context.filters && !Array.isArray(context.filters)) {
      errors.push('Filters must be an array');
    }

    if (context.maxLines && (typeof context.maxLines !== 'number' || context.maxLines < 1 || context.maxLines > 10000)) {
      errors.push('Max lines must be a number between 1 and 10000');
    }

    if (context.includeStderr && typeof context.includeStderr !== 'boolean') {
      errors.push('Include stderr must be a boolean');
    }

    if (context.realTime && typeof context.realTime !== 'boolean') {
      errors.push('Real time must be a boolean');
    }

    if (context.callback && typeof context.callback !== 'function') {
      errors.push('Callback must be a function');
    }

    // Check for potentially expensive operations
    if (context.realTime) {
      warnings.push('Real-time monitoring may consume significant resources');
    }

    if (context.maxLines && context.maxLines > 1000) {
      warnings.push('Large max lines value may impact performance');
    }

    if (context.filters && context.filters.length > 10) {
      warnings.push('Many filters may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export in StepRegistry format
module.exports = { 
  config, 
  execute: MonitorTerminalOutputStep.prototype.execute.bind(new MonitorTerminalOutputStep()),
  MonitorTerminalOutputStep 
}; 