/**
 * Execute Terminal Step
 * Executes terminal commands with validation and error handling
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('execute_terminal_step');

// Step configuration
const config = {
  name: 'ExecuteTerminalStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Execute terminal commands with validation and monitoring',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000,
    maxRetries: 3
  },
  validation: {
    required: ['userId', 'command'],
    optional: ['waitTime', 'options', 'workingDirectory', 'environment']
  }
};

class ExecuteTerminalStep {
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
    const stepId = `execute_terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal command execution', {
        stepId,
        userId: context.userId,
        command: context.command?.substring(0, 50) + (context.command?.length > 50 ? '...' : ''),
        workingDirectory: context.workingDirectory
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { userId, command, waitTime = 2000, options = {}, workingDirectory, environment } = context;
      
      logger.info(`🔧 Executing terminal command for user ${userId}`, {
        stepId,
        command: command.substring(0, 100) + (command.length > 100 ? '...' : ''),
        workingDirectory,
        waitTime
      });

      // Publish execution event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.command.executing', {
          stepId,
          userId,
          command: command.substring(0, 100) + (command.length > 100 ? '...' : ''),
          workingDirectory,
          waitTime,
          timestamp: new Date()
        });
      }

      // Execute terminal command
      const result = await this.executeTerminalCommand(services, command, {
        waitTime,
        options,
        workingDirectory,
        environment
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.command.executed', {
          stepId,
          userId,
          command: command.substring(0, 100) + (command.length > 100 ? '...' : ''),
          result: {
            success: result.success,
            output: result.output?.substring(0, 200) + (result.output?.length > 200 ? '...' : ''),
            exitCode: result.exitCode,
            duration: result.duration
          },
          timestamp: new Date()
        });
      }

      logger.info('Terminal command executed successfully', {
        stepId,
        userId,
        command: command.substring(0, 50) + (command.length > 50 ? '...' : ''),
        exitCode: result.exitCode,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        command: command.substring(0, 100) + (command.length > 100 ? '...' : ''),
        data: {
          result,
          workingDirectory,
          environment: environment ? Object.keys(environment) : null
        },
        exitCode: result.exitCode,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to execute terminal command', {
        stepId,
        userId: context.userId,
        command: context.command?.substring(0, 50) + (context.command?.length > 50 ? '...' : ''),
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        try {
          await eventBus.publish('terminal.command.failed', {
            stepId,
            userId: context.userId,
            command: context.command?.substring(0, 100) + (context.command?.length > 100 ? '...' : ''),
            error: originalError,
            timestamp: new Date()
          });
        } catch (eventError) {
          logger.error('Failed to publish failure event:', eventError);
          // Don't let event bus errors override the original error
        }
      }

      return {
        success: false,
        error: originalError,
        stepId,
        userId: context.userId,
        command: context.command?.substring(0, 100) + (context.command?.length > 100 ? '...' : ''),
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute terminal command
   */
  async executeTerminalCommand(services, command, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.executeTerminalCommand(command, {
        waitTime: options.waitTime,
        workingDirectory: options.workingDirectory,
        environment: options.environment,
        ...options.options
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: result.output || '',
        exitCode: result.exitCode || 0,
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

    if (!context.command || context.command.trim().length === 0) {
      throw new Error('Terminal command is required');
    }

    if (context.command.length > 1000) {
      throw new Error('Terminal command too long (max 1000 characters)');
    }

    if (context.waitTime && (typeof context.waitTime !== 'number' || context.waitTime < 0 || context.waitTime > 30000)) {
      throw new Error('Wait time must be a number between 0 and 30000 milliseconds');
    }

    // Validate options
    if (context.options && typeof context.options !== 'object') {
      throw new Error('Options must be an object');
    }

    // Validate working directory
    if (context.workingDirectory && typeof context.workingDirectory !== 'string') {
      throw new Error('Working directory must be a string');
    }

    // Validate environment
    if (context.environment && typeof context.environment !== 'object') {
      throw new Error('Environment must be an object');
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

    if (!context.command) {
      errors.push('Terminal command is required');
    } else if (context.command.length > 1000) {
      errors.push('Terminal command too long (max 1000 characters)');
    }

    if (context.waitTime && (typeof context.waitTime !== 'number' || context.waitTime < 0 || context.waitTime > 30000)) {
      errors.push('Wait time must be a number between 0 and 30000 milliseconds');
    }

    // Check for potentially dangerous commands
    if (context.command) {
      const dangerousCommands = ['rm -rf', 'format', 'dd if=', 'mkfs', 'fdisk'];
      const lowerCommand = context.command.toLowerCase();
      
      for (const dangerous of dangerousCommands) {
        if (lowerCommand.includes(dangerous)) {
          warnings.push(`Potentially dangerous command detected: ${dangerous}`);
        }
      }
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
  execute: ExecuteTerminalStep.prototype.execute.bind(new ExecuteTerminalStep()),
  ExecuteTerminalStep 
}; 