/**
 * ProjectValidator - Domain-specific validation for Project Management
 * 
 * Centralizes all project-related validation logic to follow DRY principles
 * and ensure consistent validation across the Project Management domain.
 */

class ProjectValidator {
  constructor() {
    this.validationRules = {
      project: {
        name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        workspacePath: { required: true, type: 'string', minLength: 1 },
        description: { required: false, type: 'string', maxLength: 500 },
        port: { required: false, type: 'number', min: 3000, max: 9999 }
      },
      interface: {
        name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
        type: { required: true, type: 'string', allowedValues: ['vscode', 'webstorm', 'intellij', 'sublime'] },
        port: { required: false, type: 'number', min: 3000, max: 9999 },
        status: { required: false, type: 'string', allowedValues: ['active', 'inactive', 'error'] }
      },
      version: {
        version: { required: true, type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
        description: { required: false, type: 'string', maxLength: 200 }
      }
    };
  }

  /**
   * Validate project data
   * @param {Object} data - Project data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateProjectData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.project, isUpdate);
  }

  /**
   * Validate interface data
   * @param {Object} data - Interface data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateInterfaceData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.interface, isUpdate);
  }

  /**
   * Validate version data
   * @param {Object} data - Version data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateVersionData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.version, isUpdate);
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
   * Validate workspace path
   * @param {string} workspacePath - Workspace path to validate
   * @returns {Object} Validation result
   */
  validateWorkspacePath(workspacePath) {
    const errors = [];
    
    if (!workspacePath) {
      errors.push("Workspace path is required");
    } else if (typeof workspacePath !== 'string') {
      errors.push("Workspace path must be a string");
    } else if (workspacePath.trim().length === 0) {
      errors.push("Workspace path cannot be empty");
    } else if (!workspacePath.startsWith('/') && !workspacePath.match(/^[A-Za-z]:/)) {
      errors.push("Workspace path must be an absolute path");
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

module.exports = ProjectValidator;
