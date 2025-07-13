/**
 * ExecutionMonitor - Real-time execution monitoring and metrics collection
 * Provides comprehensive monitoring capabilities for workflow execution
 */
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Execution metrics data structure
 */
class ExecutionMetrics {
  constructor() {
    this.executionId = null;
    this.workflowName = null;
    this.startTime = null;
    this.endTime = null;
    this.duration = 0;
    this.stepCount = 0;
    this.completedSteps = 0;
    this.failedSteps = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.retryAttempts = 0;
    this.resourceUsage = {
      memory: [],
      cpu: [],
      network: []
    };
    this.performanceMetrics = {
      stepDurations: [],
      optimizationSavings: 0,
      parallelExecutionSavings: 0
    };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Add resource usage data point
   * @param {string} type - Resource type (memory, cpu, network)
   * @param {number} value - Usage value
   * @param {Date} timestamp - Timestamp
   */
  addResourceUsage(type, value, timestamp = new Date()) {
    if (!this.resourceUsage[type]) {
      this.resourceUsage[type] = [];
    }
    this.resourceUsage[type].push({ value, timestamp });
  }

  /**
   * Add step duration
   * @param {number} stepIndex - Step index
   * @param {number} duration - Step duration
   */
  addStepDuration(stepIndex, duration) {
    this.performanceMetrics.stepDurations.push({ stepIndex, duration });
  }

  /**
   * Add error
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  addError(error, context = '') {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Add warning
   * @param {string} message - Warning message
   * @param {string} context - Warning context
   */
  addWarning(message, context = '') {
    this.warnings.push({
      message,
      context,
      timestamp: new Date()
    });
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getSummary() {
    return {
      executionId: this.executionId,
      workflowName: this.workflowName,
      duration: this.duration,
      stepCount: this.stepCount,
      completedSteps: this.completedSteps,
      failedSteps: this.failedSteps,
      successRate: this.stepCount > 0 ? (this.completedSteps / this.stepCount) * 100 : 0,
      cacheHitRate: (this.cacheHits + this.cacheMisses) > 0 ? 
        (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 : 0,
      retryAttempts: this.retryAttempts,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      averageStepDuration: this.performanceMetrics.stepDurations.length > 0 ?
        this.performanceMetrics.stepDurations.reduce((sum, d) => sum + d.duration, 0) / this.performanceMetrics.stepDurations.length : 0,
      optimizationSavings: this.performanceMetrics.optimizationSavings,
      parallelExecutionSavings: this.performanceMetrics.parallelExecutionSavings
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...this.getSummary(),
      resourceUsage: this.resourceUsage,
      performanceMetrics: this.performanceMetrics,
      errors: this.errors,
      warnings: this.warnings,
      startTime: this.startTime,
      endTime: this.endTime
    };
  }
}

/**
 * Execution alert configuration
 */
class AlertConfig {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.executionTimeout = options.executionTimeout || 300000; // 5 minutes
    this.memoryThreshold = options.memoryThreshold || 80; // 80% memory usage
    this.cpuThreshold = options.cpuThreshold || 90; // 90% CPU usage
    this.errorThreshold = options.errorThreshold || 3; // 3 errors
    this.stepFailureThreshold = options.stepFailureThreshold || 0.5; // 50% step failures
    this.performanceDegradationThreshold = options.performanceDegradationThreshold || 0.3; // 30% slower
  }
}

/**
 * Execution alert
 */
class ExecutionAlert {
  constructor(type, message, data = {}) {
    this.type = type;
    this.message = message;
    this.data = data;
    this.timestamp = new Date();
    this.severity = this.determineSeverity(type);
  }

  /**
   * Determine alert severity
   * @param {string} type - Alert type
   * @returns {string} Severity level
   */
  determineSeverity(type) {
    const severityMap = {
      'execution_timeout': 'critical',
      'memory_exceeded': 'warning',
      'cpu_exceeded': 'warning',
      'error_threshold': 'error',
      'step_failure': 'error',
      'performance_degradation': 'warning',
      'resource_shortage': 'warning'
    };
    return severityMap[type] || 'info';
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
      severity: this.severity
    };
  }
}

/**
 * Execution Monitor for real-time monitoring and metrics collection
 */
class ExecutionMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.enabled = options.enabled !== false;
    this.monitoringInterval = options.monitoringInterval || 1000; // 1 second
    this.metricsRetention = options.metricsRetention || 24 * 60 * 60 * 1000; // 24 hours
    this.alertConfig = new AlertConfig(options.alertConfig);
    
