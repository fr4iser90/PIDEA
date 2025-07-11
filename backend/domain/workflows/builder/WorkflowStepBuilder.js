/**
 * WorkflowStepBuilder - Builder for workflow steps
 * Provides fluent interface for creating and configuring workflow steps
 */
const StepRegistry = require('../steps/StepRegistry');

/**
 * Workflow step builder with fluent interface
 */
class WorkflowStepBuilder {
  constructor() {
    this._stepType = null;
    this._options = {};
    this._metadata = {};
    this._validationRules = [];
    this._dependencies = [];
  }

  /**
   * Set step type
   * @param {string} stepType - Step type name
   * @returns {WorkflowStepBuilder} Builder instance
   */
  setType(stepType) {
    this._stepType = stepType;
    return this;
  }

  /**
   * Set step options
   * @param {Object} options - Step options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  setOptions(options) {
    this._options = { ...this._options, ...options };
    return this;
  }

  /**
   * Set step metadata
   * @param {Object} metadata - Step metadata
   * @returns {WorkflowStepBuilder} Builder instance
   */
  setMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  /**
   * Add validation rule
   * @param {ValidationRule} rule - Validation rule
   * @returns {WorkflowStepBuilder} Builder instance
   */
  addValidationRule(rule) {
    this._validationRules.push(rule);
    return this;
  }

  /**
   * Add dependency
   * @param {string} dependency - Dependency ID
   * @returns {WorkflowStepBuilder} Builder instance
   */
  addDependency(dependency) {
    this._dependencies.push(dependency);
    return this;
  }

  /**
   * Add multiple dependencies
   * @param {Array<string>} dependencies - Dependency IDs
   * @returns {WorkflowStepBuilder} Builder instance
   */
  addDependencies(dependencies) {
    this._dependencies.push(...dependencies);
    return this;
  }

  /**
   * Build workflow step
   * @returns {IWorkflowStep} Workflow step instance
   */
  build() {
    if (!this._stepType) {
      throw new Error('Step type is required');
    }

    const stepClass = StepRegistry.getStep(this._stepType);
    const step = new stepClass(this._options);

    // Apply metadata
    if (Object.keys(this._metadata).length > 0) {
      step.setMetadata(this._metadata);
    }

    // Apply validation rules
    for (const rule of this._validationRules) {
      step.addValidationRule(rule);
    }

    // Apply dependencies if step supports them
    if (this._dependencies.length > 0 && step.setDependencies) {
      step.setDependencies(this._dependencies);
    }

    return step;
  }

  /**
   * Create step from template
   * @param {string} templateName - Template name
   * @param {Object} options - Template options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static fromTemplate(templateName, options = {}) {
    const builder = new WorkflowStepBuilder();
    const template = StepRegistry.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Step template not found: ${templateName}`);
    }
    
    return template.apply(builder, options);
  }

  /**
   * Create analysis step
   * @param {Object} options - Analysis options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static analysis(options = {}) {
    return new WorkflowStepBuilder()
      .setType('analysis')
      .setOptions(options);
  }

  /**
   * Create refactoring step
   * @param {Object} options - Refactoring options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static refactoring(options = {}) {
    return new WorkflowStepBuilder()
      .setType('refactoring')
      .setOptions(options);
  }

  /**
   * Create testing step
   * @param {Object} options - Testing options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static testing(options = {}) {
    return new WorkflowStepBuilder()
      .setType('testing')
      .setOptions(options);
  }

  /**
   * Create documentation step
   * @param {Object} options - Documentation options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static documentation(options = {}) {
    return new WorkflowStepBuilder()
      .setType('documentation')
      .setOptions(options);
  }

  /**
   * Create validation step
   * @param {Object} options - Validation options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static validation(options = {}) {
    return new WorkflowStepBuilder()
      .setType('validation')
      .setOptions(options);
  }

  /**
   * Create deployment step
   * @param {Object} options - Deployment options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static deployment(options = {}) {
    return new WorkflowStepBuilder()
      .setType('deployment')
      .setOptions(options);
  }

  /**
   * Create security step
   * @param {Object} options - Security options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static security(options = {}) {
    return new WorkflowStepBuilder()
      .setType('security')
      .setOptions(options);
  }

  /**
   * Create optimization step
   * @param {Object} options - Optimization options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  static optimization(options = {}) {
    return new WorkflowStepBuilder()
      .setType('optimization')
      .setOptions(options);
  }

  /**
   * Get current step type
   * @returns {string|null} Current step type
   */
  getStepType() {
    return this._stepType;
  }

  /**
   * Get current options
   * @returns {Object} Current options
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Get current metadata
   * @returns {Object} Current metadata
   */
  getMetadata() {
    return { ...this._metadata };
  }

  /**
   * Get current validation rules
   * @returns {Array<ValidationRule>} Current validation rules
   */
  getValidationRules() {
    return [...this._validationRules];
  }

  /**
   * Get current dependencies
   * @returns {Array<string>} Current dependencies
   */
  getDependencies() {
    return [...this._dependencies];
  }

  /**
   * Clear all options
   * @returns {WorkflowStepBuilder} Builder instance
   */
  clearOptions() {
    this._options = {};
    return this;
  }

  /**
   * Clear all metadata
   * @returns {WorkflowStepBuilder} Builder instance
   */
  clearMetadata() {
    this._metadata = {};
    return this;
  }

  /**
   * Clear all validation rules
   * @returns {WorkflowStepBuilder} Builder instance
   */
  clearValidationRules() {
    this._validationRules = [];
    return this;
  }

  /**
   * Clear all dependencies
   * @returns {WorkflowStepBuilder} Builder instance
   */
  clearDependencies() {
    this._dependencies = [];
    return this;
  }

  /**
   * Check if step type is set
   * @returns {boolean} True if step type is set
   */
  hasStepType() {
    return this._stepType !== null;
  }

  /**
   * Check if has options
   * @returns {boolean} True if has options
   */
  hasOptions() {
    return Object.keys(this._options).length > 0;
  }

  /**
   * Check if has metadata
   * @returns {boolean} True if has metadata
   */
  hasMetadata() {
    return Object.keys(this._metadata).length > 0;
  }

  /**
   * Check if has validation rules
   * @returns {boolean} True if has validation rules
   */
  hasValidationRules() {
    return this._validationRules.length > 0;
  }

  /**
   * Check if has dependencies
   * @returns {boolean} True if has dependencies
   */
  hasDependencies() {
    return this._dependencies.length > 0;
  }
}

module.exports = WorkflowStepBuilder; 