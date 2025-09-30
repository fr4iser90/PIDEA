/**
 * BaseBranchStrategy - Base class for all branch strategies
 * Provides common functionality and interface for branch strategy implementations
 */

const Logger = require('@logging/Logger');
const logger = new Logger('BaseBranchStrategy');

class BaseBranchStrategy {
  constructor(config = {}) {
    this.config = {
      prefix: config.prefix || 'task',
      separator: config.separator || '/',
      maxLength: config.maxLength || 50,
      includeTaskId: config.includeTaskId !== false,
      includeTimestamp: config.includeTimestamp || false,
      sanitizeTitle: config.sanitizeTitle !== false,
      protection: config.protection || 'medium',
      autoMerge: config.autoMerge || false,
      requiresReview: config.requiresReview !== false,
      mergeTarget: config.mergeTarget || 'main',
      ...config
    };
    
    this.logger = config.logger || logger;
    this.strategyType = this.constructor.name;
  }

  /**
   * Generate branch name - Must be implemented by subclasses
   * @param {Object} task - Task object
   * @param {Object} context - Git workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    throw new Error(`${this.strategyType}: generateBranchName method must be implemented`);
  }

  /**
   * Validate branch name
   * @param {string} branchName - Branch name to validate
   * @returns {Object} Validation result
   */
  validateBranchName(branchName) {
    const errors = [];
    const warnings = [];
    
    if (!branchName || typeof branchName !== 'string') {
      errors.push('Branch name must be a non-empty string');
      return { isValid: false, errors, warnings };
    }
    
    // Check length
    if (branchName.length > this.config.maxLength) {
      errors.push(`Branch name exceeds maximum length of ${this.config.maxLength} characters`);
    }
    
    // Check for invalid characters
    const invalidChars = /[^a-zA-Z0-9\-_\/]/;
    if (invalidChars.test(branchName)) {
      errors.push('Branch name contains invalid characters (only letters, numbers, hyphens, underscores, and slashes allowed)');
    }
    
    // Check for consecutive dots
    if (branchName.includes('..')) {
      errors.push('Branch name cannot contain consecutive dots');
    }
    
    // Check for leading/trailing dots
    if (branchName.startsWith('.') || branchName.endsWith('.')) {
      errors.push('Branch name cannot start or end with a dot');
    }
    
    // Check for reserved names
    const reservedNames = ['HEAD', 'ORIG_HEAD', 'FETCH_HEAD', 'MERGE_HEAD'];
    if (reservedNames.includes(branchName.toUpperCase())) {
      errors.push('Branch name is a reserved Git name');
    }
    
    // Check prefix
    if (!branchName.startsWith(this.config.prefix)) {
      warnings.push(`Branch name should start with '${this.config.prefix}' prefix`);
    }
    
    // Check for common patterns
    if (branchName.includes(' ')) {
      warnings.push('Branch name should not contain spaces (use hyphens instead)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize title for branch name
   * @param {string} title - Original title
   * @returns {string} Sanitized title
   */
  sanitizeTitle(title) {
    if (!title || typeof title !== 'string') {
      return 'task';
    }
    
    return title
      // Convert to lowercase
      .toLowerCase()
      // Replace spaces and special characters with hyphens
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length
      .substring(0, 30);
  }

  /**
   * Format timestamp according to specified format
   * @param {Date} date - Date to format
   * @param {string} format - Date format
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(date, format = 'YYYYMMDDHHmm') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute);
  }

  /**
   * Truncate branch name to fit length limit
   * @param {string} branchName - Original branch name
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated branch name
   */
  truncateBranchName(branchName, maxLength) {
    if (branchName.length <= maxLength) {
      return branchName;
    }
    
    // Try to preserve prefix and task ID
    const parts = branchName.split(this.config.separator);
    
    if (parts.length >= 2) {
      const prefix = parts[0];
      const taskId = parts[1];
      const remainingLength = maxLength - prefix.length - taskId.length - 2; // 2 for separators
      
      if (remainingLength > 0) {
        const title = parts.slice(2).join(this.config.separator);
        const truncatedTitle = title.substring(0, remainingLength);
        return `${prefix}${this.config.separator}${taskId}${this.config.separator}${truncatedTitle}`;
      } else {
        return `${prefix}${this.config.separator}${taskId}`;
      }
    }
    
    // Fallback: simple truncation
    return branchName.substring(0, maxLength);
  }

  /**
   * Get branch configuration
   * @returns {Object} Branch configuration
   */
  getConfiguration() {
    return {
      type: this.strategyType.toLowerCase().replace('branchstrategy', ''),
      prefix: this.config.prefix,
      separator: this.config.separator,
      maxLength: this.config.maxLength,
      includeTaskId: this.config.includeTaskId,
      includeTimestamp: this.config.includeTimestamp,
      sanitizeTitle: this.config.sanitizeTitle,
      protection: this.config.protection,
      autoMerge: this.config.autoMerge,
      requiresReview: this.config.requiresReview,
      mergeTarget: this.config.mergeTarget
    };
  }

  /**
   * Get branch protection rules
   * @returns {Object} Protection rules
   */
  getProtectionRules() {
    const baseRules = {
      enforceAdmins: false,
      allowForcePushes: false,
      allowDeletions: false
    };

    switch (this.config.protection) {
      case 'low':
        return {
          ...baseRules,
          requiredStatusChecks: [],
          requiredPullRequestReviews: {
            requiredApprovingReviewCount: 0,
            dismissStaleReviews: false,
            requireCodeOwnerReviews: false
          }
        };
      
      case 'high':
        return {
          ...baseRules,
          enforceAdmins: true,
          requiredStatusChecks: ['ci', 'test', 'security'],
          requiredPullRequestReviews: {
            requiredApprovingReviewCount: 2,
            dismissStaleReviews: true,
            requireCodeOwnerReviews: true
          }
        };
      
      case 'medium':
      default:
        return {
          ...baseRules,
          requiredStatusChecks: ['ci', 'test'],
          requiredPullRequestReviews: {
            requiredApprovingReviewCount: 1,
            dismissStaleReviews: true,
            requireCodeOwnerReviews: false
          }
        };
    }
  }

  /**
   * Get merge strategy
   * @returns {Object} Merge strategy configuration
   */
  getMergeStrategy() {
    return {
      method: this.config.protection === 'high' ? 'merge' : 'squash',
      deleteBranch: true,
      requireReview: this.config.requiresReview,
      autoMerge: this.config.autoMerge
    };
  }

  /**
   * Get branch description template
   * @param {Object} task - Task object
   * @returns {string} Branch description
   */
  getBranchDescription(task) {
    return `${this.strategyType} branch for: ${task.title || task.description || 'Unknown task'}

Task ID: ${task.id}
Created: ${new Date().toISOString()}
Type: ${this.strategyType}

Description:
${task.description || 'No description provided'}

Acceptance Criteria:
- [ ] Task implementation completed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Ready for merge`;
  }

  /**
   * Get commit message template
   * @param {Object} task - Task object
   * @param {string} action - Commit action (feat, fix, etc.)
   * @returns {string} Commit message
   */
  getCommitMessageTemplate(task, action = 'feat') {
    const title = task.title || task.description || 'task';
    const sanitizedTitle = this.sanitizeTitle(title);
    
    return `${action}: ${sanitizedTitle}

Task ID: ${task.id}

${task.description || 'No description provided'}

- [ ] Task implementation
- [ ] Tests added
- [ ] Documentation updated`;
  }

  /**
   * Get pull request template
   * @param {Object} task - Task object
   * @param {string} branchName - Branch name
   * @returns {Object} Pull request template
   */
  getPullRequestTemplate(task, branchName) {
    return {
      title: `${this.strategyType}: ${task.title || task.description || 'New task'}`,
      description: `## ${this.strategyType} Implementation

**Task ID:** ${task.id}
**Branch:** ${branchName}
**Type:** ${this.strategyType}

### Description
${task.description || 'No description provided'}

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
      labels: [this.strategyType.toLowerCase().replace('branchstrategy', ''), 'enhancement'],
      assignees: [],
      reviewers: []
    };
  }

  /**
   * Validate task for this strategy
   * @param {Object} task - Task to validate
   * @returns {Object} Validation result
   */
  validateTask(task) {
    const errors = [];
    const warnings = [];
    
    // Check task ID
    if (!task.id) {
      errors.push('Task ID is required');
    }
    
    // Check task title/description
    if (!task.title && !task.description) {
      warnings.push('Task should have a title or description');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get strategy type
   * @returns {string} Strategy type
   */
  getStrategyType() {
    return this.strategyType;
  }

  /**
   * Check if strategy is compatible with task type
   * @param {string} taskType - Task type
   * @returns {boolean} True if compatible
   */
  isCompatibleWithTaskType(taskType) {
    // Base implementation - can be overridden by subclasses
    return true;
  }

  /**
   * Get strategy priority (for strategy selection)
   * @returns {number} Priority (higher = more preferred)
   */
  getPriority() {
    return 1; // Base priority
  }
}

module.exports = BaseBranchStrategy;
