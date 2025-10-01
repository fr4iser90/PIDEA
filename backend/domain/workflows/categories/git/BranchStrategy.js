/**
 * BranchStrategy - Manager for branch strategies
 * Unifies and manages different branch strategies with configuration and validation
 */
const FeatureBranchStrategy = require('./strategies/FeatureBranchStrategy');
const HotfixBranchStrategy = require('./strategies/HotfixBranchStrategy');
const ReleaseBranchStrategy = require('./strategies/ReleaseBranchStrategy');
const UnifiedBranchStrategy = require('@domain/services/version/UnifiedBranchStrategy');
const BranchStrategyRegistry = require('@domain/services/version/BranchStrategyRegistry');
const GitWorkflowException = require('./exceptions/GitWorkflowException');
const Logger = require('@logging/Logger');
const logger = new Logger('GitBranchStrategy');

class BranchStrategy {
  constructor(config = {}) {
    this.strategies = new Map();
    this.defaultStrategy = config.defaultStrategy || 'unified';
    this.logger = config.logger || console;
    
    // Initialize unified strategy registry
    this.strategyRegistry = new BranchStrategyRegistry();
    
    // Initialize strategies
    this.initializeStrategies(config);
    
    // Strategy mappings
    this.strategyMappings = {
      // Task type to strategy mappings
      taskTypeMappings: {
        'feature': 'feature',
        'enhancement': 'feature',
        'improvement': 'feature',
        'new-feature': 'feature',
        'story': 'feature',
        'epic': 'feature',
        'task': 'feature',
        'development': 'feature',
        'bug': 'hotfix',
        'hotfix': 'hotfix',
        'fix': 'hotfix',
        'critical': 'hotfix',
        'urgent': 'hotfix',
        'security': 'hotfix',
        'production-fix': 'hotfix',
        'emergency': 'hotfix',
        'patch': 'hotfix',
        'release': 'release',
        'version': 'release',
        'deployment': 'release',
        'publish': 'release',
        'ship': 'release',
        'milestone': 'release',
        'sprint': 'release',
        'iteration': 'release',
        'delivery': 'release',
        'refactor': 'feature',
        'analysis': 'feature',
        'testing': 'feature',
        'documentation': 'feature'
      },
      
      // Priority to strategy mappings
      priorityMappings: {
        'critical': 'hotfix',
        'high': 'hotfix',
        'urgent': 'hotfix',
        'emergency': 'hotfix',
        'medium': 'feature',
        'low': 'feature',
        'normal': 'feature'
      },
      
      // Keywords to strategy mappings
      keywordMappings: {
        'release': 'release',
        'version': 'release',
        'deploy': 'release',
        'publish': 'release',
        'ship': 'release',
        'milestone': 'release',
        'hotfix': 'hotfix',
        'urgent': 'hotfix',
        'critical': 'hotfix',
        'emergency': 'hotfix',
        'bug': 'hotfix',
        'fix': 'hotfix',
        'patch': 'hotfix',
        'feature': 'feature',
        'enhancement': 'feature',
        'improvement': 'feature',
        'story': 'feature',
        'epic': 'feature'
      }
    };
  }

  /**
   * Initialize branch strategies
   * @param {Object} config - Configuration object
   */
  initializeStrategies(config) {
    if (this._alreadyLogged) return;
    
    // Initialize unified strategy (primary)
    const unifiedStrategy = new UnifiedBranchStrategy({
      ...config.unified,
      logger: this.logger
    });
    this.strategies.set('unified', unifiedStrategy);
    this.strategyRegistry.registerStrategy('unified', unifiedStrategy);
    
    // Create legacy strategies (for backward compatibility)
    this.strategies.set('feature', new FeatureBranchStrategy({
      ...config.feature,
      logger: this.logger
    }));

    this.strategies.set('hotfix', new HotfixBranchStrategy({
      ...config.hotfix,
      logger: this.logger
    }));

    this.strategies.set('release', new ReleaseBranchStrategy({
      ...config.release,
      logger: this.logger
    }));
    
    // Register legacy strategies in registry
    this.strategyRegistry.registerStrategy('feature', this.strategies.get('feature'));
    this.strategyRegistry.registerStrategy('hotfix', this.strategies.get('hotfix'));
    this.strategyRegistry.registerStrategy('release', this.strategies.get('release'));

    // Only log once per instance
    if (!this._alreadyLogged) {
      this.logger.debug('Initialized branch strategies:', {
        strategies: Array.from(this.strategies.keys()),
        defaultStrategy: this.defaultStrategy,
        unifiedEnabled: true
      });
      this._alreadyLogged = true;
    }
  }

