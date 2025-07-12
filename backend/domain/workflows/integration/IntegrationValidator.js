/**
 * IntegrationValidator - Integration validation and verification
 * 
 * This class provides comprehensive validation for integration operations,
 * including request validation, component validation, and setup verification.
 * It ensures that all integration operations are safe and properly configured.
 */
class IntegrationValidator {
  /**
   * Create a new integration validator
   * @param {Object} options - Validator options
   */
  constructor(options = {}) {
    this.options = {
      enableStrictValidation: options.enableStrictValidation !== false,
      maxRequestSize: options.maxRequestSize || 1024 * 1024, // 1MB
      allowedIntegrationTypes: options.allowedIntegrationTypes || ['workflow', 'handler', 'step', 'system'],
      allowedComponentTypes: options.allowedComponentTypes || ['handler', 'step', 'service'],
      enableSecurityValidation: options.enableSecurityValidation !== false,
      ...options
    };
    
    this.validators = new Map();
    this.validationRules = new Map();
    
    this.initializeValidators();
  }

  /**
   * Initialize validators
   */
  initializeValidators() {
    // Register default validators
    this.registerValidator('request', this.validateIntegrationRequest.bind(this));
    this.registerValidator('component', this.validateComponent.bind(this));
    this.registerValidator('setup', this.validateIntegrationSetup.bind(this));
    this.registerValidator('security', this.validateSecurity.bind(this));
    this.registerValidator('performance', this.validatePerformance.bind(this));
  }

  /**
   * Initialize validator
   * @param {Object} config - Validator configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    this.options = { ...this.options, ...config };
    
    // Load custom validation rules if provided
    if (config.validationRules) {
      for (const [ruleName, rule] of Object.entries(config.validationRules)) {
        this.registerValidationRule(ruleName, rule);
      }
    }
  }

  /**
   * Register validator
   * @param {string} type - Validator type
   * @param {Function} validator - Validator function
   */
  registerValidator(type, validator) {
    if (typeof validator !== 'function') {
      throw new Error('Validator must be a function');
    }
    this.validators.set(type, validator);
  }

  /**
   * Register validation rule
   * @param {string} ruleName - Rule name
   * @param {Object} rule - Validation rule
   */
  registerValidationRule(ruleName, rule) {
    this.validationRules.set(ruleName, rule);
  }

