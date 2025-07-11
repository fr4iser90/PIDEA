/**
 * IWorkflowContext - Interface for workflow context
 * Defines the contract for workflow context management
 */
class IWorkflowContext {
  /**
   * Get workflow state
   * @returns {Object} The current workflow state
   */
  getState() {
    throw new Error('getState method must be implemented');
  }

  /**
   * Set workflow state
   * @param {Object} state - The new workflow state
   */
  setState(state) {
    throw new Error('setState method must be implemented');
  }

  /**
   * Get workflow metadata
   * @returns {Object} The workflow metadata
   */
  getMetadata() {
    throw new Error('getMetadata method must be implemented');
  }

  /**
   * Set workflow metadata
   * @param {Object} metadata - The workflow metadata
   */
  setMetadata(metadata) {
    throw new Error('setMetadata method must be implemented');
  }

  /**
   * Get context data by key
   * @param {string} key - The data key
   * @returns {*} The context data
   */
  getData(key) {
    throw new Error('getData method must be implemented');
  }

  /**
   * Set context data by key
   * @param {string} key - The data key
   * @param {*} value - The data value
   */
  setData(key, value) {
    throw new Error('setData method must be implemented');
  }

  /**
   * Check if context has data for key
   * @param {string} key - The data key
   * @returns {boolean} True if data exists
   */
  hasData(key) {
    throw new Error('hasData method must be implemented');
  }

  /**
   * Remove context data by key
   * @param {string} key - The data key
   */
  removeData(key) {
    throw new Error('removeData method must be implemented');
  }

  /**
   * Get all context data
   * @returns {Object} All context data
   */
  getAllData() {
    throw new Error('getAllData method must be implemented');
  }

  /**
   * Get workflow ID
   * @returns {string} The workflow ID
   */
  getWorkflowId() {
    throw new Error('getWorkflowId method must be implemented');
  }

  /**
   * Get workflow type
   * @returns {string} The workflow type
   */
  getWorkflowType() {
    throw new Error('getWorkflowType method must be implemented');
  }

  /**
   * Get workflow version
   * @returns {string} The workflow version
   */
  getWorkflowVersion() {
    throw new Error('getWorkflowVersion method must be implemented');
  }

  /**
   * Get workflow dependencies
   * @returns {Array<string>} List of workflow dependencies
   */
  getDependencies() {
    throw new Error('getDependencies method must be implemented');
  }

  /**
   * Add workflow dependency
   * @param {string} dependencyId - The dependency ID
   */
  addDependency(dependencyId) {
    throw new Error('addDependency method must be implemented');
  }

  /**
   * Remove workflow dependency
   * @param {string} dependencyId - The dependency ID
   */
  removeDependency(dependencyId) {
    throw new Error('removeDependency method must be implemented');
  }

  /**
   * Get workflow metrics
   * @returns {Object} The workflow metrics
   */
  getMetrics() {
    throw new Error('getMetrics method must be implemented');
  }

  /**
   * Set workflow metric
   * @param {string} key - The metric key
   * @param {*} value - The metric value
   */
  setMetric(key, value) {
    throw new Error('setMetric method must be implemented');
  }

  /**
   * Get workflow logs
   * @returns {Array<Object>} The workflow logs
   */
  getLogs() {
    throw new Error('getLogs method must be implemented');
  }

  /**
   * Add workflow log
   * @param {string} level - The log level
   * @param {string} message - The log message
   * @param {Object} data - Additional log data
   */
  addLog(level, message, data = null) {
    throw new Error('addLog method must be implemented');
  }

  /**
   * Clear workflow logs
   */
  clearLogs() {
    throw new Error('clearLogs method must be implemented');
  }

  /**
   * Get workflow execution history
   * @returns {Array<Object>} The execution history
   */
  getExecutionHistory() {
    throw new Error('getExecutionHistory method must be implemented');
  }

  /**
   * Add execution history entry
   * @param {string} action - The action performed
   * @param {Object} data - Additional data
   */
  addExecutionHistory(action, data = null) {
    throw new Error('addExecutionHistory method must be implemented');
  }

  /**
   * Check if workflow is completed
   * @returns {boolean} True if workflow is completed
   */
  isCompleted() {
    throw new Error('isCompleted method must be implemented');
  }

  /**
   * Check if workflow is failed
   * @returns {boolean} True if workflow is failed
   */
  isFailed() {
    throw new Error('isFailed method must be implemented');
  }

  /**
   * Check if workflow is cancelled
   * @returns {boolean} True if workflow is cancelled
   */
  isCancelled() {
    throw new Error('isCancelled method must be implemented');
  }

  /**
   * Get workflow result
   * @returns {*} The workflow result
   */
  getResult() {
    throw new Error('getResult method must be implemented');
  }

  /**
   * Set workflow result
   * @param {*} result - The workflow result
   */
  setResult(result) {
    throw new Error('setResult method must be implemented');
  }

  /**
   * Get workflow error
   * @returns {Error|null} The workflow error
   */
  getError() {
    throw new Error('getError method must be implemented');
  }

  /**
   * Set workflow error
   * @param {Error} error - The workflow error
   */
  setError(error) {
    throw new Error('setError method must be implemented');
  }
}

module.exports = IWorkflowContext; 