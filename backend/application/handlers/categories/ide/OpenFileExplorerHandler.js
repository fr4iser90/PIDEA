/**
 * OpenFileExplorerHandler - Application Layer: IDE Handlers
 * Handler for opening IDE file explorer
 */

const OpenFileExplorerCommand = require('@categories/ide/OpenFileExplorerCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class OpenFileExplorerHandler {
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
      throw new Error(`OpenFileExplorerHandler missing required dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `OpenFileExplorerHandler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command for this handler
   * @param {OpenFileExplorerCommand} command - Command to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    try {
      if (!command || command.type !== 'OpenFileExplorerCommand') {
        return {
          isValid: false,
          errors: ['Invalid command type for OpenFileExplorerHandler']
        };
      }

      // Validate command parameters
      const validationResult = await command.validate();
      return validationResult;

    } catch (error) {
      this.logger.error('Command validation error:', error);
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Handle OpenFileExplorerCommand
   * @param {OpenFileExplorerCommand} command - File explorer command
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

      this.logger.info('Handling command', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        path: command.path
      });

      // Publish event
      await this.eventBus.publish('ide.fileexplorer.opening', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        path: command.path,
        timestamp: new Date()
      });

      // Get active IDE type if not specified
      const ideType = command.ideType || await this.ideManager.getActiveIDEType();

      // Use BrowserManager to open file explorer
      const browserResult = await this.browserManager.openFileExplorer({
        ideType: ideType,
        path: command.path,
        ...command.options
      });

      // Use IDEAutomationService for additional IDE-specific operations
      const automationResult = await this.ideAutomationService.openFileExplorer({
        ideType: ideType,
        path: command.path,
        ...command.options
      });

      const result = {
        success: true,
        commandId: command.commandId,
        ideType: ideType,
        path: command.path,
        browserResult: browserResult,
        automationResult: automationResult,
        message: `Successfully opened file explorer${command.path ? ` at ${command.path}` : ''}`,
        metadata: {
          handlerId: this.handlerId,
          executionTime: new Date(),
          options: options
        }
      };

      // Publish success event
      await this.eventBus.publish('ide.fileexplorer.opened', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: ideType,
        path: command.path,
        result: result,
        timestamp: new Date()
      });

      this.logger.info('Command handled successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error('Command handling failed:', error);

      // Publish failure event
      await this.eventBus.publish('ide.fileexplorer.open.failed', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        path: command.path,
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
      type: 'OpenFileExplorerHandler',
      dependencies: ['ideAutomationService', 'browserManager', 'ideManager', 'eventBus'],
      supportedCommands: ['OpenFileExplorerCommand']
    };
  }
}

module.exports = OpenFileExplorerHandler; 