  /**
   * Validate integration request
   * @param {Object} request - Integration request
   * @returns {Promise<Object>} Validation result
   */
  async validateIntegrationRequest(request) {
    const errors = [];
    const warnings = [];

    try {
      // Basic request validation
      if (!request) {
        errors.push('Request is required');
        return { isValid: false, errors, warnings };
      }

      // Validate request type
      if (!request.type) {
        errors.push('Request type is required');
      } else if (!this.options.allowedIntegrationTypes.includes(request.type)) {
        errors.push(`Invalid integration type: ${request.type}`);
      }

      // Validate request size
      const requestSize = JSON.stringify(request).length;
      if (requestSize > this.options.maxRequestSize) {
        errors.push(`Request size exceeds maximum allowed size: ${requestSize} bytes`);
      }

      // Type-specific validation
      switch (request.type) {
        case 'workflow':
          const workflowValidation = await this.validateWorkflowRequest(request);
          errors.push(...workflowValidation.errors);
          warnings.push(...workflowValidation.warnings);
          break;
        case 'handler':
          const handlerValidation = await this.validateHandlerRequest(request);
          errors.push(...handlerValidation.errors);
          warnings.push(...handlerValidation.warnings);
          break;
        case 'step':
          const stepValidation = await this.validateStepRequest(request);
          errors.push(...stepValidation.errors);
          warnings.push(...stepValidation.warnings);
          break;
        case 'system':
          const systemValidation = await this.validateSystemRequest(request);
          errors.push(...systemValidation.errors);
          warnings.push(...systemValidation.warnings);
          break;
      }

      // Security validation
      if (this.options.enableSecurityValidation) {
        const securityValidation = await this.validateSecurity(request);
        errors.push(...securityValidation.errors);
        warnings.push(...securityValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate workflow request
   * @param {Object} request - Workflow request
   * @returns {Promise<Object>} Validation result
   */
  async validateWorkflowRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request.workflow) {
      errors.push('Workflow data is required for workflow integration');
    } else {
      if (!request.workflow.type && !request.workflow.workflowType) {
        errors.push('Workflow type is required');
      }
      
      if (!request.workflow.data && !request.workflow.payload) {
        warnings.push('Workflow data/payload is recommended');
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate handler request
   * @param {Object} request - Handler request
   * @returns {Promise<Object>} Validation result
   */
  async validateHandlerRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request.handlerType) {
      errors.push('Handler type is required for handler integration');
    }

    if (!request.data && !request.payload) {
      warnings.push('Handler data/payload is recommended');
    }

    return { errors, warnings };
  }

  /**
   * Validate step request
   * @param {Object} request - Step request
   * @returns {Promise<Object>} Validation result
   */
  async validateStepRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request.stepType) {
      errors.push('Step type is required for step integration');
    }

    if (!request.data && !request.payload) {
      warnings.push('Step data/payload is recommended');
    }

    return { errors, warnings };
  }

  /**
   * Validate system request
   * @param {Object} request - System request
   * @returns {Promise<Object>} Validation result
   */
  async validateSystemRequest(request) {
    const errors = [];
    const warnings = [];

    if (request.testConfig && typeof request.testConfig !== 'object') {
      errors.push('Test configuration must be an object');
    }

    return { errors, warnings };
  }

  /**
   * Validate component
   * @param {string} componentType - Component type
   * @param {Object} component - Component instance
   * @returns {Promise<Object>} Validation result
   */
  async validateComponent(componentType, component) {
    const errors = [];
    const warnings = [];

    try {
      // Basic component validation
      if (!component) {
        errors.push('Component instance is required');
        return { isValid: false, errors, warnings };
      }

      // Validate component type
      if (!this.options.allowedComponentTypes.includes(componentType)) {
        errors.push(`Invalid component type: ${componentType}`);
      }

      // Type-specific validation
      switch (componentType) {
        case 'handler':
          const handlerValidation = await this.validateHandlerComponent(component);
          errors.push(...handlerValidation.errors);
          warnings.push(...handlerValidation.warnings);
          break;
        case 'step':
          const stepValidation = await this.validateStepComponent(component);
          errors.push(...stepValidation.errors);
          warnings.push(...stepValidation.warnings);
          break;
        case 'service':
          const serviceValidation = await this.validateServiceComponent(component);
          errors.push(...serviceValidation.errors);
          warnings.push(...serviceValidation.warnings);
          break;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Component validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate handler component
   * @param {Object} handler - Handler component
   * @returns {Promise<Object>} Validation result
   */
  async validateHandlerComponent(handler) {
    const errors = [];
    const warnings = [];

    // Check required methods
    if (typeof handler.handle !== 'function') {
      errors.push('Handler must have a handle method');
    }

    if (typeof handler.getMetadata !== 'function') {
      warnings.push('Handler should have a getMetadata method');
    }

    // Check constructor name
    if (!handler.constructor || !handler.constructor.name) {
      warnings.push('Handler should have a proper constructor name');
    }

    return { errors, warnings };
  }

  /**
   * Validate step component
   * @param {Object} step - Step component
   * @returns {Promise<Object>} Validation result
   */
  async validateStepComponent(step) {
    const errors = [];
    const warnings = [];

    // Check required methods
    if (typeof step.execute !== 'function') {
      errors.push('Step must have an execute method');
    }

    if (typeof step.getMetadata !== 'function') {
      warnings.push('Step should have a getMetadata method');
    }

    // Check constructor name
    if (!step.constructor || !step.constructor.name) {
      warnings.push('Step should have a proper constructor name');
    }

    return { errors, warnings };
  }

  /**
   * Validate service component
   * @param {Object} service - Service component
   * @returns {Promise<Object>} Validation result
   */
  async validateServiceComponent(service) {
    const errors = [];
    const warnings = [];

    // Check if service has at least one method
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
      .filter(name => typeof service[name] === 'function' && name !== 'constructor');

    if (methods.length === 0) {
      warnings.push('Service should have at least one method');
    }

    // Check constructor name
    if (!service.constructor || !service.constructor.name) {
      warnings.push('Service should have a proper constructor name');
    }

    return { errors, warnings };
  }

  /**
   * Validate integration setup
   * @returns {Promise<Object>} Validation result
   */
  async validateIntegrationSetup() {
    const errors = [];
    const warnings = [];

    try {
      // Check if validators are registered
      if (this.validators.size === 0) {
        errors.push('No validators are registered');
      }

      // Check if required validators exist
      const requiredValidators = ['request', 'component'];
      for (const validatorType of requiredValidators) {
        if (!this.validators.has(validatorType)) {
          errors.push(`Required validator not found: ${validatorType}`);
        }
      }

      // Validate options
      if (this.options.maxRequestSize <= 0) {
        errors.push('Max request size must be positive');
      }

      if (this.options.allowedIntegrationTypes.length === 0) {
        errors.push('At least one integration type must be allowed');
      }

      if (this.options.allowedComponentTypes.length === 0) {
        errors.push('At least one component type must be allowed');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Setup validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate security aspects
   * @param {Object} request - Request to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateSecurity(request) {
    const errors = [];
    const warnings = [];

    try {
      // Check for potentially dangerous patterns
      const requestString = JSON.stringify(request);
      
      // Check for script injection patterns
      const scriptPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /Function\s*\(/i
      ];

      for (const pattern of scriptPatterns) {
        if (pattern.test(requestString)) {
          warnings.push('Potential script injection pattern detected');
          break;
        }
      }

      // Check for deep nesting (potential DoS)
      const depth = this.calculateObjectDepth(request);
      if (depth > 10) {
        warnings.push('Request has deep nesting which may cause performance issues');
      }

      // Check for large arrays
      if (request.data && Array.isArray(request.data) && request.data.length > 1000) {
        warnings.push('Large array detected which may cause performance issues');
      }

      return { errors, warnings };

    } catch (error) {
      return {
        errors: [`Security validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate performance aspects
   * @param {Object} request - Request to validate
   * @returns {Promise<Object>} Validation result
   */
  async validatePerformance(request) {
    const errors = [];
    const warnings = [];

    try {
      // Check request size
      const requestSize = JSON.stringify(request).length;
      if (requestSize > this.options.maxRequestSize * 0.8) {
        warnings.push('Request size is approaching the limit');
      }

      // Check for potential performance issues
      if (request.data && typeof request.data === 'object') {
        const keyCount = Object.keys(request.data).length;
        if (keyCount > 100) {
          warnings.push('Request has many properties which may impact performance');
        }
      }

      return { errors, warnings };

    } catch (error) {
      return {
        errors: [`Performance validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Calculate object depth
   * @param {Object} obj - Object to calculate depth for
   * @param {number} currentDepth - Current depth
   * @returns {number} Object depth
   */
  calculateObjectDepth(obj, currentDepth = 0) {
    if (obj === null || typeof obj !== 'object') {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      const depth = this.calculateObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Get validator count
   * @returns {number} Number of registered validators
   */
  getValidatorCount() {
    return this.validators.size;
  }

  /**
   * Get validation rules count
   * @returns {number} Number of validation rules
   */
  getValidationRulesCount() {
    return this.validationRules.size;
  }

  /**
   * Get validator types
   * @returns {Array<string>} Array of validator types
   */
  getValidatorTypes() {
    return Array.from(this.validators.keys());
  }

  /**
   * Cleanup validator
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.validators.clear();
    this.validationRules.clear();
  }
}

module.exports = IntegrationValidator; 