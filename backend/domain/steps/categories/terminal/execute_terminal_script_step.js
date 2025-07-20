/**
 * Execute Terminal Script Step
 * Executes terminal scripts with validation, environment setup, and error handling
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('execute_terminal_script_step');

// Step configuration
const config = {
  name: 'ExecuteTerminalScriptStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Execute terminal scripts with validation, environment setup, and error handling',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 60000,
    maxRetries: 3
  },
  validation: {
    required: ['userId', 'script'],
    optional: ['interpreter', 'arguments', 'environment', 'workingDirectory', 'timeout', 'captureOutput']
  }
};

class ExecuteTerminalScriptStep {
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
    const stepId = `execute_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal script execution', {
        stepId,
        userId: context.userId,
        interpreter: context.interpreter,
        scriptLength: context.script?.length
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        script, 
        interpreter = 'bash',
        arguments: scriptArgs = [],
        environment = {},
        workingDirectory,
        timeout = 30000,
        captureOutput = true
      } = context;
      
      logger.info(`📜 Executing ${interpreter} script for user ${userId}`, {
        stepId,
        interpreter,
        scriptLength: script.length,
        argsCount: scriptArgs.length,
        workingDirectory,
        timeout
      });

      // Publish execution event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.script.executing', {
          stepId,
          userId,
          interpreter,
          scriptLength: script.length,
          arguments: scriptArgs,
          workingDirectory,
          timestamp: new Date()
        });
      }

      // Execute script
      const result = await this.executeScript(services, {
        script,
        interpreter,
        arguments: scriptArgs,
        environment,
        workingDirectory,
        timeout,
        captureOutput
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.script.executed', {
          stepId,
          userId,
          interpreter,
          success: result.success,
          exitCode: result.exitCode,
          outputLength: result.output?.length || 0,
          timestamp: new Date()
        });
      }

      logger.info('Terminal script executed successfully', {
        stepId,
        userId,
        interpreter,
        exitCode: result.exitCode,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          script: script.substring(0, 100) + (script.length > 100 ? '...' : ''),
          interpreter,
          arguments: scriptArgs,
          environment: Object.keys(environment),
          workingDirectory,
          result: result.result,
          output: result.output,
          errorOutput: result.errorOutput
        },
        interpreter,
        exitCode: result.exitCode,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to execute terminal script', {
        stepId,
        userId: context.userId,
        interpreter: context.interpreter,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        try {
          await eventBus.publish('terminal.script.execution.failed', {
            stepId,
            userId: context.userId,
            interpreter: context.interpreter,
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
        interpreter: context.interpreter,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute terminal script
   */
  async executeScript(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.executeTerminalScript({
        script: options.script,
        interpreter: options.interpreter,
        arguments: options.arguments,
        environment: options.environment,
        workingDirectory: options.workingDirectory,
        timeout: options.timeout,
        captureOutput: options.captureOutput
      });

      const duration = Date.now() - startTime;

      return {
        success: result.success || false,
        exitCode: result.exitCode || 0,
        output: result.output || '',
        errorOutput: result.errorOutput || '',
        result: result.result || {},
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

    if (!context.script || context.script.trim().length === 0) {
      throw new Error('Script content is required');
    }

    if (context.script.length > 50000) {
      throw new Error('Script too long (max 50000 characters)');
    }

    // Validate interpreter
    const validInterpreters = ['bash', 'sh', 'python', 'python3', 'node', 'php', 'ruby', 'perl'];
    if (context.interpreter && !validInterpreters.includes(context.interpreter)) {
      throw new Error(`Invalid interpreter: ${context.interpreter}. Valid interpreters: ${validInterpreters.join(', ')}`);
    }

    // Validate arguments
    if (context.arguments && !Array.isArray(context.arguments)) {
      throw new Error('Arguments must be an array');
    }

    if (context.arguments) {
      for (const arg of context.arguments) {
        if (typeof arg !== 'string' && typeof arg !== 'number') {
          throw new Error('Arguments must be strings or numbers');
        }
      }
    }

    // Validate environment
    if (context.environment && typeof context.environment !== 'object') {
      throw new Error('Environment must be an object');
    }

    if (context.environment) {
      for (const [key, value] of Object.entries(context.environment)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
          throw new Error('Environment variables must be string key-value pairs');
        }
      }
    }

    // Validate working directory
    if (context.workingDirectory && typeof context.workingDirectory !== 'string') {
      throw new Error('Working directory must be a string');
    }

    // Validate timeout
    if (context.timeout && (typeof context.timeout !== 'number' || context.timeout < 1000 || context.timeout > 300000)) {
      throw new Error('Timeout must be a number between 1000 and 300000 milliseconds');
    }

    // Validate captureOutput
    if (context.captureOutput && typeof context.captureOutput !== 'boolean') {
      throw new Error('Capture output must be a boolean');
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

    if (!context.script) {
      errors.push('Script content is required');
    } else if (context.script.length > 50000) {
      errors.push('Script too long (max 50000 characters)');
    }

    const validInterpreters = ['bash', 'sh', 'python', 'python3', 'node', 'php', 'ruby', 'perl'];
    if (context.interpreter && !validInterpreters.includes(context.interpreter)) {
      errors.push(`Invalid interpreter: ${context.interpreter}. Valid interpreters: ${validInterpreters.join(', ')}`);
    }

    if (context.arguments && !Array.isArray(context.arguments)) {
      errors.push('Arguments must be an array');
    }

    if (context.environment && typeof context.environment !== 'object') {
      errors.push('Environment must be an object');
    }

    if (context.workingDirectory && typeof context.workingDirectory !== 'string') {
      errors.push('Working directory must be a string');
    }

    if (context.timeout && (typeof context.timeout !== 'number' || context.timeout < 1000 || context.timeout > 300000)) {
      errors.push('Timeout must be a number between 1000 and 300000 milliseconds');
    }

    if (context.captureOutput && typeof context.captureOutput !== 'boolean') {
      errors.push('Capture output must be a boolean');
    }

    // Check for potentially dangerous scripts
    if (context.script) {
      const dangerousPatterns = [
        'rm -rf', 'format', 'dd if=', 'mkfs', 'fdisk', 'sudo', 'su -',
        'chmod 777', 'chown root', 'passwd', 'useradd', 'userdel'
      ];
      
      const lowerScript = context.script.toLowerCase();
      for (const pattern of dangerousPatterns) {
        if (lowerScript.includes(pattern)) {
          warnings.push(`Potentially dangerous script pattern detected: ${pattern}`);
        }
      }
    }

    // Check for long-running scripts
    if (context.timeout && context.timeout > 60000) {
      warnings.push('Long timeout may indicate a resource-intensive script');
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
  execute: ExecuteTerminalScriptStep.prototype.execute.bind(new ExecuteTerminalScriptStep()),
  ExecuteTerminalScriptStep 
}; 