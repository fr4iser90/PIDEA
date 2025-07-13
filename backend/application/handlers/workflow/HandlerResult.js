/**
 * HandlerResult - Result of handler execution
 * 
 * This class represents the result of handler execution, including
 * success status, result data, error information, and metadata.
 * It follows the same patterns as the existing workflow result classes.
 */
class HandlerResult {
  /**
   * Create a new handler result
   * @param {Object} data - Result data
   * @param {boolean} data.success - Success status
   * @param {string} data.handlerId - Handler identifier
   * @param {string} data.handlerName - Handler name
   * @param {*} data.result - Result data
   * @param {string} data.error - Error message
   * @param {number} data.duration - Execution duration in milliseconds
   * @param {Date} data.timestamp - Execution timestamp
   * @param {Object} data.metadata - Additional metadata
   */
  constructor(data = {}) {
    this.success = data.success || false;
    this.handlerId = data.handlerId || null;
    this.handlerName = data.handlerName || null;
    this.result = data.result || null;
    this.error = data.error || null;
    this.duration = data.duration || 0;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
  }

  /**
   * Check if result is successful
   * @returns {boolean} True if successful
   */
  isSuccess() {
    return this.success === true;
  }

  /**
   * Check if result has error
   * @returns {boolean} True if has error
   */
  hasError() {
    return this.error !== null && this.error !== undefined;
  }

  /**
   * Get error message
   * @returns {string|null} Error message
   */
  getErrorMessage() {
    return this.error;
  }

  /**
   * Get execution duration in milliseconds
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    return this.duration;
  }

  /**
   * Get formatted duration string
   * @returns {string} Formatted duration
   */
  getFormattedDuration() {
    if (this.duration < 1000) {
      return `${this.duration}ms`;
    } else if (this.duration < 60000) {
      return `${(this.duration / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(this.duration / 60000);
      const seconds = ((this.duration % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get result data
   * @returns {*} Result data
   */
  getResult() {
    return this.result;
  }

  /**
   * Get metadata
   * @returns {Object} Metadata
   */
  getMetadata() {
    return this.metadata;
  }

  /**
   * Set metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Get specific metadata value
   * @param {string} key - Metadata key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Metadata value or default
   */
  getMetadataValue(key, defaultValue = null) {
    return this.metadata.hasOwnProperty(key) ? this.metadata[key] : defaultValue;
  }

  /**
   * Get handler ID
   * @returns {string|null} Handler ID
   */
  getHandlerId() {
    return this.handlerId;
  }

  /**
   * Get handler name
   * @returns {string|null} Handler name
   */
  getHandlerName() {
    return this.handlerName;
  }

  /**
   * Get execution timestamp
   * @returns {Date} Execution timestamp
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      success: this.success,
      handlerId: this.handlerId,
      handlerName: this.handlerName,
      result: this.result,
      error: this.error,
      duration: this.duration,
      formattedDuration: this.getFormattedDuration(),
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }

  /**
   * Convert to JSON string
   * @returns {string} JSON string representation
   */
  toJSON() {
    return JSON.stringify(this.toObject());
  }

  /**
   * Get result summary for logging
   * @returns {Object} Result summary
   */
  getSummary() {
    return {
      success: this.success,
      handlerId: this.handlerId,
      handlerName: this.handlerName,
      duration: this.getFormattedDuration(),
      hasError: this.hasError(),
      errorMessage: this.getErrorMessage(),
      timestamp: this.timestamp
    };
  }

  /**
   * Create success result
   * @param {Object} data - Result data
   * @param {string} data.handlerId - Handler ID
   * @param {string} data.handlerName - Handler name
   * @param {*} data.result - Result data
   * @param {number} data.duration - Execution duration
   * @param {Object} data.metadata - Additional metadata
   * @returns {HandlerResult} Success result
   */
  static success(data = {}) {
    return new HandlerResult({
      success: true,
      ...data
    });
  }

  /**
   * Create error result
   * @param {string} error - Error message
   * @param {Object} data - Additional data
   * @param {string} data.handlerId - Handler ID
   * @param {string} data.handlerName - Handler name
   * @param {number} data.duration - Execution duration
   * @param {Object} data.metadata - Additional metadata
   * @returns {HandlerResult} Error result
   */
  static error(error, data = {}) {
    return new HandlerResult({
      success: false,
      error,
      ...data
    });
  }

  /**
   * Create timeout result
   * @param {Object} data - Additional data
   * @param {string} data.handlerId - Handler ID
   * @param {string} data.handlerName - Handler name
   * @param {number} data.duration - Execution duration
   * @param {Object} data.metadata - Additional metadata
   * @returns {HandlerResult} Timeout result
   */
  static timeout(data = {}) {
    return new HandlerResult({
      success: false,
      error: 'Handler execution timed out',
      ...data
    });
  }

  /**
   * Create cancelled result
   * @param {Object} data - Additional data
   * @param {string} data.handlerId - Handler ID
   * @param {string} data.handlerName - Handler name
   * @param {number} data.duration - Execution duration
   * @param {Object} data.metadata - Additional metadata
   * @returns {HandlerResult} Cancelled result
   */
  static cancelled(data = {}) {
    return new HandlerResult({
      success: false,
      error: 'Handler execution was cancelled',
      ...data
    });
  }
}

module.exports = HandlerResult; 