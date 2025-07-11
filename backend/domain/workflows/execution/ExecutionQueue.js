/**
 * ExecutionQueue - Manages workflow execution queue
 * Provides queue management for workflow execution with priority and scheduling
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Execution queue for managing workflow execution
 */
class ExecutionQueue {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.queue = [];
    this.processingQueue = new Map();
    this.completedQueue = new Map();
    this.failedQueue = new Map();
    
    // Queue statistics
    this.stats = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalCompleted: 0,
      totalFailed: 0,
      averageWaitTime: 0,
      averageProcessingTime: 0
    };
    
    // Queue configuration
    this.config = {
      enablePriority: options.enablePriority !== false,
      enableRetry: options.enableRetry !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      enableTimeout: options.enableTimeout !== false,
      defaultTimeout: options.defaultTimeout || 300000 // 5 minutes
    };
  }

  /**
   * Add execution to queue
   * @param {Object} execution - Execution to queue
   * @returns {boolean} True if added successfully
   */
  enqueue(execution) {
    if (this.queue.length >= this.maxSize) {
      return false;
    }
    
    const queueItem = {
      id: execution.id || uuidv4(),
      execution,
      priority: this.calculatePriority(execution),
      queuedAt: new Date(),
      retryCount: 0,
      status: 'queued'
    };
    
    // Add to queue with priority ordering
    if (this.config.enablePriority) {
      this.insertWithPriority(queueItem);
    } else {
      this.queue.push(queueItem);
    }
    
    this.stats.totalEnqueued++;
    return true;
  }

  /**
   * Insert item with priority ordering
   * @param {Object} queueItem - Queue item to insert
   * @private
   */
  insertWithPriority(queueItem) {
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < queueItem.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, queueItem);
  }

  /**
   * Calculate execution priority
   * @param {Object} execution - Execution object
   * @returns {number} Priority score
   */
  calculatePriority(execution) {
    let priority = 1;
    
    // Increase priority for critical executions
    if (execution.options?.critical) {
      priority += 10;
    }
    
    // Increase priority for high priority tasks
    if (execution.options?.priority === 'high') {
      priority += 5;
    }
    
    // Increase priority for urgent tasks
    if (execution.options?.urgent) {
      priority += 3;
    }
    
    // Decrease priority for low priority tasks
    if (execution.options?.priority === 'low') {
      priority -= 2;
    }
    
    return Math.max(1, priority);
  }

  /**
   * Remove execution from queue
   * @returns {Object|null} Next execution or null
   */
  dequeue() {
    if (this.queue.length === 0) {
      return null;
    }
    
    const queueItem = this.queue.shift();
    queueItem.status = 'processing';
    queueItem.dequeuedAt = new Date();
    
    // Move to processing queue
    this.processingQueue.set(queueItem.id, queueItem);
    
    this.stats.totalDequeued++;
    return queueItem.execution;
  }

  /**
   * Mark execution as completed
   * @param {string} executionId - Execution ID
   * @param {Object} result - Execution result
   */
  markCompleted(executionId, result) {
    const queueItem = this.processingQueue.get(executionId);
    if (!queueItem) {
      return;
    }
    
    queueItem.status = 'completed';
    queueItem.completedAt = new Date();
    queueItem.result = result;
    
    // Calculate processing time
    const processingTime = queueItem.completedAt.getTime() - queueItem.dequeuedAt.getTime();
    queueItem.processingTime = processingTime;
    
    // Move to completed queue
    this.processingQueue.delete(executionId);
    this.completedQueue.set(executionId, queueItem);
    
    this.stats.totalCompleted++;
    this.updateAverageProcessingTime(processingTime);
  }

  /**
   * Mark execution as failed
   * @param {string} executionId - Execution ID
   * @param {Error} error - Execution error
   */
  markFailed(executionId, error) {
    const queueItem = this.processingQueue.get(executionId);
    if (!queueItem) {
      return;
    }
    
    queueItem.status = 'failed';
    queueItem.failedAt = new Date();
    queueItem.error = error;
    
    // Check if retry is possible
    if (this.config.enableRetry && queueItem.retryCount < this.config.maxRetries) {
      queueItem.retryCount++;
      queueItem.status = 'queued';
      queueItem.retryAt = new Date(Date.now() + this.config.retryDelay);
      
      // Re-queue with retry
      this.processingQueue.delete(executionId);
      this.enqueue(queueItem.execution);
      
    } else {
      // Move to failed queue
      this.processingQueue.delete(executionId);
      this.failedQueue.set(executionId, queueItem);
      
      this.stats.totalFailed++;
    }
  }

  /**
   * Get queue length
   * @returns {number} Queue length
   */
  getLength() {
    return this.queue.length;
  }

  /**
   * Get processing queue length
   * @returns {number} Processing queue length
   */
  getProcessingLength() {
    return this.processingQueue.size;
  }

  /**
   * Get completed queue length
   * @returns {number} Completed queue length
   */
  getCompletedLength() {
    return this.completedQueue.size;
  }

  /**
   * Get failed queue length
   * @returns {number} Failed queue length
   */
  getFailedLength() {
    return this.failedQueue.size;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Check if processing queue is empty
   * @returns {boolean} True if empty
   */
  isProcessingEmpty() {
    return this.processingQueue.size === 0;
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
  }

  /**
   * Clear completed queue
   */
  clearCompleted() {
    this.completedQueue.clear();
  }

  /**
   * Clear failed queue
   */
  clearFailed() {
    this.failedQueue.clear();
  }

  /**
   * Get queue item by ID
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Queue item
   */
  getQueueItem(executionId) {
    // Check in main queue
    const queueItem = this.queue.find(item => item.id === executionId);
    if (queueItem) {
      return queueItem;
    }
    
    // Check in processing queue
    if (this.processingQueue.has(executionId)) {
      return this.processingQueue.get(executionId);
    }
    
    // Check in completed queue
    if (this.completedQueue.has(executionId)) {
      return this.completedQueue.get(executionId);
    }
    
    // Check in failed queue
    if (this.failedQueue.has(executionId)) {
      return this.failedQueue.get(executionId);
    }
    
    return null;
  }

  /**
   * Remove item from queue
   * @param {string} executionId - Execution ID
   * @returns {boolean} True if removed
   */
  removeFromQueue(executionId) {
    const index = this.queue.findIndex(item => item.id === executionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      processingLength: this.processingQueue.size,
      completedLength: this.completedQueue.size,
      failedLength: this.failedQueue.size,
      maxSize: this.maxSize,
      oldestItem: this.queue[0]?.queuedAt || null,
      newestItem: this.queue[this.queue.length - 1]?.queuedAt || null,
      averageWaitTime: this.stats.averageWaitTime,
      averageProcessingTime: this.stats.averageProcessingTime
    };
  }

  /**
   * Update average processing time
   * @param {number} processingTime - Processing time
   * @private
   */
  updateAverageProcessingTime(processingTime) {
    const totalCompleted = this.stats.totalCompleted;
    const currentAverage = this.stats.averageProcessingTime;
    
    this.stats.averageProcessingTime = (currentAverage * (totalCompleted - 1) + processingTime) / totalCompleted;
  }

  /**
   * Update average wait time
   * @param {number} waitTime - Wait time
   * @private
   */
  updateAverageWaitTime(waitTime) {
    const totalDequeued = this.stats.totalDequeued;
    const currentAverage = this.stats.averageWaitTime;
    
    this.stats.averageWaitTime = (currentAverage * (totalDequeued - 1) + waitTime) / totalDequeued;
  }

  /**
   * Get queue items by status
   * @param {string} status - Status to filter by
   * @returns {Array} Queue items
   */
  getItemsByStatus(status) {
    switch (status) {
      case 'queued':
        return [...this.queue];
      case 'processing':
        return Array.from(this.processingQueue.values());
      case 'completed':
        return Array.from(this.completedQueue.values());
      case 'failed':
        return Array.from(this.failedQueue.values());
      default:
        return [];
    }
  }

  /**
   * Get queue items by priority range
   * @param {number} minPriority - Minimum priority
   * @param {number} maxPriority - Maximum priority
   * @returns {Array} Queue items
   */
  getItemsByPriorityRange(minPriority, maxPriority) {
    return this.queue.filter(item => 
      item.priority >= minPriority && item.priority <= maxPriority
    );
  }

  /**
   * Get queue items by time range
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Array} Queue items
   */
  getItemsByTimeRange(startTime, endTime) {
    return this.queue.filter(item => 
      item.queuedAt >= startTime && item.queuedAt <= endTime
    );
  }

  /**
   * Get queue configuration
   * @returns {Object} Queue configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Update queue configuration
   * @param {Object} config - New configuration
   */
  updateConfiguration(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get queue health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const stats = this.getStatistics();
    const utilization = (stats.queueLength + stats.processingLength) / stats.maxSize;
    
    return {
      healthy: utilization < 0.9,
      utilization,
      queueLength: stats.queueLength,
      processingLength: stats.processingLength,
      maxSize: stats.maxSize,
      averageWaitTime: stats.averageWaitTime,
      averageProcessingTime: stats.averageProcessingTime
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      maxSize: this.maxSize,
      queueLength: this.queue.length,
      processingLength: this.processingQueue.size,
      completedLength: this.completedQueue.size,
      failedLength: this.failedQueue.size,
      stats: this.stats,
      config: this.config
    };
  }
}

module.exports = ExecutionQueue; 