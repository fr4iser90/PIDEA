/**
 * IWorkflowContext - Interface for workflow context
 * 
 * This interface defines the contract for workflow execution context
 * that provides state, metadata, and data management.
 */
class IWorkflowContext {
  /**
   * Get workflow ID
   * @returns {string} Workflow ID
   */
  getWorkflowId() {
    throw new Error('getWorkflowId method must be implemented');
  }

  /**
   * Get workflow state
   * @returns {Object} Current workflow state
   */
  getState() {
    throw new Error('getState method must be implemented');
  }

  /**
   * Set workflow state
   * @param {Object} state - New workflow state
   */
  setState(state) {
    throw new Error('setState method must be implemented');
  }

  /**
   * Get workflow data
   * @param {string} key - Data key
   * @returns {*} Data value
   */
  getData(key) {
    throw new Error('getData method must be implemented');
  }

  /**
   * Set workflow data
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  setData(key, value) {
    throw new Error('setData method must be implemented');
  }

  /**
   * Check if data exists
   * @param {string} key - Data key
   * @returns {boolean} True if data exists
   */
  hasData(key) {
    throw new Error('hasData method must be implemented');
  }

  /**
   * Remove data
   * @param {string} key - Data key
   */
  removeData(key) {
    throw new Error('removeData method must be implemented');
  }

  /**
   * Get all workflow data
   * @returns {Object} All workflow data
   */
  getAllData() {
    throw new Error('getAllData method must be implemented');
  }

  /**
   * Get workflow metadata
   * @returns {Object} Workflow metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Set workflow metadata
   * @param {Object} metadata - Workflow metadata
   */
  setMetadata(metadata) {
    throw new Error('setMetadata method must be implemented');
  }

  /**
   * Get workflow type
   * @returns {string} Workflow type
   */
  getWorkflowType() {
    throw new Error('getWorkflowType method must be implemented');
  }

  /**
   * Get workflow version
   * @returns {string} Workflow version
   */
  getWorkflowVersion() {
    throw new Error('getWorkflowVersion method must be implemented');
  }

  /**
   * Get workflow dependencies
   * @returns {Array<string>} Workflow dependencies
   */
  getDependencies() {
    throw new Error('getDependencies method must be implemented');
  }

  /**
   * Validate context
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    throw new Error('validate method must be implemented');
  }
}

module.exports = IWorkflowContext; 