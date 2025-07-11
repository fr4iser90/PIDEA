/**
 * AutomationResult - Automation result
 * Represents the result of automation execution
 */
const { v4: uuidv4 } = require('uuid');

class AutomationResult {
  constructor(
    id = uuidv4(),
    taskId = null,
    automationLevel = null,
    confidenceScore = null,
    success = false,
    data = {},
    metadata = {},
    errors = [],
    warnings = [],
    executionTime = 0,
    createdAt = new Date()
  ) {
    this._id = id;
    this._taskId = taskId;
    this._automationLevel = automationLevel;
    this._confidenceScore = confidenceScore;
    this._success = success;
    this._data = { ...data };
    this._metadata = { ...metadata };
    this._errors = [...errors];
    this._warnings = [...warnings];
    this._executionTime = executionTime;
    this._createdAt = new Date(createdAt);
    this._completedAt = null;
    this._executionSteps = [];
  }

  /**
   * Get result ID
   * @returns {string} Result ID
   */
  get id() {
    return this._id;
  }

  /**
   * Get task ID
   * @returns {string|null} Task ID
   */
  get taskId() {
    return this._taskId;
  }

  /**
   * Get automation level
   * @returns {string|null} Automation level
   */
  get automationLevel() {
    return this._automationLevel;
  }

  /**
   * Get confidence score
   * @returns {number|null} Confidence score
   */
  get confidenceScore() {
    return this._confidenceScore;
  }

  /**
   * Check if execution was successful
   * @returns {boolean} True if successful
   */
  get success() {
    return this._success;
  }

  /**
   * Get result data
   * @returns {Object} Result data
   */
  get data() {
    return { ...this._data };
  }

  /**
   * Get result metadata
   * @returns {Object} Result metadata
   */
  get metadata() {
    return { ...this._metadata };
  }

  /**
   * Get errors
   * @returns {Array} Errors
   */
  get errors() {
    return [...this._errors];
  }

  /**
   * Get warnings
   * @returns {Array} Warnings
   */
  get warnings() {
    return [...this._warnings];
  }

  /**
   * Get execution time
   * @returns {number} Execution time in milliseconds
   */
  get executionTime() {
    return this._executionTime;
  }

  /**
   * Get creation date
   * @returns {Date} Creation date
   */
  get createdAt() {
    return new Date(this._createdAt);
  }

  /**
   * Get completion date
   * @returns {Date|null} Completion date
   */
  get completedAt() {
    return this._completedAt ? new Date(this._completedAt) : null;
  }

  /**
   * Get execution steps
   * @returns {Array} Execution steps
   */
  get executionSteps() {
    return [...this._executionSteps];
  }

  /**
   * Set automation level
   * @param {string} level - Automation level
   */
  setAutomationLevel(level) {
    this._automationLevel = level;
  }

  /**
   * Set confidence score
   * @param {number} score - Confidence score
   */
  setConfidenceScore(score) {
    this._confidenceScore = score;
  }

  /**
   * Set success status
   * @param {boolean} success - Success status
   */
  setSuccess(success) {
    this._success = success;
    if (success && !this._completedAt) {
      this._completedAt = new Date();
    }
  }

  /**
   * Set result data
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  setData(key, value) {
    this._data[key] = value;
  }

  /**
   * Get result data
   * @param {string} key - Data key
   * @returns {*} Data value
   */
  getData(key) {
    return this._data[key];
  }

  /**
   * Set result metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this._metadata[key] = value;
  }

  /**
   * Get result metadata
   * @param {string} key - Metadata key
   * @returns {*} Metadata value
   */
  getMetadata(key) {
    return this._metadata[key];
  }

