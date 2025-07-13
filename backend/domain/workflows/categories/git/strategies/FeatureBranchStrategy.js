const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
/**
 * FeatureBranchStrategy - Strategy for feature branch creation and management
 * Implements feature branch naming conventions and validation
 */
class FeatureBranchStrategy {
  constructor(config = {}) {
    this.config = {
      prefix: config.prefix || 'feature',
      separator: config.separator || '/',
      maxLength: config.maxLength || 50,
      includeTaskId: config.includeTaskId !== false,
      includeDate: config.includeDate || false,
      dateFormat: config.dateFormat || 'YYYYMMDD',
      sanitizeTitle: config.sanitizeTitle !== false,
      ...config
    };
    
    this.logger = config.logger || console;
  }

  /**
   * Generate feature branch name
   * @param {Object} task - Task object
   * @param {Object} context - Git workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    try {
      const taskId = task.id || context.get('taskId') || 'unknown';
      const title = task.title || task.description || 'feature';
      
      let branchName = this.config.prefix;
      
      // Add task ID if enabled
      if (this.config.includeTaskId) {
        branchName += this.config.separator + taskId;
      }
      
      // Add sanitized title
      if (this.config.sanitizeTitle) {
        const sanitizedTitle = this.sanitizeTitle(title);
        branchName += this.config.separator + sanitizedTitle;
      }
      
      // Add date if enabled
      if (this.config.includeDate) {
        const date = this.formatDate(new Date(), this.config.dateFormat);
        branchName += this.config.separator + date;
      }
      
      // Truncate if too long
      if (branchName.length > this.config.maxLength) {
        branchName = this.truncateBranchName(branchName, this.config.maxLength);
      }
      
      this.logger.info('FeatureBranchStrategy: Generated branch name', {
        taskId,
        originalTitle: title,
        branchName,
        config: this.config
      });
      
      return branchName;
      
    } catch (error) {
      this.logger.error('FeatureBranchStrategy: Failed to generate branch name', {
        taskId: task.id,
        error: error.message
      });
      
      // Fallback to simple naming
      return `${this.config.prefix}/${task.id || 'feature'}`;
    }
  }

  /**
   * Sanitize title for branch name
   * @param {string} title - Original title
   * @returns {string} Sanitized title
   */
  sanitizeTitle(title) {
    if (!title || typeof title !== 'string') {
      return 'feature';
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
   * Format date according to specified format
   * @param {Date} date - Date to format
   * @param {string} format - Date format
   * @returns {string} Formatted date
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
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
   * Get branch configuration
   * @returns {Object} Branch configuration
   */
  getConfiguration() {
    return {
      type: 'feature',
      prefix: this.config.prefix,
      separator: this.config.separator,
      maxLength: this.config.maxLength,
      includeTaskId: this.config.includeTaskId,
      includeDate: this.config.includeDate,
      dateFormat: this.config.dateFormat,
      sanitizeTitle: this.config.sanitizeTitle,
      protection: 'medium',
      autoMerge: false,
      requiresReview: true,
      mergeTarget: 'develop'
    };
  }

  /**
   * Get branch protection rules
   * @returns {Object} Protection rules
   */
  getProtectionRules() {
    return {
      requiredStatusChecks: ['ci', 'test'],
      enforceAdmins: false,
      requiredPullRequestReviews: {
        requiredApprovingReviewCount: 1,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: false
      },
      restrictions: null,
      allowForcePushes: false,
      allowDeletions: false
    };
  }

  /**
   * Get merge strategy
   * @returns {Object} Merge strategy configuration
   */
  getMergeStrategy() {
    return {
      method: 'squash',
      deleteBranch: true,
      requireReview: true,
      autoMerge: false
    };
  }

  /**
   * Get branch description template
   * @param {Object} task - Task object
   * @returns {string} Branch description
   */
  getBranchDescription(task) {
    return `Feature branch for: ${task.title || task.description || 'Unknown feature'}

Task ID: ${task.id}
Created: ${new Date().toISOString()}
Type: Feature Implementation

Description:
${task.description || 'No description provided'}

Acceptance Criteria:
- [ ] Feature implementation completed
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
    const title = task.title || task.description || 'feature';
    const sanitizedTitle = this.sanitizeTitle(title);
    
    return `${action}: ${sanitizedTitle}

Task ID: ${task.id}

${task.description || 'No description provided'}

- [ ] Feature implementation
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
      title: `Feature: ${task.title || task.description || 'New feature'}`,
      description: `## Feature Implementation

**Task ID:** ${task.id}
**Branch:** ${branchName}
**Type:** Feature

### Description
${task.description || 'No description provided'}

### Changes Made
- [ ] Feature implementation
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
      labels: ['feature', 'enhancement'],
      assignees: [],
      reviewers: []
    };
  }
}

module.exports = FeatureBranchStrategy; 