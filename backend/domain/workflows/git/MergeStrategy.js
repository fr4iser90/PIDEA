/**
 * MergeStrategy - Manager for merge strategies
 * Manages different merge methods and automation levels for git workflow operations
 */
const GitWorkflowException = require('./exceptions/GitWorkflowException');

class MergeStrategy {
  constructor(config = {}) {
    this.logger = config.logger || console;
    
    // Merge methods
    this.mergeMethods = {
      squash: {
        name: 'squash',
        description: 'Squash all commits into a single commit',
        command: 'squash',
        preserveHistory: false,
        cleanHistory: true,
        requiresForce: false
      },
      merge: {
        name: 'merge',
        description: 'Create a merge commit',
        command: 'merge',
        preserveHistory: true,
        cleanHistory: false,
        requiresForce: false
      },
      rebase: {
        name: 'rebase',
        description: 'Rebase commits on top of target branch',
        command: 'rebase',
        preserveHistory: true,
        cleanHistory: true,
        requiresForce: true
      },
      fastForward: {
        name: 'fast-forward',
        description: 'Fast-forward merge if possible',
        command: 'fast-forward',
        preserveHistory: true,
        cleanHistory: true,
        requiresForce: false
      }
    };
    
    // Automation levels
    this.automationLevels = {
      manual: {
        name: 'manual',
        description: 'Manual merge only',
        autoMerge: false,
        requireApproval: true,
        requireReview: true,
        allowOverride: false
      },
      semiAuto: {
        name: 'semi-auto',
        description: 'Semi-automated merge with approval',
        autoMerge: true,
        requireApproval: true,
        requireReview: true,
        allowOverride: false
      },
      auto: {
        name: 'auto',
        description: 'Fully automated merge',
        autoMerge: true,
        requireApproval: false,
        requireReview: false,
        allowOverride: true
      }
    };
    
    // Default configuration
    this.defaultConfig = {
      method: config.defaultMethod || 'squash',
      automationLevel: config.defaultAutomationLevel || 'semi-auto',
      deleteSourceBranch: config.deleteSourceBranch !== false,
      requireStatusChecks: config.requireStatusChecks !== false,
      requireReviews: config.requireReviews !== false,
      ...config
    };
    
    // Strategy mappings
    this.strategyMappings = {
      // Task type to merge method mappings
      taskTypeMappings: {
        'feature': 'squash',
        'enhancement': 'squash',
        'improvement': 'squash',
        'bug': 'merge',
        'hotfix': 'merge',
        'fix': 'merge',
        'release': 'merge',
        'refactor': 'squash',
        'analysis': 'fast-forward',
        'testing': 'squash',
        'documentation': 'squash'
      },
      
      // Priority to automation level mappings
      priorityMappings: {
        'critical': 'manual',
        'high': 'semi-auto',
        'medium': 'semi-auto',
        'low': 'auto',
        'urgent': 'manual',
        'emergency': 'manual'
      },
      
      // Branch type to merge method mappings
      branchTypeMappings: {
        'feature': 'squash',
        'hotfix': 'merge',
        'release': 'merge',
        'bugfix': 'merge',
        'refactor': 'squash',
        'analysis': 'fast-forward'
      }
    };
  }

  /**
   * Get merge method by name
   * @param {string} methodName - Merge method name
   * @returns {Object} Merge method configuration
   */
  getMergeMethod(methodName) {
    const method = this.mergeMethods[methodName];
    
    if (!method) {
      throw GitWorkflowException.createConfigurationError(
        `Unknown merge method: ${methodName}`,
        { availableMethods: Object.keys(this.mergeMethods) }
      );
    }
    
    return { ...method };
  }

  /**
   * Get automation level by name
   * @param {string} levelName - Automation level name
   * @returns {Object} Automation level configuration
   */
  getAutomationLevel(levelName) {
    const level = this.automationLevels[levelName];
    
    if (!level) {
      throw GitWorkflowException.createConfigurationError(
        `Unknown automation level: ${levelName}`,
        { availableLevels: Object.keys(this.automationLevels) }
      );
    }
    
    return { ...level };
  }

  /**
   * Determine merge method for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Merge method name
   */
  determineMergeMethod(task, context = {}) {
    try {
      // Check explicit method in context
      const explicitMethod = context.get('mergeMethod');
      if (explicitMethod && this.mergeMethods[explicitMethod]) {
        this.logger.info(`[MergeStrategy] Using explicit merge method: ${explicitMethod}`);
        return explicitMethod;
      }

      // Check task type mapping
      const taskType = task.type?.value || task.type;
      if (taskType && this.strategyMappings.taskTypeMappings[taskType]) {
        const method = this.strategyMappings.taskTypeMappings[taskType];
        this.logger.info(`[MergeStrategy] Using task type merge method: ${method} (task type: ${taskType})`);
        return method;
      }

      // Check branch type mapping
      const branchType = context.get('branchType');
      if (branchType && this.strategyMappings.branchTypeMappings[branchType]) {
        const method = this.strategyMappings.branchTypeMappings[branchType];
        this.logger.info(`[MergeStrategy] Using branch type merge method: ${method} (branch type: ${branchType})`);
        return method;
      }

      // Use default method
      this.logger.info(`[MergeStrategy] Using default merge method: ${this.defaultConfig.method}`);
      return this.defaultConfig.method;

    } catch (error) {
      this.logger.error(`[MergeStrategy] Error determining merge method: ${error.message}`);
      return this.defaultConfig.method;
    }
  }

