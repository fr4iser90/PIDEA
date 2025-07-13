/**
 * AnalyzeAgainHandler - Application Layer: IDE Analysis Handlers
 * Handler for re-analyzing projects
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class AnalyzeAgainHandler {
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
      this.logger.log(`[AnalyzeAgainHandler] Handling command: ${command.commandId}`);

      // Validate command
      if (!command || command.type !== 'AnalyzeAgainCommand') {
        throw new Error('Invalid command type for AnalyzeAgainHandler');
      }

      // Re-analyze project
      const result = await this.ideAutomationService.analyzeAgain({
        ...command.options,
        clearCache: command.clearCache,
        forceRefresh: command.forceRefresh,
        workspacePath: command.workspacePath
      });

      // Publish success event
      await this.eventBus.publish('project.reanalyzed', {
        commandId: command.commandId,
        userId: command.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.log(`[AnalyzeAgainHandler] Project re-analyzed successfully`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`[AnalyzeAgainHandler] Failed to re-analyze project:`, error);

      // Publish failure event
      await this.eventBus.publish('project.reanalysis.failed', {
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
      name: 'AnalyzeAgainHandler',
      version: '1.0.0',
      description: 'Handles IDE project re-analysis operations',
      supportedCommands: ['AnalyzeAgainCommand']
    };
  }
}

module.exports = AnalyzeAgainHandler; 