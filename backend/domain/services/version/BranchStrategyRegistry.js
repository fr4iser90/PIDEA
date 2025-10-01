/**
 * BranchStrategyRegistry - Registry for managing branch strategies
 * Provides centralized strategy management and selection
 */

const Logger = require('@logging/Logger');
const logger = new Logger('BranchStrategyRegistry');

class BranchStrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = 'unified';
    this.logger = logger;
    
    // Strategy mappings for automatic selection
    this.strategyMappings = {
      taskTypeMappings: {
        'feature': 'unified',
        'bug': 'unified',
        'hotfix': 'unified',
        'refactor': 'unified',
        'optimization': 'unified',
        'analysis': 'unified',
        'documentation': 'unified',
        'test': 'unified',
        'chore': 'unified'
      },
      priorityMappings: {
        'critical': 'unified',
        'high': 'unified',
        'medium': 'unified',
        'low': 'unified',
        'urgent': 'unified',
        'emergency': 'unified'
      },
      categoryMappings: {
        'automation': 'unified',
        'frontend': 'unified',
        'backend': 'unified',
        'database': 'unified',
        'security': 'unified',
        'performance': 'unified',
        'testing': 'unified',
        'documentation': 'unified',
        'ai': 'unified',
        'ide': 'unified'
      }
    };
  }

  /**
   * Register a branch strategy
   * @param {string} name - Strategy name
   * @param {BaseBranchStrategy} strategy - Strategy instance
   */
  registerStrategy(name, strategy) {
    if (!name || typeof name !== 'string') {
      throw new Error('Strategy name must be a non-empty string');
    }
    
    if (!strategy || typeof strategy.generateBranchName !== 'function') {
      throw new Error('Strategy must be an instance of BaseBranchStrategy');
    }
    
    this.strategies.set(name, strategy);
    this.logger.debug(`Registered branch strategy: ${name}`, {
      strategyType: strategy.getStrategyType ? strategy.getStrategyType() : strategy.strategyType || strategy.type || 'unknown',
      priority: strategy.getPriority ? strategy.getPriority() : 1
    });
  }

  /**
   * Unregister a branch strategy
   * @param {string} name - Strategy name
   */
  unregisterStrategy(name) {
    if (this.strategies.has(name)) {
      this.strategies.delete(name);
      this.logger.info(`Unregistered branch strategy: ${name}`);
    }
  }

  /**
   * Get a registered strategy
   * @param {string} name - Strategy name
   * @returns {BaseBranchStrategy|null} Strategy instance or null
   */
  getStrategy(name) {
    return this.strategies.get(name) || null;
  }

  /**
   * Get strategy type for compatibility
   * @param {string} name - Strategy name
   * @returns {string} Strategy type
   */
  getStrategyType(name) {
    const strategy = this.strategies.get(name);
    return strategy ? strategy.constructor.name : 'UnknownStrategy';
  }

  /**
   * Get all registered strategies
   * @returns {Map} Map of all strategies
   */
  getAllStrategies() {
    return new Map(this.strategies);
  }

  /**
   * Get strategy names
   * @returns {string[]} Array of strategy names
   */
  getStrategyNames() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if strategy is registered
   * @param {string} name - Strategy name
   * @returns {boolean} True if registered
   */
  hasStrategy(name) {
    return this.strategies.has(name);
  }

  /**
   * Determine strategy for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Strategy name
   */
  determineStrategy(task, context = {}) {
    try {
      // Check explicit strategy in context
      const explicitStrategy = context.get('branchStrategy');
      if (explicitStrategy && this.strategies.has(explicitStrategy)) {
        this.logger.info(`Using explicit strategy: ${explicitStrategy}`);
        return explicitStrategy;
      }

      // Check task type mapping
      const taskType = task.type?.value || task.type;
      if (taskType && this.strategyMappings.taskTypeMappings[taskType]) {
        const strategy = this.strategyMappings.taskTypeMappings[taskType];
        this.logger.info(`Using task type strategy: ${strategy} (task type: ${taskType})`);
        return strategy;
      }

      // Check priority mapping
      const priority = task.priority?.value || task.priority;
      if (priority && this.strategyMappings.priorityMappings[priority]) {
        const strategy = this.strategyMappings.priorityMappings[priority];
        this.logger.info(`Using priority strategy: ${strategy} (priority: ${priority})`);
        return strategy;
      }

      // Check category mapping
      const category = task.category;
      if (category && this.strategyMappings.categoryMappings[category]) {
        const strategy = this.strategyMappings.categoryMappings[category];
        this.logger.info(`Using category strategy: ${strategy} (category: ${category})`);
        return strategy;
      }

      // Check keyword analysis
      const keywordStrategy = this.analyzeKeywords(task);
      if (keywordStrategy) {
        this.logger.info(`Using keyword strategy: ${keywordStrategy}`);
        return keywordStrategy;
      }

      // Use default strategy
      this.logger.info(`Using default strategy: ${this.defaultStrategy}`);
      return this.defaultStrategy;

    } catch (error) {
      this.logger.error(`Error determining strategy: ${error.message}`);
      return this.defaultStrategy;
    }
  }

  /**
   * Analyze keywords in task to determine strategy
   * @param {Object} task - Task object
   * @returns {string|null} Strategy name or null
   */
  analyzeKeywords(task) {
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    
    // Keyword patterns for different strategies
    const keywordPatterns = {
      'unified': [
        'feature', 'bug', 'fix', 'hotfix', 'refactor', 'optimize',
        'enhance', 'improve', 'update', 'modify', 'change',
        'add', 'remove', 'delete', 'create', 'implement'
      ]
    };
    
    for (const [strategy, keywords] of Object.entries(keywordPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return strategy;
      }
    }
    
    return null;
  }

  /**
   * Get strategy for task with validation
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {BaseBranchStrategy} Strategy instance
   */
  getStrategyForTask(task, context = {}) {
    const strategyName = this.determineStrategy(task, context);
    const strategy = this.getStrategy(strategyName);
    
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }
    
    // Validate task compatibility
    const taskType = task.type?.value || task.type;
    if (taskType && !strategy.isCompatibleWithTaskType(taskType)) {
      this.logger.warn(`Strategy '${strategyName}' may not be compatible with task type '${taskType}'`);
    }
    
    return strategy;
  }

  /**
   * Generate branch name using appropriate strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    const strategy = this.getStrategyForTask(task, context);
    return strategy.generateBranchName(task, context);
  }

  /**
   * Validate branch name using appropriate strategy
   * @param {string} branchName - Branch name to validate
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Validation result
   */
  validateBranchName(branchName, task, context = {}) {
    const strategy = this.getStrategyForTask(task, context);
    return strategy.validateBranchName(branchName);
  }

  /**
   * Get branch configuration using appropriate strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Branch configuration
   */
  getBranchConfiguration(task, context = {}) {
    const strategy = this.getStrategyForTask(task, context);
    return strategy.getConfiguration(task, context);
  }

  /**
   * Get branch protection rules using appropriate strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Protection rules
   */
  getBranchProtectionRules(task, context = {}) {
    const strategy = this.getStrategyForTask(task, context);
    return strategy.getProtectionRules(task, context);
  }

  /**
   * Get merge strategy using appropriate strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Merge strategy configuration
   */
  getMergeStrategy(task, context = {}) {
    const strategy = this.getStrategyForTask(task, context);
    return strategy.getMergeStrategy(task, context);
  }

  /**
   * Get branch description template using appropriate strategy
   * @param {Object} task - Task object
   * @returns {string} Branch description
   */
  getBranchDescription(task) {
    const strategy = this.getStrategyForTask(task);
    return strategy.getBranchDescription(task);
  }

  /**
   * Get commit message template using appropriate strategy
   * @param {Object} task - Task object
   * @param {string} action - Commit action
   * @returns {string} Commit message
   */
  getCommitMessageTemplate(task, action = 'feat') {
    const strategy = this.getStrategyForTask(task);
    return strategy.getCommitMessageTemplate(task, action);
  }

  /**
   * Get pull request template using appropriate strategy
   * @param {Object} task - Task object
   * @param {string} branchName - Branch name
   * @returns {Object} Pull request template
   */
  getPullRequestTemplate(task, branchName) {
    const strategy = this.getStrategyForTask(task);
    return strategy.getPullRequestTemplate(task, branchName);
  }

  /**
   * Set default strategy
   * @param {string} name - Strategy name
   */
  setDefaultStrategy(name) {
    if (!this.strategies.has(name)) {
      throw new Error(`Strategy '${name}' is not registered`);
    }
    
    this.defaultStrategy = name;
    this.logger.info(`Set default strategy to: ${name}`);
  }

  /**
   * Get default strategy
   * @returns {string} Default strategy name
   */
  getDefaultStrategy() {
    return this.defaultStrategy;
  }

  /**
   * Update strategy mappings
   * @param {Object} mappings - New mappings
   */
  updateStrategyMappings(mappings) {
    this.strategyMappings = { ...this.strategyMappings, ...mappings };
    this.logger.info('Updated strategy mappings', { mappings });
  }

  /**
   * Get strategy mappings
   * @returns {Object} Current mappings
   */
  getStrategyMappings() {
    return { ...this.strategyMappings };
  }

  /**
   * Clear all strategies
   */
  clear() {
    this.strategies.clear();
    this.logger.info('Cleared all branch strategies');
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStatistics() {
    const strategies = Array.from(this.strategies.values());
    const priorities = strategies.map(s => s.getPriority());
    
    return {
      totalStrategies: this.strategies.size,
      strategyNames: this.getStrategyNames(),
      defaultStrategy: this.defaultStrategy,
      averagePriority: priorities.reduce((a, b) => a + b, 0) / priorities.length,
      maxPriority: Math.max(...priorities),
      minPriority: Math.min(...priorities)
    };
  }
}

module.exports = BranchStrategyRegistry;
