/**
 * Kill Terminal Process Step
 * Kills terminal processes with safety checks and confirmation
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('kill_terminal_process_step');

// Step configuration
const config = {
  name: 'KillTerminalProcessStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Kill terminal processes with safety checks and confirmation',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 15000,
    maxRetries: 2
  },
  validation: {
    required: ['userId', 'processId'],
    optional: ['signal', 'force', 'confirm', 'reason']
  }
};

class KillTerminalProcessStep {
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
    const stepId = `kill_process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal process termination', {
        stepId,
        userId: context.userId,
        processId: context.processId,
        signal: context.signal
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        processId, 
        signal = 'SIGTERM', 
        force = false,
        confirm = false,
        reason = 'User request'
      } = context;
      
      logger.info(`💀 Terminating process ${processId} for user ${userId}`, {
        stepId,
        processId,
        signal,
        force,
        reason
      });

      // Publish termination event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.process.terminating', {
          stepId,
          userId,
          processId,
          signal,
          force,
          reason,
          timestamp: new Date()
        });
      }

      // Kill process
      const result = await this.killProcess(services, {
        processId,
        signal,
        force,
        confirm,
        reason
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.process.terminated', {
          stepId,
          userId,
          processId,
          signal,
          force,
          reason,
          success: result.success,
          timestamp: new Date()
        });
      }

      logger.info('Terminal process terminated successfully', {
        stepId,
        userId,
        processId,
        signal,
        success: result.success,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          processId,
          signal,
          force,
          reason,
          result: result.result,
          processInfo: result.processInfo
        },
        processId,
        signal,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to terminate terminal process', {
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
          await eventBus.publish('terminal.process.termination.failed', {
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
   * Kill terminal process
   */
  async killProcess(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.killTerminalProcess({
        processId: options.processId,
        signal: options.signal,
        force: options.force,
        confirm: options.confirm,
        reason: options.reason
      });

      const duration = Date.now() - startTime;

      return {
        success: result.success || false,
        result: result.result || {},
        processInfo: result.processInfo || {},
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

    // Validate signal
    const validSignals = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGQUIT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'];
    if (context.signal && !validSignals.includes(context.signal)) {
      throw new Error(`Invalid signal: ${context.signal}. Valid signals: ${validSignals.join(', ')}`);
    }

    // Validate force
    if (context.force && typeof context.force !== 'boolean') {
      throw new Error('Force must be a boolean');
    }

    // Validate confirm
    if (context.confirm && typeof context.confirm !== 'boolean') {
      throw new Error('Confirm must be a boolean');
    }

    // Validate reason
    if (context.reason && typeof context.reason !== 'string') {
      throw new Error('Reason must be a string');
    }

    if (context.reason && context.reason.length > 500) {
      throw new Error('Reason too long (max 500 characters)');
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

    const validSignals = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGQUIT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'];
    if (context.signal && !validSignals.includes(context.signal)) {
      errors.push(`Invalid signal: ${context.signal}. Valid signals: ${validSignals.join(', ')}`);
    }

    if (context.force && typeof context.force !== 'boolean') {
      errors.push('Force must be a boolean');
    }

    if (context.confirm && typeof context.confirm !== 'boolean') {
      errors.push('Confirm must be a boolean');
    }

    if (context.reason && typeof context.reason !== 'string') {
      errors.push('Reason must be a string');
    }

    // Check for potentially dangerous operations
    if (context.signal === 'SIGKILL') {
      warnings.push('SIGKILL signal will force terminate the process immediately');
    }

    if (context.force) {
      warnings.push('Force termination may cause data loss');
    }

    if (!context.confirm) {
      warnings.push('Process termination not confirmed - consider setting confirm=true');
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
  execute: KillTerminalProcessStep.prototype.execute.bind(new KillTerminalProcessStep()),
  KillTerminalProcessStep 
}; 