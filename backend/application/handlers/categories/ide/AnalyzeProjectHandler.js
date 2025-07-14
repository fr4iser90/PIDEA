/**
 * AnalyzeProjectHandler - Application Layer: IDE Analysis Handlers
 * Handler for analyzing project structure
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class AnalyzeProjectHandler {
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
      this.logger.log(`[AnalyzeProjectHandler] Handling command`);

      // Validate command
      if (!command || command.type !== 'AnalyzeProjectCommand') {
        throw new Error('Invalid command type for AnalyzeProjectHandler');
      }

      // Analyze project
      const result = await this.ideAutomationService.analyzeProject({
        ...command.options,
        analysisType: command.analysisType,
        includeCache: command.includeCache,
        workspacePath: command.workspacePath
      });

      // Publish success event
      await this.eventBus.publish('project.analyzed', {
        commandId: command.commandId,
        userId: command.userId,
        analysisType: command.analysisType,
        result: result,
        timestamp: new Date()
      });

      this.logger.log(`[AnalyzeProjectHandler] Project analyzed successfully`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`[AnalyzeProjectHandler] Failed to analyze project:`, error);

      // Publish failure event
      await this.eventBus.publish('project.analysis.failed', {
        commandId: command.commandId,
        userId: command.userId,
        analysisType: command.analysisType,
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
      name: 'AnalyzeProjectHandler',
      version: '1.0.0',
      description: 'Handles IDE project analysis operations',
      supportedCommands: ['AnalyzeProjectCommand']
    };
  }
}

module.exports = AnalyzeProjectHandler; 