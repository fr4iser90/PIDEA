const { logger } = require('@infrastructure/logging/Logger');
/**
 * HotfixBranchStrategy - Strategy for hotfix branch creation and management
 * Implements hotfix branch naming conventions and validation for urgent bug fixes
 */
class HotfixBranchStrategy {
  constructor(config = {}) {
    this.config = {
      prefix: config.prefix || 'hotfix',
      separator: config.separator || '/',
      maxLength: config.maxLength || 50,
      includeTaskId: config.includeTaskId !== false,
      includeDate: config.includeDate !== false, // Default to true for hotfixes
      dateFormat: config.dateFormat || 'YYYYMMDD',
      sanitizeTitle: config.sanitizeTitle !== false,
      includeVersion: config.includeVersion || false,
      ...config
    };
    
    this.logger = config.logger || console;
  }

  /**
   * Generate hotfix branch name
   * @param {Object} task - Task object
   * @param {Object} context - Git workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    try {
      const taskId = task.id || context.get('taskId') || 'unknown';
      const title = task.title || task.description || 'hotfix';
      const version = task.metadata?.version || context.get('version');
      
      let branchName = this.config.prefix;
      
      // Add task ID if enabled
      if (this.config.includeTaskId) {
        branchName += this.config.separator + taskId;
      }
      
      // Add version if enabled and available
      if (this.config.includeVersion && version) {
        branchName += this.config.separator + this.sanitizeVersion(version);
      }
      
      // Add sanitized title
      if (this.config.sanitizeTitle) {
        const sanitizedTitle = this.sanitizeTitle(title);
        branchName += this.config.separator + sanitizedTitle;
      }
      
      // Add date if enabled (default for hotfixes)
      if (this.config.includeDate) {
        const date = this.formatDate(new Date(), this.config.dateFormat);
        branchName += this.config.separator + date;
      }
      
      // Truncate if too long
      if (branchName.length > this.config.maxLength) {
        branchName = this.truncateBranchName(branchName, this.config.maxLength);
      }
      
      this.logger.info('HotfixBranchStrategy: Generated branch name', {
        taskId,
        originalTitle: title,
        version,
        branchName,
        config: this.config
      });
      
      return branchName;
      
    } catch (error) {
      this.logger.error('HotfixBranchStrategy: Failed to generate branch name', {
        taskId: task.id,
        error: error.message
      });
      
      // Fallback to simple naming
      return `${this.config.prefix}/${task.id || 'hotfix'}`;
    }
  }

  /**
   * Sanitize title for branch name
   * @param {string} title - Original title
   * @returns {string} Sanitized title
   */
  sanitizeTitle(title) {
    if (!title || typeof title !== 'string') {
      return 'hotfix';
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
      .substring(0, 25); // Shorter for hotfixes
  }

  /**
   * Sanitize version string
   * @param {string} version - Version string
   * @returns {string} Sanitized version
   */
  sanitizeVersion(version) {
    if (!version || typeof version !== 'string') {
      return '';
    }
    
    return version
      // Keep only version-related characters
      .replace(/[^0-9.]/g, '')
      // Remove multiple consecutive dots
      .replace(/\.+/g, '.')
      // Remove leading and trailing dots
      .replace(/^\.+|\.+$/g, '')
      // Limit length
      .substring(0, 15);
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
      type: 'hotfix',
      prefix: this.config.prefix,
      separator: this.config.separator,
      maxLength: this.config.maxLength,
      includeTaskId: this.config.includeTaskId,
      includeDate: this.config.includeDate,
      dateFormat: this.config.dateFormat,
      sanitizeTitle: this.config.sanitizeTitle,
      includeVersion: this.config.includeVersion,
      protection: 'high',
      autoMerge: false,
      requiresReview: true,
      mergeTarget: 'main'
    };
  }

