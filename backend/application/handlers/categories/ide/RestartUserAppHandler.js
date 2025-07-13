/**
 * RestartUserAppHandler - Application Layer: IDE Terminal Handlers
 * Handler for restarting user applications
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class RestartUserAppHandler {
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
      this.logger.log(`[RestartUserAppHandler] Handling command: ${command.commandId}`);

      // Validate command
      if (!command || command.type !== 'RestartUserAppCommand') {
        throw new Error('Invalid command type for RestartUserAppHandler');
      }

      // Restart user app
      const result = await this.ideAutomationService.restartUserApp({
        ...command.options,
        appName: command.appName,
        forceRestart: command.forceRestart
      });

      // Publish success event
      await this.eventBus.publish('terminal.app.restarted', {
        commandId: command.commandId,
        userId: command.userId,
        appName: command.appName,
        result: result,
        timestamp: new Date()
      });

      this.logger.log(`[RestartUserAppHandler] User app restarted successfully: ${command.appName || 'default'}`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`[RestartUserAppHandler] Failed to restart user app:`, error);

      // Publish failure event
      await this.eventBus.publish('terminal.app.restart.failed', {
        commandId: command.commandId,
        userId: command.userId,
        appName: command.appName,
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
      name: 'RestartUserAppHandler',
      version: '1.0.0',
      description: 'Handles IDE user app restart operations',
      supportedCommands: ['RestartUserAppCommand']
    };
  }
}

module.exports = RestartUserAppHandler; 