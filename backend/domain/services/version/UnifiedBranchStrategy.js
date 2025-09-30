/**
 * UnifiedBranchStrategy - Unified branch strategy implementation
 * Replaces fragmented branch strategies with a single, configurable system
 */

const BaseBranchStrategy = require('./BaseBranchStrategy');
const Logger = require('@logging/Logger');
const logger = new Logger('UnifiedBranchStrategy');

class UnifiedBranchStrategy extends BaseBranchStrategy {
  constructor(config = {}) {
    super({
      prefix: config.prefix || 'task',
      separator: config.separator || '/',
      maxLength: config.maxLength || 50,
      includeTaskId: config.includeTaskId !== false,
      includeTimestamp: config.includeTimestamp !== false,
      sanitizeTitle: config.sanitizeTitle !== false,
      protection: config.protection || 'medium',
      autoMerge: config.autoMerge || false,
      requiresReview: config.requiresReview !== false,
      mergeTarget: config.mergeTarget || 'pidea-agent',
      includePriority: config.includePriority || false,
      includeCategory: config.includeCategory || false,
      ...config
    });
    
    this.strategyType = 'UnifiedBranchStrategy';
  }

  /**
   * Generate unified branch name
   * @param {Object} task - Task object
   * @param {Object} context - Git workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    try {
      const taskId = task.id || context.get('taskId') || 'unknown';
      const title = task.title || task.description || 'task';
      const priority = task.priority?.value || task.priority || context.get('priority');
      const category = task.category || context.get('category');
      
      let branchName = this.config.prefix;
      
      // Add task ID if enabled
      if (this.config.includeTaskId) {
        branchName += this.config.separator + taskId;
      }
      
      // Add priority if enabled and available
      if (this.config.includePriority && priority) {
        branchName += this.config.separator + this.sanitizePriority(priority);
      }
      
      // Add category if enabled and available
      if (this.config.includeCategory && category) {
        branchName += this.config.separator + this.sanitizeCategory(category);
      }
      
      // Add sanitized title
      if (this.config.sanitizeTitle) {
        const sanitizedTitle = this.sanitizeTitle(title);
        branchName += this.config.separator + sanitizedTitle;
      }
      
      // Add timestamp if enabled
      if (this.config.includeTimestamp) {
        const timestamp = this.formatTimestamp(new Date());
        branchName += this.config.separator + timestamp;
      }
      
      // Truncate if too long
      if (branchName.length > this.config.maxLength) {
        branchName = this.truncateBranchName(branchName, this.config.maxLength);
      }
      
      this.logger.info('UnifiedBranchStrategy: Generated branch name', {
        taskId,
        originalTitle: title,
        priority,
        category,
        branchName,
        config: this.config
      });
      
      return branchName;
      
    } catch (error) {
      this.logger.error('UnifiedBranchStrategy: Failed to generate branch name', {
        taskId: task.id,
        error: error.message
      });
      
      // Fallback to simple naming
      return `${this.config.prefix}/${task.id || 'task'}`;
    }
  }

  /**
   * Sanitize priority for branch name
   * @param {string} priority - Priority string
   * @returns {string} Sanitized priority
   */
  sanitizePriority(priority) {
    if (!priority || typeof priority !== 'string') {
      return '';
    }
    
    const priorityMap = {
      'critical': 'crit',
      'high': 'high',
      'medium': 'med',
      'low': 'low',
      'urgent': 'urg',
      'emergency': 'emg',
      'p0': 'p0',
      'p1': 'p1',
      'p2': 'p2',
      'p3': 'p3'
    };
    
    const normalizedPriority = priority.toLowerCase().trim();
    return priorityMap[normalizedPriority] || normalizedPriority.substring(0, 3);
  }

  /**
   * Sanitize category for branch name
   * @param {string} category - Category string
   * @returns {string} Sanitized category
   */
  sanitizeCategory(category) {
    if (!category || typeof category !== 'string') {
      return '';
    }
    
    return category
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
  }

  /**
   * Determine strategy based on task properties
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Strategy configuration
   */
  determineStrategy(task, context = {}) {
    const taskType = task.type?.value || task.type;
    const priority = task.priority?.value || task.priority;
    const category = task.category;
    
    // Determine protection level based on priority
    let protection = 'medium';
    if (priority === 'critical' || priority === 'urgent' || priority === 'emergency') {
      protection = 'high';
    } else if (priority === 'low') {
      protection = 'low';
    }
    
    // Determine merge target based on task type
    let mergeTarget = 'pidea-agent';
    if (taskType === 'feature' || taskType === 'optimization' || taskType === 'refactor') {
      mergeTarget = 'pidea-ai-main';
    } else if (taskType === 'hotfix' || taskType === 'bug') {
      mergeTarget = 'main';
    }
    
    // Determine auto-merge based on task type
    let autoMerge = false;
    if (taskType === 'analysis' || taskType === 'documentation') {
      autoMerge = true;
    }
    
    return {
      protection,
      mergeTarget,
      autoMerge,
      requiresReview: !autoMerge
    };
  }

  /**
   * Get branch configuration with dynamic strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Branch configuration
   */
  getConfiguration(task = null, context = {}) {
    const baseConfig = super.getConfiguration();
    
    if (task) {
      const strategy = this.determineStrategy(task, context);
      return {
        ...baseConfig,
        ...strategy,
        type: 'unified'
      };
    }
    
    return baseConfig;
  }

