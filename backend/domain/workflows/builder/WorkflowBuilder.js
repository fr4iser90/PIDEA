/**
 * WorkflowBuilder - Main workflow builder with fluent interface
 * Provides a fluent API for building composed workflows with steps, metadata, and validation
 */
const ComposedWorkflow = require('./ComposedWorkflow');
const WorkflowTemplateRegistry = require('./WorkflowTemplateRegistry');

/**
 * Workflow builder with fluent interface
 */
class WorkflowBuilder {
  constructor() {
    this._steps = [];
    this._metadata = {};
    this._validationRules = [];
    this._rollbackStrategy = null;
  }

  /**
   * Add step to workflow
   * @param {IWorkflowStep} step - Workflow step
   * @returns {WorkflowBuilder} Builder instance
   */
  addStep(step) {
    this._steps.push(step);
    return this;
  }

  /**
   * Add multiple steps to workflow
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @returns {WorkflowBuilder} Builder instance
   */
  addSteps(steps) {
    this._steps.push(...steps);
    return this;
  }

  /**
   * Set workflow metadata
   * @param {Object} metadata - Workflow metadata
   * @returns {WorkflowBuilder} Builder instance
   */
  setMetadata(metadata) {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  /**
   * Add validation rule
   * @param {ValidationRule} rule - Validation rule
   * @returns {WorkflowBuilder} Builder instance
   */
  addValidationRule(rule) {
    this._validationRules.push(rule);
    return this;
  }

  /**
   * Set rollback strategy
   * @param {RollbackStrategy} strategy - Rollback strategy
   * @returns {WorkflowBuilder} Builder instance
   */
  setRollbackStrategy(strategy) {
    this._rollbackStrategy = strategy;
    return this;
  }

  /**
   * Build composed workflow
   * @returns {ComposedWorkflow} Composed workflow instance
   */
  build() {
    return new ComposedWorkflow(
      this._steps,
      this._metadata,
      this._validationRules,
      this._rollbackStrategy
    );
  }

  /**
   * Create workflow from template
   * @param {string} templateName - Template name
   * @param {Object} options - Template options
   * @returns {WorkflowBuilder} Builder instance
   */
  static fromTemplate(templateName, options = {}) {
    const builder = new WorkflowBuilder();
    const template = WorkflowTemplateRegistry.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Workflow template not found: ${templateName}`);
    }
    
    return template.apply(builder, options);
  }

  /**
   * Get current steps count
   * @returns {number} Number of steps
   */
  getStepsCount() {
    return this._steps.length;
  }

  /**
   * Get current metadata
   * @returns {Object} Current metadata
   */
  getMetadata() {
    return { ...this._metadata };
  }

  /**
   * Clear all steps
   * @returns {WorkflowBuilder} Builder instance
   */
  clearSteps() {
    this._steps = [];
    return this;
  }

  /**
   * Clear all validation rules
   * @returns {WorkflowBuilder} Builder instance
   */
  clearValidationRules() {
    this._validationRules = [];
    return this;
  }

  /**
   * Remove step by index
   * @param {number} index - Step index to remove
   * @returns {WorkflowBuilder} Builder instance
   */
  removeStep(index) {
    if (index >= 0 && index < this._steps.length) {
      this._steps.splice(index, 1);
    }
    return this;
  }

  /**
   * Insert step at specific index
   * @param {number} index - Index to insert at
   * @param {IWorkflowStep} step - Workflow step
   * @returns {WorkflowBuilder} Builder instance
   */
  insertStep(index, step) {
    if (index >= 0 && index <= this._steps.length) {
      this._steps.splice(index, 0, step);
    }
    return this;
  }

  /**
   * Replace step at specific index
   * @param {number} index - Index to replace
   * @param {IWorkflowStep} step - New workflow step
   * @returns {WorkflowBuilder} Builder instance
   */
  replaceStep(index, step) {
    if (index >= 0 && index < this._steps.length) {
      this._steps[index] = step;
    }
    return this;
  }

  /**
   * Get step at specific index
   * @param {number} index - Step index
   * @returns {IWorkflowStep|null} Workflow step or null
   */
  getStep(index) {
    return this._steps[index] || null;
  }

  /**
   * Get all steps
   * @returns {Array<IWorkflowStep>} All workflow steps
   */
  getSteps() {
    return [...this._steps];
  }

  /**
   * Check if workflow has steps
   * @returns {boolean} True if workflow has steps
   */
  hasSteps() {
    return this._steps.length > 0;
  }

  /**
   * Check if workflow has validation rules
   * @returns {boolean} True if workflow has validation rules
   */
  hasValidationRules() {
    return this._validationRules.length > 0;
  }

  /**
   * Check if workflow has rollback strategy
   * @returns {boolean} True if workflow has rollback strategy
   */
  hasRollbackStrategy() {
    return this._rollbackStrategy !== null;
  }
}

module.exports = WorkflowBuilder; 