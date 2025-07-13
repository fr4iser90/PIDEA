/**
 * OpenCommandPaletteHandler - Application Layer: IDE Handlers
 * Handler for opening IDE command palette
 */

const OpenCommandPaletteCommand = require('@categories/ide/OpenCommandPaletteCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class OpenCommandPaletteHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.ideAutomationService = dependencies.ideAutomationService;
    this.browserManager = dependencies.browserManager;
    this.ideManager = dependencies.ideManager;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger || logger;
    
    this.handlerId = this.generateHandlerId();
  }

  /**
   * Validate handler dependencies
   * @param {Object} dependencies - Handler dependencies
   */
  validateDependencies(dependencies) {
    const requiredDeps = ['ideAutomationService', 'browserManager', 'ideManager'];
    const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
    
    if (missingDeps.length > 0) {
      throw new Error(`OpenCommandPaletteHandler missing required dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `OpenCommandPaletteHandler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command for this handler
   * @param {OpenCommandPaletteCommand} command - Command to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    try {
      if (!command || command.type !== 'OpenCommandPaletteCommand') {
        return {
          isValid: false,
          errors: ['Invalid command type for OpenCommandPaletteHandler']
        };
      }

      // Validate command parameters
      const validationResult = await command.validate();
      return validationResult;

    } catch (error) {
      this.logger.error('[OpenCommandPaletteHandler] Command validation error:', error);
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Handle OpenCommandPaletteCommand
   * @param {OpenCommandPaletteCommand} command - Command palette command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Opening result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('[OpenCommandPaletteHandler] Handling command', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        searchTerm: command.searchTerm
      });

      // Publish event
      await this.eventBus.publish('ide.commandpalette.opening', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        searchTerm: command.searchTerm,
        timestamp: new Date()
      });

      // Get active IDE type if not specified
      const ideType = command.ideType || await this.ideManager.getActiveIDEType();

      // Use BrowserManager to open command palette
      const browserResult = await this.browserManager.openCommandPalette({
        ideType: ideType,
        searchTerm: command.searchTerm,
        ...command.options
      });

      // Use IDEAutomationService for additional IDE-specific operations
      const automationResult = await this.ideAutomationService.openCommandPalette({
        ideType: ideType,
        searchTerm: command.searchTerm,
        ...command.options
      });

      const result = {
        success: true,
        commandId: command.commandId,
        ideType: ideType,
        searchTerm: command.searchTerm,
        browserResult: browserResult,
        automationResult: automationResult,
        message: `Successfully opened command palette${command.searchTerm ? ` with search term: ${command.searchTerm}` : ''}`,
        metadata: {
          handlerId: this.handlerId,
          executionTime: new Date(),
          options: options
        }
      };

      // Publish success event
      await this.eventBus.publish('ide.commandpalette.opened', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: ideType,
        searchTerm: command.searchTerm,
        result: result,
        timestamp: new Date()
      });

      this.logger.info('[OpenCommandPaletteHandler] Command handled successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error('[OpenCommandPaletteHandler] Command handling failed:', error);

      // Publish failure event
      await this.eventBus.publish('ide.commandpalette.open.failed', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        searchTerm: command.searchTerm,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Get handler metadata
   * @returns {Object} Handler metadata
   */
  getMetadata() {
    return {
      id: this.handlerId,
      type: 'OpenCommandPaletteHandler',
      dependencies: ['ideAutomationService', 'browserManager', 'ideManager', 'eventBus'],
      supportedCommands: ['OpenCommandPaletteCommand']
    };
  }
}

module.exports = OpenCommandPaletteHandler; 