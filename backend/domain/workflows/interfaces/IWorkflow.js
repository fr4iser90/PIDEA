/**
 * IWorkflow - Core workflow interface
 * Defines the contract for workflow execution, validation, and rollback
 */
class IWorkflow {
  /**
   * Execute the workflow with the given context
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<Object>} The execution result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Validate the workflow with the given context
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<IWorkflowValidator>} The validation result
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Rollback the workflow to a previous state
   * @param {IWorkflowContext} context - The workflow context
   * @param {string} stepId - The step to rollback to
   * @returns {Promise<Object>} The rollback result
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
   * Check if workflow can be executed
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<boolean>} True if workflow can be executed
   */
  async canExecute(context) {
    throw new Error('canExecute method must be implemented');
  }

  /**
   * Get workflow type
   * @returns {string} The workflow type
   */
  getType() {
    throw new Error('getType method must be implemented');
  }

  /**
   * Get workflow version
   * @returns {string} The workflow version
   */
  getVersion() {
    throw new Error('getVersion method must be implemented');
  }
}

module.exports = IWorkflow; 