/**
 * TerminalLogCaptureHandler - Application Layer: IDE Terminal Handlers
 * Handler for capturing terminal logs
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TerminalLogCaptureHandler {
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
      if (!command || command.type !== 'TerminalLogCaptureCommand') {
        throw new Error('Invalid command type for TerminalLogCaptureHandler');
      }

      // Capture terminal logs
      const result = await this.ideAutomationService.captureTerminalLogs({
        ...command.options,
        maxLines: command.maxLines,
        includeTimestamps: command.includeTimestamps,
        filterLevel: command.filterLevel
      });

      // Publish success event
      await this.eventBus.publish('terminal.logs.captured', {
        commandId: command.commandId,
        userId: command.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.info(`Terminal logs captured successfully: ${result.count} entries`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`Failed to capture terminal logs:`, error);

      // Publish failure event
      await this.eventBus.publish('terminal.logs.capture.failed', {
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
      name: 'TerminalLogCaptureHandler',
      version: '1.0.0',
      description: 'Handles IDE terminal log capture operations',
      supportedCommands: ['TerminalLogCaptureCommand']
    };
  }
}

module.exports = TerminalLogCaptureHandler; 