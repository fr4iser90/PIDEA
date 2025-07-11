/**
 * HandlerMetrics - Metrics collection and analysis for handlers
 * 
 * This class provides comprehensive metrics collection, analysis,
 * and reporting for handler performance, including execution times,
 * success rates, error rates, and resource usage.
 */
class HandlerMetrics {
  /**
   * Create a new handler metrics collector
   * @param {Object} options - Metrics options
   */
  constructor(options = {}) {
    this.metrics = new Map();
    this.globalMetrics = {
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalDuration: 0,
      averageDuration: 0,
      peakConcurrency: 0,
      currentConcurrency: 0,
      startTime: new Date(),
      lastExecution: null
    };
    this.options = {
      enableMetrics: options.enableMetrics !== false,
      enableRealTime: options.enableRealTime !== false,
      enableAggregation: options.enableAggregation !== false,
      retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      aggregationInterval: options.aggregationInterval || 5 * 60 * 1000, // 5 minutes
      maxMetricsPerHandler: options.maxMetricsPerHandler || 1000,
      ...options
    };
    
    // Initialize aggregation timer if enabled
    if (this.options.enableAggregation) {
      this.startAggregationTimer();
    }
  }

  /**
   * Record handler execution
   * @param {string} handlerId - Handler identifier
   * @param {Object} data - Execution data
   * @returns {Promise<void>} Recording result
   */
  async recordHandlerExecution(handlerId, data) {
    if (!this.options.enableMetrics) {
      return;
    }

    try {
      const timestamp = new Date();
      const executionData = {
        handlerId,
        handlerType: data.handler?.getType() || 'unknown',
        handlerName: data.handler?.getMetadata()?.name || 'unknown',
        requestType: data.request?.type || 'unknown',
        success: data.result?.isSuccess() || false,
        duration: data.duration || 0,
        timestamp,
        metadata: {
          requestSize: JSON.stringify(data.request || {}).length,
          responseSize: JSON.stringify(data.result || {}).length,
          error: data.result?.getError() || null,
          ...data.metadata
        }
      };

      // Update global metrics
      this.updateGlobalMetrics(executionData);

      // Update handler-specific metrics
      this.updateHandlerMetrics(handlerId, executionData);

      // Store detailed execution record
      this.storeExecutionRecord(handlerId, executionData);

    } catch (error) {
      console.error('HandlerMetrics: Failed to record handler execution', {
        handlerId,
        error: error.message
      });
    }
  }

  /**
   * Record handler failure
   * @param {string} handlerId - Handler identifier
   * @param {Object} data - Failure data
   * @returns {Promise<void>} Recording result
   */
  async recordHandlerFailure(handlerId, data) {
    if (!this.options.enableMetrics) {
      return;
    }

    try {
      const timestamp = new Date();
      const failureData = {
        handlerId,
        handlerType: data.handler?.getType() || 'unknown',
        handlerName: data.handler?.getMetadata()?.name || 'unknown',
        requestType: data.request?.type || 'unknown',
        success: false,
        duration: data.duration || 0,
        timestamp,
        error: data.error?.message || 'Unknown error',
        errorType: data.error?.constructor?.name || 'Error',
        metadata: {
          requestSize: JSON.stringify(data.request || {}).length,
          stack: data.error?.stack || null,
          ...data.metadata
        }
      };

      // Update global metrics
      this.updateGlobalMetrics(failureData);

      // Update handler-specific metrics
      this.updateHandlerMetrics(handlerId, failureData);

      // Store detailed failure record
      this.storeExecutionRecord(handlerId, failureData);

    } catch (error) {
      console.error('HandlerMetrics: Failed to record handler failure', {
        handlerId,
        error: error.message
      });
    }
  }

  /**
   * Update global metrics
   * @param {Object} executionData - Execution data
   */
  updateGlobalMetrics(executionData) {
    this.globalMetrics.totalExecutions++;
    this.globalMetrics.totalDuration += executionData.duration;
    this.globalMetrics.averageDuration = this.globalMetrics.totalDuration / this.globalMetrics.totalExecutions;
    this.globalMetrics.lastExecution = executionData.timestamp;

    if (executionData.success) {
      this.globalMetrics.totalSuccesses++;
    } else {
      this.globalMetrics.totalFailures++;
    }

    // Update concurrency tracking
    this.globalMetrics.currentConcurrency++;
    if (this.globalMetrics.currentConcurrency > this.globalMetrics.peakConcurrency) {
      this.globalMetrics.peakConcurrency = this.globalMetrics.currentConcurrency;
    }

    // Decrease concurrency after a delay (simulating execution completion)
    setTimeout(() => {
      this.globalMetrics.currentConcurrency = Math.max(0, this.globalMetrics.currentConcurrency - 1);
    }, executionData.duration);
  }

