/**
 * ExecutionResult - Handles workflow execution results
 * Provides structured result data and metadata for workflow execution
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Execution result for workflow execution
 */
class ExecutionResult {
  constructor(options = {}) {
    this.id = options.id || uuidv4();
    this.success = options.success !== false;
    this.strategy = options.strategy || 'unknown';
    this.duration = options.duration || 0;
    this.results = options.results || [];
    this.stepCount = options.stepCount || 0;
    this.error = options.error || null;
    this.metadata = options.metadata || {};
    this.timestamp = options.timestamp || new Date();
    
    // Performance metrics
    this.performanceMetrics = options.performanceMetrics || {};
    
    // Execution details
    this.executionId = options.executionId || null;
    this.workflowId = options.workflowId || null;
    this.workflowName = options.workflowName || null;
    
    // Step results
    this.stepResults = options.stepResults || [];
    this.failedSteps = options.failedSteps || [];
    this.successfulSteps = options.successfulSteps || [];
    
    // Resource usage
    this.resourceUsage = options.resourceUsage || {
      memory: 0,
      cpu: 0,
      disk: 0
    };
    
    this._validate();
  }

  /**
   * Validate execution result
   * @private
   */
  _validate() {
    if (typeof this.success !== 'boolean') {
      throw new Error('Success must be a boolean value');
    }
    
    if (typeof this.duration !== 'number' || this.duration < 0) {
      throw new Error('Duration must be a non-negative number');
    }
    
    if (typeof this.stepCount !== 'number' || this.stepCount < 0) {
      throw new Error('Step count must be a non-negative number');
    }
  }

  /**
   * Get result ID
   * @returns {string} Result ID
   */
  getId() {
    return this.id;
  }

  /**
   * Check if execution was successful
   * @returns {boolean} True if successful
   */
  isSuccess() {
    return this.success;
  }

  /**
   * Check if execution failed
   * @returns {boolean} True if failed
   */
  isFailure() {
    return !this.success;
  }

