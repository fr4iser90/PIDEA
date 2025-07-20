/**
 * Terminal Session Management Step
 * Manages terminal sessions with creation, management, and cleanup capabilities
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('terminal_session_management_step');

// Step configuration
const config = {
  name: 'TerminalSessionManagementStep',
  type: 'terminal',
  category: 'terminal',
  description: 'Manage terminal sessions with creation, management, and cleanup capabilities',
  version: '1.0.0',
  dependencies: ['ideAutomationService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 20000,
    maxRetries: 2
  },
  validation: {
    required: ['userId', 'action'],
    optional: ['sessionId', 'sessionConfig', 'cleanup', 'timeout']
  }
};

class TerminalSessionManagementStep {
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
    const stepId = `session_management_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting terminal session management', {
        stepId,
        userId: context.userId,
        action: context.action,
        sessionId: context.sessionId
      });

      // Validate context
      this.validateContext(context);
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { 
        userId, 
        action,
        sessionId = null,
        sessionConfig = {},
        cleanup = false,
        timeout = 30000
      } = context;
      
      logger.info(`🖥️ ${action} terminal session for user ${userId}`, {
        stepId,
        action,
        sessionId,
        cleanup,
        timeout
      });

      // Publish management event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.session.managing', {
          stepId,
          userId,
          action,
          sessionId,
          sessionConfig,
          timestamp: new Date()
        });
      }

      // Manage session
      const result = await this.manageSession(services, {
        action,
        sessionId,
        sessionConfig,
        cleanup,
        timeout
      });

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('terminal.session.managed', {
          stepId,
          userId,
          action,
          sessionId: result.sessionId,
          success: result.success,
          timestamp: new Date()
        });
      }

      logger.info('Terminal session management completed', {
        stepId,
        userId,
        action,
        sessionId: result.sessionId,
        success: result.success,
        duration: result.duration
      });

      return {
        success: true,
        stepId,
        userId,
        data: {
          action,
          sessionId: result.sessionId,
          sessionInfo: result.sessionInfo,
          sessionConfig,
          cleanup
        },
        action,
        sessionId: result.sessionId,
        duration: result.duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to manage terminal session', {
        stepId,
        userId: context.userId,
        action: context.action,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('EventBus');
      if (eventBus) {
        try {
          await eventBus.publish('terminal.session.management.failed', {
            stepId,
            userId: context.userId,
            action: context.action,
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
        action: context.action,
        timestamp: new Date()
      };
    }
  }

  /**
   * Manage terminal session
   */
  async manageSession(services, options) {
    const startTime = Date.now();
    
    try {
      const result = await services.ideAutomationService.manageTerminalSession({
        action: options.action,
        sessionId: options.sessionId,
        sessionConfig: options.sessionConfig,
        cleanup: options.cleanup,
        timeout: options.timeout
      });

      const duration = Date.now() - startTime;

      return {
        sessionId: result.sessionId || options.sessionId,
        sessionInfo: result.sessionInfo || {},
        success: result.success || false,
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

    if (!context.action) {
      throw new Error('Action is required');
    }

    const validActions = ['create', 'list', 'get', 'update', 'delete', 'cleanup', 'restart'];
    if (!validActions.includes(context.action)) {
      throw new Error(`Invalid action: ${context.action}. Valid actions: ${validActions.join(', ')}`);
    }

    // Validate sessionId for actions that require it
    const actionsRequiringSessionId = ['get', 'update', 'delete', 'restart'];
    if (actionsRequiringSessionId.includes(context.action) && !context.sessionId) {
      throw new Error(`Session ID is required for action: ${context.action}`);
    }

    if (context.sessionId && typeof context.sessionId !== 'string') {
      throw new Error('Session ID must be a string');
    }

    // Validate sessionConfig
    if (context.sessionConfig && typeof context.sessionConfig !== 'object') {
      throw new Error('Session config must be an object');
    }

    if (context.sessionConfig) {
      const validConfigKeys = ['title', 'workingDirectory', 'environment', 'shell', 'size'];
      for (const key of Object.keys(context.sessionConfig)) {
        if (!validConfigKeys.includes(key)) {
          throw new Error(`Invalid session config key: ${key}. Valid keys: ${validConfigKeys.join(', ')}`);
        }
      }
    }

    // Validate cleanup
    if (context.cleanup && typeof context.cleanup !== 'boolean') {
      throw new Error('Cleanup must be a boolean');
    }

    // Validate timeout
    if (context.timeout && (typeof context.timeout !== 'number' || context.timeout < 1000 || context.timeout > 120000)) {
      throw new Error('Timeout must be a number between 1000 and 120000 milliseconds');
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

    if (!context.action) {
      errors.push('Action is required');
    }

    const validActions = ['create', 'list', 'get', 'update', 'delete', 'cleanup', 'restart'];
    if (context.action && !validActions.includes(context.action)) {
      errors.push(`Invalid action: ${context.action}. Valid actions: ${validActions.join(', ')}`);
    }

    const actionsRequiringSessionId = ['get', 'update', 'delete', 'restart'];
    if (context.action && actionsRequiringSessionId.includes(context.action) && !context.sessionId) {
      errors.push(`Session ID is required for action: ${context.action}`);
    }

    if (context.sessionId && typeof context.sessionId !== 'string') {
      errors.push('Session ID must be a string');
    }

    if (context.sessionConfig && typeof context.sessionConfig !== 'object') {
      errors.push('Session config must be an object');
    }

    if (context.cleanup && typeof context.cleanup !== 'boolean') {
      errors.push('Cleanup must be a boolean');
    }

    if (context.timeout && (typeof context.timeout !== 'number' || context.timeout < 1000 || context.timeout > 120000)) {
      errors.push('Timeout must be a number between 1000 and 120000 milliseconds');
    }

    // Check for potentially destructive actions
    if (context.action === 'delete') {
      warnings.push('Delete action will permanently remove the terminal session');
    }

    if (context.action === 'cleanup') {
      warnings.push('Cleanup action will terminate all user sessions');
    }

    if (context.cleanup) {
      warnings.push('Cleanup enabled - sessions will be terminated after completion');
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
  execute: TerminalSessionManagementStep.prototype.execute.bind(new TerminalSessionManagementStep()),
  TerminalSessionManagementStep 
}; 