  /**
   * Get branch protection rules
   * @returns {Object} Protection rules
   */
  getProtectionRules() {
    return {
      requiredStatusChecks: ['ci', 'test', 'security'],
      enforceAdmins: true,
      requiredPullRequestReviews: {
        requiredApprovingReviewCount: 2,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: true
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
      method: 'merge',
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
    return `Hotfix branch for: ${task.title || task.description || 'Unknown hotfix'}

Task ID: ${task.id}
Created: ${new Date().toISOString()}
Type: Hotfix (Urgent Bug Fix)
Priority: HIGH

Description:
${task.description || 'No description provided'}

Acceptance Criteria:
- [ ] Critical bug identified and fixed
- [ ] Fix tested in isolation
- [ ] Regression tests pass
- [ ] Security review completed
- [ ] Ready for immediate deployment

⚠️  URGENT: This is a hotfix for a critical issue requiring immediate attention.`;
  }

  /**
   * Get commit message template
   * @param {Object} task - Task object
   * @param {string} action - Commit action (fix, hotfix, etc.)
   * @returns {string} Commit message
   */
  getCommitMessageTemplate(task, action = 'fix') {
    const title = task.title || task.description || 'hotfix';
    const sanitizedTitle = this.sanitizeTitle(title);
    
    return `${action}: ${sanitizedTitle}

Task ID: ${task.id}
Type: HOTFIX (URGENT)

${task.description || 'No description provided'}

- [ ] Critical bug fix
- [ ] Tests added
- [ ] Security review completed
- [ ] Ready for deployment`;
  }

  /**
   * Get pull request template
   * @param {Object} task - Task object
   * @param {string} branchName - Branch name
   * @returns {Object} Pull request template
   */
  getPullRequestTemplate(task, branchName) {
    return {
      title: `🚨 HOTFIX: ${task.title || task.description || 'Critical bug fix'}`,
      description: `## 🚨 HOTFIX - URGENT

**Task ID:** ${task.id}
**Branch:** ${branchName}
**Type:** Hotfix (Critical Bug Fix)
**Priority:** HIGH

### 🚨 Critical Issue
${task.description || 'No description provided'}

### 🔧 Fix Applied
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added
- [ ] Security review completed

### 🧪 Testing
- [ ] Fix tested in isolation
- [ ] Regression tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

### ⚠️  Deployment Checklist
- [ ] Fix is minimal and targeted
- [ ] No breaking changes introduced
- [ ] Rollback plan prepared
- [ ] Monitoring alerts updated
- [ ] Ready for immediate deployment

### 🔗 Related Issues
Closes #${task.id}

### 📋 Review Requirements
- [ ] Code review by senior developer
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Documentation updated

**⚠️  URGENT: This hotfix requires immediate attention and deployment.**`,
      labels: ['hotfix', 'urgent', 'bug', 'critical'],
      assignees: [],
      reviewers: []
    };
  }

  /**
   * Validate task for hotfix strategy
   * @param {Object} task - Task to validate
   * @returns {Object} Validation result
   */
  validateTask(task) {
    const errors = [];
    const warnings = [];
    
    // Check task type
    const taskType = task.type?.value || task.type;
    if (taskType && !this.isValidTaskType(taskType)) {
      warnings.push(`Task type '${taskType}' may not be suitable for hotfix branch strategy`);
    }
    
    // Check priority
    const priority = task.priority || task.metadata?.priority;
    if (priority && !this.isValidPriority(priority)) {
      warnings.push(`Task priority '${priority}' may not indicate urgent hotfix`);
    }
    
    // Check for version information
    const version = task.metadata?.version;
    if (!version && this.config.includeVersion) {
      warnings.push('Version information not provided for hotfix');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if task type is valid for hotfix
   * @param {string} taskType - Task type
   * @returns {boolean} True if valid
   */
  isValidTaskType(taskType) {
    const validTypes = [
      'bug', 'hotfix', 'critical', 'urgent', 'security',
      'fix', 'patch', 'emergency'
    ];
    
    return validTypes.includes(taskType.toLowerCase());
  }

  /**
   * Check if priority is valid for hotfix
   * @param {string} priority - Task priority
   * @returns {boolean} True if valid
   */
  isValidPriority(priority) {
    const validPriorities = [
      'critical', 'high', 'urgent', 'emergency',
      'p0', 'p1', 'blocker'
    ];
    
    return validPriorities.includes(priority.toLowerCase());
  }
}

module.exports = HotfixBranchStrategy; 