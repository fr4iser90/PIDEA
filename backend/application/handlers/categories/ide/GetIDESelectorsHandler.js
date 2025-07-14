/**
 * GetIDESelectorsHandler - Application Layer: IDE Handlers
 * Handler for retrieving IDE selectors for automation
 */

const GetIDESelectorsCommand = require('@categories/ide/GetIDESelectorsCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GetIDESelectorsHandler {
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
      throw new Error(`GetIDESelectorsHandler missing required dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `GetIDESelectorsHandler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command for this handler
   * @param {GetIDESelectorsCommand} command - Command to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    try {
      if (!command || command.type !== 'GetIDESelectorsCommand') {
        return {
          isValid: false,
          errors: ['Invalid command type for GetIDESelectorsHandler']
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
   * Handle GetIDESelectorsCommand
   * @param {GetIDESelectorsCommand} command - Selector retrieval command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Retrieval result
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
        selectorType: command.selectorType
      });

      // Publish event
      await this.eventBus.publish('ide.selectors.retrieving', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        selectorType: command.selectorType,
        timestamp: new Date()
      });

      // Get active IDE type if not specified
      const ideType = command.ideType || await this.ideManager.getActiveIDEType();

      // Use BrowserManager to get selectors
      const browserResult = await this.browserManager.getIDESelectors({
        ideType: ideType,
        selectorType: command.selectorType,
        ...command.options
      });

      // Use IDEAutomationService for additional selector operations
      const automationResult = await this.ideAutomationService.getIDESelectors({
        ideType: ideType,
        selectorType: command.selectorType,
        ...command.options
      });

      // Get selectors from command
      const commandSelectors = command.getSelectors();

      const result = {
        success: true,
        commandId: command.commandId,
        ideType: ideType,
        selectorType: command.selectorType,
        selectors: commandSelectors,
        browserResult: browserResult,
        automationResult: automationResult,
        message: `Successfully retrieved selectors for ${command.selectorType || 'all'} components`,
        metadata: {
          handlerId: this.handlerId,
          executionTime: new Date(),
          options: options
        }
      };

      // Publish success event
      await this.eventBus.publish('ide.selectors.retrieved', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: ideType,
        selectorType: command.selectorType,
        selectors: commandSelectors,
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
      await this.eventBus.publish('ide.selectors.retrieval.failed', {
        commandId: command.commandId,
        userId: command.userId,
        ideType: command.ideType,
        selectorType: command.selectorType,
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
      type: 'GetIDESelectorsHandler',
      dependencies: ['ideAutomationService', 'browserManager', 'ideManager', 'eventBus'],
      supportedCommands: ['GetIDESelectorsCommand']
    };
  }
}

module.exports = GetIDESelectorsHandler; 