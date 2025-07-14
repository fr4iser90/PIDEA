/**
 * DetectPackageJsonHandler - Application Layer: IDE Analysis Handlers
 * Handler for detecting package.json and dev server
 */

const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class DetectPackageJsonHandler {
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
      this.logger.info(`[DetectPackageJsonHandler] Handling command: ${command.commandId}`);

      // Validate command
      if (!command || command.type !== 'DetectPackageJsonCommand') {
        throw new Error('Invalid command type for DetectPackageJsonHandler');
      }

      // Detect package.json
      const result = await this.ideAutomationService.detectPackageJson({
        ...command.options,
        detectDevServer: command.detectDevServer,
        analyzeScripts: command.analyzeScripts,
        workspacePath: command.workspacePath
      });

      // Publish success event
      await this.eventBus.publish('package.json.detected', {
        commandId: command.commandId,
        userId: command.userId,
        result: result,
        timestamp: new Date()
      });

      this.logger.info(`[DetectPackageJsonHandler] Package.json detected successfully`);

      return {
        success: true,
        commandId: command.commandId,
        result: result,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`[DetectPackageJsonHandler] Failed to detect package.json:`, error);

      // Publish failure event
      await this.eventBus.publish('package.json.detection.failed', {
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
      name: 'DetectPackageJsonHandler',
      version: '1.0.0',
      description: 'Handles IDE package.json detection operations',
      supportedCommands: ['DetectPackageJsonCommand']
    };
  }
}

module.exports = DetectPackageJsonHandler; 