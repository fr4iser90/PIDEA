/**
 * Centralized Validation Utility
 * Eliminates DRY violations in validation patterns across all controllers
 * Provides common validation functions with consistent error messages
 */

class ValidationUtility {
  constructor() {
    this.commonValidators = {
      required: this.validateRequired.bind(this),
      string: this.validateString.bind(this),
      number: this.validateNumber.bind(this),
      boolean: this.validateBoolean.bind(this),
      array: this.validateArray.bind(this),
      object: this.validateObject.bind(this),
      email: this.validateEmail.bind(this),
      uuid: this.validateUuid.bind(this),
      path: this.validatePath.bind(this),
      url: this.validateUrl.bind(this),
    };
  }

  /**
   * Validate request body against schema
   * @param {Object} body - Request body
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateRequest(body, schema) {
    const errors = [];
    const warnings = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];
      const fieldErrors = this.validateField(field, value, rules);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single field against rules
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {Object|Array} rules - Validation rules
   * @returns {Array} Array of error messages
   */
  validateField(field, value, rules) {
    const errors = [];

    // Handle array of rules
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        const error = this.validateField(field, value, rule);
        if (error) errors.push(error);
      }
      return errors;
    }

    // Handle single rule object
    if (typeof rules === 'object' && rules !== null) {
      for (const [ruleName, ruleValue] of Object.entries(rules)) {
        const error = this.validateRule(field, value, ruleName, ruleValue);
        if (error) errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Validate a single rule
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {string} ruleName - Rule name
   * @param {*} ruleValue - Rule value
   * @returns {string|null} Error message or null
   */
  validateRule(field, value, ruleName, ruleValue) {
    if (this.commonValidators[ruleName]) {
      const result = this.commonValidators[ruleName](value, ruleValue);
      if (!result.isValid) {
        return `${field}: ${result.message}`;
      }
    }
    return null;
  }

  /**
   * Validate required field
   * @param {*} value - Field value
   * @param {boolean} required - Whether field is required
   * @returns {Object} Validation result
   */
  validateRequired(value, required = true) {
    if (required && (value === undefined || value === null || value === '')) {
      return {
        isValid: false,
        message: 'Field is required'
      };
    }
    return { isValid: true };
  }

  /**
   * Validate string field
   * @param {*} value - Field value
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateString(value, options = {}) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    if (typeof value !== 'string') {
      return {
        isValid: false,
        message: 'Must be a string'
      };
    }

    const { minLength, maxLength, pattern } = options;

    if (minLength !== undefined && value.length < minLength) {
      return {
        isValid: false,
        message: `Must be at least ${minLength} characters long`
      };
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return {
        isValid: false,
        message: `Must be no more than ${maxLength} characters long`
      };
    }

    if (pattern && !new RegExp(pattern).test(value)) {
      return {
        isValid: false,
        message: 'Does not match required pattern'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate number field
   * @param {*} value - Field value
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateNumber(value, options = {}) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    const num = Number(value);
    if (isNaN(num)) {
      return {
        isValid: false,
        message: 'Must be a valid number'
      };
    }

    const { min, max, integer } = options;

    if (min !== undefined && num < min) {
      return {
        isValid: false,
        message: `Must be at least ${min}`
      };
    }

    if (max !== undefined && num > max) {
      return {
        isValid: false,
        message: `Must be no more than ${max}`
      };
    }

    if (integer && !Number.isInteger(num)) {
      return {
        isValid: false,
        message: 'Must be an integer'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate boolean field
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validateBoolean(value) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    if (typeof value !== 'boolean') {
      return {
        isValid: false,
        message: 'Must be a boolean'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate array field
   * @param {*} value - Field value
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateArray(value, options = {}) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    if (!Array.isArray(value)) {
      return {
        isValid: false,
        message: 'Must be an array'
      };
    }

    const { minLength, maxLength } = options;

    if (minLength !== undefined && value.length < minLength) {
      return {
        isValid: false,
        message: `Must have at least ${minLength} items`
      };
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return {
        isValid: false,
        message: `Must have no more than ${maxLength} items`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate object field
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validateObject(value) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return {
        isValid: false,
        message: 'Must be an object'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate email field
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validateEmail(value) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        isValid: false,
        message: 'Must be a valid email address'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate UUID field
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validateUuid(value) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return {
        isValid: false,
        message: 'Must be a valid UUID'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate path field
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validatePath(value) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    if (typeof value !== 'string' || value.length === 0) {
      return {
        isValid: false,
        message: 'Must be a non-empty string'
      };
    }

    if (value.includes('\0')) {
      return {
        isValid: false,
        message: 'Path contains invalid characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate URL field
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validateUrl(value) {
    if (value === undefined || value === null) {
      return { isValid: true }; // Let required validator handle this
    }

    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        message: 'Must be a valid URL'
      };
    }
  }

  /**
   * Common validation schemas
   */
  static getCommonSchemas() {
    return {
      projectRequest: {
        projectId: { required: true, string: { minLength: 1 } },
        projectPath: { required: true, path: true },
        config: { object: true }
      },
      userRequest: {
        userId: { required: true, string: { minLength: 1 } },
        email: { required: true, email: true }
      },
      paginationRequest: {
        page: { number: { min: 1, integer: true } },
        limit: { number: { min: 1, max: 100, integer: true } },
        sortBy: { string: { minLength: 1 } },
        sortOrder: { string: { pattern: '^(asc|desc)$' } }
      }
    };
  }
}

module.exports = ValidationUtility;