  /**
   * Determine automation level for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Automation level name
   */
  determineAutomationLevel(task, context = {}) {
    try {
      // Check explicit level in context
      const explicitLevel = context.get('automationLevel');
      if (explicitLevel && this.automationLevels[explicitLevel]) {
        this.logger.info(`[MergeStrategy] Using explicit automation level: ${explicitLevel}`);
        return explicitLevel;
      }

      // Check priority mapping
      const priority = task.priority?.value || task.priority;
      if (priority && this.strategyMappings.priorityMappings[priority]) {
        const level = this.strategyMappings.priorityMappings[priority];
        this.logger.info(`[MergeStrategy] Using priority automation level: ${level} (priority: ${priority})`);
        return level;
      }

      // Use default level
      this.logger.info(`[MergeStrategy] Using default automation level: ${this.defaultConfig.automationLevel}`);
      return this.defaultConfig.automationLevel;

    } catch (error) {
      this.logger.error(`[MergeStrategy] Error determining automation level: ${error.message}`);
      return this.defaultConfig.automationLevel;
    }
  }

  /**
   * Get merge configuration for task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Merge configuration
   */
  getMergeConfiguration(task, context = {}) {
    try {
      const mergeMethod = this.determineMergeMethod(task, context);
      const automationLevel = this.determineAutomationLevel(task, context);
      
      const methodConfig = this.getMergeMethod(mergeMethod);
      const levelConfig = this.getAutomationLevel(automationLevel);
      
      const config = {
        method: mergeMethod,
        methodConfig: methodConfig,
        automationLevel: automationLevel,
        levelConfig: levelConfig,
        deleteSourceBranch: this.defaultConfig.deleteSourceBranch,
        requireStatusChecks: this.defaultConfig.requireStatusChecks,
        requireReviews: this.defaultConfig.requireReviews,
        ...context.get('mergeConfig') || {}
      };
      
      this.logger.info(`[MergeStrategy] Merge configuration:`, {
        method: config.method,
        automationLevel: config.automationLevel,
        deleteSourceBranch: config.deleteSourceBranch
      });
      
      return config;
      
    } catch (error) {
      this.logger.error(`[MergeStrategy] Error getting merge configuration: ${error.message}`);
      
      // Return default configuration
      return {
        method: this.defaultConfig.method,
        methodConfig: this.getMergeMethod(this.defaultConfig.method),
        automationLevel: this.defaultConfig.automationLevel,
        levelConfig: this.getAutomationLevel(this.defaultConfig.automationLevel),
        deleteSourceBranch: this.defaultConfig.deleteSourceBranch,
        requireStatusChecks: this.defaultConfig.requireStatusChecks,
        requireReviews: this.defaultConfig.requireReviews,
        error: error.message
      };
    }
  }