  /**
   * Update handler-specific metrics
   * @param {string} handlerId - Handler identifier
   * @param {Object} executionData - Execution data
   */
  updateHandlerMetrics(handlerId, executionData) {
    if (!this.metrics.has(handlerId)) {
      this.metrics.set(handlerId, {
        executions: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        lastExecution: null,
        firstExecution: null,
        errorTypes: new Map(),
        requestTypes: new Map()
      });
    }

    const handlerMetrics = this.metrics.get(handlerId);
    handlerMetrics.executions++;
    handlerMetrics.totalDuration += executionData.duration;
    handlerMetrics.averageDuration = handlerMetrics.totalDuration / handlerMetrics.executions;
    handlerMetrics.lastExecution = executionData.timestamp;

    if (!handlerMetrics.firstExecution) {
      handlerMetrics.firstExecution = executionData.timestamp;
    }

    if (executionData.duration < handlerMetrics.minDuration) {
      handlerMetrics.minDuration = executionData.duration;
    }

    if (executionData.duration > handlerMetrics.maxDuration) {
      handlerMetrics.maxDuration = executionData.duration;
    }

    if (executionData.success) {
      handlerMetrics.successes++;
    } else {
      handlerMetrics.failures++;
      handlerMetrics.errorCount++;

      // Track error types
      const errorType = executionData.errorType || 'Unknown';
      handlerMetrics.errorTypes.set(errorType, (handlerMetrics.errorTypes.get(errorType) || 0) + 1);
    }

    // Track request types
    const requestType = executionData.requestType;
    handlerMetrics.requestTypes.set(requestType, (handlerMetrics.requestTypes.get(requestType) || 0) + 1);
  }

  /**
   * Store execution record
   * @param {string} handlerId - Handler identifier
   * @param {Object} executionData - Execution data
   */
  storeExecutionRecord(handlerId, executionData) {
    if (!this.metrics.has(handlerId)) {
      this.metrics.set(handlerId, { records: [] });
    }

    const handlerMetrics = this.metrics.get(handlerId);
    if (!handlerMetrics.records) {
      handlerMetrics.records = [];
    }

    // Add new record
    handlerMetrics.records.push(executionData);

    // Clean up old records based on retention period
    const cutoffTime = new Date(Date.now() - this.options.retentionPeriod);
    handlerMetrics.records = handlerMetrics.records.filter(record => 
      record.timestamp > cutoffTime
    );

    // Limit number of records per handler
    if (handlerMetrics.records.length > this.options.maxMetricsPerHandler) {
      handlerMetrics.records = handlerMetrics.records.slice(-this.options.maxMetricsPerHandler);
    }
  }

  /**
   * Get handler metrics
   * @param {string} handlerId - Handler identifier
   * @returns {Object|null} Handler metrics
   */
  getHandlerMetrics(handlerId) {
    const metrics = this.metrics.get(handlerId);
    if (!metrics) {
      return null;
    }

    return {
      ...metrics,
      successRate: metrics.executions > 0 ? (metrics.successes / metrics.executions) * 100 : 0,
      failureRate: metrics.executions > 0 ? (metrics.failures / metrics.executions) * 100 : 0,
      errorTypes: Object.fromEntries(metrics.errorTypes),
      requestTypes: Object.fromEntries(metrics.requestTypes),
      uptime: metrics.firstExecution ? 
        (new Date() - metrics.firstExecution) / (1000 * 60 * 60) : 0 // hours
    };
  }

  /**
   * Get global metrics
   * @returns {Object} Global metrics
   */
  getGlobalMetrics() {
    return {
      ...this.globalMetrics,
      successRate: this.globalMetrics.totalExecutions > 0 ? 
        (this.globalMetrics.totalSuccesses / this.globalMetrics.totalExecutions) * 100 : 0,
      failureRate: this.globalMetrics.totalExecutions > 0 ? 
        (this.globalMetrics.totalFailures / this.globalMetrics.totalExecutions) * 100 : 0,
      uptime: (new Date() - this.globalMetrics.startTime) / (1000 * 60 * 60), // hours
      activeHandlers: this.metrics.size
    };
  }

  /**
   * Get all handler metrics
   * @returns {Object} All handler metrics
   */
  getAllHandlerMetrics() {
    const allMetrics = {};
    
    for (const [handlerId, metrics] of this.metrics) {
      allMetrics[handlerId] = this.getHandlerMetrics(handlerId);
    }
    
    return allMetrics;
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    const globalMetrics = this.getGlobalMetrics();
    const handlerCount = this.metrics.size;
    
    // Calculate top performers
    const handlerMetrics = Array.from(this.metrics.entries()).map(([id, metrics]) => ({
      id,
      successRate: metrics.executions > 0 ? (metrics.successes / metrics.executions) * 100 : 0,
      averageDuration: metrics.averageDuration,
      executions: metrics.executions
    }));

    const topPerformers = handlerMetrics
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    const fastestHandlers = handlerMetrics
      .filter(h => h.executions > 0)
      .sort((a, b) => a.averageDuration - b.averageDuration)
      .slice(0, 5);

    return {
      global: globalMetrics,
      handlers: {
        total: handlerCount,
        topPerformers,
        fastestHandlers
      },
      collection: {
        enabled: this.options.enableMetrics,
        realTime: this.options.enableRealTime,
        aggregation: this.options.enableAggregation,
        retentionPeriod: this.options.retentionPeriod,
        maxRecordsPerHandler: this.options.maxMetricsPerHandler
      }
    };
  }

