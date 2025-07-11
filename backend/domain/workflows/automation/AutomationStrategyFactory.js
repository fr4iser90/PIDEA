/**
 * AutomationStrategyFactory - Strategy factory
 * Creates automation strategies based on task type and context
 */
const AutomationStrategy = require('./AutomationStrategy');

class AutomationStrategyFactory {
  constructor() {
    this._strategies = new Map();
    this._defaultStrategy = null;
  }

  /**
   * Register strategy
   * @param {string} name - Strategy name
   * @param {AutomationStrategy} strategy - Strategy instance
   */
  registerStrategy(name, strategy) {
    if (!(strategy instanceof AutomationStrategy)) {
      throw new Error('Strategy must extend AutomationStrategy');
    }
    this._strategies.set(name, strategy);
  }

  /**
   * Get strategy by name
   * @param {string} name - Strategy name
   * @returns {AutomationStrategy|null} Strategy instance
   */
  getStrategy(name) {
    return this._strategies.get(name) || null;
  }

  /**
   * Get all registered strategies
   * @returns {Array<AutomationStrategy>} Array of strategies
   */
  getAllStrategies() {
    return Array.from(this._strategies.values());
  }

  /**
   * Create strategy for task
   * @param {Object} task - Task object
   * @param {Object} context - Execution context
   * @returns {Promise<AutomationStrategy|null>} Appropriate strategy
   */
  async createStrategyForTask(task, context) {
    // Find strategy that can handle the task
    for (const strategy of this._strategies.values()) {
      if (await strategy.canHandle(task, context)) {
        return strategy;
      }
    }

    // Return default strategy if no specific strategy found
    return this._defaultStrategy;
  }

  /**
   * Set default strategy
   * @param {AutomationStrategy} strategy - Default strategy
   */
  setDefaultStrategy(strategy) {
    if (!(strategy instanceof AutomationStrategy)) {
      throw new Error('Default strategy must extend AutomationStrategy');
    }
    this._defaultStrategy = strategy;
  }

  /**
   * Get default strategy
   * @returns {AutomationStrategy|null} Default strategy
   */
  getDefaultStrategy() {
    return this._defaultStrategy;
  }

  /**
   * Remove strategy
   * @param {string} name - Strategy name
   */
  removeStrategy(name) {
    this._strategies.delete(name);
  }

  /**
   * Clear all strategies
   */
  clearStrategies() {
    this._strategies.clear();
    this._defaultStrategy = null;
  }

  /**
   * Get strategy names
   * @returns {Array<string>} Array of strategy names
   */
  getStrategyNames() {
    return Array.from(this._strategies.keys());
  }

  /**
   * Check if strategy exists
   * @param {string} name - Strategy name
   * @returns {boolean} True if strategy exists
   */
  hasStrategy(name) {
    return this._strategies.has(name);
  }

  /**
   * Get factory statistics
   * @returns {Object} Factory statistics
   */
  getStatistics() {
    return {
      totalStrategies: this._strategies.size,
      strategyNames: this.getStrategyNames(),
      hasDefaultStrategy: this._defaultStrategy !== null,
      defaultStrategyName: this._defaultStrategy ? this._defaultStrategy.name : null
    };
  }
}

module.exports = AutomationStrategyFactory; 