  /**
   * Get execution strategy
   * @returns {string} Execution strategy
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Get execution duration
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    return this.duration;
  }

  /**
   * Get formatted duration
   * @returns {string} Formatted duration
   */
  getFormattedDuration() {
    const seconds = Math.floor(this.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get execution results
   * @returns {Array} Execution results
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Get step count
   * @returns {number} Step count
   */
  getStepCount() {
    return this.stepCount;
  }

  /**
   * Get error
   * @returns {string|null} Error message
   */
  getError() {
    return this.error;
  }

  /**
   * Get metadata
   * @returns {Object} Metadata
   */
  getMetadata() {
    return { ...this.metadata };
  }

  /**
   * Get metadata value
   * @param {string} key - Metadata key
   * @param {*} defaultValue - Default value
   * @returns {*} Metadata value
   */
  getMetadataValue(key, defaultValue = null) {
    return this.metadata[key] !== undefined ? this.metadata[key] : defaultValue;
  }

  /**
   * Set metadata value
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadataValue(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Get timestamp
   * @returns {Date} Timestamp
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Set performance metric
   * @param {string} key - Metric key
   * @param {*} value - Metric value
   */
  setPerformanceMetric(key, value) {
    this.performanceMetrics[key] = value;
  }

  /**
   * Get performance metric
   * @param {string} key - Metric key
   * @param {*} defaultValue - Default value
   * @returns {*} Performance metric
   */
  getPerformanceMetric(key, defaultValue = null) {
    return this.performanceMetrics[key] !== undefined ? this.performanceMetrics[key] : defaultValue;
  }

  /**
   * Get execution ID
   * @returns {string|null} Execution ID
   */
  getExecutionId() {
    return this.executionId;
  }

  /**
   * Set execution ID
   * @param {string} executionId - Execution ID
   */
  setExecutionId(executionId) {
    this.executionId = executionId;
  }

  /**
   * Get workflow ID
   * @returns {string|null} Workflow ID
   */
  getWorkflowId() {
    return this.workflowId;
  }

  /**
   * Set workflow ID
   * @param {string} workflowId - Workflow ID
   */
  setWorkflowId(workflowId) {
    this.workflowId = workflowId;
  }

  /**
   * Get workflow name
   * @returns {string|null} Workflow name
   */
  getWorkflowName() {
    return this.workflowName;
  }

  /**
   * Set workflow name
   * @param {string} workflowName - Workflow name
   */
  setWorkflowName(workflowName) {
    this.workflowName = workflowName;
  }

  /**
   * Get step results
   * @returns {Array} Step results
   */
  getStepResults() {
    return [...this.stepResults];
  }

  /**
   * Add step result
   * @param {Object} stepResult - Step result
   */
  addStepResult(stepResult) {
    this.stepResults.push({
      ...stepResult,
      timestamp: new Date()
    });
  }

  /**
   * Get failed steps
   * @returns {Array} Failed steps
   */
  getFailedSteps() {
    return [...this.failedSteps];
  }

  /**
   * Add failed step
   * @param {Object} failedStep - Failed step
   */
  addFailedStep(failedStep) {
    this.failedSteps.push({
      ...failedStep,
      timestamp: new Date()
    });
  }

  /**
   * Get successful steps
   * @returns {Array} Successful steps
   */
  getSuccessfulSteps() {
    return [...this.successfulSteps];
  }

  /**
   * Add successful step
   * @param {Object} successfulStep - Successful step
   */
  addSuccessfulStep(successfulStep) {
    this.successfulSteps.push({
      ...successfulStep,
      timestamp: new Date()
    });
  }

  /**
   * Get resource usage
   * @returns {Object} Resource usage
   */
  getResourceUsage() {
    return { ...this.resourceUsage };
  }

  /**
   * Set resource usage
   * @param {Object} resourceUsage - Resource usage
   */
  setResourceUsage(resourceUsage) {
    this.resourceUsage = { ...resourceUsage };
  }

  /**
   * Get success rate
   * @returns {number} Success rate (0-1)
   */
  getSuccessRate() {
    if (this.stepCount === 0) {
      return 0;
    }
    
    return this.successfulSteps.length / this.stepCount;
  }

  /**
   * Get failure rate
   * @returns {number} Failure rate (0-1)
   */
  getFailureRate() {
    if (this.stepCount === 0) {
      return 0;
    }
    
    return this.failedSteps.length / this.stepCount;
  }

  /**
   * Get average step duration
   * @returns {number} Average step duration in milliseconds
   */
  getAverageStepDuration() {
    if (this.stepResults.length === 0) {
      return 0;
    }
    
    const totalDuration = this.stepResults.reduce((sum, step) => {
      return sum + (step.duration || 0);
    }, 0);
    
    return totalDuration / this.stepResults.length;
  }

  /**
   * Get execution summary
   * @returns {Object} Execution summary
   */
  getSummary() {
    return {
      id: this.id,
      success: this.success,
      strategy: this.strategy,
      duration: this.duration,
      formattedDuration: this.getFormattedDuration(),
      stepCount: this.stepCount,
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
      averageStepDuration: this.getAverageStepDuration(),
      error: this.error,
      executionId: this.executionId,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      timestamp: this.timestamp
    };
  }

  /**
   * Check if result has error
   * @returns {boolean} True if has error
   */
  hasError() {
    return this.error !== null && this.error !== undefined;
  }

  /**
   * Get error details
   * @returns {Object} Error details
   */
  getErrorDetails() {
    if (!this.hasError()) {
      return null;
    }
    
    return {
      message: this.error,
      timestamp: this.timestamp,
      strategy: this.strategy,
      duration: this.duration
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      success: this.success,
      strategy: this.strategy,
      duration: this.duration,
      results: this.results,
      stepCount: this.stepCount,
      error: this.error,
      metadata: this.metadata,
      timestamp: this.timestamp,
      performanceMetrics: this.performanceMetrics,
      executionId: this.executionId,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      stepResults: this.stepResults,
      failedSteps: this.failedSteps,
      successfulSteps: this.successfulSteps,
      resourceUsage: this.resourceUsage
    };
  }

  /**
   * Create success result
   * @param {Object} options - Result options
   * @returns {ExecutionResult} Success result
   */
  static createSuccess(options = {}) {
    return new ExecutionResult({
      ...options,
      success: true
    });
  }

  /**
   * Create failure result
   * @param {string} error - Error message
   * @param {Object} options - Result options
   * @returns {ExecutionResult} Failure result
   */
  static createFailure(error, options = {}) {
    return new ExecutionResult({
      ...options,
      success: false,
      error
    });
  }

  /**
   * Create from JSON
   * @param {Object} data - JSON data
   * @returns {ExecutionResult} Execution result
   */
  static fromJSON(data) {
    return new ExecutionResult({
      id: data.id,
      success: data.success,
      strategy: data.strategy,
      duration: data.duration,
      results: data.results,
      stepCount: data.stepCount,
      error: data.error,
      metadata: data.metadata,
      timestamp: data.timestamp,
      performanceMetrics: data.performanceMetrics,
      executionId: data.executionId,
      workflowId: data.workflowId,
      workflowName: data.workflowName,
      stepResults: data.stepResults,
      failedSteps: data.failedSteps,
      successfulSteps: data.successfulSteps,
      resourceUsage: data.resourceUsage
    });
  }
}

module.exports = ExecutionResult; 