  /**
   * Get performance alerts
   * @returns {Array<Object>} Performance alerts
   */
  getPerformanceAlerts() {
    const alerts = [];
    const globalMetrics = this.getGlobalMetrics();

    // Check global success rate
    if (globalMetrics.successRate < 90) {
      alerts.push({
        type: 'LOW_SUCCESS_RATE',
        severity: 'HIGH',
        message: `Global success rate is ${globalMetrics.successRate.toFixed(2)}%`,
        value: globalMetrics.successRate,
        threshold: 90
      });
    }

    // Check average duration
    if (globalMetrics.averageDuration > 5000) { // 5 seconds
      alerts.push({
        type: 'HIGH_AVERAGE_DURATION',
        severity: 'MEDIUM',
        message: `Average execution duration is ${globalMetrics.averageDuration.toFixed(2)}ms`,
        value: globalMetrics.averageDuration,
        threshold: 5000
      });
    }

    // Check individual handlers
    for (const [handlerId, metrics] of this.metrics) {
      if (metrics.executions > 10) { // Only check handlers with sufficient data
        const successRate = (metrics.successes / metrics.executions) * 100;
        
        if (successRate < 80) {
          alerts.push({
            type: 'HANDLER_LOW_SUCCESS_RATE',
            severity: 'HIGH',
            handlerId,
            message: `Handler ${handlerId} success rate is ${successRate.toFixed(2)}%`,
            value: successRate,
            threshold: 80
          });
        }

        if (metrics.averageDuration > 10000) { // 10 seconds
          alerts.push({
            type: 'HANDLER_HIGH_DURATION',
            severity: 'MEDIUM',
            handlerId,
            message: `Handler ${handlerId} average duration is ${metrics.averageDuration.toFixed(2)}ms`,
            value: metrics.averageDuration,
            threshold: 10000
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Start aggregation timer
   */
  startAggregationTimer() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
    }, this.options.aggregationInterval);
  }

  /**
   * Perform metrics aggregation
   */
  performAggregation() {
    try {
      const timestamp = new Date();
      const globalMetrics = this.getGlobalMetrics();
      
      // Store aggregated metrics
      if (!this.aggregatedMetrics) {
        this.aggregatedMetrics = [];
      }

      this.aggregatedMetrics.push({
        timestamp,
        global: globalMetrics,
        handlerCount: this.metrics.size
      });

      // Clean up old aggregated metrics
      const cutoffTime = new Date(Date.now() - this.options.retentionPeriod);
      this.aggregatedMetrics = this.aggregatedMetrics.filter(record => 
        record.timestamp > cutoffTime
      );

    } catch (error) {
      console.error('HandlerMetrics: Aggregation failed', error.message);
    }
  }

  /**
   * Get aggregated metrics
   * @param {number} hours - Number of hours to look back
   * @returns {Array<Object>} Aggregated metrics
   */
  getAggregatedMetrics(hours = 24) {
    if (!this.aggregatedMetrics) {
      return [];
    }

    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.aggregatedMetrics.filter(record => record.timestamp > cutoffTime);
  }

  /**
   * Clear metrics
   * @param {string} handlerId - Handler identifier (optional, clears all if not provided)
   */
  clearMetrics(handlerId = null) {
    if (handlerId) {
      this.metrics.delete(handlerId);
    } else {
      this.metrics.clear();
      this.globalMetrics = {
        totalExecutions: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        totalDuration: 0,
        averageDuration: 0,
        peakConcurrency: 0,
        currentConcurrency: 0,
        startTime: new Date(),
        lastExecution: null
      };
    }
  }

  /**
   * Export metrics
   * @returns {Object} Exported metrics data
   */
  exportMetrics() {
    return {
      global: this.getGlobalMetrics(),
      handlers: this.getAllHandlerMetrics(),
      summary: this.getMetricsSummary(),
      alerts: this.getPerformanceAlerts(),
      aggregated: this.getAggregatedMetrics(),
      exportTime: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Import metrics
   * @param {Object} data - Metrics data to import
   */
  importMetrics(data) {
    try {
      if (data.global) {
        this.globalMetrics = { ...this.globalMetrics, ...data.global };
      }

      if (data.handlers) {
        for (const [handlerId, metrics] of Object.entries(data.handlers)) {
          this.metrics.set(handlerId, metrics);
        }
      }

      if (data.aggregated) {
        this.aggregatedMetrics = data.aggregated;
      }

    } catch (error) {
      console.error('HandlerMetrics: Import failed', error.message);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
  }
}

module.exports = HandlerMetrics; 