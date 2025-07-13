/**
 * IWorkflow - Interface for workflow implementations
 * 
 * This interface defines the contract that all workflows must implement
 * in the domain layer. It provides a consistent API for workflow
 * execution, validation, and metadata access.
 */
class IWorkflow {
  /**
   * Execute workflow
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Execution result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Validate workflow
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Validation result
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Rollback workflow execution
   * @param {IWorkflowContext} context - Workflow context
   * @param {string} stepId - Step to rollback to
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(context, stepId) {
    throw new Error('rollback method must be implemented');
  }

  /**
   * Get workflow metadata
   * @returns {Object} Workflow metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Check if workflow can be executed
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<boolean>} True if workflow can be executed
   */
  async canExecute(context) {
    throw new Error('canExecute method must be implemented');
  }

  /**
   * Get workflow dependencies
   * @returns {Array<string>} List of dependency IDs
   */
  getDependencies() {
    throw new Error('getDependencies method must be implemented');
  }

  /**
   * Get workflow steps
   * @returns {Array<IWorkflowStep>} List of workflow steps
   */
  getSteps() {
    throw new Error('getSteps method must be implemented');
  }

  /**
   * Get workflow type
   * @returns {string} Workflow type
   */
  getType() {
    throw new Error('getType method must be implemented');
  }

  /**
   * Get workflow version
   * @returns {string} Workflow version
   */
  getVersion() {
    throw new Error('getVersion method must be implemented');
  }
}

module.exports = IWorkflow; 