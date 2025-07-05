/**
 * TaskExecutionRepository Interface
 * Defines the contract for task execution persistence operations
 */
class TaskExecutionRepository {
  /**
   * Save a task execution
   * @param {TaskExecution} execution - The task execution to save
   * @returns {Promise<TaskExecution>} The saved task execution
   */
  async save(execution) {
    throw new Error('save method must be implemented');
  }

  /**
   * Find a task execution by ID
   * @param {string} id - The execution ID
   * @returns {Promise<TaskExecution|null>} The found execution or null
   */
  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  /**
   * Find executions by task ID
   * @param {string} taskId - The task ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of executions
   */
  async findByTaskId(taskId, filters = {}) {
    throw new Error('findByTaskId method must be implemented');
  }

  /**
   * Find the latest execution for a task
   * @param {string} taskId - The task ID
   * @returns {Promise<TaskExecution|null>} The latest execution or null
   */
  async findLatestByTaskId(taskId) {
    throw new Error('findLatestByTaskId method must be implemented');
  }

  /**
   * Find all executions
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of executions
   */
  async findAll(filters = {}) {
    throw new Error('findAll method must be implemented');
  }

  /**
   * Find executions by status
   * @param {string} status - The execution status
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of executions
   */
  async findByStatus(status, filters = {}) {
    throw new Error('findByStatus method must be implemented');
  }

  /**
   * Find running executions
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of running executions
   */
  async findRunning(filters = {}) {
    throw new Error('findRunning method must be implemented');
  }

  /**
   * Find completed executions
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of completed executions
   */
  async findCompleted(filters = {}) {
    throw new Error('findCompleted method must be implemented');
  }

  /**
   * Find failed executions
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of failed executions
   */
  async findFailed(filters = {}) {
    throw new Error('findFailed method must be implemented');
  }

  /**
   * Find executions within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of executions in date range
   */
  async findByDateRange(startDate, endDate, filters = {}) {
    throw new Error('findByDateRange method must be implemented');
  }

  /**
   * Find executions by duration range
   * @param {number} minDuration - Minimum duration in seconds
   * @param {number} maxDuration - Maximum duration in seconds
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of executions in duration range
   */
  async findByDurationRange(minDuration, maxDuration, filters = {}) {
    throw new Error('findByDurationRange method must be implemented');
  }

  /**
   * Find long-running executions
   * @param {number} threshold - Duration threshold in seconds
   * @param {Object} filters - Optional filters
   * @returns {Promise<TaskExecution[]>} Array of long-running executions
   */
  async findLongRunning(threshold = 3600, filters = {}) {
    throw new Error('findLongRunning method must be implemented');
  }

  /**
   * Count executions by status
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Object with status counts
   */
  async countByStatus(filters = {}) {
    throw new Error('countByStatus method must be implemented');
  }

  /**
   * Get execution statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Execution statistics
   */
  async getStatistics(filters = {}) {
    throw new Error('getStatistics method must be implemented');
  }

  /**
   * Update a task execution
   * @param {string} id - The execution ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<TaskExecution>} The updated execution
   */
  async update(id, updates) {
    throw new Error('update method must be implemented');
  }

  /**
   * Delete a task execution
   * @param {string} id - The execution ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  async delete(id) {
    throw new Error('delete method must be implemented');
  }

  /**
   * Delete executions by task ID
   * @param {string} taskId - The task ID
   * @returns {Promise<number>} Number of deleted executions
   */
  async deleteByTaskId(taskId) {
    throw new Error('deleteByTaskId method must be implemented');
  }

  /**
   * Bulk save executions
   * @param {TaskExecution[]} executions - Array of executions to save
   * @returns {Promise<TaskExecution[]>} Array of saved executions
   */
  async bulkSave(executions) {
    throw new Error('bulkSave method must be implemented');
  }

  /**
   * Bulk update executions
   * @param {Object[]} updates - Array of update objects with id and updates
   * @returns {Promise<TaskExecution[]>} Array of updated executions
   */
  async bulkUpdate(updates) {
    throw new Error('bulkUpdate method must be implemented');
  }

  /**
   * Bulk delete executions
   * @param {string[]} ids - Array of execution IDs to delete
   * @returns {Promise<number>} Number of deleted executions
   */
  async bulkDelete(ids) {
    throw new Error('bulkDelete method must be implemented');
  }

  /**
   * Get executions with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @param {Object} filters - Optional filters
   * @param {Object} sort - Optional sort options
   * @returns {Promise<Object>} Object with executions and pagination info
   */
  async findWithPagination(page = 1, limit = 10, filters = {}, sort = {}) {
    throw new Error('findWithPagination method must be implemented');
  }

  /**
   * Check if an execution exists
   * @param {string} id - The execution ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(id) {
    throw new Error('exists method must be implemented');
  }

  /**
   * Get execution logs
   * @param {string} executionId - The execution ID
   * @param {string} level - Optional log level filter
   * @param {number} limit - Optional limit on number of logs
   * @returns {Promise<Object[]>} Array of log entries
   */
  async getLogs(executionId, level = null, limit = null) {
    throw new Error('getLogs method must be implemented');
  }

  /**
   * Add log entry to execution
   * @param {string} executionId - The execution ID
   * @param {Object} logEntry - The log entry to add
   * @returns {Promise<boolean>} True if added, false otherwise
   */
  async addLog(executionId, logEntry) {
    throw new Error('addLog method must be implemented');
  }

  /**
   * Get execution performance metrics
   * @param {string} executionId - The execution ID
   * @param {string} metricType - Optional metric type filter
   * @returns {Promise<Object[]>} Array of performance metrics
   */
  async getPerformanceMetrics(executionId, metricType = null) {
    throw new Error('getPerformanceMetrics method must be implemented');
  }

  /**
   * Add performance metric to execution
   * @param {string} executionId - The execution ID
   * @param {string} metricType - The metric type
   * @param {number} value - The metric value
   * @returns {Promise<boolean>} True if added, false otherwise
   */
  async addPerformanceMetric(executionId, metricType, value) {
    throw new Error('addPerformanceMetric method must be implemented');
  }

  /**
   * Get execution steps
   * @param {string} executionId - The execution ID
   * @returns {Promise<Object[]>} Array of execution steps
   */
  async getSteps(executionId) {
    throw new Error('getSteps method must be implemented');
  }

  /**
   * Add step to execution
   * @param {string} executionId - The execution ID
   * @param {Object} step - The step to add
   * @returns {Promise<boolean>} True if added, false otherwise
   */
  async addStep(executionId, step) {
    throw new Error('addStep method must be implemented');
  }

  /**
   * Update step in execution
   * @param {string} executionId - The execution ID
   * @param {string} stepName - The step name
   * @param {Object} updates - The updates to apply
   * @returns {Promise<boolean>} True if updated, false otherwise
   */
  async updateStep(executionId, stepName, updates) {
    throw new Error('updateStep method must be implemented');
  }

  /**
   * Clear old executions (cleanup)
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {Promise<number>} Number of cleared executions
   */
  async clearOld(daysOld = 30) {
    throw new Error('clearOld method must be implemented');
  }

  /**
   * Clear all executions (for testing)
   * @returns {Promise<number>} Number of cleared executions
   */
  async clear() {
    throw new Error('clear method must be implemented');
  }
}

module.exports = TaskExecutionRepository; 