/**
 * ExecutionMetrics - Performance metrics tracking for workflow execution
 * Provides comprehensive metrics collection and analysis for workflow performance
 */
const { EventEmitter } = require('events');

/**
 * Execution metrics for workflow performance tracking
 */
class ExecutionMetrics extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.logger = options.logger || console;
    
    this.enableMetrics = options.enableMetrics !== false;
    this.enableRealTimeMetrics = options.enableRealTimeMetrics !== false;
    this.metricsRetention = options.metricsRetention || 86400000; // 24 hours
    this.maxMetricsHistory = options.maxMetricsHistory || 10000;
    
    // Metrics storage
    this.executionMetrics = new Map();
    this.stepMetrics = new Map();
    this.performanceMetrics = new Map();
    this.errorMetrics = new Map();
    
    // Aggregated metrics
    this.aggregatedMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageStepTime: 0,
      totalSteps: 0,
      errorRate: 0,
      throughput: 0,
      lastUpdated: Date.now()
    };
    
    // Real-time metrics
    this.realTimeMetrics = {
      activeExecutions: 0,
      executionsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      resourceUtilization: {
        memory: 0,
        cpu: 0
      }
    };
    
    // Metrics collection interval
    this.collectionInterval = null;
    this.collectionIntervalMs = options.collectionIntervalMs || 10000; // 10 seconds
    
    // Start metrics collection if enabled
    if (this.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Record execution start
   * @param {string} executionId - Execution ID
   * @param {Object} metadata - Execution metadata
   */
  recordExecutionStart(executionId, metadata = {}) {
    if (!this.enableMetrics) return;

    const startTime = Date.now();
    
    this.executionMetrics.set(executionId, {
      executionId,
      startTime,
      metadata,
      status: 'running',
      steps: [],
      errors: [],
      performance: {
        totalTime: 0,
        stepTimes: {},
        resourceUsage: {}
      }
    });

    // Update real-time metrics
    this.realTimeMetrics.activeExecutions++;
    
    this.emit('executionStarted', { executionId, startTime, metadata });
    
    this.logger.debug('ExecutionMetrics: Execution started', {
      executionId,
      metadata: metadata.name || 'unknown'
    });
  }

  /**
   * Record execution end
   * @param {string} executionId - Execution ID
   * @param {Object} result - Execution result
   */
  recordExecutionEnd(executionId, result) {
    if (!this.enableMetrics) return;

    const endTime = Date.now();
    const execution = this.executionMetrics.get(executionId);
    
    if (!execution) {
      this.logger.warn('ExecutionMetrics: No execution found for end recording', {
        executionId
      });
      return;
    }

    const duration = endTime - execution.startTime;
    const success = result && result.success !== false;
    
    // Update execution metrics
    execution.endTime = endTime;
    execution.duration = duration;
    execution.status = success ? 'completed' : 'failed';
    execution.result = result;
    
    // Update aggregated metrics
    this.updateAggregatedMetrics(execution, success);
    
    // Update real-time metrics
    this.realTimeMetrics.activeExecutions = Math.max(0, this.realTimeMetrics.activeExecutions - 1);
    
    this.emit('executionEnded', { executionId, duration, success, result });
    
    this.logger.debug('ExecutionMetrics: Execution ended', {
      executionId,
      duration,
      success
    });
  }

  /**
   * Record step execution
   * @param {string} executionId - Execution ID
   * @param {string} stepName - Step name
   * @param {number} stepIndex - Step index
   * @param {Object} stepMetadata - Step metadata
   */
  recordStepStart(executionId, stepName, stepIndex, stepMetadata = {}) {
    if (!this.enableMetrics) return;

    const startTime = Date.now();
    const stepId = `${executionId}_${stepIndex}`;
    
    this.stepMetrics.set(stepId, {
      executionId,
      stepName,
      stepIndex,
      startTime,
      metadata: stepMetadata,
      status: 'running'
    });

    // Add to execution metrics
    const execution = this.executionMetrics.get(executionId);
    if (execution) {
      execution.steps.push({
        stepName,
        stepIndex,
        startTime,
        metadata: stepMetadata
      });
    }
    
    this.emit('stepStarted', { executionId, stepName, stepIndex, startTime });
  }

  /**
   * Record step completion
   * @param {string} executionId - Execution ID
   * @param {string} stepName - Step name
   * @param {number} stepIndex - Step index
   * @param {Object} result - Step result
   * @param {Error} error - Step error if any
   */
  recordStepEnd(executionId, stepName, stepIndex, result, error = null) {
    if (!this.enableMetrics) return;

    const endTime = Date.now();
    const stepId = `${executionId}_${stepIndex}`;
    const step = this.stepMetrics.get(stepId);
    
    if (!step) {
      this.logger.warn('ExecutionMetrics: No step found for end recording', {
        executionId,
        stepName,
        stepIndex
      });
      return;
    }

    const duration = endTime - step.startTime;
    const success = !error;
    
    // Update step metrics
    step.endTime = endTime;
    step.duration = duration;
    step.status = success ? 'completed' : 'failed';
    step.result = result;
    step.error = error;
    
    // Update execution metrics
    const execution = this.executionMetrics.get(executionId);
    if (execution) {
      const stepInExecution = execution.steps.find(s => s.stepIndex === stepIndex);
      if (stepInExecution) {
        stepInExecution.endTime = endTime;
        stepInExecution.duration = duration;
        stepInExecution.success = success;
        stepInExecution.result = result;
        stepInExecution.error = error;
      }
      
      // Update performance metrics
      execution.performance.stepTimes[stepIndex] = duration;
      execution.performance.totalTime += duration;
    }
    
    // Record error if any
    if (error) {
      this.recordError(executionId, stepName, error);
    }
    
    this.emit('stepEnded', { executionId, stepName, stepIndex, duration, success, error });
  }

  /**
   * Record error
   * @param {string} executionId - Execution ID
   * @param {string} source - Error source (step name, execution, etc.)
   * @param {Error} error - Error object
   */
  recordError(executionId, source, error) {
    if (!this.enableMetrics) return;

    const errorRecord = {
      executionId,
      source,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      timestamp: Date.now()
    };
    
    this.errorMetrics.set(`${executionId}_${Date.now()}`, errorRecord);
    
    // Add to execution metrics
    const execution = this.executionMetrics.get(executionId);
    if (execution) {
      execution.errors.push(errorRecord);
    }
    
    this.emit('errorRecorded', errorRecord);
    
    this.logger.debug('ExecutionMetrics: Error recorded', {
      executionId,
      source,
      error: error.message
    });
  }

  /**
   * Record performance metric
   * @param {string} executionId - Execution ID
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordPerformanceMetric(executionId, metricName, value, metadata = {}) {
    if (!this.enableMetrics) return;

    const metricId = `${executionId}_${metricName}`;
    
    this.performanceMetrics.set(metricId, {
      executionId,
      metricName,
      value,
      metadata,
      timestamp: Date.now()
    });
    
    // Update execution metrics
    const execution = this.executionMetrics.get(executionId);
    if (execution) {
      execution.performance[metricName] = value;
    }
    
    this.emit('performanceMetricRecorded', { executionId, metricName, value, metadata });
  }

  /**
   * Update aggregated metrics
   * @param {Object} execution - Execution metrics
   * @param {boolean} success - Whether execution was successful
   */
  updateAggregatedMetrics(execution, success) {
    this.aggregatedMetrics.totalExecutions++;
    
    if (success) {
      this.aggregatedMetrics.successfulExecutions++;
    } else {
      this.aggregatedMetrics.failedExecutions++;
    }
    
    // Update average execution time
    const totalTime = this.aggregatedMetrics.averageExecutionTime * (this.aggregatedMetrics.totalExecutions - 1);
    this.aggregatedMetrics.averageExecutionTime = (totalTime + execution.duration) / this.aggregatedMetrics.totalExecutions;
    
    // Update total steps
    this.aggregatedMetrics.totalSteps += execution.steps.length;
    
    // Update average step time
    const stepTimes = Object.values(execution.performance.stepTimes);
    if (stepTimes.length > 0) {
      const totalStepTime = this.aggregatedMetrics.averageStepTime * (this.aggregatedMetrics.totalSteps - stepTimes.length);
      const newTotalStepTime = totalStepTime + stepTimes.reduce((sum, time) => sum + time, 0);
      this.aggregatedMetrics.averageStepTime = newTotalStepTime / this.aggregatedMetrics.totalSteps;
    }
    
    // Update error rate
    this.aggregatedMetrics.errorRate = this.aggregatedMetrics.failedExecutions / this.aggregatedMetrics.totalExecutions;
    
    // Update throughput (executions per minute)
    const timeWindow = 60000; // 1 minute
    const recentExecutions = Array.from(this.executionMetrics.values())
      .filter(e => e.endTime && (Date.now() - e.endTime) < timeWindow);
    this.aggregatedMetrics.throughput = recentExecutions.length;
    
    this.aggregatedMetrics.lastUpdated = Date.now();
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    this.collectionInterval = setInterval(() => {
      this.collectRealTimeMetrics();
      this.cleanupOldMetrics();
    }, this.collectionIntervalMs);

    this.logger.info('ExecutionMetrics: Metrics collection started', {
      interval: this.collectionIntervalMs
    });
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      this.logger.info('ExecutionMetrics: Metrics collection stopped');
    }
  }

  /**
   * Collect real-time metrics
   */
  collectRealTimeMetrics() {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    
    // Calculate executions per minute
    const recentExecutions = Array.from(this.executionMetrics.values())
      .filter(e => e.endTime && (now - e.endTime) < timeWindow);
    this.realTimeMetrics.executionsPerMinute = recentExecutions.length;
    
    // Calculate average response time
    if (recentExecutions.length > 0) {
      const totalTime = recentExecutions.reduce((sum, e) => sum + e.duration, 0);
      this.realTimeMetrics.averageResponseTime = totalTime / recentExecutions.length;
    }
    
    // Calculate error rate
    const failedExecutions = recentExecutions.filter(e => e.status === 'failed');
    this.realTimeMetrics.errorRate = recentExecutions.length > 0 ? 
      failedExecutions.length / recentExecutions.length : 0;
    
    // Emit real-time metrics
    this.emit('realTimeMetricsUpdated', this.realTimeMetrics);
  }

  /**
   * Cleanup old metrics
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.metricsRetention;
    let cleanedCount = 0;
    
    // Cleanup execution metrics
    for (const [key, execution] of this.executionMetrics.entries()) {
      if (execution.endTime && execution.endTime < cutoff) {
        this.executionMetrics.delete(key);
        cleanedCount++;
      }
    }
    
    // Cleanup step metrics
    for (const [key, step] of this.stepMetrics.entries()) {
      if (step.endTime && step.endTime < cutoff) {
        this.stepMetrics.delete(key);
        cleanedCount++;
      }
    }
    
    // Cleanup performance metrics
    for (const [key, metric] of this.performanceMetrics.entries()) {
      if (metric.timestamp < cutoff) {
        this.performanceMetrics.delete(key);
        cleanedCount++;
      }
    }
    
    // Cleanup error metrics
    for (const [key, error] of this.errorMetrics.entries()) {
      if (error.timestamp < cutoff) {
        this.errorMetrics.delete(key);
        cleanedCount++;
      }
    }
    
    // Limit metrics history size
    this.limitMetricsHistory();
    
    if (cleanedCount > 0) {
      this.logger.debug('ExecutionMetrics: Cleaned old metrics', {
        cleanedCount
      });
    }
  }

  /**
   * Limit metrics history size
   */
  limitMetricsHistory() {
    // Limit execution metrics
    if (this.executionMetrics.size > this.maxMetricsHistory) {
      const entries = Array.from(this.executionMetrics.entries())
        .sort(([, a], [, b]) => (b.endTime || 0) - (a.endTime || 0));
      
      const toDelete = entries.slice(this.maxMetricsHistory);
      for (const [key] of toDelete) {
        this.executionMetrics.delete(key);
      }
    }
    
    // Limit step metrics
    if (this.stepMetrics.size > this.maxMetricsHistory) {
      const entries = Array.from(this.stepMetrics.entries())
        .sort(([, a], [, b]) => (b.endTime || 0) - (a.endTime || 0));
      
      const toDelete = entries.slice(this.maxMetricsHistory);
      for (const [key] of toDelete) {
        this.stepMetrics.delete(key);
      }
    }
  }

  /**
   * Get execution metrics
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Execution metrics
   */
  getExecutionMetrics(executionId) {
    return this.executionMetrics.get(executionId) || null;
  }

  /**
   * Get step metrics
   * @param {string} executionId - Execution ID
   * @param {number} stepIndex - Step index
   * @returns {Object|null} Step metrics
   */
  getStepMetrics(executionId, stepIndex) {
    const stepId = `${executionId}_${stepIndex}`;
    return this.stepMetrics.get(stepId) || null;
  }

  /**
   * Get aggregated metrics
   * @returns {Object} Aggregated metrics
   */
  getAggregatedMetrics() {
    return { ...this.aggregatedMetrics };
  }

  /**
   * Get real-time metrics
   * @returns {Object} Real-time metrics
   */
  getRealTimeMetrics() {
    return { ...this.realTimeMetrics };
  }

  /**
   * Get performance metrics
   * @param {string} executionId - Execution ID
   * @returns {Array} Performance metrics
   */
  getPerformanceMetrics(executionId) {
    return Array.from(this.performanceMetrics.values())
      .filter(m => m.executionId === executionId);
  }

  /**
   * Get error metrics
   * @param {string} executionId - Execution ID
   * @returns {Array} Error metrics
   */
  getErrorMetrics(executionId) {
    return Array.from(this.errorMetrics.values())
      .filter(e => e.executionId === executionId);
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    return {
      aggregated: this.getAggregatedMetrics(),
      realTime: this.getRealTimeMetrics(),
      storage: {
        executions: this.executionMetrics.size,
        steps: this.stepMetrics.size,
        performance: this.performanceMetrics.size,
        errors: this.errorMetrics.size
      },
      enabled: this.enableMetrics,
      realTimeEnabled: this.enableRealTimeMetrics
    };
  }

  /**
   * Get metrics for time range
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {Object} Metrics for time range
   */
  getMetricsForTimeRange(startTime, endTime) {
    const executions = Array.from(this.executionMetrics.values())
      .filter(e => e.endTime && e.endTime >= startTime && e.endTime <= endTime);
    
    const steps = Array.from(this.stepMetrics.values())
      .filter(s => s.endTime && s.endTime >= startTime && s.endTime <= endTime);
    
    const errors = Array.from(this.errorMetrics.values())
      .filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    
    return {
      executions,
      steps,
      errors,
      summary: {
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'completed').length,
        failedExecutions: executions.filter(e => e.status === 'failed').length,
        averageExecutionTime: executions.length > 0 ? 
          executions.reduce((sum, e) => sum + e.duration, 0) / executions.length : 0,
        totalSteps: steps.length,
        totalErrors: errors.length
      }
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.executionMetrics.clear();
    this.stepMetrics.clear();
    this.performanceMetrics.clear();
    this.errorMetrics.clear();
    
    // Reset aggregated metrics
    this.aggregatedMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageStepTime: 0,
      totalSteps: 0,
      errorRate: 0,
      throughput: 0,
      lastUpdated: Date.now()
    };
    
    this.logger.info('ExecutionMetrics: All metrics cleared');
  }

  /**
   * Shutdown metrics
   */
  shutdown() {
    this.logger.info('ExecutionMetrics: Shutting down');
    
    // Stop metrics collection
    this.stopMetricsCollection();
    
    // Clear metrics
    this.clearMetrics();
    
    this.logger.info('ExecutionMetrics: Shutdown complete');
  }
}

module.exports = ExecutionMetrics; 