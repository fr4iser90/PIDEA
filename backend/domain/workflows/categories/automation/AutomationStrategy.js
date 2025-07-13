/**
 * AutomationStrategy - Automation strategy interface
 * Defines different automation strategies for task execution
 */
class AutomationStrategy {
  constructor(name, description = '') {
    this._name = name;
    this._description = description;
  }

  /**
   * Get strategy name
   * @returns {string} Strategy name
   */
  get name() {
    return this._name;
  }

  /**
   * Get strategy description
   * @returns {string} Strategy description
   */
  get description() {
    return this._description;
  }

  /**
   * Execute strategy
   * @param {Object} task - Task to execute
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async execute(task, context) {
    throw new Error('execute method must be implemented by subclass');
  }

  /**
   * Check if strategy can handle task
   * @param {Object} task - Task to check
   * @param {Object} context - Execution context
   * @returns {Promise<boolean>} True if can handle
   */
  async canHandle(task, context) {
    throw new Error('canHandle method must be implemented by subclass');
  }

  /**
   * Get strategy metadata
   * @returns {Object} Strategy metadata
   */
  getMetadata() {
    return {
      name: this._name,
      description: this._description,
      type: this.constructor.name
    };
  }
}

module.exports = AutomationStrategy; 