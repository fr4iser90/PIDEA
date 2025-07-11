/**
 * ReleaseBranchStrategy - Strategy for release branch management
 * Implements release branch naming conventions, validation, and configuration for release management
 */
const GitWorkflowException = require('../exceptions/GitWorkflowException');

class ReleaseBranchStrategy {
  constructor(config = {}) {
    this.type = 'release';
    this.prefix = config.prefix || 'release';
    this.separator = config.separator || '/';
    this.maxLength = config.maxLength || 50;
    this.allowedCharacters = config.allowedCharacters || /^[a-zA-Z0-9\-_\/\.]+$/;
    
    // Branch configuration
    this.config = {
      startPoint: config.startPoint || 'develop',
      protection: config.protection || 'high',
      autoMerge: config.autoMerge || false,
      requiresReview: config.requiresReview || true,
      mergeTarget: config.mergeTarget || 'main',
      deleteAfterMerge: config.deleteAfterMerge || true,
      versioning: config.versioning || 'semantic',
      ...config
    };
    
    // Naming patterns
    this.namingPatterns = {
      version: config.versionPattern || '{version}',
      codename: config.codenamePattern || '{codename}',
      date: config.datePattern || '{date}',
      milestone: config.milestonePattern || '{milestone}',
      ...config.namingPatterns
    };
    
    // Validation rules
    this.validationRules = {
      requireVersion: config.requireVersion !== false,
      requireSemanticVersion: config.requireSemanticVersion !== false,
      allowPrerelease: config.allowPrerelease || false,
      maxTitleLength: config.maxTitleLength || 30,
      allowSpecialCharacters: config.allowSpecialCharacters || false,
      ...config.validationRules
    };
    
    // Version patterns
    this.versionPatterns = {
      semantic: /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/,
      simple: /^\d+\.\d+$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      custom: config.customVersionPattern
    };
  }

  /**
   * Generate branch name for release
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Generated branch name
   */
  generateBranchName(task, context = {}) {
    try {
      const version = this.extractVersion(task, context);
      const codename = this.extractCodename(task, context);
      const date = this.extractDate(task, context);
      const milestone = this.extractMilestone(task, context);
      
      // Build branch name components
      const components = [this.prefix];
      
      if (version) {
        components.push(this.namingPatterns.version.replace('{version}', version));
      }
      
      if (codename && this.validationRules.includeCodename) {
        components.push(this.namingPatterns.codename.replace('{codename}', codename));
      }
      
      if (date && this.validationRules.includeDate) {
        components.push(this.namingPatterns.date.replace('{date}', date));
      }
      
      if (milestone && this.validationRules.includeMilestone) {
        components.push(this.namingPatterns.milestone.replace('{milestone}', milestone));
      }
      
      // Join components
      let branchName = components.join(this.separator);
      
      // Validate and truncate if necessary
      branchName = this.validateAndTruncate(branchName);
      
      return branchName;
      
    } catch (error) {
      throw GitWorkflowException.createBranchError(
        `Failed to generate release branch name: ${error.message}`,
        { taskId: task.id, taskType: task.type?.value }
      );
    }
  }

  /**
   * Extract version from task or context
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Version string
   */
  extractVersion(task, context) {
    const version = task.version || 
                    task.releaseVersion || 
                    task.targetVersion || 
                    context.get('version') || 
                    context.get('releaseVersion') || 
                    context.get('targetVersion');
    
    if (!version && this.validationRules.requireVersion) {
      throw new Error('Version is required for release branch naming');
    }
    
    if (!version) return null;
    
    const versionStr = String(version);
    
    // Validate version format
    if (this.validationRules.requireSemanticVersion) {
      if (!this.versionPatterns.semantic.test(versionStr)) {
        throw new Error(`Invalid semantic version format: ${versionStr}. Expected format: X.Y.Z[-prerelease][+build]`);
      }
    } else {
      // Check against all patterns
      const isValid = Object.values(this.versionPatterns).some(pattern => 
        pattern && pattern.test(versionStr)
      );
      
      if (!isValid) {
        throw new Error(`Invalid version format: ${versionStr}`);
      }
    }
    
    // Check prerelease restrictions
    if (!this.validationRules.allowPrerelease && versionStr.includes('-')) {
      throw new Error(`Prerelease versions not allowed: ${versionStr}`);
    }
    
    return versionStr;
  }

  /**
   * Extract codename from task or context
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Codename string
   */
  extractCodename(task, context) {
    const codename = task.codename || 
                     task.releaseName || 
                     task.releaseCodename || 
                     context.get('codename') || 
                     context.get('releaseName');
    
    if (!codename) return null;
    
    const codenameStr = String(codename)
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return codenameStr || null;
  }

  /**
   * Extract date from task or context
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Date string
   */
  extractDate(task, context) {
    const date = task.releaseDate || 
                 task.targetDate || 
                 task.scheduledDate || 
                 context.get('releaseDate') || 
                 context.get('targetDate') || 
                 new Date();
    
    const dateObj = new Date(date);
    
    // Format as YYYYMMDD
    return dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  }

