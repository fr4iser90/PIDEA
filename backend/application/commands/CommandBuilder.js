/**
 * CommandBuilder - Application Layer: Command builder
 * Builds commands with validation and configuration
 */
const CommandRegistry = require('./CommandRegistry');

class CommandBuilder {
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Build command from category
   * @param {string} category - Command category
   * @param {string} name - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Command instance
   */
  static buildFromCategory(category, name, params = {}) {
    return CommandRegistry.buildFromCategory(category, name, params);
  }

  /**
   * Validate command parameters
   * @param {string} commandName - Command name
   * @param {Object} params - Command parameters
   * @returns {Object} Validation result
   */
  static validateParams(commandName, params) {
    const CommandClass = CommandRegistry.buildFromCategory('management', commandName, params);
    
    if (!CommandClass) {
      return { isValid: false, errors: [`Command not found: ${commandName}`] };
    }

    try {
      const command = new CommandClass(params);
      
      if (typeof command.validateParams === 'function') {
        command.validateParams(params);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

module.exports = CommandBuilder;