  /**
   * Get strategy by name
   * @param {string} strategyName - Strategy name
   * @returns {Object} Branch strategy instance
   */
  getStrategy(strategyName) {
    const strategy = this.strategies.get(strategyName);
    
    if (!strategy) {
      throw GitWorkflowException.createConfigurationError(
        `Unknown branch strategy: ${strategyName}`,
        { availableStrategies: Array.from(this.strategies.keys()) }
      );
    }
    
    return strategy;
  }

  /**
   * Determine strategy for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Strategy name
   */
  determineStrategy(task, context = {}) {
    try {
      // Use unified strategy registry for determination
      const strategyName = this.strategyRegistry.determineStrategy(task, context);
      
      this.logger.info(`Determined strategy: ${strategyName}`, {
        taskId: task.id,
        taskType: task.type?.value || task.type,
        priority: task.priority?.value || task.priority
      });
      
      return strategyName;

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
    
    // Count keyword matches for each strategy
    const keywordCounts = {};
    
    for (const [keyword, strategy] of Object.entries(this.strategyMappings.keywordMappings)) {
      if (text.includes(keyword)) {
        keywordCounts[strategy] = (keywordCounts[strategy] || 0) + 1;
      }
    }
    
    // Return strategy with most keyword matches
    if (Object.keys(keywordCounts).length > 0) {
      const bestStrategy = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      return bestStrategy;
    }
    
    return null;
  }

  /**
   * Generate branch name using appropriate strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    try {
      const strategyName = this.determineStrategy(task, context);
      const strategy = this.getStrategy(strategyName);
      
      this.logger.info(`Generating branch name with strategy: ${strategyName}`);
      
      const branchName = strategy.generateBranchName(task, context);
      
      this.logger.info(`Generated branch name: ${branchName}`);
      
      return branchName;
      
    } catch (error) {
      throw GitWorkflowException.createBranchError(
        `Failed to generate branch name: ${error.message}`,
        { taskId: task.id, taskType: task.type?.value }
      );
    }
  }

  /**
   * Validate task for branch strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Validation result
   */
  validateTask(task, context = {}) {
    try {
      const strategyName = this.determineStrategy(task, context);
      const strategy = this.getStrategy(strategyName);
      
      this.logger.info(`Validating task with strategy: ${strategyName}`);
      
      const validation = strategy.validateTask(task, context);
      
      // Add strategy information to validation result
      validation.strategy = strategyName;
      validation.strategyType = strategy.strategyType || strategy.type || 'unknown';
      
      this.logger.info(`Validation result:`, validation);
      
      return validation;
      
    } catch (error) {
      this.logger.error(`Validation error: ${error.message}`);
      
      return {
        isValid: false,
        strategy: this.defaultStrategy,
        strategyType: 'unknown',
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Get branch configuration for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Branch configuration
   */
  getBranchConfiguration(task, context = {}) {
    try {
      const strategyName = this.determineStrategy(task, context);
      const strategy = this.getStrategy(strategyName);
      
      const config = strategy.getConfiguration();
      config.strategyName = strategyName;
      
      return config;
      
    } catch (error) {
      this.logger.error(`Error getting configuration: ${error.message}`);
      
      // Return default configuration
      const defaultStrategy = this.getStrategy(this.defaultStrategy);
      const config = defaultStrategy.getConfiguration();
      config.strategyName = this.defaultStrategy;
      config.error = error.message;
      
      return config;
    }
  }

  /**
   * Get protection rules for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Protection rules
   */
  getProtectionRules(task, context = {}) {
    try {
      const strategyName = this.determineStrategy(task, context);
      const strategy = this.getStrategy(strategyName);
      
      return strategy.getProtectionRules();
      
    } catch (error) {
      this.logger.error(`Error getting protection rules: ${error.message}`);
      
      // Return default protection rules
      const defaultStrategy = this.getStrategy(this.defaultStrategy);
      return defaultStrategy.getProtectionRules();
    }
  }

  /**
   * Get merge strategy for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Merge strategy
   */
  getMergeStrategy(task, context = {}) {
    try {
      const strategyName = this.determineStrategy(task, context);
      const strategy = this.getStrategy(strategyName);
      
      return strategy.getMergeStrategy();
      
    } catch (error) {
      this.logger.error(`Error getting merge strategy: ${error.message}`);
      
      // Return default merge strategy
      const defaultStrategy = this.getStrategy(this.defaultStrategy);
      return defaultStrategy.getMergeStrategy();
    }
  }

  /**
   * Add custom strategy
   * @param {string} name - Strategy name
   * @param {Object} strategy - Strategy instance
   */
  addStrategy(name, strategy) {
    if (this.strategies.has(name)) {
      this.logger.warn(`Overwriting existing strategy: ${name}`);
    }
    
    this.strategies.set(name, strategy);
    this.logger.info(`Added custom strategy: ${name}`);
  }

  /**
   * Remove strategy
   * @param {string} name - Strategy name
   */
  removeStrategy(name) {
    if (name === this.defaultStrategy) {
      throw new Error(`Cannot remove default strategy: ${name}`);
    }
    
    if (this.strategies.has(name)) {
      this.strategies.delete(name);
      this.logger.info(`Removed strategy: ${name}`);
    }
  }

  /**
   * Update strategy mappings
   * @param {Object} mappings - New mappings
   */
  updateMappings(mappings) {
    if (mappings.taskTypeMappings) {
      this.strategyMappings.taskTypeMappings = {
        ...this.strategyMappings.taskTypeMappings,
        ...mappings.taskTypeMappings
      };
    }
    
    if (mappings.priorityMappings) {
      this.strategyMappings.priorityMappings = {
        ...this.strategyMappings.priorityMappings,
        ...mappings.priorityMappings
      };
    }
    
    if (mappings.keywordMappings) {
      this.strategyMappings.keywordMappings = {
        ...this.strategyMappings.keywordMappings,
        ...mappings.keywordMappings
      };
    }
    
    this.logger.info(`Updated strategy mappings`);
  }

  /**
   * Get all available strategies
   * @returns {Array} Array of strategy names
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get strategy statistics
   * @returns {Object} Strategy statistics
   */
  getStatistics() {
    const stats = {
      totalStrategies: this.strategies.size,
      availableStrategies: this.getAvailableStrategies(),
      defaultStrategy: this.defaultStrategy,
      mappings: {
        taskTypes: Object.keys(this.strategyMappings.taskTypeMappings).length,
        priorities: Object.keys(this.strategyMappings.priorityMappings).length,
        keywords: Object.keys(this.strategyMappings.keywordMappings).length
      }
    };
    
    return stats;
  }

  /**
   * Validate configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const errors = [];
    const warnings = [];
    
    // Check if strategies exist
    if (this.strategies.size === 0) {
      errors.push('No branch strategies configured');
    }
    
    // Check if default strategy exists
    if (!this.strategies.has(this.defaultStrategy)) {
      errors.push(`Default strategy '${this.defaultStrategy}' not found`);
    }
    
    // Check strategy mappings
    for (const [taskType, strategy] of Object.entries(this.strategyMappings.taskTypeMappings)) {
      if (!this.strategies.has(strategy)) {
        warnings.push(`Task type mapping '${taskType}' points to non-existent strategy '${strategy}'`);
      }
    }
    
    for (const [priority, strategy] of Object.entries(this.strategyMappings.priorityMappings)) {
      if (!this.strategies.has(strategy)) {
        warnings.push(`Priority mapping '${priority}' points to non-existent strategy '${strategy}'`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Get configuration summary
   * @returns {Object} Configuration summary
   */
  getConfigurationSummary() {
    return {
      defaultStrategy: this.defaultStrategy,
      availableStrategies: this.getAvailableStrategies(),
      strategyMappings: this.strategyMappings,
      statistics: this.getStatistics(),
      validation: this.validateConfiguration()
    };
  }
}

module.exports = BranchStrategy; 