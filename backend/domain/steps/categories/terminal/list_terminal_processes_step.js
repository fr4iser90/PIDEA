/**
 * List Terminal Processes Step
 * Lists running terminal processes with filtering and monitoring
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('list_terminal_processes_step');

// Step configuration
const config = {
  name: 'ListTerminalProcessesStep',
  type: 'terminal',
  category: 'terminal',
  description: 'List running terminal processes with filtering and monitoring',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 10000,
    maxRetries: 2
  },
  validation: {
    required: ['userId'],
    optional: ['filter', 'limit', 'sortBy', 'includeDetails', 'refreshInterval']
  }
};

class ListTerminalProcessesStep {
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
    const stepId = `list_processes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal processes listing', {
        stepId,
        userId: context.userId,
        filter: context.filter,
        limit: context.limit
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        filter = {}, 
        limit = 50, 
        sortBy = 'cpu', 
        includeDetails = false,
        refreshInterval = 0
      } = context;
      
      logger.info(`🔍 Listing terminal processes for user ${userId}`, {
        stepId,
        filter: Object.keys(filter),
        limit,
        sortBy,
        includeDetails
      });

      // Publish listing event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.processes.listing', {
          stepId,
          userId,
          filter,
          limit,
          sortBy,
          timestamp: new Date()
        });
      }

      // List processes
      const result = await this.listProcesses(services, {
        filter,
        limit,
        sortBy,
        includeDetails,
        refreshInterval
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.processes.listed', {
          stepId,
          userId,
          processCount: result.processes.length,
          filter: Object.keys(filter),
          timestamp: new Date()
        });
      }

      logger.info('Terminal processes listed successfully', {
        stepId,
        userId,
        processCount: result.processes.length,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          processes: result.processes,
          totalCount: result.totalCount,
          filteredCount: result.processes.length,
          filter,
          sortBy,
          includeDetails
        },
        processCount: result.processes.length,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to list terminal processes', {
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
          await eventBus.publish('terminal.processes.listing.failed', {
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
   * List terminal processes
   */
  async listProcesses(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.listTerminalProcesses({
        filter: options.filter,
        limit: options.limit,
        sortBy: options.sortBy,
        includeDetails: options.includeDetails,
        refreshInterval: options.refreshInterval
      });

      const duration = Date.now() - startTime;

      return {
        processes: result.processes || [],
        totalCount: result.totalCount || 0,
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

    if (context.limit && (typeof context.limit !== 'number' || context.limit < 1 || context.limit > 1000)) {
      throw new Error('Limit must be a number between 1 and 1000');
    }

    if (context.sortBy && !['cpu', 'memory', 'pid', 'name', 'user'].includes(context.sortBy)) {
      throw new Error('Sort by must be one of: cpu, memory, pid, name, user');
    }

    // Validate filter
    if (context.filter && typeof context.filter !== 'object') {
      throw new Error('Filter must be an object');
    }

    if (context.filter) {
      const validFilterKeys = ['name', 'user', 'pid', 'cpuThreshold', 'memoryThreshold'];
      for (const key of Object.keys(context.filter)) {
        if (!validFilterKeys.includes(key)) {
          throw new Error(`Invalid filter key: ${key}. Valid keys: ${validFilterKeys.join(', ')}`);
        }
      }
    }

    // Validate includeDetails
    if (context.includeDetails && typeof context.includeDetails !== 'boolean') {
      throw new Error('Include details must be a boolean');
    }

    // Validate refreshInterval
    if (context.refreshInterval && (typeof context.refreshInterval !== 'number' || context.refreshInterval < 0)) {
      throw new Error('Refresh interval must be a non-negative number');
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

    if (context.limit && (typeof context.limit !== 'number' || context.limit < 1 || context.limit > 1000)) {
      errors.push('Limit must be a number between 1 and 1000');
    }

    if (context.sortBy && !['cpu', 'memory', 'pid', 'name', 'user'].includes(context.sortBy)) {
      errors.push('Sort by must be one of: cpu, memory, pid, name, user');
    }

    if (context.filter && typeof context.filter !== 'object') {
      errors.push('Filter must be an object');
    }

    // Check for potentially expensive operations
    if (context.includeDetails) {
      warnings.push('Including details may impact performance');
    }

    if (context.refreshInterval && context.refreshInterval < 1000) {
      warnings.push('Very short refresh intervals may impact system performance');
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
  execute: ListTerminalProcessesStep.prototype.execute.bind(new ListTerminalProcessesStep()),
  ListTerminalProcessesStep 
}; 