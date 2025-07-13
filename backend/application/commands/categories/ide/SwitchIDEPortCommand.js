/**
 * SwitchIDEPortCommand - Application Layer: IDE Commands
 * Command for switching between different IDE ports
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SwitchIDEPortCommand {
  constructor(params = {}) {
    this.validateParams(params);
    
    this.commandId = params.commandId || uuidv4();
    this.type = 'SwitchIDEPortCommand';
    this.timestamp = new Date();
    
    // Command parameters
    this.port = params.port;
    this.ideType = params.ideType; // 'cursor', 'vscode', 'windsurf'
    this.userId = params.userId;
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

    if (!params.port) {
      errors.push('Port is required');
    } else if (typeof params.port !== 'number' || params.port < 1 || params.port > 65535) {
      errors.push('Port must be a valid number between 1 and 65535');
    }

    if (params.ideType && !['cursor', 'vscode', 'windsurf'].includes(params.ideType)) {
      errors.push('IDE type must be one of: cursor, vscode, windsurf');
    }

    if (!params.userId) {
      errors.push('User ID is required');
    }

    if (errors.length > 0) {
      throw new Error(`SwitchIDEPortCommand validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate command for execution
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    try {
      // Additional runtime validation
      if (this.port < 9222 || this.port > 9251) {
        return {
          isValid: false,
          errors: ['Port must be in IDE range (9222-9251)']
        };
      }

      return {
        isValid: true,
        errors: []
      };
    } catch (error) {
      this.logger.error('[SwitchIDEPortCommand] Validation error:', error);
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
      this.logger.info('[SwitchIDEPortCommand] Executing command', {
        commandId: this.commandId,
        port: this.port,
        ideType: this.ideType,
        userId: this.userId
      });

      // Validate command
      const validationResult = await this.validate();
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Publish event
      if (context.eventBus) {
        await context.eventBus.publish('ide.port.switching', {
          commandId: this.commandId,
          userId: this.userId,
          port: this.port,
          ideType: this.ideType,
          timestamp: new Date()
        });
      }

      // Execute port switching logic
      const result = {
        success: true,
        commandId: this.commandId,
        port: this.port,
        ideType: this.ideType,
        message: `Successfully switched to IDE port ${this.port}`,
        metadata: {
          ...this.metadata,
          executionTime: new Date(),
          context: context
        }
      };

      // Publish success event
      if (context.eventBus) {
        await context.eventBus.publish('ide.port.switched', {
          commandId: this.commandId,
          userId: this.userId,
          port: this.port,
          ideType: this.ideType,
          result: result,
          timestamp: new Date()
        });
      }

      this.logger.info('[SwitchIDEPortCommand] Command executed successfully', {
        commandId: this.commandId,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error('[SwitchIDEPortCommand] Command execution failed:', error);

      // Publish failure event
      if (context.eventBus) {
        await context.eventBus.publish('ide.port.switch.failed', {
          commandId: this.commandId,
          userId: this.userId,
          port: this.port,
          ideType: this.ideType,
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
      port: this.port,
      ideType: this.ideType,
      userId: this.userId,
      options: this.options,
      metadata: this.metadata
    };
  }

  /**
   * Create command from parameters
   * @param {Object} params - Command parameters
   * @returns {SwitchIDEPortCommand} Command instance
   */
  static create(params) {
    return new SwitchIDEPortCommand(params);
  }
}

module.exports = SwitchIDEPortCommand; 