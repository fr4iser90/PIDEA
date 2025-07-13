/**
 * AutomationMetrics - Automation metrics
 * Tracks and analyzes automation performance metrics
 */
const { v4: uuidv4 } = require('uuid');

class AutomationMetrics {
  constructor() {
    this._metrics = new Map();
    this._executions = [];
    this._startTime = Date.now();
  }

  /**
   * Record execution
   * @param {Object} execution - Execution data
   */
  recordExecution(execution) {
    const executionRecord = {
      id: uuidv4(),
      taskId: execution.taskId,
      automationLevel: execution.automationLevel,
      confidenceScore: execution.confidenceScore,
      success: execution.success,
      executionTime: execution.executionTime,
      timestamp: new Date(),
      errors: execution.errors || [],
      warnings: execution.warnings || []
    };

    this._executions.push(executionRecord);
    this._updateMetrics(executionRecord);
  }

  /**
   * Update metrics based on execution
   * @param {Object} execution - Execution record
   */
  _updateMetrics(execution) {
    const level = execution.automationLevel;
    
    if (!this._metrics.has(level)) {
      this._metrics.set(level, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        totalConfidenceScore: 0,
        averageConfidenceScore: 0,
        totalErrors: 0,
        totalWarnings: 0,
        lastExecution: null
      });
    }

    const metrics = this._metrics.get(level);
    metrics.totalExecutions++;
    metrics.totalExecutionTime += execution.executionTime;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;

    if (execution.success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    if (execution.confidenceScore !== null) {
      metrics.totalConfidenceScore += execution.confidenceScore;
      metrics.averageConfidenceScore = metrics.totalConfidenceScore / metrics.totalExecutions;
    }

    metrics.totalErrors += execution.errors.length;
    metrics.totalWarnings += execution.warnings.length;
    metrics.lastExecution = execution.timestamp;
  }

  /**
   * Get metrics for automation level
   * @param {string} level - Automation level
   * @returns {Object|null} Metrics for level
   */
  getMetricsForLevel(level) {
    return this._metrics.get(level) || null;
  }

  /**
   * Get all metrics
   * @returns {Object} All metrics
   */
  getAllMetrics() {
    const result = {};
    for (const [level, metrics] of this._metrics.entries()) {
      result[level] = { ...metrics };
    }
    return result;
  }

  /**
   * Get success rate for automation level
   * @param {string} level - Automation level
   * @returns {number} Success rate (0-1)
   */
  getSuccessRate(level) {
    const metrics = this.getMetricsForLevel(level);
    if (!metrics || metrics.totalExecutions === 0) {
      return 0;
    }
    return metrics.successfulExecutions / metrics.totalExecutions;
  }

  /**
   * Get overall success rate
   * @returns {number} Overall success rate (0-1)
   */
  getOverallSuccessRate() {
    let totalExecutions = 0;
    let totalSuccessful = 0;

    for (const metrics of this._metrics.values()) {
      totalExecutions += metrics.totalExecutions;
      totalSuccessful += metrics.successfulExecutions;
    }

    return totalExecutions > 0 ? totalSuccessful / totalExecutions : 0;
  }

  /**
   * Get average execution time for automation level
   * @param {string} level - Automation level
   * @returns {number} Average execution time in milliseconds
   */
  getAverageExecutionTime(level) {
    const metrics = this.getMetricsForLevel(level);
    return metrics ? metrics.averageExecutionTime : 0;
  }

  /**
   * Get average confidence score for automation level
   * @param {string} level - Automation level
   * @returns {number} Average confidence score (0-1)
   */
  getAverageConfidenceScore(level) {
    const metrics = this.getMetricsForLevel(level);
    return metrics ? metrics.averageConfidenceScore : 0;
  }

  /**
   * Get total executions for automation level
   * @param {string} level - Automation level
   * @returns {number} Total executions
   */
  getTotalExecutions(level) {
    const metrics = this.getMetricsForLevel(level);
    return metrics ? metrics.totalExecutions : 0;
  }

  /**
   * Get total executions across all levels
   * @returns {number} Total executions
   */
  getTotalExecutions() {
    let total = 0;
    for (const metrics of this._metrics.values()) {
      total += metrics.totalExecutions;
    }
    return total;
  }

  /**
   * Get recent executions
   * @param {number} limit - Number of recent executions to return
   * @returns {Array} Recent executions
   */
  getRecentExecutions(limit = 10) {
    return this._executions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get executions for time period
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Array} Executions in time period
   */
  getExecutionsForPeriod(startTime, endTime) {
    return this._executions.filter(execution => 
      execution.timestamp >= startTime && execution.timestamp <= endTime
    );
  }

  /**
   * Get error rate for automation level
   * @param {string} level - Automation level
   * @returns {number} Error rate (0-1)
   */
  getErrorRate(level) {
    const metrics = this.getMetricsForLevel(level);
    if (!metrics || metrics.totalExecutions === 0) {
      return 0;
    }
    return metrics.totalErrors / metrics.totalExecutions;
  }

  /**
   * Get warning rate for automation level
   * @param {string} level - Automation level
   * @returns {number} Warning rate (0-1)
   */
  getWarningRate(level) {
    const metrics = this.getMetricsForLevel(level);
    if (!metrics || metrics.totalExecutions === 0) {
      return 0;
    }
    return metrics.totalWarnings / metrics.totalExecutions;
  }

  /**
   * Get uptime
   * @returns {number} Uptime in milliseconds
   */
  getUptime() {
    return Date.now() - this._startTime;
  }

  /**
   * Get formatted uptime
   * @returns {string} Formatted uptime
   */
  getFormattedUptime() {
    const uptime = this.getUptime();
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getSummary() {
    const summary = {
      uptime: this.getUptime(),
      formattedUptime: this.getFormattedUptime(),
      totalExecutions: this.getTotalExecutions(),
      overallSuccessRate: this.getOverallSuccessRate(),
      levels: {}
    };

    for (const [level, metrics] of this._metrics.entries()) {
      summary.levels[level] = {
        totalExecutions: metrics.totalExecutions,
        successRate: this.getSuccessRate(level),
        averageExecutionTime: metrics.averageExecutionTime,
        averageConfidenceScore: metrics.averageConfidenceScore,
        errorRate: this.getErrorRate(level),
        warningRate: this.getWarningRate(level),
        lastExecution: metrics.lastExecution
      };
    }

    return summary;
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this._metrics.clear();
    this._executions = [];
    this._startTime = Date.now();
  }

  /**
   * Export metrics to JSON
   * @returns {Object} Metrics JSON representation
   */
  toJSON() {
    return {
      metrics: this.getAllMetrics(),
      executions: this._executions,
      startTime: this._startTime,
      summary: this.getSummary()
    };
  }

  /**
   * Create metrics from JSON
   * @param {Object} data - Metrics data
   * @returns {AutomationMetrics} New metrics instance
   */
  static fromJSON(data) {
    const metrics = new AutomationMetrics();
    
    if (data.startTime) {
      metrics._startTime = data.startTime;
    }
    
    if (data.metrics) {
      for (const [level, levelMetrics] of Object.entries(data.metrics)) {
        metrics._metrics.set(level, levelMetrics);
      }
    }
    
    if (data.executions) {
      metrics._executions = data.executions.map(execution => ({
        ...execution,
        timestamp: new Date(execution.timestamp)
      }));
    }
    
    return metrics;
  }
}

module.exports = AutomationMetrics; 