/**
 * MonitorTerminalOutputHandler - Application Layer: IDE Terminal Handlers
 * Handler for monitoring terminal output
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class MonitorTerminalOutputHandler {
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
      this.logger.info(`Handling command: ${command.commandId}`);

      // Validate command
      if (!command || command.type !== 'MonitorTerminalOutputCommand') {
        throw new Error('Invalid command type for MonitorTerminalOutputHandler');
      }

      // Monitor terminal output
      const result = await this.ideAutomationService.monitorTerminalOutput({
        ...command.options,
        duration: command.duration,
        interval: command.interval
      });

      // Publish success event
      await this.eventBus.publish('terminal.output.monitored', {
        commandId: command.commandId,
        userId: command.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.info(`Terminal output monitored successfully`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`Failed to monitor terminal output:`, error);

      // Publish failure event
      await this.eventBus.publish('terminal.output.monitoring.failed', {
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
      name: 'MonitorTerminalOutputHandler',
      version: '1.0.0',
      description: 'Handles IDE terminal output monitoring',
      supportedCommands: ['MonitorTerminalOutputCommand']
    };
  }
}

module.exports = MonitorTerminalOutputHandler; 