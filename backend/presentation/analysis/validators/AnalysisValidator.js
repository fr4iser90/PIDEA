/**
 * AnalysisValidator - Domain-specific validation for Analysis
 * 
 * Centralizes all analysis-related validation logic to follow DRY principles
 * and ensure consistent validation across the Analysis domain.
 */

class AnalysisValidator {
  constructor() {
    this.validationRules = {
      analysis: {
        projectId: { required: true, type: 'string', minLength: 1 },
        projectPath: { required: true, type: 'string', minLength: 1 },
        analysisType: { required: false, type: 'string', allowedValues: ['project', 'architecture', 'security', 'performance', 'dependencies', 'comprehensive'] },
        config: { required: false, type: 'object' },
        mode: { required: false, type: 'string', allowedValues: ['project-analysis', 'architecture-analysis', 'security-analysis', 'performance-analysis', 'dependency-analysis', 'analysis'] }
      },
      config: {
        depth: { required: false, type: 'number', min: 1, max: 10 },
        includeTests: { required: false, type: 'boolean' },
        includeDependencies: { required: false, type: 'boolean' },
        severity: { required: false, type: 'array' },
        metrics: { required: false, type: 'array' },
        samplingInterval: { required: false, type: 'number', min: 100, max: 10000 },
        duration: { required: false, type: 'number', min: 1000, max: 300000 }
      }
    };
  }

  /**
   * Validate analysis request data
   * @param {Object} data - Analysis data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateAnalysisData(data, isUpdate = false) {
    return this.validateData(data, this.validationRules.analysis, isUpdate);
  }

  /**
   * Validate analysis configuration
   * @param {Object} config - Configuration to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateAnalysisConfig(config, isUpdate = false) {
    return this.validateData(config, this.validationRules.config, isUpdate);
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
   * Validate project path
   * @param {string} projectPath - Project path to validate
   * @returns {Object} Validation result
   */
  validateProjectPath(projectPath) {
    const errors = [];
    
    if (!projectPath) {
      errors.push("Project path is required");
    } else if (typeof projectPath !== 'string') {
      errors.push("Project path must be a string");
    } else if (projectPath.trim().length === 0) {
      errors.push("Project path cannot be empty");
    } else if (!projectPath.startsWith('/') && !projectPath.match(/^[A-Za-z]:/)) {
      errors.push("Project path must be an absolute path");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate analysis type
   * @param {string} analysisType - Analysis type to validate
   * @returns {Object} Validation result
   */
  validateAnalysisType(analysisType) {
    const errors = [];
    const validTypes = ['project', 'architecture', 'security', 'performance', 'dependencies', 'comprehensive'];
    
    if (analysisType && !validTypes.includes(analysisType)) {
      errors.push(`Analysis type must be one of: ${validTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate severity levels
   * @param {Array} severity - Severity levels to validate
   * @returns {Object} Validation result
   */
  validateSeverity(severity) {
    const errors = [];
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    
    if (severity && Array.isArray(severity)) {
      const invalidSeverities = severity.filter(s => !validSeverities.includes(s));
      if (invalidSeverities.length > 0) {
        errors.push(`Invalid severity levels: ${invalidSeverities.join(', ')}. Must be one of: ${validSeverities.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate metrics
   * @param {Array} metrics - Metrics to validate
   * @returns {Object} Validation result
   */
  validateMetrics(metrics) {
    const errors = [];
    const validMetrics = ['cpu', 'memory', 'network', 'database', 'coupling', 'cohesion', 'complexity'];
    
    if (metrics && Array.isArray(metrics)) {
      const invalidMetrics = metrics.filter(m => !validMetrics.includes(m));
      if (invalidMetrics.length > 0) {
        errors.push(`Invalid metrics: ${invalidMetrics.join(', ')}. Must be one of: ${validMetrics.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate sampling interval
   * @param {number} interval - Sampling interval to validate
   * @returns {Object} Validation result
   */
  validateSamplingInterval(interval) {
    const errors = [];
    
    if (interval !== undefined && interval !== null) {
      if (typeof interval !== 'number' || isNaN(interval)) {
        errors.push("Sampling interval must be a number");
      } else if (interval < 100) {
        errors.push("Sampling interval must be at least 100ms");
      } else if (interval > 10000) {
        errors.push("Sampling interval must be at most 10000ms");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate analysis duration
   * @param {number} duration - Duration to validate
   * @returns {Object} Validation result
   */
  validateDuration(duration) {
    const errors = [];
    
    if (duration !== undefined && duration !== null) {
      if (typeof duration !== 'number' || isNaN(duration)) {
        errors.push("Duration must be a number");
      } else if (duration < 1000) {
        errors.push("Duration must be at least 1000ms");
      } else if (duration > 300000) {
        errors.push("Duration must be at most 300000ms (5 minutes)");
      }
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

module.exports = AnalysisValidator;
