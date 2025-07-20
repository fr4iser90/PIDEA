/**
 * Step Validator
 * Validates step module structure and configuration
 */

const Logger = require('@logging/Logger');
const logger = new Logger('StepValidator');

class StepValidator {
  /**
   * Validate step module structure
   * @param {Object} stepModule - The step module to validate
   * @param {string} stepPath - Path to the step file
   * @returns {Object} Validation result
   */
  static validateStepModule(stepModule, stepPath) {
    const result = {
      isValid: false,
      errors: [],
      warnings: [],
      type: null,
      hasConfig: false,
      hasExecute: false
    };

    try {
      // Check if module exists
      if (!stepModule) {
        result.errors.push('Step module is null or undefined');
        return result;
      }

      // Determine module type
      if (typeof stepModule === 'function' && stepModule.prototype) {
        result.type = 'class';
      } else if (typeof stepModule === 'object' && stepModule !== null) {
        result.type = 'object';
      } else {
        result.errors.push(`Invalid module type: ${typeof stepModule}`);
        return result;
      }

      // Check for config
      if (result.type === 'class') {
        result.hasConfig = !!stepModule.prototype.config || !!stepModule.config;
      } else {
        result.hasConfig = !!stepModule.config;
      }

      // Check for execute method
      if (result.type === 'class') {
        result.hasExecute = typeof stepModule.prototype.execute === 'function' || typeof stepModule.execute === 'function';
      } else {
        result.hasExecute = typeof stepModule.execute === 'function';
      }

      // Validate required components
      if (!result.hasConfig) {
        result.warnings.push('Step has no config property');
      }

      if (!result.hasExecute) {
        result.errors.push('Step has no execute method');
      }

      // Check for proper export
      if (result.type === 'class' && !stepModule.name) {
        result.warnings.push('Step class has no name property');
      }

      // Determine if valid
      result.isValid = result.hasExecute && result.errors.length === 0;

      logger.debug(`Step validation for ${stepPath}:`, {
        isValid: result.isValid,
        type: result.type,
        hasConfig: result.hasConfig,
        hasExecute: result.hasExecute,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
      logger.error(`Step validation failed for ${stepPath}:`, error.message);
    }

    return result;
  }

  /**
   * Validate step configuration
   * @param {Object} config - Step configuration
   * @returns {Object} Validation result
   */
  static validateStepConfig(config) {
    const result = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      if (!config) {
        result.errors.push('Step configuration is missing');
        return result;
      }

      // Check required fields
      if (!config.name) {
        result.errors.push('Step name is required');
      }

      if (!config.type) {
        result.warnings.push('Step type is recommended');
      }

      if (!config.category) {
        result.warnings.push('Step category is recommended');
      }

      if (!config.description) {
        result.warnings.push('Step description is recommended');
      }

      // Validate dependencies
      if (config.dependencies && !Array.isArray(config.dependencies)) {
        result.errors.push('Dependencies must be an array');
      }

      // Determine if valid
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Configuration validation error: ${error.message}`);
    }

    return result;
  }
}

module.exports = StepValidator; 