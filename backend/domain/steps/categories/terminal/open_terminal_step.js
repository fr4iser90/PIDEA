/**
 * Open Terminal Step
 * Opens terminal sessions with configuration and validation
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('open_terminal_step');

// Step configuration
const config = {
  name: 'OpenTerminalStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Open terminal sessions with configuration and validation',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 15000,
    maxRetries: 2
  },
  validation: {
    required: ['userId'],
    optional: ['ideType', 'options', 'workingDirectory', 'shell', 'title']
  }
};

class OpenTerminalStep {
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
    const stepId = `open_terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal opening', {
        stepId,
        userId: context.userId,
        ideType: context.ideType
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        ideType = 'cursor',
        options = {},
        workingDirectory,
        shell = 'bash',
        title = 'Terminal'
      } = context;
      
      logger.info(`🚀 Opening terminal for user ${userId} (IDE: ${ideType})`, {
        stepId,
        ideType,
        workingDirectory,
        shell,
        title
      });

      // Publish opening event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.opening', {
          stepId,
          userId,
          ideType,
          workingDirectory,
          shell,
          title,
          timestamp: new Date()
        });
      }

      // Open terminal
      const result = await this.openTerminal(services, {
        ideType,
        options,
        workingDirectory,
        shell,
        title
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.opened', {
          stepId,
          userId,
          ideType,
          terminalId: result.terminalId,
          success: result.success,
          timestamp: new Date()
        });
      }

      logger.info('Terminal opened successfully', {
        stepId,
        userId,
        ideType,
        terminalId: result.terminalId,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          ideType,
          terminalId: result.terminalId,
          workingDirectory,
          shell,
          title,
          options,
          result: result.result
        },
        ideType,
        terminalId: result.terminalId,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to open terminal', {
        stepId,
        userId: context.userId,
        ideType: context.ideType,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        try {
          await eventBus.publish('terminal.opening.failed', {
            stepId,
            userId: context.userId,
            ideType: context.ideType,
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
        ideType: context.ideType,
        timestamp: new Date()
      };
    }
  }

  /**
   * Open terminal
   */
  async openTerminal(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.openTerminal({
        ideType: options.ideType,
        workingDirectory: options.workingDirectory,
        shell: options.shell,
        title: options.title,
        ...options.options
      });

      const duration = Date.now() - startTime;

      return {
        terminalId: result.terminalId || `terminal_${Date.now()}`,
        success: result.success || false,
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

    // Validate IDE type
    const validTypes = ['cursor', 'vscode', 'windsurf'];
    if (context.ideType && !validTypes.includes(context.ideType)) {
      throw new Error(`Invalid IDE type: ${context.ideType}. Valid types: ${validTypes.join(', ')}`);
    }

    // Validate options
    if (context.options && typeof context.options !== 'object') {
      throw new Error('Options must be an object');
    }

    // Validate working directory
    if (context.workingDirectory && typeof context.workingDirectory !== 'string') {
      throw new Error('Working directory must be a string');
    }

    // Validate shell
    if (context.shell && typeof context.shell !== 'string') {
      throw new Error('Shell must be a string');
    }

    const validShells = ['bash', 'zsh', 'sh', 'fish', 'powershell', 'cmd'];
    if (context.shell && !validShells.includes(context.shell)) {
      throw new Error(`Invalid shell: ${context.shell}. Valid shells: ${validShells.join(', ')}`);
    }

    // Validate title
    if (context.title && typeof context.title !== 'string') {
      throw new Error('Title must be a string');
    }

    if (context.title && context.title.length > 100) {
      throw new Error('Title too long (max 100 characters)');
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

    const validTypes = ['cursor', 'vscode', 'windsurf'];
    if (context.ideType && !validTypes.includes(context.ideType)) {
      errors.push(`Invalid IDE type: ${context.ideType}. Valid types: ${validTypes.join(', ')}`);
    }

    if (context.options && typeof context.options !== 'object') {
      errors.push('Options must be an object');
    }

    if (context.workingDirectory && typeof context.workingDirectory !== 'string') {
      errors.push('Working directory must be a string');
    }

    const validShells = ['bash', 'zsh', 'sh', 'fish', 'powershell', 'cmd'];
    if (context.shell && !validShells.includes(context.shell)) {
      errors.push(`Invalid shell: ${context.shell}. Valid shells: ${validShells.join(', ')}`);
    }

    if (context.title && typeof context.title !== 'string') {
      errors.push('Title must be a string');
    }

    if (context.title && context.title.length > 100) {
      errors.push('Title too long (max 100 characters)');
    }

    // Check for potentially problematic configurations
    if (context.workingDirectory && !context.workingDirectory.startsWith('/')) {
      warnings.push('Relative working directory may cause issues');
    }

    if (context.shell === 'powershell' && context.ideType === 'cursor') {
      warnings.push('PowerShell with Cursor IDE may have compatibility issues');
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
  execute: OpenTerminalStep.prototype.execute.bind(new OpenTerminalStep()),
  OpenTerminalStep 
}; 