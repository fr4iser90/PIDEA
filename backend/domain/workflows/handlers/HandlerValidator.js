/**
 * HandlerValidator - Validation for handlers and requests
 * 
 * This class provides comprehensive validation for handlers, requests,
 * and contexts. It ensures that handlers are properly configured and
 * requests are valid before execution.
 */
const ValidationResult = require('../validation/ValidationResult');

class HandlerValidator {
  /**
   * Create a new handler validator
   * @param {Object} options - Validator options
   */
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode || false,
      validateMetadata: options.validateMetadata !== false,
      validateDependencies: options.validateDependencies !== false,
      maxRequestSize: options.maxRequestSize || 1024 * 1024, // 1MB
      allowedRequestTypes: options.allowedRequestTypes || [],
      ...options
    };
  }

  /**
   * Validate handler request
   * @param {Object} request - Request to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateRequest(request) {
    const errors = [];
    const warnings = [];

    try {
      // Basic request validation
      if (!request) {
        errors.push('Request is required');
        return new ValidationResult(false, errors, warnings);
      }

      // Validate request type
      if (request.type) {
        if (typeof request.type !== 'string') {
          errors.push('Request type must be a string');
        } else if (this.options.allowedRequestTypes.length > 0 && 
                   !this.options.allowedRequestTypes.includes(request.type)) {
          errors.push(`Request type '${request.type}' is not allowed`);
        }
      }

      // Validate request size
      const requestSize = JSON.stringify(request).length;
      if (requestSize > this.options.maxRequestSize) {
        errors.push(`Request size (${requestSize} bytes) exceeds maximum allowed size (${this.options.maxRequestSize} bytes)`);
      }

      // Validate required fields based on request type
      const typeValidation = await this.validateRequestByType(request);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
        warnings.push(...typeValidation.warnings);
      }

      // Validate request structure
      const structureValidation = this.validateRequestStructure(request);
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
        warnings.push(...structureValidation.warnings);
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate handler
   * @param {IHandler} handler - Handler to validate
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateHandler(handler, context) {
    const errors = [];
    const warnings = [];

    try {
      // Basic handler validation
      if (!handler) {
        errors.push('Handler is required');
        return new ValidationResult(false, errors, warnings);
      }

      // Validate handler interface compliance
      const interfaceValidation = this.validateHandlerInterface(handler);
      if (!interfaceValidation.isValid) {
        errors.push(...interfaceValidation.errors);
        warnings.push(...interfaceValidation.warnings);
      }

      // Validate handler metadata
      if (this.options.validateMetadata) {
        const metadataValidation = this.validateHandlerMetadata(handler);
        if (!metadataValidation.isValid) {
          errors.push(...metadataValidation.errors);
          warnings.push(...metadataValidation.warnings);
        }
      }

      // Validate handler dependencies
      if (this.options.validateDependencies) {
        const dependencyValidation = await this.validateHandlerDependencies(handler, context);
        if (!dependencyValidation.isValid) {
          errors.push(...dependencyValidation.errors);
          warnings.push(...dependencyValidation.warnings);
        }
      }

      // Validate handler health
      const healthValidation = await this.validateHandlerHealth(handler);
      if (!healthValidation.isValid) {
        errors.push(...healthValidation.errors);
        warnings.push(...healthValidation.warnings);
      }

    } catch (error) {
      errors.push(`Handler validation error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate handler context
   * @param {HandlerContext} context - Context to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateContext(context) {
    const errors = [];
    const warnings = [];

    try {
      // Basic context validation
      if (!context) {
        errors.push('Context is required');
        return new ValidationResult(false, errors, warnings);
      }

      // Validate context structure
      if (!context.handlerId) {
        errors.push('Context must have a handler ID');
      }

      if (!context.request) {
        errors.push('Context must have a request');
      }

      if (!context.response) {
        errors.push('Context must have a response');
      }

      // Validate context age
      const contextAge = context.getAge();
      if (contextAge > 300000) { // 5 minutes
        warnings.push(`Context is old (${Math.round(contextAge / 1000)}s), consider refreshing`);
      }

      // Validate context data
      const dataValidation = this.validateContextData(context);
      if (!dataValidation.isValid) {
        errors.push(...dataValidation.errors);
        warnings.push(...dataValidation.warnings);
      }

    } catch (error) {
      errors.push(`Context validation error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate request by type
   * @param {Object} request - Request to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateRequestByType(request) {
    const errors = [];
    const warnings = [];

    const requestType = request.type || 'unknown';

    switch (requestType) {
      case 'workflow':
        if (!request.taskId) {
          errors.push('Workflow requests must have a taskId');
        }
        break;

      case 'command':
        if (!request.command) {
          errors.push('Command requests must have a command');
        }
        break;

      case 'service':
        if (!request.service) {
          errors.push('Service requests must have a service');
        }
        if (!request.method) {
          errors.push('Service requests must have a method');
        }
        break;

      case 'legacy':
        if (!request.handlerClass && !request.handlerPath) {
          errors.push('Legacy requests must have either handlerClass or handlerPath');
        }
        break;

      default:
        if (this.options.strictMode) {
          warnings.push(`Unknown request type: ${requestType}`);
        }
        break;
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate request structure
   * @param {Object} request - Request to validate
   * @returns {ValidationResult} Validation result
   */
  validateRequestStructure(request) {
    const errors = [];
    const warnings = [];

    // Check for circular references
    try {
      JSON.stringify(request);
    } catch (error) {
      errors.push('Request contains circular references');
    }

    // Check for invalid values
    for (const [key, value] of Object.entries(request)) {
      if (value === undefined) {
        errors.push(`Request contains undefined value for key: ${key}`);
      }
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate handler interface compliance
   * @param {IHandler} handler - Handler to validate
   * @returns {ValidationResult} Validation result
   */
  validateHandlerInterface(handler) {
    const errors = [];
    const warnings = [];

    const requiredMethods = [
      'execute',
      'getMetadata',
      'validate',
      'canHandle',
      'getDependencies',
      'getVersion',
      'getType'
    ];

    for (const method of requiredMethods) {
      if (typeof handler[method] !== 'function') {
        errors.push(`Handler must implement ${method} method`);
      }
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate handler metadata
   * @param {IHandler} handler - Handler to validate
   * @returns {ValidationResult} Validation result
   */
  validateHandlerMetadata(handler) {
    const errors = [];
    const warnings = [];

    try {
      const metadata = handler.getMetadata();

      if (!metadata) {
        errors.push('Handler metadata is required');
        return new ValidationResult(false, errors, warnings);
      }

      if (!metadata.name) {
        errors.push('Handler metadata must include a name');
      }

      if (!metadata.version) {
        errors.push('Handler metadata must include a version');
      }

      if (metadata.version && !this.isValidVersion(metadata.version)) {
        warnings.push(`Handler version '${metadata.version}' may not be valid`);
      }

    } catch (error) {
      errors.push(`Metadata validation error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate handler dependencies
   * @param {IHandler} handler - Handler to validate
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateHandlerDependencies(handler, context) {
    const errors = [];
    const warnings = [];

    try {
      const dependencies = handler.getDependencies();

      if (!Array.isArray(dependencies)) {
        errors.push('Handler dependencies must be an array');
        return new ValidationResult(false, errors, warnings);
      }

      // Check if dependencies are available in context
      for (const dependency of dependencies) {
        if (!context.has(dependency)) {
          warnings.push(`Dependency '${dependency}' not found in context`);
        }
      }

    } catch (error) {
      errors.push(`Dependency validation error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate handler health
   * @param {IHandler} handler - Handler to validate
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateHandlerHealth(handler) {
    const errors = [];
    const warnings = [];

    try {
      if (typeof handler.isHealthy === 'function') {
        const isHealthy = await handler.isHealthy();
        if (!isHealthy) {
          errors.push('Handler health check failed');
        }
      }
    } catch (error) {
      warnings.push(`Health check error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validate context data
   * @param {HandlerContext} context - Context to validate
   * @returns {ValidationResult} Validation result
   */
  validateContextData(context) {
    const errors = [];
    const warnings = [];

    try {
      const data = context.getAll();

      // Check for circular references in data
      try {
        JSON.stringify(data);
      } catch (error) {
        errors.push('Context data contains circular references');
      }

      // Check data size
      const dataSize = JSON.stringify(data).length;
      if (dataSize > this.options.maxRequestSize) {
        warnings.push(`Context data size (${dataSize} bytes) is large`);
      }

    } catch (error) {
      errors.push(`Context data validation error: ${error.message}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Check if version string is valid
   * @param {string} version - Version string to validate
   * @returns {boolean} True if valid
   */
  isValidVersion(version) {
    if (typeof version !== 'string') {
      return false;
    }

    // Basic semantic versioning check
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverPattern.test(version);
  }

  /**
   * Get validator options
   * @returns {Object} Validator options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Set validator options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }
}

module.exports = HandlerValidator; 