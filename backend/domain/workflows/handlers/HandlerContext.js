/**
 * HandlerContext - Execution context for handlers
 * 
 * This class provides a unified context for handler execution,
 * containing request data, response object, shared data, and metadata.
 * It follows the same patterns as the existing WorkflowContext.
 */
class HandlerContext {
  /**
   * Create a new handler context
   * @param {Object} request - Handler request object
   * @param {Object} response - Handler response object
   * @param {string} handlerId - Unique handler identifier
   * @param {Object} options - Additional context options
   */
  constructor(request, response, handlerId, options = {}) {
    this.request = request;
    this.response = response;
    this.handlerId = handlerId;
    this.data = new Map();
    this.metadata = new Map();
    this.createdAt = new Date();
    this.options = options;
    
    // Initialize with default metadata
    this.setMetadata('createdAt', this.createdAt);
    this.setMetadata('handlerId', handlerId);
    this.setMetadata('requestType', request?.type || 'unknown');
    this.setMetadata('taskId', request?.taskId || null);
  }

  /**
   * Set data in context
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  set(key, value) {
    this.data.set(key, value);
  }

  /**
   * Get data from context
   * @param {string} key - Data key
   * @returns {*} Data value
   */
  get(key) {
    return this.data.get(key);
  }

  /**
   * Check if data exists in context
   * @param {string} key - Data key
   * @returns {boolean} True if exists
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * Delete data from context
   * @param {string} key - Data key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this.data.delete(key);
  }

  /**
   * Get all data from context
   * @returns {Object} All data as plain object
   */
  getAll() {
    const result = {};
    for (const [key, value] of this.data) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Set metadata in context
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this.metadata.set(key, value);
  }

  /**
   * Get metadata from context
   * @param {string} key - Metadata key
   * @returns {*} Metadata value
   */
  getMetadata(key) {
    return this.metadata.get(key);
  }

  /**
   * Get all metadata from context
   * @returns {Object} All metadata as plain object
   */
  getAllMetadata() {
    const result = {};
    for (const [key, value] of this.metadata) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get context age in milliseconds
   * @returns {number} Age in milliseconds
   */
  getAge() {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get request object
   * @returns {Object} Request object
   */
  getRequest() {
    return this.request;
  }

  /**
   * Get response object
   * @returns {Object} Response object
   */
  getResponse() {
    return this.response;
  }

  /**
   * Get handler ID
   * @returns {string} Handler ID
   */
  getHandlerId() {
    return this.handlerId;
  }

  /**
   * Get context options
   * @returns {Object} Context options
   */
  getOptions() {
    return this.options;
  }

  /**
   * Get creation timestamp
   * @returns {Date} Creation timestamp
   */
  getCreatedAt() {
    return this.createdAt;
  }

  /**
   * Check if context has specific option
   * @param {string} key - Option key
   * @returns {boolean} True if option exists
   */
  hasOption(key) {
    return this.options && this.options.hasOwnProperty(key);
  }

  /**
   * Get specific option value
   * @param {string} key - Option key
   * @param {*} defaultValue - Default value if option doesn't exist
   * @returns {*} Option value or default
   */
  getOption(key, defaultValue = null) {
    return this.options && this.options.hasOwnProperty(key) 
      ? this.options[key] 
      : defaultValue;
  }

  /**
   * Set option value
   * @param {string} key - Option key
   * @param {*} value - Option value
   */
  setOption(key, value) {
    if (!this.options) {
      this.options = {};
    }
    this.options[key] = value;
  }

  /**
   * Clone context with new data
   * @param {Object} additionalData - Additional data to add
   * @returns {HandlerContext} New context instance
   */
  clone(additionalData = {}) {
    const newContext = new HandlerContext(
      this.request,
      this.response,
      this.handlerId,
      { ...this.options }
    );

    // Copy existing data
    for (const [key, value] of this.data) {
      newContext.set(key, value);
    }

    // Copy existing metadata
    for (const [key, value] of this.metadata) {
      newContext.setMetadata(key, value);
    }

    // Add additional data
    for (const [key, value] of Object.entries(additionalData)) {
      newContext.set(key, value);
    }

    return newContext;
  }

  /**
   * Convert context to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      handlerId: this.handlerId,
      request: this.request,
      response: this.response,
      data: this.getAll(),
      metadata: this.getAllMetadata(),
      options: this.options,
      createdAt: this.createdAt,
      age: this.getAge()
    };
  }

  /**
   * Get context summary for logging
   * @returns {Object} Context summary
   */
  getSummary() {
    return {
      handlerId: this.handlerId,
      requestType: this.getMetadata('requestType'),
      taskId: this.getMetadata('taskId'),
      age: this.getAge(),
      dataKeys: Array.from(this.data.keys()),
      metadataKeys: Array.from(this.metadata.keys())
    };
  }
}

module.exports = HandlerContext; 