/**
 * GetWorkspaceInfoHandler - Application Layer: IDE Analysis Handlers
 * Handler for getting workspace information
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GetWorkspaceInfoHandler {
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
      if (!command || command.type !== 'GetWorkspaceInfoCommand') {
        throw new Error('Invalid command type for GetWorkspaceInfoHandler');
      }

      // Get workspace info
      const result = await this.ideAutomationService.getWorkspaceInfo({
        ...command.options,
        includeDetails: command.includeDetails,
        includeProjects: command.includeProjects,
        workspacePath: command.workspacePath
      });

      // Publish success event
      await this.eventBus.publish('workspace.info.retrieved', {
        commandId: command.commandId,
        userId: command.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.info(`Workspace info retrieved successfully`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`Failed to get workspace info:`, error);

      // Publish failure event
      await this.eventBus.publish('workspace.info.retrieval.failed', {
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
      name: 'GetWorkspaceInfoHandler',
      version: '1.0.0',
      description: 'Handles IDE workspace information retrieval',
      supportedCommands: ['GetWorkspaceInfoCommand']
    };
  }
}

module.exports = GetWorkspaceInfoHandler; 