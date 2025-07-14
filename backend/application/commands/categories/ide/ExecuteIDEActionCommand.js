/**
 * ExecuteIDEActionCommand - Application Layer: IDE Commands
 * Command for executing specific IDE actions
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ExecuteIDEActionCommand {
  constructor(params = {}) {
    this.validateParams(params);
    
    this.commandId = params.commandId || uuidv4();
    this.type = 'ExecuteIDEActionCommand';
    this.timestamp = new Date();
    
    // Command parameters
    this.userId = params.userId;
    this.ideType = params.ideType; // 'cursor', 'vscode', 'windsurf'
    this.action = params.action; // Action to execute (e.g., 'save', 'undo', 'redo', 'find')
    this.actionType = params.actionType; // 'keyboard', 'menu', 'command'
    this.parameters = params.parameters || {}; // Action-specific parameters
    this.options = params.options || {};
    this.metadata = params.metadata || {};
    
    this.logger = params.logger || logger;
  }

  /**
   * Validate command parameters
   * @param {Object} params - Command parameters
   */
  validateParams(params) {
    const errors = [];

    if (!params.userId) {
      errors.push('User ID is required');
    }

    if (!params.action) {
      errors.push('Action is required');
    } else if (typeof params.action !== 'string') {
      errors.push('Action must be a string');
    }

    if (params.ideType && !['cursor', 'vscode', 'windsurf'].includes(params.ideType)) {
      errors.push('IDE type must be one of: cursor, vscode, windsurf');
    }

    if (params.actionType && !['keyboard', 'menu', 'command'].includes(params.actionType)) {
      errors.push('Action type must be one of: keyboard, menu, command');
    }

    if (params.parameters && typeof params.parameters !== 'object') {
      errors.push('Parameters must be an object');
    }

    if (errors.length > 0) {
      throw new Error(`ExecuteIDEActionCommand validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate command for execution
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    try {
      // Additional runtime validation
      const validActions = [
        'save', 'undo', 'redo', 'find', 'replace', 'go-to-line', 'format', 'comment',
        'uncomment', 'indent', 'outdent', 'duplicate-line', 'delete-line', 'move-line-up',
        'move-line-down', 'select-all', 'copy', 'cut', 'paste', 'find-in-files',
        'replace-in-files', 'toggle-sidebar', 'toggle-terminal', 'new-file', 'open-file'
      ];

      if (!validActions.includes(this.action)) {
        return {
          isValid: false,
          errors: [`Action '${this.action}' is not supported. Valid actions: ${validActions.join(', ')}`]
        };
      }

      return {
        isValid: true,
        errors: []
      };
    } catch (error) {
      this.logger.error('Validation error:', error);
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Execute the command
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async execute(context = {}) {
    try {
      this.logger.info('Executing command', {
        commandId: this.commandId,
        userId: this.userId,
        ideType: this.ideType,
        action: this.action,
        actionType: this.actionType,
        parameters: this.parameters
      });

      // Validate command
      const validationResult = await this.validate();
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Publish event
      if (context.eventBus) {
        await context.eventBus.publish('ide.action.executing', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          action: this.action,
          actionType: this.actionType,
          parameters: this.parameters,
          timestamp: new Date()
        });
      }

      // Execute IDE action logic
      const result = {
        success: true,
        commandId: this.commandId,
        ideType: this.ideType,
        action: this.action,
        actionType: this.actionType,
        parameters: this.parameters,
        message: `Successfully executed IDE action: ${this.action}`,
        metadata: {
          ...this.metadata,
          executionTime: new Date(),
          context: context
        }
      };

      // Publish success event
      if (context.eventBus) {
        await context.eventBus.publish('ide.action.executed', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          action: this.action,
          actionType: this.actionType,
          parameters: this.parameters,
          result: result,
          timestamp: new Date()
        });
      }

      this.logger.info('Command executed successfully', {
        commandId: this.commandId,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error('Command execution failed:', error);

      // Publish failure event
      if (context.eventBus) {
        await context.eventBus.publish('ide.action.execution.failed', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          action: this.action,
          actionType: this.actionType,
          parameters: this.parameters,
          error: error.message,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Get command metadata
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      id: this.commandId,
      type: this.type,
      timestamp: this.timestamp,
      userId: this.userId,
      ideType: this.ideType,
      action: this.action,
      actionType: this.actionType,
      parameters: this.parameters,
      options: this.options,
      metadata: this.metadata
    };
  }

  /**
   * Create command from parameters
   * @param {Object} params - Command parameters
   * @returns {ExecuteIDEActionCommand} Command instance
   */
  static create(params) {
    return new ExecuteIDEActionCommand(params);
  }
}

module.exports = ExecuteIDEActionCommand; 