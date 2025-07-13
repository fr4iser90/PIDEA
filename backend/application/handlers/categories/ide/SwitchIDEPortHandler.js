/**
 * SwitchIDEPortHandler - Application Layer: IDE Handlers
 * Handler for switching between different IDE ports
 */

const SwitchIDEPortCommand = require('@categories/ide/SwitchIDEPortCommand');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class SwitchIDEPortHandler {
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
      throw new Error(`SwitchIDEPortHandler missing required dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `SwitchIDEPortHandler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate command for this handler
   * @param {SwitchIDEPortCommand} command - Command to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCommand(command) {
    try {
      if (!command || command.type !== 'SwitchIDEPortCommand') {
        return {
          isValid: false,
          errors: ['Invalid command type for SwitchIDEPortHandler']
        };
      }

      // Validate command parameters
      const validationResult = await command.validate();
      return validationResult;

    } catch (error) {
      this.logger.error('[SwitchIDEPortHandler] Command validation error:', error);
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Handle SwitchIDEPortCommand
   * @param {SwitchIDEPortCommand} command - Port switching command
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Switching result
   */
  async handle(command, options = {}) {
    try {
      // Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.logger.info('[SwitchIDEPortHandler] Handling command', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        userId: command.userId,
        port: command.port,
        ideType: command.ideType
      });

      // Publish event
      await this.eventBus.publish('ide.port.switching', {
        commandId: command.commandId,
        userId: command.userId,
        port: command.port,
        ideType: command.ideType,
        timestamp: new Date()
      });

      // Use BrowserManager to switch IDE port
      const browserResult = await this.browserManager.switchToPort(command.port, {
        ideType: command.ideType,
        ...command.options
      });

      // Update IDE manager with new active port
      await this.ideManager.setActivePort(command.port);

      // Use IDEAutomationService for additional IDE-specific operations
      const automationResult = await this.ideAutomationService.switchIDEPort(command.port, {
        ideType: command.ideType,
        ...command.options
      });

      const result = {
        success: true,
        commandId: command.commandId,
        port: command.port,
        ideType: command.ideType,
        browserResult: browserResult,
        automationResult: automationResult,
        message: `Successfully switched to IDE port ${command.port}`,
        metadata: {
          handlerId: this.handlerId,
          executionTime: new Date(),
          options: options
        }
      };

      // Publish success event
      await this.eventBus.publish('ide.port.switched', {
        commandId: command.commandId,
        userId: command.userId,
        port: command.port,
        ideType: command.ideType,
        result: result,
        timestamp: new Date()
      });

      this.logger.info('[SwitchIDEPortHandler] Command handled successfully', {
        handlerId: this.handlerId,
        commandId: command.commandId,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error('[SwitchIDEPortHandler] Command handling failed:', error);

      // Publish failure event
      await this.eventBus.publish('ide.port.switch.failed', {
        commandId: command.commandId,
        userId: command.userId,
        port: command.port,
        ideType: command.ideType,
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
      type: 'SwitchIDEPortHandler',
      dependencies: ['ideAutomationService', 'browserManager', 'ideManager', 'eventBus'],
      supportedCommands: ['SwitchIDEPortCommand']
    };
  }
}

module.exports = SwitchIDEPortHandler; 