  /**
   * Add error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   */
  addError(message, details = {}) {
    this._errors.push({
      id: uuidv4(),
      message,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Add warning
   * @param {string} message - Warning message
   * @param {Object} details - Warning details
   */
  addWarning(message, details = {}) {
    this._warnings.push({
      id: uuidv4(),
      message,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Set execution time
   * @param {number} time - Execution time in milliseconds
   */
  setExecutionTime(time) {
    this._executionTime = time;
  }

  /**
   * Add execution step
   * @param {string} step - Step name
   * @param {Object} data - Step data
   * @param {number} duration - Step duration
   */
  addExecutionStep(step, data = {}, duration = 0) {
    this._executionSteps.push({
      id: uuidv4(),
      step,
      data,
      duration,
      timestamp: new Date()
    });
  }

  /**
   * Mark as completed
   */
  complete() {
    this._completedAt = new Date();
    if (!this._executionTime && this._createdAt) {
      this._executionTime = this._completedAt.getTime() - this._createdAt.getTime();
    }
  }

  /**
   * Check if result has errors
   * @returns {boolean} True if has errors
   */
  hasErrors() {
    return this._errors.length > 0;
  }

  /**
   * Check if result has warnings
   * @returns {boolean} True if has warnings
   */
  hasWarnings() {
    return this._warnings.length > 0;
  }

  /**
   * Get latest error
   * @returns {Object|null} Latest error
   */
  getLatestError() {
    return this._errors.length > 0 ? this._errors[this._errors.length - 1] : null;
  }

  /**
   * Get latest warning
   * @returns {Object|null} Latest warning
   */
  getLatestWarning() {
    return this._warnings.length > 0 ? this._warnings[this._warnings.length - 1] : null;
  }

  /**
   * Get result summary
   * @returns {Object} Result summary
   */
  getSummary() {
    return {
      id: this._id,
      taskId: this._taskId,
      automationLevel: this._automationLevel,
      confidenceScore: this._confidenceScore,
      success: this._success,
      dataKeys: Object.keys(this._data),
      metadataKeys: Object.keys(this._metadata),
      errorCount: this._errors.length,
      warningCount: this._warnings.length,
      stepCount: this._executionSteps.length,
      executionTime: this._executionTime,
      createdAt: this._createdAt.toISOString(),
      completedAt: this._completedAt ? this._completedAt.toISOString() : null
    };
  }

  /**
   * Get formatted execution time
   * @returns {string} Formatted execution time
   */
  getFormattedExecutionTime() {
    if (this._executionTime < 1000) {
      return `${this._executionTime}ms`;
    } else if (this._executionTime < 60000) {
      return `${(this._executionTime / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(this._executionTime / 60000);
      const seconds = ((this._executionTime % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Convert result to JSON
   * @returns {Object} Result JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      taskId: this._taskId,
      automationLevel: this._automationLevel,
      confidenceScore: this._confidenceScore,
      success: this._success,
      data: this._data,
      metadata: this._metadata,
      errors: this._errors,
      warnings: this._warnings,
      executionTime: this._executionTime,
      executionSteps: this._executionSteps,
      createdAt: this._createdAt.toISOString(),
      completedAt: this._completedAt ? this._completedAt.toISOString() : null,
      formattedExecutionTime: this.getFormattedExecutionTime()
    };
  }

  /**
   * Create result from JSON
   * @param {Object} data - Result data
   * @returns {AutomationResult} New result instance
   */
  static fromJSON(data) {
    const result = new AutomationResult(
      data.id,
      data.taskId,
      data.automationLevel,
      data.confidenceScore,
      data.success,
      data.data,
      data.metadata,
      data.errors,
      data.warnings,
      data.executionTime,
      data.createdAt
    );

    if (data.completedAt) {
      result._completedAt = new Date(data.completedAt);
    }

    if (data.executionSteps) {
      result._executionSteps = [...data.executionSteps];
    }

    return result;
  }

  /**
   * Create successful result
   * @param {string} taskId - Task ID
   * @param {string} automationLevel - Automation level
   * @param {number} confidenceScore - Confidence score
   * @param {Object} data - Result data
   * @returns {AutomationResult} New successful result
   */
  static createSuccess(taskId, automationLevel, confidenceScore, data = {}) {
    const result = new AutomationResult(
      null,
      taskId,
      automationLevel,
      confidenceScore,
      true,
      data
    );
    result.complete();
    return result;
  }

  /**
   * Create failed result
   * @param {string} taskId - Task ID
   * @param {string} automationLevel - Automation level
   * @param {Array} errors - Errors
   * @returns {AutomationResult} New failed result
   */
  static createFailure(taskId, automationLevel, errors = []) {
    const result = new AutomationResult(
      null,
      taskId,
      automationLevel,
      null,
      false,
      {},
      {},
      errors
    );
    result.complete();
    return result;
  }

  /**
   * Merge results
   * @param {AutomationResult} other - Other result to merge
   * @returns {AutomationResult} Merged result
   */
  merge(other) {
    // Merge data
    this._data = { ...this._data, ...other._data };

    // Merge metadata
    this._metadata = { ...this._metadata, ...other._metadata };

    // Merge errors
    this._errors = [...this._errors, ...other._errors];

    // Merge warnings
    this._warnings = [...this._warnings, ...other._warnings];

    // Merge execution steps
    this._executionSteps = [...this._executionSteps, ...other._executionSteps];

    // Update execution time
    this._executionTime += other._executionTime;

    // Update success status (both must be successful)
    this._success = this._success && other._success;

    // Update confidence score (average)
    if (this._confidenceScore !== null && other._confidenceScore !== null) {
      this._confidenceScore = (this._confidenceScore + other._confidenceScore) / 2;
    } else if (other._confidenceScore !== null) {
      this._confidenceScore = other._confidenceScore;
    }

    return this;
  }
}

module.exports = AutomationResult; 