  /**
   * Validate merge configuration
   * @param {Object} config - Merge configuration
   * @returns {Object} Validation result
   */
  validateMergeConfiguration(config) {
    const errors = [];
    const warnings = [];
    
    // Validate merge method
    if (!config.method || !this.mergeMethods[config.method]) {
      errors.push(`Invalid merge method: ${config.method}`);
    }
    
    // Validate automation level
    if (!config.automationLevel || !this.automationLevels[config.automationLevel]) {
      errors.push(`Invalid automation level: ${config.automationLevel}`);
    }
    
    // Check for potential conflicts
    if (config.method === 'rebase' && config.automationLevel === 'auto') {
      warnings.push('Rebase with auto automation may cause conflicts');
    }
    
    if (config.method === 'fast-forward' && config.automationLevel === 'manual') {
      warnings.push('Fast-forward with manual automation may not work as expected');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Generate merge command
   * @param {Object} config - Merge configuration
   * @param {string} sourceBranch - Source branch
   * @param {string} targetBranch - Target branch
   * @returns {Object} Merge command
   */
  generateMergeCommand(config, sourceBranch, targetBranch) {
    const methodConfig = this.getMergeMethod(config.method);
    
    const command = {
      type: 'merge',
      method: config.method,
      sourceBranch: sourceBranch,
      targetBranch: targetBranch,
      command: methodConfig.command,
      options: {
        deleteSourceBranch: config.deleteSourceBranch,
        requireStatusChecks: config.requireStatusChecks,
        requireReviews: config.requireReviews,
        force: methodConfig.requiresForce
      }
    };
    
    // Add method-specific options
    if (config.method === 'squash') {
      command.options.squash = true;
      command.options.commitMessage = this.generateCommitMessage(config);
    }
    
    if (config.method === 'merge') {
      command.options.noFF = true;
      command.options.commitMessage = this.generateCommitMessage(config);
    }
    
    if (config.method === 'rebase') {
      command.options.rebase = true;
      command.options.onto = targetBranch;
    }
    
    return command;
  }

  /**
   * Generate commit message for merge
   * @param {Object} config - Merge configuration
   * @returns {string} Commit message
   */
  generateCommitMessage(config) {
    const methodConfig = config.methodConfig;
    const levelConfig = config.levelConfig;
    
    let message = `${methodConfig.name}: Merge ${config.sourceBranch} into ${config.targetBranch}`;
    
    if (levelConfig.name !== 'auto') {
      message += ` (${levelConfig.name})`;
    }
    
    return message;
  }

  /**
   * Check if merge can be automated
   * @param {Object} config - Merge configuration
   * @param {Object} context - Workflow context
   * @returns {boolean} True if can be automated
   */
  canAutomateMerge(config, context = {}) {
    const levelConfig = config.levelConfig;
    
    if (!levelConfig.autoMerge) {
      return false;
    }
    
    // Check for blocking conditions
    if (context.get('hasConflicts')) {
      return false;
    }
    
    if (context.get('hasFailingTests')) {
      return false;
    }
    
    if (context.get('requiresManualReview')) {
      return false;
    }
    
    return true;
  }

  /**
   * Get merge requirements
   * @param {Object} config - Merge configuration
   * @returns {Object} Merge requirements
   */
  getMergeRequirements(config) {
    const levelConfig = config.levelConfig;
    
    return {
      requireApproval: levelConfig.requireApproval,
      requireReview: levelConfig.requireReview,
      requireStatusChecks: config.requireStatusChecks,
      requireReviews: config.requireReviews,
      allowOverride: levelConfig.allowOverride,
      canAutomate: levelConfig.autoMerge
    };
  }

  /**
   * Add custom merge method
   * @param {string} name - Method name
   * @param {Object} method - Method configuration
   */
  addMergeMethod(name, method) {
    if (this.mergeMethods[name]) {
      this.logger.warn(`[MergeStrategy] Overwriting existing merge method: ${name}`);
    }
    
    this.mergeMethods[name] = {
      name: name,
      description: method.description || 'Custom merge method',
      command: method.command || 'custom',
      preserveHistory: method.preserveHistory !== false,
      cleanHistory: method.cleanHistory !== false,
      requiresForce: method.requiresForce || false,
      ...method
    };
    
    this.logger.info(`[MergeStrategy] Added custom merge method: ${name}`);
  }

  /**
   * Add custom automation level
   * @param {string} name - Level name
   * @param {Object} level - Level configuration
   */
  addAutomationLevel(name, level) {
    if (this.automationLevels[name]) {
      this.logger.warn(`[MergeStrategy] Overwriting existing automation level: ${name}`);
    }
    
    this.automationLevels[name] = {
      name: name,
      description: level.description || 'Custom automation level',
      autoMerge: level.autoMerge || false,
      requireApproval: level.requireApproval !== false,
      requireReview: level.requireReview !== false,
      allowOverride: level.allowOverride || false,
      ...level
    };
    
    this.logger.info(`[MergeStrategy] Added custom automation level: ${name}`);
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
    
    if (mappings.branchTypeMappings) {
      this.strategyMappings.branchTypeMappings = {
        ...this.strategyMappings.branchTypeMappings,
        ...mappings.branchTypeMappings
      };
    }
    
    this.logger.info(`[MergeStrategy] Updated strategy mappings`);
  }

  /**
   * Get available merge methods
   * @returns {Array} Array of merge method names
   */
  getAvailableMergeMethods() {
    return Object.keys(this.mergeMethods);
  }

  /**
   * Get available automation levels
   * @returns {Array} Array of automation level names
   */
  getAvailableAutomationLevels() {
    return Object.keys(this.automationLevels);
  }

  /**
   * Get configuration summary
   * @returns {Object} Configuration summary
   */
  getConfigurationSummary() {
    return {
      defaultConfig: this.defaultConfig,
      availableMethods: this.getAvailableMergeMethods(),
      availableLevels: this.getAvailableAutomationLevels(),
      strategyMappings: this.strategyMappings,
      mergeMethods: this.mergeMethods,
      automationLevels: this.automationLevels
    };
  }
}

module.exports = MergeStrategy; 