  /**
   * Extract milestone from task or context
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {string} Milestone string
   */
  extractMilestone(task, context) {
    const milestone = task.milestone || 
                      task.sprint || 
                      task.iteration || 
                      context.get('milestone') || 
                      context.get('sprint');
    
    if (!milestone) return null;
    
    const milestoneStr = String(milestone)
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return milestoneStr || null;
  }

  /**
   * Validate and truncate branch name
   * @param {string} branchName - Branch name to validate
   * @returns {string} Validated branch name
   */
  validateAndTruncate(branchName) {
    if (!branchName) {
      throw new Error('Branch name cannot be empty');
    }
    
    // Check length
    if (branchName.length > this.maxLength) {
      branchName = branchName.substring(0, this.maxLength);
      // Remove trailing separator if present
      branchName = branchName.replace(new RegExp(`${this.escapeRegex(this.separator)}+$`), '');
    }
    
    // Check character validity
    if (!this.allowedCharacters.test(branchName)) {
      throw new Error(`Branch name contains invalid characters: ${branchName}`);
    }
    
    // Check for reserved names
    const reservedNames = ['main', 'master', 'develop', 'staging', 'production'];
    if (reservedNames.includes(branchName.toLowerCase())) {
      throw new Error(`Branch name is reserved: ${branchName}`);
    }
    
    return branchName;
  }