    // Storage
    this.activeExecutions = new Map(); // executionId -> ExecutionMetrics
    this.executionHistory = new Map(); // executionId -> ExecutionMetrics
    this.alerts = []; // Array of ExecutionAlert
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitoringTimer = null;
    
    // Performance tracking
    this.performanceBaseline = new Map(); // workflowName -> baseline metrics
    this.performanceThresholds = new Map(); // workflowName -> thresholds
    
    this.logger = options.logger || console;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringTimer = setInterval(() => {
      this.performMonitoring();
    }, this.monitoringInterval);

    this.logger.info('ExecutionMonitor: Started monitoring');
    this.emit('monitoring:started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    this.logger.info('ExecutionMonitor: Stopped monitoring');
    this.emit('monitoring:stopped');
  }

  /**
   * Register execution for monitoring
   * @param {string} executionId - Execution ID
   * @param {Object} executionData - Execution data
   */
  registerExecution(executionId, executionData) {
    if (!this.enabled) {
      return;
    }

    const metrics = new ExecutionMetrics();
    metrics.executionId = executionId;
    metrics.workflowName = executionData.workflowName;
    metrics.startTime = new Date();
    metrics.stepCount = executionData.stepCount || 0;

    this.activeExecutions.set(executionId, metrics);
    
    this.logger.info('ExecutionMonitor: Registered execution for monitoring', {
      executionId,
      workflowName: executionData.workflowName
    });
    
    this.emit('execution:registered', { executionId, metrics });
  }

  /**
   * Update execution metrics
   * @param {string} executionId - Execution ID
   * @param {Object} updateData - Update data
   */
  updateExecution(executionId, updateData) {
    if (!this.enabled) {
      return;
    }

    const metrics = this.activeExecutions.get(executionId);
    if (!metrics) {
      return;
    }

    // Update basic metrics
    if (updateData.completedSteps !== undefined) {
      metrics.completedSteps = updateData.completedSteps;
    }
    if (updateData.failedSteps !== undefined) {
      metrics.failedSteps = updateData.failedSteps;
    }
    if (updateData.cacheHits !== undefined) {
      metrics.cacheHits = updateData.cacheHits;
    }
    if (updateData.cacheMisses !== undefined) {
      metrics.cacheMisses = updateData.cacheMisses;
    }
    if (updateData.retryAttempts !== undefined) {
      metrics.retryAttempts = updateData.retryAttempts;
    }

    // Update resource usage
    if (updateData.resourceUsage) {
      Object.entries(updateData.resourceUsage).forEach(([type, value]) => {
        metrics.addResourceUsage(type, value);
      });
    }

    // Update step duration
    if (updateData.stepDuration) {
      metrics.addStepDuration(updateData.stepIndex, updateData.stepDuration);
    }

    // Add errors/warnings
    if (updateData.error) {
      metrics.addError(updateData.error, updateData.errorContext);
    }
    if (updateData.warning) {
      metrics.addWarning(updateData.warning, updateData.warningContext);
    }

    this.emit('execution:updated', { executionId, metrics, updateData });
  }