  /**
   * Get branch protection rules with dynamic strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Protection rules
   */
  getProtectionRules(task = null, context = {}) {
    if (task) {
      const strategy = this.determineStrategy(task, context);
      const originalProtection = this.config.protection;
      this.config.protection = strategy.protection;
      const rules = super.getProtectionRules();
      this.config.protection = originalProtection;
      return rules;
    }
    
    return super.getProtectionRules();
  }

  /**
   * Get merge strategy with dynamic strategy
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {Object} Merge strategy configuration
   */
  getMergeStrategy(task = null, context = {}) {
    if (task) {
      const strategy = this.determineStrategy(task, context);
      return {
        method: strategy.protection === 'high' ? 'merge' : 'squash',
        deleteBranch: true,
        requireReview: strategy.requiresReview,
        autoMerge: strategy.autoMerge,
        mergeTarget: strategy.mergeTarget
      };
    }
    
    return super.getMergeStrategy();
  }

  /**
   * Get branch description template with task-specific information
   * @param {Object} task - Task object
   * @returns {string} Branch description
   */
  getBranchDescription(task) {
    const strategy = this.determineStrategy(task);
    const taskType = task.type?.value || task.type || 'task';
    const priority = task.priority?.value || task.priority || 'medium';
    
    return `Unified branch for: ${task.title || task.description || 'Unknown task'}

Task ID: ${task.id}
Created: ${new Date().toISOString()}
Type: ${taskType}
Priority: ${priority}
Category: ${task.category || 'general'}

Description:
${task.description || 'No description provided'}

Strategy Configuration:
- Protection Level: ${strategy.protection}
- Merge Target: ${strategy.mergeTarget}
- Auto Merge: ${strategy.autoMerge ? 'Yes' : 'No'}
- Requires Review: ${strategy.requiresReview ? 'Yes' : 'No'}

Acceptance Criteria:
- [ ] Task implementation completed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Ready for merge`;
  }

  /**
   * Get commit message template with task-specific information
   * @param {Object} task - Task object
   * @param {string} action - Commit action (feat, fix, etc.)
   * @returns {string} Commit message
   */
  getCommitMessageTemplate(task, action = 'feat') {
    const title = task.title || task.description || 'task';
    const sanitizedTitle = this.sanitizeTitle(title);
    const taskType = task.type?.value || task.type || 'task';
    const priority = task.priority?.value || task.priority || 'medium';
    
    return `${action}: ${sanitizedTitle}

Task ID: ${task.id}
Type: ${taskType}
Priority: ${priority}
Category: ${task.category || 'general'}

${task.description || 'No description provided'}

- [ ] Task implementation
- [ ] Tests added
- [ ] Documentation updated`;
  }

  /**
   * Get pull request template with task-specific information
   * @param {Object} task - Task object
   * @param {string} branchName - Branch name
   * @returns {Object} Pull request template
   */
  getPullRequestTemplate(task, branchName) {
    const strategy = this.determineStrategy(task);
    const taskType = task.type?.value || task.type || 'task';
    const priority = task.priority?.value || task.priority || 'medium';
    
    return {
      title: `${taskType}: ${task.title || task.description || 'New task'}`,
      description: `## ${taskType} Implementation

**Task ID:** ${task.id}
**Branch:** ${branchName}
**Type:** ${taskType}
**Priority:** ${priority}
**Category:** ${task.category || 'general'}

### Description
${task.description || 'No description provided'}

### Strategy Configuration
- **Protection Level:** ${strategy.protection}
- **Merge Target:** ${strategy.mergeTarget}
- **Auto Merge:** ${strategy.autoMerge ? 'Yes' : 'No'}
- **Requires Review:** ${strategy.requiresReview ? 'Yes' : 'No'}

### Changes Made
- [ ] Task implementation
- [ ] Tests added
- [ ] Documentation updated

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

### Checklist
- [ ] Code follows project standards
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No breaking changes introduced

### Related Issues
Closes #${task.id}`,
      labels: [taskType, priority, task.category || 'general'],
      assignees: [],
      reviewers: []
    };
  }

  /**
   * Validate task for unified strategy
   * @param {Object} task - Task to validate
   * @returns {Object} Validation result
   */
  validateTask(task) {
    const baseValidation = super.validateTask(task);
    const errors = [...baseValidation.errors];
    const warnings = [...baseValidation.warnings];
    
    // Check task type
    const taskType = task.type?.value || task.type;
    if (!taskType) {
      warnings.push('Task type not specified - using default strategy');
    }
    
    // Check priority
    const priority = task.priority?.value || task.priority;
    if (!priority) {
      warnings.push('Task priority not specified - using medium protection');
    }
    
    // Check category
    if (!task.category) {
      warnings.push('Task category not specified - using general category');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if strategy is compatible with task type
   * @param {string} taskType - Task type
   * @returns {boolean} True if compatible
   */
  isCompatibleWithTaskType(taskType) {
    // Unified strategy is compatible with all task types
    return true;
  }

  /**
   * Get strategy priority (for strategy selection)
   * @returns {number} Priority (higher = more preferred)
   */
  getPriority() {
    return 10; // High priority as it's the unified strategy
  }

  /**
   * Get strategy name
   * @returns {string} Strategy name
   */
  getStrategyName() {
    return 'unified';
  }
}

module.exports = UnifiedBranchStrategy;
