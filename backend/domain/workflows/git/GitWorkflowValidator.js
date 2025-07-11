/**
 * GitWorkflowValidator - Validation for Git workflow operations
 * Ensures all requirements are met before workflow execution
 */
const GitWorkflowException = require('./exceptions/GitWorkflowException');

class GitWorkflowValidator {
  constructor() {
    this.requiredContextKeys = [
      'projectPath',
      'taskId',
      'taskType',
      'automationLevel'
    ];
    
    this.optionalContextKeys = [
      'baseBranch',
      'reviewers',
      'workflow',
      'gitService',
      'logger',
      'eventBus'
    ];
    
    // Validation rules
    this.validationRules = {
      projectPath: {
        required: true,
        type: 'string',
        minLength: 1,
        pattern: /^[\/\w\-\.]+$/
      },
      taskId: {
        required: true,
        type: 'string',
        minLength: 1
      },
      taskType: {
        required: true,
        type: 'string',
        allowedValues: [
          'feature', 'bug', 'hotfix', 'release', 'refactor', 'analysis',
          'testing', 'documentation', 'deployment', 'security', 'performance'
        ]
      },
      automationLevel: {
        required: true,
        type: 'string',
        allowedValues: ['manual', 'assisted', 'semi_auto', 'full_auto', 'adaptive']
      },
      baseBranch: {
        required: false,
        type: 'string',
        defaultValue: 'main',
        pattern: /^[a-zA-Z0-9\-_\/]+$/
      },
      reviewers: {
        required: false,
        type: 'array',
        itemType: 'string'
      }
    };
  }

