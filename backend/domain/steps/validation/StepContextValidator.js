/**
 * StepContextValidator - Comprehensive validation for step execution context
 * Ensures all steps receive required parameters like projectId, step.step, etc.
 */

const Logger = require('@logging/Logger');
const { validationRules, stepOverrides, validationConfig } = require('@config/step-validation-rules');
const logger = new Logger('StepContextValidator');

class StepContextValidator {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    
    // Use configuration from external file
    this.validationRules = validationRules;
    this.stepOverrides = stepOverrides;
    this.config = validationConfig;
    
    // Override with options if provided
    this.strictMode = options.strictMode !== undefined ? options.strictMode : this.config.strictMode;
  }

  /**
   * Validate step context before execution
   * @param {string} stepType - Type of step (ide, terminal, chat, etc.)
   * @param {string} stepName - Name of the step
   * @param {Object} context - Execution context
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateStepContext(stepType, stepName, context, options = {}) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingFields: [],
      invalidFields: [],
      stepType,
      stepName,
      timestamp: new Date()
    };

    try {
      this.logger.info('Validating step context', {
        stepType,
        stepName,
        contextKeys: Object.keys(context || {}),
        strictMode: this.strictMode
      });

      // 1. Validate context object exists
      if (!context || typeof context !== 'object') {
        validationResult.isValid = false;
        validationResult.errors.push('Context must be a valid object');
        return validationResult;
      }

      // 2. Get validation rules for this step type
      const rules = this.getValidationRules(stepType, stepName);
      
      // 3. Validate required fields
      this.validateRequiredFields(context, rules, validationResult);
      
      // 4. Validate field types
      this.validateFieldTypes(context, rules, validationResult);
      
      // 5. Validate nested objects
      this.validateNestedObjects(context, rules, validationResult);
      
      // 6. Validate step-specific requirements
      this.validateStepSpecificRequirements(stepType, stepName, context, validationResult);
      
      // 7. Check for common issues
      this.validateCommonIssues(context, validationResult);
      
      // Determine overall validity
      validationResult.isValid = validationResult.errors.length === 0;
      
      this.logger.info('Step context validation completed', {
        stepType,
        stepName,
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length
      });

      return validationResult;

    } catch (error) {
      this.logger.error('Step context validation failed', {
        stepType,
        stepName,
        error: error.message
      });
      
      validationResult.isValid = false;
      validationResult.errors.push(`Validation error: ${error.message}`);
      return validationResult;
    }
  }

  /**
   * Get validation rules for step type and name
   * @param {string} stepType - Step type
   * @param {string} stepName - Step name
   * @returns {Object} Validation rules
   */
  getValidationRules(stepType, stepName) {
    // Start with common rules
    let rules = { ...this.validationRules.common };
    
    // Add type-specific rules
    if (this.validationRules[stepType]) {
      rules = this.mergeRules(rules, this.validationRules[stepType]);
    }
    
    // Add step-specific overrides
    if (this.stepOverrides[stepName]) {
      rules = this.mergeRules(rules, this.stepOverrides[stepName]);
    }
    
    return rules;
  }

  /**
   * Merge validation rules
   * @param {Object} base - Base rules
   * @param {Object} override - Override rules
   * @returns {Object} Merged rules
   */
  mergeRules(base, override) {
    return {
      required: [...new Set([...(base.required || []), ...(override.required || [])])],
      optional: [...new Set([...(base.optional || []), ...(override.optional || [])])],
      types: { ...(base.types || {}), ...(override.types || {}) },
      nested: { ...(base.nested || {}), ...(override.nested || {}) }
    };
  }

  /**
   * Validate required fields
   * @param {Object} context - Context to validate
   * @param {Object} rules - Validation rules
   * @param {Object} result - Validation result object
   */
  validateRequiredFields(context, rules, result) {
    if (!rules.required) return;
    
    for (const field of rules.required) {
      if (!context.hasOwnProperty(field) || context[field] === null || context[field] === undefined) {
        result.missingFields.push(field);
        result.errors.push(`Required field '${field}' is missing or null`);
      } else if (typeof context[field] === 'string' && context[field].trim() === '') {
        result.missingFields.push(field);
        result.errors.push(`Required field '${field}' is empty`);
      }
    }
  }

  /**
   * Validate field types and custom validators
   * @param {Object} context - Context to validate
   * @param {Object} rules - Validation rules
   * @param {Object} result - Validation result object
   */
  validateFieldTypes(context, rules, result) {
    if (!rules.types) return;
    
    for (const [field, expectedType] of Object.entries(rules.types)) {
      if (context.hasOwnProperty(field) && context[field] !== null && context[field] !== undefined) {
        const actualType = this.getFieldType(context[field]);
        if (actualType !== expectedType) {
          result.invalidFields.push({ field, expected: expectedType, actual: actualType });
          result.errors.push(`Field '${field}' should be ${expectedType}, got ${actualType}`);
        }
        
        // Run custom validators if defined
        if (rules.validators && rules.validators[field]) {
          this.runCustomValidators(field, context[field], rules.validators[field], result);
        }
      }
    }
  }

  /**
   * Run custom validators for a field
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {Object} validators - Validator configuration
   * @param {Object} result - Validation result object
   */
  runCustomValidators(field, value, validators, result) {
    for (const [validatorName, config] of Object.entries(validators)) {
      try {
        const validator = this.config.customValidators[validatorName];
        if (!validator) {
          result.warnings.push(`Unknown validator '${validatorName}' for field '${field}'`);
          continue;
        }

        let isValid = false;
        if (validatorName === 'range') {
          isValid = validator(value, config.min, config.max);
        } else if (validatorName === 'length') {
          isValid = validator(value, config.min, config.max);
        } else if (validatorName === 'enum') {
          isValid = validator(value, config.values);
        } else if (validatorName === 'regex') {
          isValid = validator(value, config.pattern);
        } else {
          isValid = validator(value);
        }

        if (!isValid) {
          result.errors.push(config.message || `Field '${field}' failed ${validatorName} validation`);
        }
      } catch (error) {
        result.warnings.push(`Validator '${validatorName}' failed for field '${field}': ${error.message}`);
      }
    }
  }

  /**
   * Validate nested objects
   * @param {Object} context - Context to validate
   * @param {Object} rules - Validation rules
   * @param {Object} result - Validation result object
   */
  validateNestedObjects(context, rules, result) {
    if (!rules.nested) return;
    
    for (const [field, nestedRules] of Object.entries(rules.nested)) {
      if (context[field] && typeof context[field] === 'object') {
        const nestedResult = this.validateRequiredFields(context[field], nestedRules, {
          errors: [],
          missingFields: []
        });
        
        if (nestedResult.errors.length > 0) {
          result.errors.push(`Nested object '${field}': ${nestedResult.errors.join(', ')}`);
        }
      }
    }
  }

  /**
   * Validate step-specific requirements
   * @param {string} stepType - Step type
   * @param {string} stepName - Step name
   * @param {Object} context - Context to validate
   * @param {Object} result - Validation result object
   */
  validateStepSpecificRequirements(stepType, stepName, context, result) {
    // IDE steps require activeIDE
    if (stepType === 'ide' && !context.activeIDE) {
      result.errors.push('IDE steps require activeIDE context');
    }
    
    // Message steps require message
    if (stepName.includes('message') && !context.message) {
      result.errors.push('Message steps require message context');
    }
    
    // Terminal steps require command or script
    if (stepType === 'terminal' && !context.command && !context.script) {
      result.errors.push('Terminal steps require command or script');
    }
    
    // Git steps require projectPath
    if (stepType === 'git' && !context.projectPath) {
      result.errors.push('Git steps require projectPath');
    }
  }

  /**
   * Validate common issues
   * @param {Object} context - Context to validate
   * @param {Object} result - Validation result object
   */
  validateCommonIssues(context, result) {
    // Check for empty strings in critical fields
    const criticalFields = ['userId', 'projectId'];
    for (const field of criticalFields) {
      if (context[field] && typeof context[field] === 'string' && context[field].trim() === '') {
        result.warnings.push(`Critical field '${field}' is empty`);
      }
    }
    
    // Check for invalid UUIDs
    if (context.projectId && !this.isValidUUID(context.projectId)) {
      result.warnings.push('projectId should be a valid UUID');
    }
    
    if (context.userId && !this.isValidUUID(context.userId)) {
      result.warnings.push('userId should be a valid UUID');
    }
    
    // Check for path consistency
    if (context.projectPath && context.workspacePath && context.projectPath !== context.workspacePath) {
      result.warnings.push('projectPath and workspacePath should be consistent');
    }
  }

  /**
   * Get field type
   * @param {*} value - Value to check
   * @returns {string} Type name
   */
  getFieldType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Check if string is valid UUID
   * @param {string} str - String to check
   * @returns {boolean} Is valid UUID
   */
  isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Validate step configuration
   * @param {Object} step - Step configuration
   * @returns {Object} Validation result
   */
  validateStepConfiguration(step) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      step: step
    };

    if (!step) {
      result.isValid = false;
      result.errors.push('Step configuration is required');
      return result;
    }

    // Validate required step properties
    const requiredStepProps = ['id', 'type', 'step'];
    for (const prop of requiredStepProps) {
      if (!step[prop]) {
        result.errors.push(`Step missing required property: ${prop}`);
      }
    }

    // Validate step type
    if (step.type && !this.validationRules[step.type]) {
      result.warnings.push(`Unknown step type: ${step.type}`);
    }

    // Validate step name
    if (step.step && typeof step.step !== 'string') {
      result.errors.push('Step name must be a string');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      stepTypes: Object.keys(this.validationRules).length,
      stepOverrides: Object.keys(this.stepOverrides).length,
      strictMode: this.strictMode,
      supportedTypes: Object.keys(this.validationRules).filter(type => type !== 'common')
    };
  }
}

module.exports = StepContextValidator;
