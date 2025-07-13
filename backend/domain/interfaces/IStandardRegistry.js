/**
 * IStandardRegistry - Standard Registry Interface
 * Defines consistent patterns for all registries in the system
 */

class IStandardRegistry {
  /**
   * Get component by category
   * @param {string} category - Component category
   * @returns {Array} Components in category
   */
  static getByCategory(category) {
    throw new Error('getByCategory() must be implemented');
  }

  /**
   * Build component from category
   * @param {string} category - Component category
   * @param {string} name - Component name
   * @param {Object} params - Component parameters
   * @returns {Object|null} Component instance
   */
  static buildFromCategory(category, name, params) {
    throw new Error('buildFromCategory() must be implemented');
  }

  /**
   * Register component
   * @param {string} name - Component name
   * @param {Object} config - Component configuration
   * @param {string} category - Component category
   * @param {Function} executor - Component executor (optional)
   * @returns {Promise<boolean>} Registration success
   */
  static async register(name, config, category, executor = null) {
    throw new Error('register() must be implemented');
  }

  /**
   * Execute component
   * @param {string} name - Component name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async execute(name, context = {}, options = {}) {
    throw new Error('execute() must be implemented');
  }

  /**
   * Get all categories
   * @returns {Array} All available categories
   */
  static getCategories() {
    throw new Error('getCategories() must be implemented');
  }

  /**
   * Get component by name
   * @param {string} name - Component name
   * @returns {Object} Component instance
   */
  static get(name) {
    throw new Error('get() must be implemented');
  }

  /**
   * Check if component exists
   * @param {string} name - Component name
   * @returns {boolean} True if exists
   */
  static has(name) {
    throw new Error('has() must be implemented');
  }

  /**
   * Remove component
   * @param {string} name - Component name
   * @returns {boolean} Removal success
   */
  static remove(name) {
    throw new Error('remove() must be implemented');
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  static getStats() {
    throw new Error('getStats() must be implemented');
  }

  /**
   * Validate component configuration
   * @param {Object} config - Component configuration
   * @returns {Object} Validation result
   */
  static validateConfig(config) {
    throw new Error('validateConfig() must be implemented');
  }

  /**
   * Get component metadata
   * @param {string} name - Component name
   * @returns {Object} Component metadata
   */
  static getMetadata(name) {
    throw new Error('getMetadata() must be implemented');
  }

  /**
   * Update component metadata
   * @param {string} name - Component name
   * @param {Object} metadata - New metadata
   * @returns {boolean} Update success
   */
  static updateMetadata(name, metadata) {
    throw new Error('updateMetadata() must be implemented');
  }

  /**
   * Get component execution history
   * @param {string} name - Component name
   * @returns {Array} Execution history
   */
  static getExecutionHistory(name) {
    throw new Error('getExecutionHistory() must be implemented');
  }

  /**
   * Clear registry
   * @returns {boolean} Clear success
   */
  static clear() {
    throw new Error('clear() must be implemented');
  }

  /**
   * Export registry data
   * @returns {Object} Registry data
   */
  static export() {
    throw new Error('export() must be implemented');
  }

  /**
   * Import registry data
   * @param {Object} data - Registry data
   * @returns {boolean} Import success
   */
  static import(data) {
    throw new Error('import() must be implemented');
  }
}

module.exports = IStandardRegistry; 