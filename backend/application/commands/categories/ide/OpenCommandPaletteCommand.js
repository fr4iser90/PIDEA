/**
 * OpenCommandPaletteCommand - Application Layer: IDE Commands
 * Command for opening IDE command palette
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class OpenCommandPaletteCommand {
  constructor(params = {}) {
    this.validateParams(params);
    
    this.commandId = params.commandId || uuidv4();
    this.type = 'OpenCommandPaletteCommand';
    this.timestamp = new Date();
    
    // Command parameters
    this.userId = params.userId;
    this.ideType = params.ideType; // 'cursor', 'vscode', 'windsurf'
    this.searchTerm = params.searchTerm; // Optional: pre-fill search term
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

    if (params.searchTerm && typeof params.searchTerm !== 'string') {
      errors.push('Search term must be a string');
    }

    if (errors.length > 0) {
      throw new Error(`OpenCommandPaletteCommand validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate command for execution
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    try {
      // Additional runtime validation
      if (this.searchTerm && this.searchTerm.length > 100) {
        return {
          isValid: false,
          errors: ['Search term must be less than 100 characters']
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
        searchTerm: this.searchTerm
      });

      // Validate command
      const validationResult = await this.validate();
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Publish event
      if (context.eventBus) {
        await context.eventBus.publish('ide.commandpalette.opening', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          searchTerm: this.searchTerm,
          timestamp: new Date()
        });
      }

      // Execute command palette opening logic
      const result = {
        success: true,
        commandId: this.commandId,
        ideType: this.ideType,
        searchTerm: this.searchTerm,
        message: `Successfully opened command palette${this.searchTerm ? ` with search term: ${this.searchTerm}` : ''}`,
        metadata: {
          ...this.metadata,
          executionTime: new Date(),
          context: context
        }
      };

      // Publish success event
      if (context.eventBus) {
        await context.eventBus.publish('ide.commandpalette.opened', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          searchTerm: this.searchTerm,
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
        await context.eventBus.publish('ide.commandpalette.open.failed', {
          commandId: this.commandId,
          userId: this.userId,
          ideType: this.ideType,
          searchTerm: this.searchTerm,
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
      searchTerm: this.searchTerm,
      options: this.options,
      metadata: this.metadata
    };
  }

  /**
   * Create command from parameters
   * @param {Object} params - Command parameters
   * @returns {OpenCommandPaletteCommand} Command instance
   */
  static create(params) {
    return new OpenCommandPaletteCommand(params);
  }
}

module.exports = OpenCommandPaletteCommand; 