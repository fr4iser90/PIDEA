/**
 * IWorkflowStep - Interface for workflow steps
 * Defines the contract for individual workflow steps
 */
class IWorkflowStep {
  /**
   * Execute the workflow step
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<Object>} The step execution result
   */
  async execute(context) {
    throw new Error('execute method must be implemented');
  }

  /**
   * Validate the workflow step
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<IWorkflowValidator>} The validation result
   */
  async validate(context) {
    throw new Error('validate method must be implemented');
  }

  /**
   * Rollback the workflow step
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<Object>} The rollback result
   */
  async rollback(context) {
    throw new Error('rollback method must be implemented');
  }

  /**
   * Get step ID
   * @returns {string} The step ID
   */
  getId() {
    throw new Error('getId method must be implemented');
  }

  /**
   * Get step name
   * @returns {string} The step name
   */
  getName() {
    throw new Error('getName method must be implemented');
  }

  /**
   * Get step description
   * @returns {string} The step description
   */
  getDescription() {
    throw new Error('getDescription method must be implemented');
  }

  /**
   * Get step dependencies
   * @returns {Array<string>} List of step dependency IDs
   */
  getDependencies() {
    throw new Error('getDependencies method must be implemented');
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Check if step can be executed
   * @param {IWorkflowContext} context - The workflow context
   * @returns {Promise<boolean>} True if step can be executed
   */
  async canExecute(context) {
    throw new Error('canExecute method must be implemented');
  }

  /**
   * Get step type
   * @returns {string} The step type
   */
  getType() {
    throw new Error('getType method must be implemented');
  }

  /**
   * Get step timeout in milliseconds
   * @returns {number} The step timeout
   */
  getTimeout() {
    throw new Error('getTimeout method must be implemented');
  }

  /**
   * Get step retry configuration
   * @returns {Object} Retry configuration
   */
  getRetryConfig() {
    throw new Error('getRetryConfig method must be implemented');
  }

  /**
   * Check if step is required
   * @returns {boolean} True if step is required
   */
  isRequired() {
    throw new Error('isRequired method must be implemented');
  }

  /**
   * Check if step can be skipped
   * @returns {boolean} True if step can be skipped
   */
  canSkip() {
    throw new Error('canSkip method must be implemented');
  }
}

module.exports = IWorkflowStep; 