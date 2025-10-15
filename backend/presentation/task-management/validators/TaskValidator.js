/**
 * TaskValidator - Domain-specific validation for Task Management
 * 
 * Centralizes all task-related validation logic to follow DRY principles
 * and ensure consistent validation across the Task Management domain.
 */

class TaskValidator {
  constructor() {
    this.validationRules = {
      task: {
        title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
        description: { required: false, type: 'string', maxLength: 1000 },
        priority: { required: false, type: 'string', allowedValues: ['low', 'medium', 'high', 'critical'] },
        status: { required: false, type: 'string', allowedValues: ['pending', 'in-progress', 'completed', 'cancelled'] },
        category: { required: false, type: 'string', allowedValues: ['bug', 'feature', 'refactor', 'test', 'documentation'] },
        estimatedTime: { required: false, type: 'number', min: 0, max: 999 },
        tags: { required: false, type: 'array' }
      },
      workflow: {
        name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        description: { required: false, type: 'string', maxLength: 500 },
        steps: { required: true, type: 'array', minLength: 1 },
        status: { required: false, type: 'string', allowedValues: ['draft', 'active', 'paused', 'completed'] }
      },
      script: {
        name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        content: { required: true, type: 'string', minLength: 1 },
        language: { required: false, type: 'string', allowedValues: ['bash', 'powershell', 'python', 'javascript'] },
        type: { required: false, type: 'string', allowedValues: ['build', 'test', 'deploy', 'cleanup'] }
      }
    };
  }

  /**
   * Validate task data
   * @param {Object} data - Task data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateTaskData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.task, isUpdate);
  }

  /**
   * Validate workflow data
   * @param {Object} data - Workflow data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateWorkflowData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.workflow, isUpdate);
  }

  /**
   * Validate script data
   * @param {Object} data - Script data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateScriptData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.script, isUpdate);
  }

  /**
   * Validate task ID parameter
   * @param {string} taskId - Task ID to validate
   * @returns {Object} Validation result
   */
  validateTaskId(taskId) {
    const errors = [];
    
    if (!taskId) {
      errors.push("Task ID is required");
    } else if (typeof taskId !== 'string') {
      errors.push("Task ID must be a string");
    } else if (taskId.trim().length === 0) {
      errors.push("Task ID cannot be empty");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate project ID parameter
   * @param {string} projectId - Project ID to validate
   * @returns {Object} Validation result
   */
  validateProjectId(projectId) {
    const errors = [];
    
    if (!projectId) {
      errors.push("Project ID is required");
    } else if (typeof projectId !== 'string') {
      errors.push("Project ID must be a string");
    } else if (projectId.trim().length === 0) {
      errors.push("Project ID cannot be empty");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate task status transition
   * @param {string} currentStatus - Current task status
   * @param {string} newStatus - New task status
   * @returns {Object} Validation result
   */
  validateStatusTransition(currentStatus, newStatus) {
    const errors = [];
    
    const validTransitions = {
      'pending': ['in-progress', 'cancelled'],
      'in-progress': ['completed', 'cancelled'],
      'completed': [], // No transitions from completed
      'cancelled': [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus]) {
      errors.push(`Invalid current status: ${currentStatus}`);
    } else if (!validTransitions[currentStatus].includes(newStatus)) {
      errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate task priority
   * @param {string} priority - Priority to validate
   * @returns {Object} Validation result
   */
  validatePriority(priority) {
    const errors = [];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    
    if (priority && !validPriorities.includes(priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate task category
   * @param {string} category - Category to validate
   * @returns {Object} Validation result
   */
  validateCategory(category) {
    const errors = [];
    const validCategories = ['bug', 'feature', 'refactor', 'test', 'documentation'];
    
    if (category && !validCategories.includes(category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generic data validation method
   * @param {Object} data - Data to validate
   * @param {Object} rules - Validation rules
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateData(data, rules, isUpdate = false) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push("Data must be an object");
      return { isValid: false, errors };
    }

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const fieldErrors = this.validateField(value, field, rule, isUpdate);
      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single field
   * @param {any} value - Value to validate
   * @param {string} fieldName - Name of the field
   * @param {Object} rule - Validation rule for the field
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of error messages
   */
  validateField(value, fieldName, rule, isUpdate = false) {
    const errors = [];

    // Check if field is required
    if (rule.required && !isUpdate && (value === undefined || value === null)) {
      errors.push(`${fieldName} is required`);
      return errors;
    }

    // Skip validation if field is not provided in update
    if (isUpdate && value === undefined) {
      return errors;
    }

    // Type validation
    if (value !== undefined && value !== null && rule.type) {
      if (!this.validateType(value, rule.type)) {
        errors.push(`${fieldName} must be a ${rule.type}`);
        return errors;
      }
    }

    // String-specific validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${fieldName} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${fieldName} must be at most ${rule.maxLength} characters long`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${fieldName} format is invalid`);
      }
    }

    // Number-specific validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${fieldName} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${fieldName} must be at most ${rule.max}`);
      }
    }

    // Array-specific validations
    if (rule.type === 'array' && Array.isArray(value)) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${fieldName} must have at least ${rule.minLength} items`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${fieldName} must have at most ${rule.maxLength} items`);
      }
    }

    // Enum validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rule.allowedValues.join(', ')}`);
    }

    return errors;
  }

  /**
   * Validate data type
   * @param {any} value - Value to check
   * @param {string} expectedType - Expected type
   * @returns {boolean} Whether the type is correct
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

module.exports = TaskValidator;
