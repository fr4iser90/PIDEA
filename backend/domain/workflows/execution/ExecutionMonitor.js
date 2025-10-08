/**
 * ExecutionMonitor - Real-time monitoring and metrics collection for workflow execution
 * Provides comprehensive monitoring, alerting, and performance tracking
 */
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Execution monitor for workflow execution
 */
class ExecutionMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.enabled = options.enabled !== false;
    this.monitoringInterval = options.monitoringInterval || 1000; // 1 second
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.alertThresholds = {
      executionTime: options.executionTimeThreshold || 300000, // 5 minutes
      memoryUsage: options.memoryUsageThreshold || 80, // 80%
      cpuUsage: options.cpuUsageThreshold || 90, // 90%
      errorRate: options.errorRateThreshold || 0.1, // 10%
      queueSize: options.queueSizeThreshold || 50
    };
    
    this.metrics = {
      executions: new Map(),
      performance: new Map(),
      errors: new Map(),
      resources: new Map(),
      alerts: []
    };
    
    this.activeExecutions = new Map();
    this.executionHistory = new Map();
    this.performanceHistory = new Map();
    this.errorHistory = new Map();
    this.resourceHistory = new Map();
    
    this.monitoringTimer = null;
    this.logger = options.logger || console;
    
    // Start monitoring if enabled
    if (this.enabled) {
      this.start();
    }
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.monitoringTimer) {
      return;
    }
    
    this.logger.info('ExecutionMonitor: Starting monitoring');
    
    this.monitoringTimer = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.cleanupOldData();
    }, this.monitoringInterval);
    
    this.emit('monitoring:started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.logger.info('ExecutionMonitor: Monitoring stopped');
      this.emit('monitoring:stopped');
    }
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
    
    const execution = {
      id: executionId,
      startTime: Date.now(),
      status: 'running',
      data: executionData,
      metrics: {
        startTime: Date.now(),
        lastUpdate: Date.now(),
        stepCount: 0,
        completedSteps: 0,
        errors: 0,
        warnings: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };
    
    this.activeExecutions.set(executionId, execution);
    this.metrics.executions.set(executionId, execution);
    
    this.logger.debug('ExecutionMonitor: Registered execution', {
      executionId,
      workflowName: executionData.workflow?.getMetadata()?.name
    });
    
    this.emit('execution:registered', execution);
  }

  /**
   * Update execution status
   * @param {string} executionId - Execution ID
   * @param {Object} update - Status update
   */
  updateExecution(executionId, update) {
    if (!this.enabled) {
      return;
    }
    
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }
    
    // Update execution data
    Object.assign(execution, update);
    execution.metrics.lastUpdate = Date.now();
    
    // Update specific metrics
    if (update.stepCount !== undefined) {
      execution.metrics.stepCount = update.stepCount;
    }
    
    if (update.completedSteps !== undefined) {
      execution.metrics.completedSteps = update.completedSteps;
    }
    
    if (update.errors !== undefined) {
      execution.metrics.errors = update.errors;
    }
    
    if (update.warnings !== undefined) {
      execution.metrics.warnings = update.warnings;
    }
    
    if (update.memoryUsage !== undefined) {
      execution.metrics.memoryUsage = update.memoryUsage;
    }
    
    if (update.cpuUsage !== undefined) {
      execution.metrics.cpuUsage = update.cpuUsage;
    }
    
    this.logger.debug('ExecutionMonitor: Updated execution', {
      executionId,
      status: update.status,
      completedSteps: update.completedSteps
    });
    
    this.emit('execution:updated', execution);
  }

  /**
   * Complete execution monitoring
   * @param {string} executionId - Execution ID
   * @param {Object} result - Execution result
   */
  completeExecution(executionId, result) {
    if (!this.enabled) {
      return;
    }
    
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }
    
    // Calculate final metrics
    const duration = Date.now() - execution.metrics.startTime;
    const success = result.success !== false;
    
    execution.status = success ? 'completed' : 'failed';
    execution.result = result;
    execution.metrics.duration = duration;
    execution.metrics.success = success;
    execution.metrics.endTime = Date.now();
    
    // Move to history
    this.executionHistory.set(executionId, execution);
    this.activeExecutions.delete(executionId);
    
    // Update performance metrics
    this.updatePerformanceMetrics(executionId, execution);
    
    // Update error metrics if failed
    if (!success) {
      this.updateErrorMetrics(executionId, execution);
    }
    
    this.logger.info('ExecutionMonitor: Execution completed', {
      executionId,
      duration,
      success,
      stepCount: execution.metrics.stepCount,
      completedSteps: execution.metrics.completedSteps
    });
    
    this.emit('execution:completed', execution);
  }

  /**
   * Record error
   * @param {string} executionId - Execution ID
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  recordError(executionId, error, context = {}) {
    if (!this.enabled) {
      return;
    }
    
    const errorRecord = {
      executionId,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context
    };
    
    this.errorHistory.set(`${executionId}_${Date.now()}`, errorRecord);
    
    // Update execution error count
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.metrics.errors++;
    }
    
    this.logger.error('ExecutionMonitor: Error recorded', {
      executionId,
      error: error.message
    });
    
    this.emit('execution:error', errorRecord);
  }

  /**
   * Record warning
   * @param {string} executionId - Execution ID
   * @param {string} warning - Warning message
   * @param {Object} context - Warning context
   */
  recordWarning(executionId, warning, context = {}) {
    if (!this.enabled) {
      return;
    }
    
    const warningRecord = {
      executionId,
      warning,
      timestamp: Date.now(),
      context
    };
    
    // Update execution warning count
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.metrics.warnings++;
    }
    
    this.logger.warn('ExecutionMonitor: Warning recorded', {
      executionId,
      warning
    });
    
    this.emit('execution:warning', warningRecord);
  }

  /**
   * Update resource usage
   * @param {string} executionId - Execution ID
   * @param {Object} resourceUsage - Resource usage data
   */
  updateResourceUsage(executionId, resourceUsage) {
    if (!this.enabled) {
      return;
    }
    
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }
    
    execution.metrics.memoryUsage = resourceUsage.memory || 0;
    execution.metrics.cpuUsage = resourceUsage.cpu || 0;
    
    // Store resource history
    const resourceRecord = {
      executionId,
      timestamp: Date.now(),
      memory: resourceUsage.memory,
      cpu: resourceUsage.cpu,
      disk: resourceUsage.disk
    };
    
    this.resourceHistory.set(`${executionId}_${Date.now()}`, resourceRecord);
    
    this.emit('execution:resource_update', resourceRecord);
  }

  /**
   * Collect metrics
   */
  collectMetrics() {
    if (!this.enabled) {
      return;
    }
    
    const currentTime = Date.now();
    
    // Collect system metrics
    const systemMetrics = this.collectSystemMetrics();
    
    // Update performance metrics
    this.updateSystemPerformanceMetrics(systemMetrics);
    
    // Check for stalled executions
    this.checkStalledExecutions(currentTime);
    
    this.emit('metrics:collected', {
      timestamp: currentTime,
      systemMetrics,
      activeExecutions: this.activeExecutions.size
    });
  }

  /**
   * Collect system metrics
   * @returns {Object} System metrics
   */
  collectSystemMetrics() {
    const usage = process.memoryUsage();
    
    return {
      memory: {
        used: usage.heapUsed,
        total: usage.heapTotal,
        external: usage.external,
        percentage: (usage.heapUsed / usage.heapTotal) * 100
      },
      cpu: {
        usage: process.cpuUsage(),
        load: this.getCpuLoad()
      },
      uptime: process.uptime(),
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionHistory.size
    };
  }

  /**
   * Get CPU load (simplified)
   * @returns {number} CPU load percentage
   */
  getCpuLoad() {
    // Simplified CPU load calculation
    // In a real implementation, this would use os.loadavg() or similar
    return Math.random() * 100; // Placeholder
  }

  /**
   * Update system performance metrics
   * @param {Object} systemMetrics - System metrics
   */
  updateSystemPerformanceMetrics(systemMetrics) {
    const timestamp = Date.now();
    
    this.performanceHistory.set(timestamp, {
      timestamp,
      memory: systemMetrics.memory.percentage,
      cpu: systemMetrics.cpu.load,
      activeExecutions: systemMetrics.activeExecutions
    });
  }

  /**
   * Check for stalled executions
   * @param {number} currentTime - Current timestamp
   */
  checkStalledExecutions(currentTime) {
    const stallThreshold = 300000; // 5 minutes
    
    for (const [executionId, execution] of this.activeExecutions) {
      const timeSinceUpdate = currentTime - execution.metrics.lastUpdate;
      
      if (timeSinceUpdate > stallThreshold) {
        this.recordWarning(executionId, 'Execution appears to be stalled', {
          timeSinceUpdate,
          stallThreshold
        });
      }
    }
  }

  /**
   * Check alerts
   */
  checkAlerts() {
    if (!this.enabled) {
      return;
    }
    
    const alerts = [];
    
    // Check execution time alerts
    for (const [executionId, execution] of this.activeExecutions) {
      const duration = Date.now() - execution.metrics.startTime;
      
      if (duration > this.alertThresholds.executionTime) {
        alerts.push({
          type: 'execution_time',
          executionId,
          message: `Execution ${executionId} exceeded time threshold`,
          value: duration,
          threshold: this.alertThresholds.executionTime,
          severity: 'warning'
        });
      }
    }
    
    // Check resource usage alerts
    const systemMetrics = this.collectSystemMetrics();
    
    if (systemMetrics.memory.percentage > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        message: 'Memory usage exceeded threshold',
        value: systemMetrics.memory.percentage,
        threshold: this.alertThresholds.memoryUsage,
        severity: 'warning'
      });
    }
    
    if (systemMetrics.cpu.load > this.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_usage',
        message: 'CPU usage exceeded threshold',
        value: systemMetrics.cpu.load,
        threshold: this.alertThresholds.cpuUsage,
        severity: 'warning'
      });
    }
    
    // Check error rate alerts
    const errorRate = this.calculateErrorRate();
    if (errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        message: 'Error rate exceeded threshold',
        value: errorRate,
        threshold: this.alertThresholds.errorRate,
        severity: 'error'
      });
    }
    
    // Store and emit alerts
    for (const alert of alerts) {
      alert.timestamp = Date.now();
      this.metrics.alerts.push(alert);
      
      this.logger.warn('ExecutionMonitor: Alert triggered', alert);
      this.emit('alert:triggered', alert);
    }
  }

  /**
   * Calculate error rate
   * @returns {number} Error rate (0-1)
   */
  calculateErrorRate() {
    const recentExecutions = Array.from(this.executionHistory.values())
      .filter(execution => 
        Date.now() - execution.metrics.endTime < 3600000 // Last hour
      );
    
    if (recentExecutions.length === 0) {
      return 0;
    }
    
    const failedExecutions = recentExecutions.filter(execution => !execution.metrics.success);
    return failedExecutions.length / recentExecutions.length;
  }

  /**
   * Update performance metrics
   * @param {string} executionId - Execution ID
   * @param {Object} execution - Execution data
   */
  updatePerformanceMetrics(executionId, execution) {
    const performanceKey = `${execution.metrics.stepCount}_${execution.data.workflow?.getMetadata()?.type || 'unknown'}`;
    
    if (!this.performanceHistory.has(performanceKey)) {
      this.performanceHistory.set(performanceKey, {
        executions: 0,
        totalDuration: 0,
        averageDuration: 0,
        successCount: 0,
        successRate: 0
      });
    }
    
    const metrics = this.performanceHistory.get(performanceKey);
    metrics.executions++;
    metrics.totalDuration += execution.metrics.duration;
    metrics.averageDuration = metrics.totalDuration / metrics.executions;
    
    if (execution.metrics.success) {
      metrics.successCount++;
    }
    metrics.successRate = metrics.successCount / metrics.executions;
  }

  /**
   * Update error metrics
   * @param {string} executionId - Execution ID
   * @param {Object} execution - Execution data
   */
  updateErrorMetrics(executionId, execution) {
    const errorKey = execution.data.workflow?.getMetadata()?.type || 'unknown';
    
    if (!this.errorHistory.has(errorKey)) {
      this.errorHistory.set(errorKey, {
        count: 0,
        lastError: null,
        lastErrorTime: null
      });
    }
    
    const errorMetrics = this.errorHistory.get(errorKey);
    errorMetrics.count++;
    errorMetrics.lastError = execution.result.error;
    errorMetrics.lastErrorTime = Date.now();
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - 86400000; // 24 hours
    
    // Clean up execution history
    for (const [key, execution] of this.executionHistory) {
      if (execution.metrics.endTime < cutoffTime) {
        this.executionHistory.delete(key);
      }
    }
    
    // Clean up performance history
    for (const [key, metrics] of this.performanceHistory) {
      if (metrics.lastUpdate && metrics.lastUpdate < cutoffTime) {
        this.performanceHistory.delete(key);
      }
    }
    
    // Clean up error history
    for (const [key, error] of this.errorHistory) {
      if (error.timestamp && error.timestamp < cutoffTime) {
        this.errorHistory.delete(key);
      }
    }
    
    // Clean up resource history
    for (const [key, resource] of this.resourceHistory) {
      if (resource.timestamp < cutoffTime) {
        this.resourceHistory.delete(key);
      }
    }
    
    // Clean up old alerts (keep last 100)
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }
  }

  /**
   * Get execution status
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Execution status
   */
  getExecutionStatus(executionId) {
    const execution = this.activeExecutions.get(executionId) || 
                     this.executionHistory.get(executionId);
    
    if (!execution) {
      return null;
    }
    
    return {
      id: execution.id,
      status: execution.status,
      startTime: execution.metrics.startTime,
      duration: execution.metrics.endTime ? 
        execution.metrics.endTime - execution.metrics.startTime : 
        Date.now() - execution.metrics.startTime,
      stepCount: execution.metrics.stepCount,
      completedSteps: execution.metrics.completedSteps,
      errors: execution.metrics.errors,
      warnings: execution.metrics.warnings,
      memoryUsage: execution.metrics.memoryUsage,
      cpuUsage: execution.metrics.cpuUsage,
      success: execution.metrics.success
    };
  }

  /**
   * Get system metrics
   * @returns {Object} System metrics
   */
  getSystemMetrics() {
    const systemMetrics = this.collectSystemMetrics();
    
    return {
      current: systemMetrics,
      performance: this.getPerformanceMetrics(),
      errors: this.getErrorMetrics(),
      alerts: this.metrics.alerts.slice(-10) // Last 10 alerts
    };
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [key, data] of this.performanceHistory) {
      metrics[key] = {
        executions: data.executions,
        averageDuration: data.averageDuration,
        successRate: data.successRate
      };
    }
    
    return metrics;
  }

  /**
   * Get error metrics
   * @returns {Object} Error metrics
   */
  getErrorMetrics() {
    const metrics = {};
    
    for (const [key, data] of this.errorHistory) {
      metrics[key] = {
        count: data.count,
        lastError: data.lastError,
        lastErrorTime: data.lastErrorTime
      };
    }
    
    return metrics;
  }

  /**
   * Get active executions
   * @returns {Array<Object>} Active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map(execution => ({
      id: execution.id,
      status: execution.status,
      startTime: execution.metrics.startTime,
      duration: Date.now() - execution.metrics.startTime,
      stepCount: execution.metrics.stepCount,
      completedSteps: execution.metrics.completedSteps,
      workflowName: execution.data.workflow?.getMetadata()?.name
    }));
  }

  /**
   * Get execution history
   * @param {number} limit - Number of executions to return
   * @returns {Array<Object>} Execution history
   */
  getExecutionHistory(limit = 50) {
    const executions = Array.from(this.executionHistory.values())
      .sort((a, b) => b.metrics.endTime - a.metrics.endTime)
      .slice(0, limit);
    
    return executions.map(execution => ({
      id: execution.id,
      status: execution.status,
      startTime: execution.metrics.startTime,
      endTime: execution.metrics.endTime,
      duration: execution.metrics.duration,
      success: execution.metrics.success,
      stepCount: execution.metrics.stepCount,
      completedSteps: execution.metrics.completedSteps,
      errors: execution.metrics.errors,
      workflowName: execution.data.workflow?.getMetadata()?.name
    }));
  }

  /**
   * Get alerts
   * @param {number} limit - Number of alerts to return
   * @returns {Array<Object>} Alerts
   */
  getAlerts(limit = 50) {
    return this.metrics.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.executions.clear();
    this.metrics.performance.clear();
    this.metrics.errors.clear();
    this.metrics.resources.clear();
    this.metrics.alerts = [];
    
    this.executionHistory.clear();
    this.performanceHistory.clear();
    this.errorHistory.clear();
    this.resourceHistory.clear();
    
    this.logger.info('ExecutionMonitor: Metrics cleared');
    this.emit('metrics:cleared');
  }

  /**
   * Get monitor statistics
   * @returns {Object} Monitor statistics
   */
  getStatistics() {
    return {
      enabled: this.enabled,
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionHistory.size,
      totalAlerts: this.metrics.alerts.length,
      performanceMetrics: this.performanceHistory.size,
      errorMetrics: this.errorHistory.size,
      resourceMetrics: this.resourceHistory.size,
      monitoringInterval: this.monitoringInterval,
      alertThresholds: this.alertThresholds
    };
  }
}

module.exports = ExecutionMonitor; 