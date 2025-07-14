/**
 * ExecuteIDEActionHandler - Application Layer: IDE Handlers
 * Handler for executing specific IDE actions
 */

const ExecuteIDEActionCommand = require('@categories/ide/ExecuteIDEActionCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ExecuteIDEActionHandler {
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
      throw new Error(`ExecuteIDEActionHandler missing required dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `ExecuteIDEActionHandler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command for this handler
   * @param {ExecuteIDEActionCommand} command - Command to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    try {
      if (!command || command.type !== 'ExecuteIDEActionCommand') {
        return {
          isValid: false,
          errors: ['Invalid command type for ExecuteIDEActionHandler']
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
   * Handle ExecuteIDEActionCommand
   * @param {ExecuteIDEActionCommand} command - IDE action command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
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
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters
      });

      // Publish event
      await this.eventBus.publish('ide.action.executing', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters,
        timestamp: new Date()
      });

      // Get active IDE type if not specified
      const ideType = command.ideType || await this.ideManager.getActiveIDEType();

      // Use BrowserManager to execute IDE action
      const browserResult = await this.browserManager.executeIDEAction({
        ideType: ideType,
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters,
        ...command.options
      });

      // Use IDEAutomationService for additional IDE-specific operations
      const automationResult = await this.ideAutomationService.executeIDEAction({
        ideType: ideType,
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters,
        ...command.options
      });

      const result = {
        success: true,
        commandId: command.commandId,
        ideType: ideType,
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters,
        browserResult: browserResult,
        automationResult: automationResult,
        message: `Successfully executed IDE action: ${command.action}`,
        metadata: {
          handlerId: this.handlerId,
          executionTime: new Date(),
          options: options
        }
      };

      // Publish success event
      await this.eventBus.publish('ide.action.executed', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: ideType,
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters,
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
      await this.eventBus.publish('ide.action.execution.failed', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        action: command.action,
        actionType: command.actionType,
        parameters: command.parameters,
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
      type: 'ExecuteIDEActionHandler',
      dependencies: ['ideAutomationService', 'browserManager', 'ideManager', 'eventBus'],
      supportedCommands: ['ExecuteIDEActionCommand']
    };
  }
}

module.exports = ExecuteIDEActionHandler; 