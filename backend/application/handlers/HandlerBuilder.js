/**
 * HandlerBuilder - Application Layer: Handler builder
 * Builds handlers with validation and configuration
 */
const HandlerRegistry = require('./HandlerRegistry');

class HandlerBuilder {
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Build handler from category
   * @param {string} category - Handler category
   * @param {string} name - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Handler instance
   */
  static buildFromCategory(category, name, dependencies = {}) {
    return HandlerRegistry.buildFromCategory(category, name, dependencies);
  }

  /**
   * Validate handler dependencies
   * @param {string} handlerName - Handler name
   * @param {Object} dependencies - Handler dependencies
   * @returns {Object} Validation result
   */
  static validateDependencies(handlerName, dependencies) {
    const HandlerClass = HandlerRegistry.buildFromCategory('management', handlerName, dependencies);
    
    if (!HandlerClass) {
      return { isValid: false, errors: [`Handler not found: ${handlerName}`] };
    }

    try {
      const handler = new HandlerClass(dependencies);
      
      if (typeof handler.validateDependencies === 'function') {
        handler.validateDependencies(dependencies);
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: [error.message] };
    }
  }
}

module.exports = HandlerBuilder;