  /**
   * Validate git workflow
   * @param {Object} task - Task object
   * @param {Object} context - Git workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validate(task, context) {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    
    try {
      // Validate task
      const taskValidation = this.validateTask(task);
      errors.push(...taskValidation.errors);
      warnings.push(...taskValidation.warnings);
      
      // Validate context
      const contextValidation = this.validateContext(context);
      errors.push(...contextValidation.errors);
      warnings.push(...contextValidation.warnings);
      
      // Validate git service availability
      const gitServiceValidation = await this.validateGitService(context);
      errors.push(...gitServiceValidation.errors);
      warnings.push(...gitServiceValidation.warnings);
      
      // Validate repository state
      const repositoryValidation = await this.validateRepository(context);
      errors.push(...repositoryValidation.errors);
      warnings.push(...repositoryValidation.warnings);
      
      // Validate permissions
      const permissionValidation = await this.validatePermissions(context);
      errors.push(...permissionValidation.errors);
      warnings.push(...permissionValidation.warnings);
      
      const duration = Date.now() - startTime;
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        duration,
        timestamp: new Date(),
        details: {
          taskValidation: taskValidation.isValid,
          contextValidation: contextValidation.isValid,
          gitServiceValidation: gitServiceValidation.isValid,
          repositoryValidation: repositoryValidation.isValid,
          permissionValidation: permissionValidation.isValid
        }
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        error: error
      };
    }
  }

  /**
   * Validate task object
   * @param {Object} task - Task object
   * @returns {Object} Validation result
   */
  validateTask(task) {
    const errors = [];
    const warnings = [];
    
    if (!task) {
      errors.push('Task is required');
      return { isValid: false, errors, warnings };
    }
    
    // Check required task fields
    if (!task.id) {
      errors.push('Task ID is required');
    }
    
    if (!task.type) {
      errors.push('Task type is required');
    } else if (!task.type.value) {
      errors.push('Task type value is required');
    }
    
    if (!task.title && !task.description) {
      errors.push('Task title or description is required');
    }
    
    // Check task type validity
    if (task.type?.value && !this.validationRules.taskType.allowedValues.includes(task.type.value)) {
      warnings.push(`Unknown task type: ${task.type.value}`);
    }
    
    // Check task metadata
    if (task.metadata) {
      if (!task.metadata.projectPath) {
        errors.push('Task metadata must include projectPath');
      }
      
      if (task.metadata.automationLevel && !this.validationRules.automationLevel.allowedValues.includes(task.metadata.automationLevel)) {
        warnings.push(`Unknown automation level: ${task.metadata.automationLevel}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate context object
   * @param {Object} context - Git workflow context
   * @returns {Object} Validation result
   */
  validateContext(context) {
    const errors = [];
    const warnings = [];
    
    if (!context) {
      errors.push('Context is required');
      return { isValid: false, errors, warnings };
    }
    
    // Check required context keys
    for (const key of this.requiredContextKeys) {
      if (!context.has(key)) {
        errors.push(`Required context key missing: ${key}`);
      } else {
        const value = context.get(key);
        const rule = this.validationRules[key];
        
        if (rule) {
          const fieldValidation = this.validateField(key, value, rule);
          errors.push(...fieldValidation.errors);
          warnings.push(...fieldValidation.warnings);
        }
      }
    }
    
    // Check optional context keys
    for (const key of this.optionalContextKeys) {
      if (context.has(key)) {
        const value = context.get(key);
        const rule = this.validationRules[key];
        
        if (rule) {
          const fieldValidation = this.validateField(key, value, rule);
          warnings.push(...fieldValidation.errors); // Treat as warnings for optional fields
          warnings.push(...fieldValidation.warnings);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate individual field
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @param {Object} rule - Validation rule
   * @returns {Object} Validation result
   */
  validateField(fieldName, value, rule) {
    const errors = [];
    const warnings = [];
    
    // Check type
    if (rule.type && typeof value !== rule.type) {
      errors.push(`${fieldName} must be of type ${rule.type}`);
      return { errors, warnings };
    }
    
    // Check required
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName} is required`);
      return { errors, warnings };
    }
    
    // Check min length
    if (rule.minLength && value && value.length < rule.minLength) {
      errors.push(`${fieldName} must be at least ${rule.minLength} characters long`);
    }
    
    // Check pattern
    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }
    
    // Check allowed values
    if (rule.allowedValues && value && !rule.allowedValues.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rule.allowedValues.join(', ')}`);
    }
    
    // Check array item type
    if (rule.itemType && Array.isArray(value)) {
      for (const item of value) {
        if (typeof item !== rule.itemType) {
          errors.push(`${fieldName} items must be of type ${rule.itemType}`);
          break;
        }
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validate git service availability
   * @param {Object} context - Git workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validateGitService(context) {
    const errors = [];
    const warnings = [];
    
    const gitService = context.get('gitService');
    
    if (!gitService) {
      errors.push('Git service is required');
      return { isValid: false, errors, warnings };
    }
    
    // Check if git service has required methods
    const requiredMethods = [
      'createBranch',
      'checkoutBranch',
      'mergeBranch',
      'getCurrentBranch',
      'getBranches'
    ];
    
    for (const method of requiredMethods) {
      if (typeof gitService[method] !== 'function') {
        errors.push(`Git service must implement ${method} method`);
      }
    }
    
    // Test git service connectivity
    try {
      const projectPath = context.get('projectPath');
      if (projectPath) {
        const branches = await gitService.getBranches(projectPath);
        if (!Array.isArray(branches)) {
          warnings.push('Git service getBranches method should return an array');
        }
      }
    } catch (error) {
      warnings.push(`Git service connectivity test failed: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate repository state
   * @param {Object} context - Git workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validateRepository(context) {
    const errors = [];
    const warnings = [];
    
    const gitService = context.get('gitService');
    const projectPath = context.get('projectPath');
    
    if (!gitService || !projectPath) {
      return { isValid: true, errors, warnings };
    }
    
    try {
      // Check if repository exists
      const branches = await gitService.getBranches(projectPath);
      
      if (!branches || branches.length === 0) {
        errors.push('Repository has no branches');
      }
      
      // Check if base branch exists
      const baseBranch = context.get('baseBranch') || 'main';
      if (!branches.includes(baseBranch)) {
        errors.push(`Base branch '${baseBranch}' does not exist`);
      }
      
      // Check current branch
      const currentBranch = await gitService.getCurrentBranch(projectPath);
      if (!currentBranch) {
        warnings.push('Unable to determine current branch');
      }
      
      // Check for uncommitted changes
      try {
        const status = await gitService.getStatus(projectPath);
        if (status && status.modified && status.modified.length > 0) {
          warnings.push('Repository has uncommitted changes');
        }
      } catch (error) {
        // Status check not available, skip
      }
      
    } catch (error) {
      errors.push(`Repository validation failed: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate permissions
   * @param {Object} context - Git workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validatePermissions(context) {
    const errors = [];
    const warnings = [];
    
    const gitService = context.get('gitService');
    const projectPath = context.get('projectPath');
    
    if (!gitService || !projectPath) {
      return { isValid: true, errors, warnings };
    }
    
    try {
      // Test write permissions by attempting to create a test branch
      const testBranchName = `test-permissions-${Date.now()}`;
      
      try {
        await gitService.createBranch(projectPath, testBranchName, {
          startPoint: context.get('baseBranch') || 'main'
        });
        
        // Clean up test branch
        try {
          await gitService.deleteBranch(projectPath, testBranchName);
        } catch (cleanupError) {
          warnings.push(`Failed to cleanup test branch: ${cleanupError.message}`);
        }
        
      } catch (error) {
        errors.push(`Insufficient permissions to create branches: ${error.message}`);
      }
      
    } catch (error) {
      warnings.push(`Permission validation failed: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
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
    if (branchName.length > 100) {
      errors.push('Branch name must be 100 characters or less');
    }
    
    // Check for invalid characters
    const invalidChars = /[^a-zA-Z0-9\-_\/]/;
    if (invalidChars.test(branchName)) {
      errors.push('Branch name contains invalid characters');
    }
    
    // Check for reserved names
    const reservedNames = ['HEAD', 'main', 'master', 'develop', 'staging', 'production'];
    if (reservedNames.includes(branchName.toLowerCase())) {
      errors.push(`Branch name '${branchName}' is reserved`);
    }
    
    // Check for double slashes
    if (branchName.includes('//')) {
      errors.push('Branch name cannot contain double slashes');
    }
    
    // Check for leading/trailing slashes
    if (branchName.startsWith('/') || branchName.endsWith('/')) {
      errors.push('Branch name cannot start or end with slash');
    }
    
    // Check for consecutive hyphens
    if (branchName.includes('--')) {
      warnings.push('Branch name contains consecutive hyphens');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get validation rules
   * @returns {Object} Validation rules
   */
  getValidationRules() {
    return { ...this.validationRules };
  }

  /**
   * Update validation rules
   * @param {Object} rules - New validation rules
   */
  updateValidationRules(rules) {
    if (!rules || typeof rules !== 'object') {
      throw new GitWorkflowException('Validation rules must be an object', {}, 'update_rules');
    }
    
    Object.assign(this.validationRules, rules);
  }
}

module.exports = GitWorkflowValidator; 