  /**
   * Complete execution monitoring
   * @param {string} executionId - Execution ID
   * @param {Object} finalData - Final execution data
   */
  completeExecution(executionId, finalData = {}) {
    if (!this.enabled) {
      return;
    }

    const metrics = this.activeExecutions.get(executionId);
    if (!metrics) {
      return;
    }

    // Finalize metrics
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime - metrics.startTime;

    // Apply final data
    if (finalData.optimizationSavings !== undefined) {
      metrics.performanceMetrics.optimizationSavings = finalData.optimizationSavings;
    }
    if (finalData.parallelExecutionSavings !== undefined) {
      metrics.performanceMetrics.parallelExecutionSavings = finalData.parallelExecutionSavings;
    }

    // Move to history
    this.executionHistory.set(executionId, metrics);
    this.activeExecutions.delete(executionId);

    // Update performance baseline
    this.updatePerformanceBaseline(metrics);

    // Check for alerts
    this.checkAlerts(executionId, metrics);

    // Cleanup old history
    this.cleanupOldHistory();

    this.logger.info('ExecutionMonitor: Completed execution monitoring', {
      executionId,
      duration: metrics.duration,
      successRate: metrics.getSummary().successRate
    });

    this.emit('execution:completed', { executionId, metrics });
  }

  /**
   * Perform monitoring checks
   */
  performMonitoring() {
    if (!this.enabled || this.activeExecutions.size === 0) {
      return;
    }

    const now = Date.now();

    // Check active executions for timeouts and resource issues
    for (const [executionId, metrics] of this.activeExecutions) {
      // Check execution timeout
      if (now - metrics.startTime > this.alertConfig.executionTimeout) {
        this.createAlert('execution_timeout', `Execution ${executionId} exceeded timeout`, {
          executionId,
          duration: now - metrics.startTime,
          timeout: this.alertConfig.executionTimeout
        });
      }

      // Check resource usage
      if (metrics.resourceUsage.memory.length > 0) {
        const latestMemory = metrics.resourceUsage.memory[metrics.resourceUsage.memory.length - 1];
        if (latestMemory.value > this.alertConfig.memoryThreshold) {
          this.createAlert('memory_exceeded', `Memory usage exceeded threshold for execution ${executionId}`, {
            executionId,
            memoryUsage: latestMemory.value,
            threshold: this.alertConfig.memoryThreshold
          });
        }
      }

      if (metrics.resourceUsage.cpu.length > 0) {
        const latestCpu = metrics.resourceUsage.cpu[metrics.resourceUsage.cpu.length - 1];
        if (latestCpu.value > this.alertConfig.cpuThreshold) {
          this.createAlert('cpu_exceeded', `CPU usage exceeded threshold for execution ${executionId}`, {
            executionId,
            cpuUsage: latestCpu.value,
            threshold: this.alertConfig.cpuThreshold
          });
        }
      }

      // Check error threshold
      if (metrics.errors.length >= this.alertConfig.errorThreshold) {
        this.createAlert('error_threshold', `Error threshold exceeded for execution ${executionId}`, {
          executionId,
          errorCount: metrics.errors.length,
          threshold: this.alertConfig.errorThreshold
        });
      }

      // Check step failure threshold
      if (metrics.stepCount > 0) {
        const failureRate = metrics.failedSteps / metrics.stepCount;
        if (failureRate >= this.alertConfig.stepFailureThreshold) {
          this.createAlert('step_failure', `Step failure rate exceeded threshold for execution ${executionId}`, {
            executionId,
            failureRate,
            threshold: this.alertConfig.stepFailureThreshold
          });
        }
      }
    }
  }

  /**
   * Create alert
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} data - Alert data
   */
  createAlert(type, message, data = {}) {
    const alert = new ExecutionAlert(type, message, data);
    this.alerts.push(alert);

    this.logger.warn('ExecutionMonitor: Alert created', {
      type: alert.type,
      message: alert.message,
      severity: alert.severity
    });

    this.emit('alert:created', alert);
  }

  /**
   * Update performance baseline
   * @param {ExecutionMetrics} metrics - Execution metrics
   */
  updatePerformanceBaseline(metrics) {
    if (!metrics.workflowName) {
      return;
    }

    const baseline = this.performanceBaseline.get(metrics.workflowName) || {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      stepDurations: []
    };

    baseline.count++;
    baseline.totalDuration += metrics.duration;
    baseline.averageDuration = baseline.totalDuration / baseline.count;

    // Update step durations
    metrics.performanceMetrics.stepDurations.forEach(stepDuration => {
      baseline.stepDurations.push(stepDuration);
    });

    this.performanceBaseline.set(metrics.workflowName, baseline);
  }

