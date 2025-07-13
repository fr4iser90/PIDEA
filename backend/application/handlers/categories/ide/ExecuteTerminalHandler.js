/**
 * ExecuteTerminalHandler - Application Layer: IDE Terminal Handlers
 * Handler for executing terminal commands
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ExecuteTerminalHandler {
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
      this.logger.log(`[ExecuteTerminalHandler] Handling command: ${command.commandId}`);

      // Validate command
      if (!command || command.type !== 'ExecuteTerminalCommand') {
        throw new Error('Invalid command type for ExecuteTerminalHandler');
      }

      // Execute terminal command
      const result = await this.ideAutomationService.executeTerminalCommand(
        command.command,
        {
          ...command.options,
          waitTime: command.waitTime
        }
      );

      // Publish success event
      await this.eventBus.publish('terminal.command.executed', {
        commandId: command.commandId,
        userId: command.userId,
        command: command.command,
        result: result,
        timestamp: new Date()
      });

      this.logger.log(`[ExecuteTerminalHandler] Terminal command executed successfully: ${command.command}`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`[ExecuteTerminalHandler] Failed to execute terminal command:`, error);

      // Publish failure event
      await this.eventBus.publish('terminal.command.failed', {
        commandId: command.commandId,
        userId: command.userId,
        command: command.command,
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
      name: 'ExecuteTerminalHandler',
      version: '1.0.0',
      description: 'Handles IDE terminal command execution',
      supportedCommands: ['ExecuteTerminalCommand']
    };
  }
}

module.exports = ExecuteTerminalHandler; 