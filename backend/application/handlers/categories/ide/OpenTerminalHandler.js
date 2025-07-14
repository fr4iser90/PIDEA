/**
 * OpenTerminalHandler - Application Layer: IDE Terminal Handlers
 * Handler for opening IDE terminal
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class OpenTerminalHandler {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.ideAutomationService = dependencies.ideAutomationService;
    this.eventBus = dependencies.eventBus;
    this.logger = logger;
  }

  /**
   * Validate handler dependencies
   * @param {Object} dependencies - Handler dependencies
   * @throws {Error} If dependencies are invalid
   */
  validateDependencies(dependencies) {
    if (!dependencies.ideAutomationService) {
      throw new Error('IDEAutomationService is required');
    }
    if (!dependencies.eventBus) {
      throw new Error('EventBus is required');
    }
  }

  /**
   * Handle command execution
   * @param {Object} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Handler result
   */
  async handle(command, context = {}) {
    try {
      this.logger.info(`[OpenTerminalHandler] Handling command: ${command.commandId}`);

      // Validate command
      if (!command || command.type !== 'OpenTerminalCommand') {
        throw new Error('Invalid command type for OpenTerminalHandler');
      }

      // Execute terminal opening
      const result = await this.ideAutomationService.openTerminal({
        ...command.options,
        ideType: command.ideType
      });

      // Publish success event
      await this.eventBus.publish('terminal.open.completed', {
        commandId: command.commandId,
        userId: command.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.info(`[OpenTerminalHandler] Terminal opened successfully: ${result.success}`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`[OpenTerminalHandler] Failed to open terminal:`, error);

      // Publish failure event
      await this.eventBus.publish('terminal.open.failed', {
        commandId: command.commandId,
        userId: command.userId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Get handler information
   * @returns {Object} Handler information
   */
  getInfo() {
    return {
      name: 'OpenTerminalHandler',
      version: '1.0.0',
      description: 'Handles IDE terminal opening operations',
      supportedCommands: ['OpenTerminalCommand']
    };
  }
}

module.exports = OpenTerminalHandler; 