  /**
   * Check for performance degradation
   * @param {string} executionId - Execution ID
   * @param {ExecutionMetrics} metrics - Execution metrics
   */
  checkAlerts(executionId, metrics) {
    if (!metrics.workflowName) {
      return;
    }

    const baseline = this.performanceBaseline.get(metrics.workflowName);
    if (!baseline || baseline.count < 3) {
      return; // Need at least 3 executions for baseline
    }

    const degradationThreshold = this.alertConfig.performanceDegradationThreshold;
    const currentDuration = metrics.duration;
    const baselineDuration = baseline.averageDuration;

    if (currentDuration > baselineDuration * (1 + degradationThreshold)) {
      this.createAlert('performance_degradation', `Performance degradation detected for execution ${executionId}`, {
        executionId,
        workflowName: metrics.workflowName,
        currentDuration,
        baselineDuration,
        degradation: ((currentDuration - baselineDuration) / baselineDuration) * 100,
        threshold: degradationThreshold * 100
      });
    }
  }

  /**
   * Cleanup old history
   */
  cleanupOldHistory() {
    const cutoffTime = Date.now() - this.metricsRetention;

    for (const [executionId, metrics] of this.executionHistory) {
      if (metrics.endTime && metrics.endTime.getTime() < cutoffTime) {
        this.executionHistory.delete(executionId);
      }
    }

    // Cleanup old alerts
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Get execution metrics
   * @param {string} executionId - Execution ID
   * @returns {ExecutionMetrics|null} Execution metrics
   */
  getExecutionMetrics(executionId) {
    return this.activeExecutions.get(executionId) || this.executionHistory.get(executionId) || null;
  }

  /**
   * Get all active executions
   * @returns {Array} Active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.entries()).map(([id, metrics]) => ({
      executionId: id,
      metrics: metrics.getSummary()
    }));
  }

  /**
   * Get execution history
   * @param {Object} filters - Filter options
   * @returns {Array} Execution history
   */
  getExecutionHistory(filters = {}) {
    let history = Array.from(this.executionHistory.values());

    // Apply filters
    if (filters.workflowName) {
      history = history.filter(metrics => metrics.workflowName === filters.workflowName);
    }
    if (filters.minDuration) {
      history = history.filter(metrics => metrics.duration >= filters.minDuration);
    }
    if (filters.maxDuration) {
      history = history.filter(metrics => metrics.duration <= filters.maxDuration);
    }
    if (filters.minSuccessRate) {
      history = history.filter(metrics => metrics.getSummary().successRate >= filters.minSuccessRate);
    }

    return history.map(metrics => metrics.getSummary());
  }

  /**
   * Get alerts
   * @param {Object} filters - Filter options
   * @returns {Array} Alerts
   */
  getAlerts(filters = {}) {
    let alerts = this.alerts;

    // Apply filters
    if (filters.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }
    if (filters.type) {
      alerts = alerts.filter(alert => alert.type === filters.type);
    }
    if (filters.since) {
      alerts = alerts.filter(alert => alert.timestamp >= filters.since);
    }

    return alerts.map(alert => alert.toJSON());
  }

  /**
   * Get performance baseline
   * @param {string} workflowName - Workflow name
   * @returns {Object|null} Performance baseline
   */
  getPerformanceBaseline(workflowName) {
    return this.performanceBaseline.get(workflowName) || null;
  }

  /**
   * Get monitoring statistics
   * @returns {Object} Monitoring statistics
   */
  getStatistics() {
    return {
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionHistory.size,
      totalAlerts: this.alerts.length,
      performanceBaselines: this.performanceBaseline.size,
      isMonitoring: this.isMonitoring,
      enabled: this.enabled
    };
  }

  /**
   * Reset monitoring data
   */
  reset() {
    this.activeExecutions.clear();
    this.executionHistory.clear();
    this.alerts = [];
    this.performanceBaseline.clear();
    this.performanceThresholds.clear();

    this.logger.info('ExecutionMonitor: Reset all monitoring data');
    this.emit('monitoring:reset');
  }
}

module.exports = {
  ExecutionMonitor,
  ExecutionMetrics,
  AlertConfig,
  ExecutionAlert
}; 