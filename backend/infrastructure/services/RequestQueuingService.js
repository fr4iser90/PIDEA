/**
 * Request Queuing Service
 * 
 * Manages concurrent requests to prevent request stacking
 * and provide proper request lifecycle management.
 */

const Logger = require('@logging/Logger');
const logger = new Logger('RequestQueuingService');

class RequestQueuingService {
  constructor(options = {}) {
    this.queue = [];
    this.processing = new Map();
    this.maxConcurrent = options.maxConcurrent || 5;
    this.requestTimeout = options.requestTimeout || 30 * 1000; // 30 seconds
    this.stats = {
      totalRequests: 0,
      queuedRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      averageWaitTime: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };
    
    // Performance tracking
    this.waitTimes = [];
    this.processingTimes = [];
  }

  /**
   * Add request to queue
   * @param {string} key - Request key
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async queueRequest(key, requestFn, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    this.stats.totalRequests++;
    this.stats.queuedRequests++;

    return new Promise((resolve, reject) => {
      const request = {
        id: requestId,
        key,
        requestFn,
        options,
        startTime,
        resolve,
        reject,
        status: 'queued'
      };

      // Check if already processing
      if (this.processing.has(key)) {
        logger.info(`Request ${key} already processing, waiting for completion`);
        this.stats.queuedRequests++;
        
        // Wait for existing request
        this.waitForExistingRequest(key, resolve, reject);
        return;
      }

      // Add to queue
      this.queue.push(request);
      logger.debug(`Request ${key} added to queue, position: ${this.queue.length}`);

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Wait for existing request to complete
   * @param {string} key - Request key
   * @param {Function} resolve - Resolve function
   * @param {Function} reject - Reject function
   */
  async waitForExistingRequest(key, resolve, reject) {
    const processingRequest = this.processing.get(key);
    
    if (!processingRequest) {
      reject(new Error('Processing request not found'));
      return;
    }

    try {
      const result = await processingRequest.promise;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Process queue
   */
  async processQueue() {
    // Check if we can process more requests
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Get next request from queue
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    // Start processing
    this.startProcessing(request);
  }

  /**
   * Start processing a request
   * @param {Object} request - Request object
   */
  async startProcessing(request) {
    const { id, key, requestFn, options, startTime, resolve, reject } = request;
    
    request.status = 'processing';
    this.stats.queuedRequests--;

    // Create promise for this request
    const requestPromise = this.executeRequest(requestFn, options);
    this.processing.set(key, { promise: requestPromise, startTime });

    logger.debug(`Processing request ${key} (${id})`);

    try {
      const result = await requestPromise;
      
      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, true);
      
      logger.debug(`Request ${key} completed successfully in ${processingTime}ms`);
      resolve(result);
    } catch (error) {
      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false);
      
      logger.error(`Request ${key} failed after ${processingTime}ms:`, error.message);
      reject(error);
    } finally {
      // Remove from processing
      this.processing.delete(key);
      
      // Process next request in queue
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Execute request with timeout
   * @param {Function} requestFn - Request function
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async executeRequest(requestFn, options = {}) {
    const timeout = options.timeout || this.requestTimeout;
    
    return Promise.race([
      requestFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  /**
   * Update statistics
   * @param {number} processingTime - Processing time in milliseconds
   * @param {boolean} success - Whether request was successful
   */
  updateStats(processingTime, success) {
    this.stats.processedRequests++;
    this.processingTimes.push(processingTime);
    
    if (!success) {
      this.stats.failedRequests++;
    }

    // Calculate averages
    if (this.processingTimes.length > 0) {
      this.stats.averageProcessingTime = 
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    }

    if (this.waitTimes.length > 0) {
      this.stats.averageWaitTime = 
        this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length;
    }
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      isFull: this.processing.size >= this.maxConcurrent
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const successRate = this.stats.processedRequests > 0 
      ? ((this.stats.processedRequests - this.stats.failedRequests) / this.stats.processedRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      uptime,
      successRate: `${successRate}%`,
      averageProcessingTime: Math.round(this.stats.averageProcessingTime),
      averageWaitTime: Math.round(this.stats.averageWaitTime),
      queueStatus: this.getQueueStatus()
    };
  }

  /**
   * Clear queue
   */
  clearQueue() {
    const queueLength = this.queue.length;
    this.queue = [];
    logger.info(`Cleared queue with ${queueLength} pending requests`);
  }

  /**
   * Cancel specific request
   * @param {string} key - Request key
   */
  cancelRequest(key) {
    // Remove from queue
    const queueIndex = this.queue.findIndex(req => req.key === key);
    if (queueIndex !== -1) {
      const request = this.queue.splice(queueIndex, 1)[0];
      request.reject(new Error('Request cancelled'));
      logger.info(`Cancelled queued request: ${key}`);
    }

    // Check if processing
    if (this.processing.has(key)) {
      logger.warn(`Cannot cancel processing request: ${key}`);
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      queuedRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      averageWaitTime: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };
    this.waitTimes = [];
    this.processingTimes = [];
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    // Cancel all queued requests
    this.queue.forEach(request => {
      request.reject(new Error('Service destroyed'));
    });
    
    this.clearQueue();
    this.processing.clear();
    
    logger.info('RequestQueuingService destroyed');
  }
}

// Create singleton instance
const requestQueuingService = new RequestQueuingService();

module.exports = requestQueuingService; 