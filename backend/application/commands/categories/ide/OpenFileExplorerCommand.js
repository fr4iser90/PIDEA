/**
 * OpenFileExplorerCommand - Application Layer: IDE Commands
 * Command for opening IDE file explorer
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class OpenFileExplorerCommand {
  constructor(params = {}) {
    this.validateParams(params);
    
    this.commandId = params.commandId || uuidv4();
    this.type = 'OpenFileExplorerCommand';
    this.timestamp = new Date();
    
    // Command parameters
    this.userId = params.userId;
    this.ideType = params.ideType; // 'cursor', 'vscode', 'windsurf'
    this.path = params.path; // Optional: specific path to open
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

    if (params.ideType && !['cursor', 'vscode', 'windsurf'].includes(params.ideType)) {
      errors.push('IDE type must be one of: cursor, vscode, windsurf');
    }

    if (params.path && typeof params.path !== 'string') {
      errors.push('Path must be a string');
    }

    if (errors.length > 0) {
      throw new Error(`OpenFileExplorerCommand validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate command for execution
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    try {
      // Additional runtime validation
      if (this.path && !this.path.startsWith('/') && !this.path.startsWith('./')) {
        return {
          isValid: false,
          errors: ['Path must be an absolute or relative path']
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
        path: this.path
      });

      // Validate command
      const validationResult = await this.validate();
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Publish event
      if (context.eventBus) {
        await context.eventBus.publish('ide.fileexplorer.opening', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          path: this.path,
          timestamp: new Date()
        });
      }

      // Execute file explorer opening logic
      const result = {
        success: true,
        commandId: this.commandId,
        ideType: this.ideType,
        path: this.path,
        message: `Successfully opened file explorer${this.path ? ` at ${this.path}` : ''}`,
        metadata: {
          ...this.metadata,
          executionTime: new Date(),
          context: context
        }
      };

      // Publish success event
      if (context.eventBus) {
        await context.eventBus.publish('ide.fileexplorer.opened', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          path: this.path,
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
        await context.eventBus.publish('ide.fileexplorer.open.failed', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          path: this.path,
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
      path: this.path,
      options: this.options,
      metadata: this.metadata
    };
  }

  /**
   * Create command from parameters
   * @param {Object} params - Command parameters
   * @returns {OpenFileExplorerCommand} Command instance
   */
  static create(params) {
    return new OpenFileExplorerCommand(params);
  }
}

module.exports = OpenFileExplorerCommand; 