  /**
   * Escape regex special characters
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate task for release branch strategy
   * @param {Object} task - Task to validate
   * @param {Object} context - Workflow context
   * @returns {Object} Validation result
   */
  validateTask(task, context = {}) {
    const errors = [];
    const warnings = [];
    
    // Check required fields
    if (this.validationRules.requireVersion && !this.extractVersion(task, context)) {
      errors.push('Version is required for release branch');
    }
    
    // Check task type
    const taskType = task.type?.value || task.type;
    if (taskType && !this.isValidTaskType(taskType)) {
      warnings.push(`Task type '${taskType}' may not be suitable for release branch strategy`);
    }
    
    // Check if task is actually a release task
    if (!this.isReleaseTask(task, context)) {
      warnings.push('Task does not appear to be a release task');
    }
    
    // Check version format
    try {
      const version = this.extractVersion(task, context);
      if (version && this.validationRules.requireSemanticVersion) {
        if (!this.versionPatterns.semantic.test(version)) {
          warnings.push('Version should follow semantic versioning format (X.Y.Z)');
        }
      }
    } catch (error) {
      warnings.push(`Version validation: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Check if task type is valid for release branch
   * @param {string} taskType - Task type
   * @returns {boolean} True if valid
   */
  isValidTaskType(taskType) {
    const validTypes = [
      'release', 'version', 'deployment', 'publish', 'ship',
      'milestone', 'sprint', 'iteration', 'delivery'
    ];
    
    return validTypes.includes(taskType.toLowerCase());
  }

  /**
   * Check if task is a release task
   * @param {Object} task - Task object
   * @param {Object} context - Workflow context
   * @returns {boolean} True if release task
   */
  isReleaseTask(task, context) {
    // Check for release keywords in title/description
    const releaseKeywords = ['release', 'version', 'deploy', 'publish', 'ship', 'milestone'];
    const title = task.title || task.description || '';
    const description = task.description || '';
    const text = `${title} ${description}`.toLowerCase();
    
    return releaseKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Get branch configuration
   * @returns {Object} Branch configuration
   */
  getConfiguration() {
    return {
      type: this.type,
      prefix: this.prefix,
      separator: this.separator,
      maxLength: this.maxLength,
      config: this.config,
      namingPatterns: this.namingPatterns,
      validationRules: this.validationRules,
      versionPatterns: this.versionPatterns
    };
  }

  /**
   * Get branch protection rules
   * @returns {Object} Protection rules
   */
  getProtectionRules() {
    const protectionLevel = this.config.protection;
    
    const rules = {
      low: {
        requirePullRequestReviews: false,
        dismissStaleReviews: false,
        requireCodeOwnerReviews: false,
        requiredApprovingReviewCount: 0,
        requireStatusChecksToPass: false,
        requireBranchesToBeUpToDate: false,
        allowForcePushes: true,
        allowDeletions: true
      },
      medium: {
        requirePullRequestReviews: true,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: false,
        requiredApprovingReviewCount: 1,
        requireStatusChecksToPass: true,
        requireBranchesToBeUpToDate: true,
        allowForcePushes: false,
        allowDeletions: false
      },
      high: {
        requirePullRequestReviews: true,
        dismissStaleReviews: true,
        requireCodeOwnerReviews: true,
        requiredApprovingReviewCount: 2,
        requireStatusChecksToPass: true,
        requireBranchesToBeUpToDate: true,
        allowForcePushes: false,
        allowDeletions: false
      }
    };
    
    return rules[protectionLevel] || rules.high;
  }

  /**
   * Get merge strategy configuration
   * @returns {Object} Merge strategy configuration
   */
  getMergeStrategy() {
    return {
      method: 'merge', // Use merge commit for releases to preserve history
      deleteSourceBranch: this.config.deleteAfterMerge,
      commitMessage: this.generateCommitMessage.bind(this),
      mergeTitle: this.generateMergeTitle.bind(this),
      mergeDescription: this.generateMergeDescription.bind(this)
    };
  }

  /**
   * Generate commit message for merge
   * @param {Object} task - Task object
   * @returns {string} Commit message
   */
  generateCommitMessage(task) {
    const version = this.extractVersion(task);
    const codename = this.extractCodename(task);
    
    let message = `release: ${version}`;
    
    if (codename) {
      message += ` (${codename})`;
    }
    
    return message;
  }

  /**
   * Generate merge title
   * @param {Object} task - Task object
   * @returns {string} Merge title
   */
  generateMergeTitle(task) {
    const version = this.extractVersion(task);
    const codename = this.extractCodename(task);
    
    let mergeTitle = `Release: ${version}`;
    
    if (codename) {
      mergeTitle += ` (${codename})`;
    }
    
    return mergeTitle;
  }

  /**
   * Generate merge description
   * @param {Object} task - Task object
   * @returns {string} Merge description
   */
  generateMergeDescription(task) {
    const version = this.extractVersion(task);
    const codename = this.extractCodename(task);
    const description = task.description || task.description;
    const date = this.extractDate(task);
    const milestone = this.extractMilestone(task);
    
    let mergeDescription = `## Release: ${version}\n\n`;
    
    if (codename) {
      mergeDescription += `**Codename:** ${codename}\n\n`;
    }
    
    if (date) {
      mergeDescription += `**Release Date:** ${date}\n\n`;
    }
    
    if (milestone) {
      mergeDescription += `**Milestone:** ${milestone}\n\n`;
    }
    
    if (description) {
      mergeDescription += `**Description:**\n${description}\n\n`;
    }
    
    mergeDescription += `**Type:** Release Branch\n`;
    mergeDescription += `**Strategy:** ${this.type}\n`;
    mergeDescription += `**Versioning:** ${this.config.versioning}\n`;
    mergeDescription += `**Auto-merge:** ${this.config.autoMerge ? 'Enabled' : 'Disabled'}\n`;
    mergeDescription += `**Requires Review:** ${this.config.requiresReview ? 'Yes' : 'No'}\n`;
    
    return mergeDescription;
  }

  /**
   * Get release procedures
   * @returns {Object} Release procedures
   */
  getReleaseProcedures() {
    return {
      preReleaseChecks: [
        'All tests passing',
        'Code review completed',
        'Documentation updated',
        'Changelog generated',
        'Version bumped',
        'Dependencies updated'
      ],
      releaseSteps: [
        'Create release branch',
        'Run final tests',
        'Generate release notes',
        'Tag release',
        'Merge to main',
        'Deploy to staging',
        'Deploy to production',
        'Announce release'
      ],
      postReleaseTasks: [
        'Update documentation',
        'Notify stakeholders',
        'Monitor deployment',
        'Handle feedback',
        'Plan next release'
      ]
    };
  }

  /**
   * Get version management utilities
   * @returns {Object} Version management utilities
   */
  getVersionManagement() {
    return {
      bumpVersion: this.bumpVersion.bind(this),
      validateVersion: this.validateVersion.bind(this),
      compareVersions: this.compareVersions.bind(this),
      generateChangelog: this.generateChangelog.bind(this)
    };
  }

  /**
   * Bump version according to type
   * @param {string} currentVersion - Current version
   * @param {string} bumpType - Bump type (major, minor, patch)
   * @returns {string} New version
   */
  bumpVersion(currentVersion, bumpType = 'patch') {
    if (!this.versionPatterns.semantic.test(currentVersion)) {
      throw new Error(`Invalid semantic version: ${currentVersion}`);
    }
    
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2].split('-')[0]); // Remove prerelease
    
    switch (bumpType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid bump type: ${bumpType}`);
    }
  }

  /**
   * Validate version format
   * @param {string} version - Version to validate
   * @returns {boolean} True if valid
   */
  validateVersion(version) {
    return this.versionPatterns.semantic.test(version);
  }

  /**
   * Compare two versions
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {number} Comparison result (-1, 0, 1)
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;
      
      if (v1 < v2) return -1;
      if (v1 > v2) return 1;
    }
    
    return 0;
  }

  /**
   * Generate changelog template
   * @param {string} version - Version
   * @param {string} codename - Codename
   * @returns {string} Changelog template
   */
  generateChangelog(version, codename = null) {
    let changelog = `# Release ${version}\n\n`;
    
    if (codename) {
      changelog += `**Codename:** ${codename}\n\n`;
    }
    
    changelog += `## 🚀 New Features\n\n`;
    changelog += `- \n\n`;
    changelog += `## 🐛 Bug Fixes\n\n`;
    changelog += `- \n\n`;
    changelog += `## 🔧 Improvements\n\n`;
    changelog += `- \n\n`;
    changelog += `## 📚 Documentation\n\n`;
    changelog += `- \n\n`;
    changelog += `## 🔄 Breaking Changes\n\n`;
    changelog += `- None\n\n`;
    
    return changelog;
  }
}

module.exports = ReleaseBranchStrategy; 