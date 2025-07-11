/**
 * AutomationContext - Automation execution context
 * Manages context data for automation execution
 */
const { v4: uuidv4 } = require('uuid');

class AutomationContext {
  constructor(
    id = uuidv4(),
    taskId = null,
    userId = null,
    projectId = null,
    data = {},
    metadata = {},
    createdAt = new Date()
  ) {
    this._id = id;
    this._taskId = taskId;
    this._userId = userId;
    this._projectId = projectId;
    this._data = { ...data };
    this._metadata = { ...metadata };
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(createdAt);
    this._automationLevel = null;
    this._confidenceScore = null;
    this._executionHistory = [];
    this._errors = [];
    this._warnings = [];
  }

  /**
   * Get context ID
   * @returns {string} Context ID
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
   * Get user ID
   * @returns {string|null} User ID
   */
  get userId() {
    return this._userId;
  }

  /**
   * Get project ID
   * @returns {string|null} Project ID
   */
  get projectId() {
    return this._projectId;
  }

  /**
   * Get context data
   * @returns {Object} Context data
   */
  get data() {
    return { ...this._data };
  }

  /**
   * Get context metadata
   * @returns {Object} Context metadata
   */
  get metadata() {
    return { ...this._metadata };
  }

  /**
   * Get creation date
   * @returns {Date} Creation date
   */
  get createdAt() {
    return new Date(this._createdAt);
  }

  /**
   * Get update date
   * @returns {Date} Update date
   */
  get updatedAt() {
    return new Date(this._updatedAt);
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
   * Get execution history
   * @returns {Array} Execution history
   */
  get executionHistory() {
    return [...this._executionHistory];
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
   * Set automation level
   * @param {string} level - Automation level
   */
  setAutomationLevel(level) {
    this._automationLevel = level;
    this._updatedAt = new Date();
    this._addToHistory('automation_level_set', { level });
  }

  /**
   * Set confidence score
   * @param {number} score - Confidence score
   */
  setConfidenceScore(score) {
    this._confidenceScore = score;
    this._updatedAt = new Date();
    this._addToHistory('confidence_score_set', { score });
  }

  /**
   * Set context data
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  setData(key, value) {
    this._data[key] = value;
    this._updatedAt = new Date();
    this._addToHistory('data_set', { key, value });
  }

  /**
   * Get context data
   * @param {string} key - Data key
   * @returns {*} Data value
   */
  getData(key) {
    return this._data[key];
  }

  /**
   * Set context metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this._metadata[key] = value;
    this._updatedAt = new Date();
    this._addToHistory('metadata_set', { key, value });
  }

  /**
   * Get context metadata
   * @param {string} key - Metadata key
   * @returns {*} Metadata value
   */
  getMetadata(key) {
    return this._metadata[key];
  }

  /**
   * Add error to context
   * @param {string} message - Error message
   * @param {Object} details - Error details
   */
  addError(message, details = {}) {
    const error = {
      id: uuidv4(),
      message,
      details,
      timestamp: new Date()
    };
    this._errors.push(error);
    this._updatedAt = new Date();
    this._addToHistory('error_added', error);
  }

  /**
   * Add warning to context
   * @param {string} message - Warning message
   * @param {Object} details - Warning details
   */
  addWarning(message, details = {}) {
    const warning = {
      id: uuidv4(),
      message,
      details,
      timestamp: new Date()
    };
    this._warnings.push(warning);
    this._updatedAt = new Date();
    this._addToHistory('warning_added', warning);
  }

  /**
   * Clear errors
   */
  clearErrors() {
    this._errors = [];
    this._updatedAt = new Date();
    this._addToHistory('errors_cleared', {});
  }

  /**
   * Clear warnings
   */
  clearWarnings() {
    this._warnings = [];
    this._updatedAt = new Date();
    this._addToHistory('warnings_cleared', {});
  }

  /**
   * Add entry to execution history
   * @param {string} action - Action performed
   * @param {Object} data - Action data
   */
  _addToHistory(action, data) {
    this._executionHistory.push({
      id: uuidv4(),
      action,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Get context summary
   * @returns {Object} Context summary
   */
  getSummary() {
    return {
      id: this._id,
      taskId: this._taskId,
      userId: this._userId,
      projectId: this._projectId,
      automationLevel: this._automationLevel,
      confidenceScore: this._confidenceScore,
      dataKeys: Object.keys(this._data),
      metadataKeys: Object.keys(this._metadata),
      errorCount: this._errors.length,
      warningCount: this._warnings.length,
      historyCount: this._executionHistory.length,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }

  /**
   * Check if context has errors
   * @returns {boolean} True if has errors
   */
  hasErrors() {
    return this._errors.length > 0;
  }

  /**
   * Check if context has warnings
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
   * Convert context to JSON
   * @returns {Object} Context JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      taskId: this._taskId,
      userId: this._userId,
      projectId: this._projectId,
      data: this._data,
      metadata: this._metadata,
      automationLevel: this._automationLevel,
      confidenceScore: this._confidenceScore,
      executionHistory: this._executionHistory,
      errors: this._errors,
      warnings: this._warnings,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }

  /**
   * Create context from JSON
   * @param {Object} data - Context data
   * @returns {AutomationContext} New context instance
   */
  static fromJSON(data) {
    const context = new AutomationContext(
      data.id,
      data.taskId,
      data.userId,
      data.projectId,
      data.data,
      data.metadata,
      data.createdAt
    );

    if (data.automationLevel) {
      context.setAutomationLevel(data.automationLevel);
    }

    if (data.confidenceScore !== null) {
      context.setConfidenceScore(data.confidenceScore);
    }

    if (data.executionHistory) {
      context._executionHistory = [...data.executionHistory];
    }

    if (data.errors) {
      context._errors = [...data.errors];
    }

    if (data.warnings) {
      context._warnings = [...data.warnings];
    }

    return context;
  }

  /**
   * Create context for task
   * @param {Object} task - Task object
   * @param {Object} options - Context options
   * @returns {AutomationContext} New context instance
   */
  static createForTask(task, options = {}) {
    return new AutomationContext(
      null,
      task.id,
      options.userId,
      task.projectId || options.projectId,
      options.data || {},
      options.metadata || {},
      new Date()
    );
  }

  /**
   * Merge contexts
   * @param {AutomationContext} other - Other context to merge
   * @returns {AutomationContext} Merged context
   */
  merge(other) {
    // Merge data
    this._data = { ...this._data, ...other._data };

    // Merge metadata
    this._metadata = { ...this._metadata, ...other._metadata };

    // Merge execution history
    this._executionHistory = [...this._executionHistory, ...other._executionHistory];

    // Merge errors
    this._errors = [...this._errors, ...other._errors];

    // Merge warnings
    this._warnings = [...this._warnings, ...other._warnings];

    // Update timestamp
    this._updatedAt = new Date();

    return this;
  }
}

module.exports = AutomationContext; 