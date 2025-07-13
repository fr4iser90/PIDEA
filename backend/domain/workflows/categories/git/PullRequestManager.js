/**
 * PullRequestManager - Manages pull request creation and operations
 * Handles automated pull request creation with templates and validation
 */
const GitWorkflowException = require('./exceptions/GitWorkflowException');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class PullRequestManager {
  constructor(dependencies = {}) {
    this.gitService = dependencies.gitService;
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    
    // PR templates
    this.templates = {
      feature: this.getFeaturePRTemplate(),
      bug: this.getBugPRTemplate(),
      hotfix: this.getHotfixPRTemplate(),
      release: this.getReleasePRTemplate(),
      refactor: this.getRefactorPRTemplate(),
      default: this.getDefaultPRTemplate()
    };
    
    // Configuration
    this.config = {
      autoAssign: dependencies.autoAssign !== false,
      requireDescription: dependencies.requireDescription !== false,
      requireLabels: dependencies.requireLabels !== false,
      requireReviewers: dependencies.requireReviewers !== false,
      defaultReviewers: dependencies.defaultReviewers || [],
      defaultLabels: dependencies.defaultLabels || ['automated'],
      ...dependencies
    };
  }

  /**
   * Create pull request
   * @param {string} projectPath - Project path
   * @param {Object} prData - Pull request data
   * @returns {Promise<Object>} Pull request result
   */
  async createPullRequest(projectPath, prData) {
    try {
      this.logger.info('PullRequestManager: Creating pull request', {
        projectPath,
        title: prData.title,
        sourceBranch: prData.sourceBranch,
        targetBranch: prData.targetBranch
      });

      // Validate PR data
      const validation = this.validatePRData(prData);
      if (!validation.isValid) {
        throw GitWorkflowException.pullRequestCreationFailed(
          prData.title,
          validation.errors.join(', '),
          { projectPath }
        );
      }

      // Enhance PR data with defaults
      const enhancedPRData = this.enhancePRData(prData);

      // Create pull request using git service
      const result = await this.gitService.createPullRequest(
        projectPath,
        enhancedPRData.sourceBranch,
        enhancedPRData.targetBranch,
        {
          title: enhancedPRData.title,
          description: enhancedPRData.description,
          labels: enhancedPRData.labels,
          reviewers: enhancedPRData.reviewers,
          assignees: enhancedPRData.assignees
        }
      );

      const prResult = {
        success: true,
        id: result.id,
        url: result.url,
        title: enhancedPRData.title,
        sourceBranch: enhancedPRData.sourceBranch,
        targetBranch: enhancedPRData.targetBranch,
        labels: enhancedPRData.labels,
        reviewers: enhancedPRData.reviewers,
        assignees: enhancedPRData.assignees,
        timestamp: new Date()
      };

      // Emit PR created event
      if (this.eventBus) {
        this.eventBus.publish('pull_request.created', {
          projectPath,
          prId: result.id,
          prData: prResult,
          timestamp: new Date()
        });
      }

      this.logger.info('PullRequestManager: Pull request created successfully', {
        projectPath,
        prId: result.id,
        url: result.url
      });

      return prResult;

    } catch (error) {
      this.logger.error('PullRequestManager: Failed to create pull request', {
        projectPath,
        title: prData.title,
        error: error.message
      });

      throw GitWorkflowException.pullRequestCreationFailed(
        prData.title,
        error.message,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Validate pull request data
   * @param {Object} prData - Pull request data
   * @returns {Object} Validation result
   */
  validatePRData(prData) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!prData.title || typeof prData.title !== 'string') {
      errors.push('Pull request title is required and must be a string');
    }

    if (!prData.sourceBranch || typeof prData.sourceBranch !== 'string') {
      errors.push('Source branch is required and must be a string');
    }

    if (!prData.targetBranch || typeof prData.targetBranch !== 'string') {
      errors.push('Target branch is required and must be a string');
    }

    // Title length validation
    if (prData.title && prData.title.length > 200) {
      errors.push('Pull request title must be less than 200 characters');
    }

    // Branch name validation
    if (prData.sourceBranch && !this.isValidBranchName(prData.sourceBranch)) {
      errors.push('Invalid source branch name');
    }

    if (prData.targetBranch && !this.isValidBranchName(prData.targetBranch)) {
      errors.push('Invalid target branch name');
    }

    // Description validation
    if (this.config.requireDescription && (!prData.description || prData.description.trim().length === 0)) {
      errors.push('Pull request description is required');
    }

    // Labels validation
    if (this.config.requireLabels && (!prData.labels || prData.labels.length === 0)) {
      errors.push('Pull request labels are required');
    }

    // Reviewers validation
    if (this.config.requireReviewers && (!prData.reviewers || prData.reviewers.length === 0)) {
      errors.push('Pull request reviewers are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Enhance PR data with defaults and templates
   * @param {Object} prData - Original PR data
   * @returns {Object} Enhanced PR data
   */
  enhancePRData(prData) {
    const enhanced = { ...prData };

    // Add default labels
    if (!enhanced.labels) {
      enhanced.labels = [...this.config.defaultLabels];
    } else {
      enhanced.labels = [...new Set([...this.config.defaultLabels, ...enhanced.labels])];
    }

    // Add default reviewers
    if (!enhanced.reviewers) {
      enhanced.reviewers = [...this.config.defaultReviewers];
    } else {
      enhanced.reviewers = [...new Set([...this.config.defaultReviewers, ...enhanced.reviewers])];
    }

    // Auto-assign if enabled
    if (this.config.autoAssign && enhanced.reviewers.length > 0) {
      enhanced.assignees = [enhanced.reviewers[0]];
    }

    // Enhance description with template
    if (enhanced.description) {
      enhanced.description = this.enhanceDescription(enhanced.description, enhanced);
    }

    return enhanced;
  }

  /**
   * Enhance description with template
   * @param {string} description - Original description
   * @param {Object} prData - PR data
   * @returns {string} Enhanced description
   */
  enhanceDescription(description, prData) {
    const template = this.getTemplateForPR(prData);
    
    if (!template) {
      return description;
    }

    // Replace template placeholders
    let enhanced = template.replace('{{description}}', description);
    enhanced = enhanced.replace('{{sourceBranch}}', prData.sourceBranch);
    enhanced = enhanced.replace('{{targetBranch}}', prData.targetBranch);
    enhanced = enhanced.replace('{{timestamp}}', new Date().toISOString());

    return enhanced;
  }

  /**
   * Get template for PR type
   * @param {Object} prData - PR data
   * @returns {string} Template
   */
  getTemplateForPR(prData) {
    // Determine PR type from labels or title
    const prType = this.determinePRType(prData);
    return this.templates[prType] || this.templates.default;
  }

  /**
   * Determine PR type from data
   * @param {Object} prData - PR data
   * @returns {string} PR type
   */
  determinePRType(prData) {
    // Check labels first
    if (prData.labels) {
      for (const label of prData.labels) {
        if (label.includes('feature')) return 'feature';
        if (label.includes('bug') || label.includes('fix')) return 'bug';
        if (label.includes('hotfix')) return 'hotfix';
        if (label.includes('release')) return 'release';
        if (label.includes('refactor')) return 'refactor';
      }
    }

    // Check title
    const title = prData.title.toLowerCase();
    if (title.includes('feature') || title.includes('enhancement')) return 'feature';
    if (title.includes('bug') || title.includes('fix')) return 'bug';
    if (title.includes('hotfix')) return 'hotfix';
    if (title.includes('release')) return 'release';
    if (title.includes('refactor')) return 'refactor';

    return 'default';
  }

  /**
   * Validate branch name
   * @param {string} branchName - Branch name
   * @returns {boolean} True if valid
   */
  isValidBranchName(branchName) {
    // Basic branch name validation
    const validPattern = /^[a-zA-Z0-9\-_\/]+$/;
    return validPattern.test(branchName) && branchName.length <= 100;
  }

  /**
   * Get feature PR template
   * @returns {string} Template
   */
  getFeaturePRTemplate() {
    return `## Feature Implementation

**Source Branch:** {{sourceBranch}}
**Target Branch:** {{targetBranch}}
**Created:** {{timestamp}}

### Description
{{description}}

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
Please link any related issues here.`;
  }

  /**
   * Get bug PR template
   * @returns {string} Template
   */
  getBugPRTemplate() {
    return `## Bug Fix

**Source Branch:** {{sourceBranch}}
**Target Branch:** {{targetBranch}}
**Created:** {{timestamp}}

### Description
{{description}}

### Bug Details
- **Issue:** [Describe the bug]
- **Root Cause:** [Explain the root cause]
- **Solution:** [Describe the fix]

### Changes Made
- [ ] Bug fix implemented
- [ ] Tests added/updated
- [ ] Documentation updated

### Testing
- [ ] Bug is fixed
- [ ] Regression tests pass
- [ ] No new bugs introduced

### Checklist
- [ ] Bug fix is minimal and targeted
- [ ] Tests cover the fix
- [ ] Documentation updated
- [ ] No breaking changes

### Related Issues
Closes #[issue-number]`;
  }

  /**
   * Get hotfix PR template
   * @returns {string} Template
   */
  getHotfixPRTemplate() {
    return `## 🚨 HOTFIX - URGENT

**Source Branch:** {{sourceBranch}}
**Target Branch:** {{targetBranch}}
**Created:** {{timestamp}}

### 🚨 Critical Issue
{{description}}

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
Closes #[issue-number]

### 📋 Review Requirements
- [ ] Code review by senior developer
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Documentation updated

**⚠️  URGENT: This hotfix requires immediate attention and deployment.**`;
  }

  /**
   * Get release PR template
   * @returns {string} Template
   */
  getReleasePRTemplate() {
    return `## Release Preparation

**Source Branch:** {{sourceBranch}}
**Target Branch:** {{targetBranch}}
**Created:** {{timestamp}}

### Description
{{description}}

### Release Details
- **Version:** [Version number]
- **Release Date:** [Release date]
- **Release Notes:** [Link to release notes]

### Pre-Release Checklist
- [ ] All features completed
- [ ] All bugs fixed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Deployment plan ready

### Post-Release Checklist
- [ ] Version tagged
- [ ] Release notes published
- [ ] Deployment completed
- [ ] Monitoring active
- [ ] Rollback plan ready

### Related Issues
Closes #[issue-number]`;
  }

  /**
   * Get refactor PR template
   * @returns {string} Template
   */
  getRefactorPRTemplate() {
    return `## Code Refactoring

**Source Branch:** {{sourceBranch}}
**Target Branch:** {{targetBranch}}
**Created:** {{timestamp}}

### Description
{{description}}

### Refactoring Details
- **Scope:** [What was refactored]
- **Reason:** [Why the refactoring was needed]
- **Benefits:** [What improvements this brings]

### Changes Made
- [ ] Code refactored
- [ ] Tests updated
- [ ] Documentation updated
- [ ] Performance verified

### Testing
- [ ] All tests pass
- [ ] Performance tests pass
- [ ] No regressions introduced

### Checklist
- [ ] Refactoring is complete
- [ ] Code is cleaner and more maintainable
- [ ] Tests cover all changes
- [ ] Documentation reflects changes
- [ ] No breaking changes

### Related Issues
Closes #[issue-number]`;
  }

  /**
   * Get default PR template
   * @returns {string} Template
   */
  getDefaultPRTemplate() {
    return `## Changes

**Source Branch:** {{sourceBranch}}
**Target Branch:** {{targetBranch}}
**Created:** {{timestamp}}

### Description
{{description}}

### Changes Made
- [ ] Changes implemented
- [ ] Tests added/updated
- [ ] Documentation updated

### Testing
- [ ] Tests pass
- [ ] Manual testing completed

### Checklist
- [ ] Code follows standards
- [ ] Tests cover changes
- [ ] Documentation updated
- [ ] No breaking changes

### Related Issues
Closes #[issue-number]`;
  }

  /**
   * Get PR manager configuration
   * @returns {Object} Configuration
   */
  getConfiguration() {
    return {
      autoAssign: this.config.autoAssign,
      requireDescription: this.config.requireDescription,
      requireLabels: this.config.requireLabels,
      requireReviewers: this.config.requireReviewers,
      defaultReviewers: this.config.defaultReviewers,
      defaultLabels: this.config.defaultLabels,
      templates: Object.keys(this.templates)
    };
  }
}

module.exports = PullRequestManager; 