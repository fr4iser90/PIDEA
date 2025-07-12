/**
 * BaseWorkflowStep - Base workflow step implementation
 * Provides common functionality for all workflow steps
 */
const IWorkflowStep = require('../interfaces/IWorkflowStep');
const ValidationException = require('../exceptions/ValidationException');
const ValidationResult = require('../validation/ValidationResult');

/**
 * Base workflow step implementation
 */
class BaseWorkflowStep extends IWorkflowStep {
  constructor(name, description, type = 'generic') {
    super();
    this._name = name;
    this._description = description;
    this._type = type;
    this._metadata = {};
    this._validationRules = [];
    this._dependencies = [];
  }

  /**
   * Execute the workflow step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Step execution result
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      // Validate step before execution
      const validationResult = await this.validate(context);
      if (!validationResult.isValid) {
        throw new ValidationException('Step validation failed', validationResult);
      }

      // Execute step implementation
      const result = await this.executeStep(context);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        stepName: this._name,
        result,
        duration,
        metadata: this._metadata
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        stepName: this._name,
        error: error.message,
        duration,
        metadata: this._metadata
      };
    }
  }

  /**
   * Execute step implementation (to be overridden)
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<*>} Step result
   */
  async executeStep(context) {
    throw new Error('executeStep must be implemented by subclass');
  }

  /**
   * Validate step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validate(context) {
    const results = [];
    let isValid = true;

    // Apply validation rules
    for (const rule of this._validationRules) {
      try {
        const ruleValidation = await rule.validate(context);
        results.push(ruleValidation);
        
        if (!ruleValidation.isValid) {
          isValid = false;
        }
      } catch (error) {
        results.push(new ValidationResult(undefined, false, [error.message], [], {}));
        isValid = false;
      }
    }

    return new ValidationResult(undefined, isValid, results, [], {});
  }

  /**
   * Rollback step execution
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context) {
    // Default rollback implementation
    return {
      success: true,
      stepName: this._name,
      message: 'Step rollback completed'
    };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      name: this._name,
      description: this._description,
      type: this._type,
      version: this._metadata.version || '1.0.0',
      validationRules: this._validationRules.length,
      dependencies: this._dependencies.length
    };
  }

  /**
   * Add validation rule
   * @param {ValidationRule} rule - Validation rule
   */
  addValidationRule(rule) {
    this._validationRules.push(rule);
  }

  /**
   * Set metadata
   * @param {Object} metadata - Step metadata
   */
  setMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
  }

  /**
   * Get step name
   * @returns {string} Step name
   */
  getName() {
    return this._name;
  }

  /**
   * Get step description
   * @returns {string} Step description
   */
  getDescription() {
    return this._description;
  }

  /**
   * Get step type
   * @returns {string} Step type
   */
  getType() {
    return this._type;
  }

  /**
   * Get step dependencies
   * @returns {Array<string>} Step dependencies
   */
  getDependencies() {
    return [...this._dependencies];
  }

  /**
   * Set step dependencies
   * @param {Array<string>} dependencies - Step dependencies
   */
  setDependencies(dependencies) {
    this._dependencies = [...dependencies];
  }

  /**
   * Add dependency
   * @param {string} dependency - Dependency ID
   */
  addDependency(dependency) {
    this._dependencies.push(dependency);
  }

  /**
   * Remove dependency
   * @param {string} dependency - Dependency ID
   */
  removeDependency(dependency) {
    const index = this._dependencies.indexOf(dependency);
    if (index > -1) {
      this._dependencies.splice(index, 1);
    }
  }

  /**
   * Check if step has dependencies
   * @returns {boolean} True if step has dependencies
   */
  hasDependencies() {
    return this._dependencies.length > 0;
  }

  /**
   * Get validation rules
   * @returns {Array<ValidationRule>} Validation rules
   */
  getValidationRules() {
    return [...this._validationRules];
  }

  /**
   * Clear validation rules
   */
  clearValidationRules() {
    this._validationRules = [];
  }

  /**
   * Check if step has validation rules
   * @returns {boolean} True if step has validation rules
   */
  hasValidationRules() {
    return this._validationRules.length > 0;
  }

  /**
   * Get step version
   * @returns {string} Step version
   */
  getVersion() {
    return this._metadata.version || '1.0.0';
  }

  /**
   * Set step version
   * @param {string} version - Step version
   */
  setVersion(version) {
    this._metadata.version = version;
  }

  /**
   * Check if step can execute
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<boolean>} True if step can execute
   */
  async canExecute(context) {
    try {
      const validationResult = await this.validate(context);
      return validationResult.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get step configuration
   * @returns {Object} Step configuration
   */
  getConfiguration() {
    return {
      name: this._name,
      description: this._description,
      type: this._type,
      metadata: { ...this._metadata },
      dependencies: [...this._dependencies],
      validationRules: this._validationRules.length
    };
  }

  /**
   * Clone step
   * @returns {BaseWorkflowStep} Cloned step
   */
  clone() {
    const clonedStep = new this.constructor();
    clonedStep._name = this._name;
    clonedStep._description = this._description;
    clonedStep._type = this._type;
    clonedStep._metadata = { ...this._metadata };
    clonedStep._validationRules = [...this._validationRules];
    clonedStep._dependencies = [...this._dependencies];
    return clonedStep;
  }

  /**
   * Compare with another step
   * @param {BaseWorkflowStep} other - Other step
   * @returns {boolean} True if steps are equal
   */
  equals(other) {
    if (!(other instanceof BaseWorkflowStep)) {
      return false;
    }

    return (
      this._name === other._name &&
      this._description === other._description &&
      this._type === other._type &&
      JSON.stringify(this._metadata) === JSON.stringify(other._metadata) &&
      JSON.stringify(this._dependencies) === JSON.stringify(other._dependencies)
    );
  }

  /**
   * Convert step to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this._name,
      description: this._description,
      type: this._type,
      metadata: this._metadata,
      dependencies: this._dependencies,
      validationRules: this._validationRules.length
    };
  }

  /**
   * Create step from JSON
   * @param {Object} json - JSON representation
   * @returns {BaseWorkflowStep} Step instance
   */
  static fromJSON(json) {
    const step = new BaseWorkflowStep(json.name, json.description, json.type);
    step._metadata = json.metadata || {};
    step._dependencies = json.dependencies || [];
    return step;
  }
}

module.exports = BaseWorkflowStep; 