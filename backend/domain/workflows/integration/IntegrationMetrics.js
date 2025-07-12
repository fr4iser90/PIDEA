/**
 * IntegrationMetrics - Integration metrics collection and analysis
 * 
 * This class provides comprehensive metrics collection for integration operations,
 * including performance metrics, success rates, error tracking, and system health
 * indicators. It supports real-time monitoring and historical analysis.
 */
class IntegrationMetrics {
  /**
   * Create a new integration metrics collector
   * @param {Object} options - Metrics options
   */
  constructor(options = {}) {
    this.options = {
      enableRealTimeMetrics: options.enableRealTimeMetrics !== false,
      enableHistoricalMetrics: options.enableHistoricalMetrics !== false,
      maxHistorySize: options.maxHistorySize || 10000,
      metricsRetentionHours: options.metricsRetentionHours || 24,
      enablePerformanceMetrics: options.enablePerformanceMetrics !== false,
      enableErrorMetrics: options.enableErrorMetrics !== false,
      enableHealthMetrics: options.enableHealthMetrics !== false,
      ...options
    };
    
    this.metrics = {
      integrations: new Map(),
      performance: new Map(),
      errors: new Map(),
      health: new Map(),
      summary: {
        totalIntegrations: 0,
        successfulIntegrations: 0,
        failedIntegrations: 0,
        averageDuration: 0,
        totalDuration: 0,
        lastIntegrationTime: null,
        errorRate: 0
      }
    };
    
    this.history = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize metrics collector
   * @param {Object} config - Metrics configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    this.options = { ...this.options, ...config };
    
    // Initialize metrics storage
    this.metrics = {
      integrations: new Map(),
      performance: new Map(),
      errors: new Map(),
      health: new Map(),
      summary: {
        totalIntegrations: 0,
        successfulIntegrations: 0,
        failedIntegrations: 0,
        averageDuration: 0,
        totalDuration: 0,
        lastIntegrationTime: null,
        errorRate: 0
      }
    };
    
    this.history = [];
    this.startTime = Date.now();
  }

  /**
   * Record integration metrics
   * @param {string} integrationId - Integration ID
   * @param {Object} request - Integration request
   * @param {Object} result - Integration result
   * @param {number} duration - Integration duration in milliseconds
   * @returns {Promise<void>}
   */
  async recordIntegration(integrationId, request, result, duration) {
    try {
      const timestamp = new Date();
      const metricData = {
        integrationId,
        request,
        result,
        duration,
        timestamp,
        success: result.success !== false,
        type: request.type,
        handlerType: request.handlerType || request.stepType || 'unknown'
      };

      // Store integration metric
      this.metrics.integrations.set(integrationId, metricData);

      // Update summary metrics
      this.updateSummaryMetrics(metricData);

      // Record performance metrics
      if (this.options.enablePerformanceMetrics) {
        await this.recordPerformanceMetrics(integrationId, metricData);
      }

      // Add to history
      if (this.options.enableHistoricalMetrics) {
        this.addToHistory(metricData);
      }

      // Cleanup old metrics
      this.cleanupOldMetrics();

    } catch (error) {
      console.error('IntegrationMetrics: Failed to record integration metrics', { error: error.message });
    }
  }

  /**
   * Record integration error
   * @param {string} integrationId - Integration ID
   * @param {Object} request - Integration request
   * @param {Error} error - Error object
   * @param {number} duration - Integration duration in milliseconds
   * @returns {Promise<void>}
   */
  async recordIntegrationError(integrationId, request, error, duration) {
    try {
      const timestamp = new Date();
      const errorData = {
        integrationId,
        request,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        duration,
        timestamp,
        success: false,
        type: request.type,
        handlerType: request.handlerType || request.stepType || 'unknown'
      };

      // Store error metric
      this.metrics.errors.set(integrationId, errorData);

      // Update summary metrics
      this.updateSummaryMetrics(errorData);

      // Record performance metrics for failed operations
      if (this.options.enablePerformanceMetrics) {
        await this.recordPerformanceMetrics(integrationId, errorData);
      }

      // Add to history
      if (this.options.enableHistoricalMetrics) {
        this.addToHistory(errorData);
      }

      // Cleanup old metrics
      this.cleanupOldMetrics();

    } catch (err) {
      console.error('IntegrationMetrics: Failed to record error metrics', { error: err.message });
    }
  }

  /**
   * Record performance metrics
   * @param {string} integrationId - Integration ID
   * @param {Object} metricData - Metric data
   * @returns {Promise<void>}
   */
  async recordPerformanceMetrics(integrationId, metricData) {
    const performanceData = {
      integrationId,
      duration: metricData.duration,
      timestamp: metricData.timestamp,
      type: metricData.type,
      handlerType: metricData.handlerType,
      success: metricData.success
    };

    this.metrics.performance.set(integrationId, performanceData);
  }

  /**
   * Record health metrics
   * @param {string} componentType - Component type
   * @param {Object} healthData - Health data
   * @returns {Promise<void>}
   */
  async recordHealthMetrics(componentType, healthData) {
    if (!this.options.enableHealthMetrics) {
      return;
    }

    const timestamp = new Date();
    const healthMetric = {
      componentType,
      healthData,
      timestamp,
      isHealthy: healthData.overall === 'healthy'
    };

    this.metrics.health.set(componentType, healthMetric);
  }

  /**
   * Update summary metrics
   * @param {Object} metricData - Metric data
   */
  updateSummaryMetrics(metricData) {
    const summary = this.metrics.summary;
    
    summary.totalIntegrations++;
    summary.totalDuration += metricData.duration;
    summary.lastIntegrationTime = metricData.timestamp;

    if (metricData.success) {
      summary.successfulIntegrations++;
    } else {
      summary.failedIntegrations++;
    }

    // Calculate averages
    summary.averageDuration = summary.totalDuration / summary.totalIntegrations;
    summary.errorRate = (summary.failedIntegrations / summary.totalIntegrations) * 100;
  }

  /**
   * Add metric to history
   * @param {Object} metricData - Metric data
   */
  addToHistory(metricData) {
    this.history.push(metricData);

    // Limit history size
    if (this.history.length > this.options.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Cleanup old metrics
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - (this.options.metricsRetentionHours * 60 * 60 * 1000);

    // Cleanup integrations
    for (const [id, metric] of this.metrics.integrations) {
      if (metric.timestamp.getTime() < cutoffTime) {
        this.metrics.integrations.delete(id);
      }
    }

    // Cleanup performance metrics
    for (const [id, metric] of this.metrics.performance) {
      if (metric.timestamp.getTime() < cutoffTime) {
        this.metrics.performance.delete(id);
      }
    }

    // Cleanup error metrics
    for (const [id, metric] of this.metrics.errors) {
      if (metric.timestamp.getTime() < cutoffTime) {
        this.metrics.errors.delete(id);
      }
    }

    // Cleanup health metrics
    for (const [type, metric] of this.metrics.health) {
      if (metric.timestamp.getTime() < cutoffTime) {
        this.metrics.health.delete(type);
      }
    }

    // Cleanup history
    this.history = this.history.filter(metric => metric.timestamp.getTime() >= cutoffTime);
  }

  /**
   * Get metrics summary
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    return {
      summary: { ...this.metrics.summary },
      current: {
        integrations: this.metrics.integrations.size,
        performance: this.metrics.performance.size,
        errors: this.metrics.errors.size,
        health: this.metrics.health.size,
        history: this.history.length
      },
      uptime: Date.now() - this.startTime,
      startTime: this.startTime
    };
  }

  /**
   * Get performance metrics
   * @param {Object} filters - Filter options
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics(filters = {}) {
    const metrics = Array.from(this.metrics.performance.values());
    
    // Apply filters
    let filteredMetrics = metrics;
    if (filters.type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === filters.type);
    }
    if (filters.handlerType) {
      filteredMetrics = filteredMetrics.filter(m => m.handlerType === filters.handlerType);
    }
    if (filters.success !== undefined) {
      filteredMetrics = filteredMetrics.filter(m => m.success === filters.success);
    }
    if (filters.timeRange) {
      const cutoffTime = Date.now() - filters.timeRange;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp.getTime() >= cutoffTime);
    }

    // Calculate performance statistics
    const durations = filteredMetrics.map(m => m.duration);
    const successful = filteredMetrics.filter(m => m.success);
    const failed = filteredMetrics.filter(m => !m.success);

    return {
      total: filteredMetrics.length,
      successful: successful.length,
      failed: failed.length,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      successRate: filteredMetrics.length > 0 ? (successful.length / filteredMetrics.length) * 100 : 0,
      metrics: filteredMetrics
    };
  }

  /**
   * Get error metrics
   * @param {Object} filters - Filter options
   * @returns {Object} Error metrics
   */
  getErrorMetrics(filters = {}) {
    const errors = Array.from(this.metrics.errors.values());
    
    // Apply filters
    let filteredErrors = errors;
    if (filters.type) {
      filteredErrors = filteredErrors.filter(e => e.type === filters.type);
    }
    if (filters.handlerType) {
      filteredErrors = filteredErrors.filter(e => e.handlerType === filters.handlerType);
    }
    if (filters.timeRange) {
      const cutoffTime = Date.now() - filters.timeRange;
      filteredErrors = filteredErrors.filter(e => e.timestamp.getTime() >= cutoffTime);
    }

    // Group errors by type
    const errorTypes = {};
    filteredErrors.forEach(error => {
      const errorType = error.error.name || 'Unknown';
      if (!errorTypes[errorType]) {
        errorTypes[errorType] = [];
      }
      errorTypes[errorType].push(error);
    });

    return {
      total: filteredErrors.length,
      errorTypes,
      recentErrors: filteredErrors.slice(-10), // Last 10 errors
      averageErrorDuration: filteredErrors.length > 0 
        ? filteredErrors.reduce((sum, e) => sum + e.duration, 0) / filteredErrors.length 
        : 0
    };
  }

  /**
   * Get health metrics
   * @returns {Object} Health metrics
   */
  getHealthMetrics() {
    const healthData = Array.from(this.metrics.health.values());
    
    const componentHealth = {};
    healthData.forEach(health => {
      componentHealth[health.componentType] = {
        isHealthy: health.isHealthy,
        lastCheck: health.timestamp,
        healthData: health.healthData
      };
    });

    const overallHealth = healthData.length > 0 
      ? healthData.every(h => h.isHealthy) ? 'healthy' : 'degraded'
      : 'unknown';

    return {
      overall: overallHealth,
      components: componentHealth,
      lastCheck: healthData.length > 0 ? Math.max(...healthData.map(h => h.timestamp.getTime())) : null
    };
  }

  /**
   * Get historical metrics
   * @param {Object} options - Options for historical data
   * @returns {Object} Historical metrics
   */
  getHistoricalMetrics(options = {}) {
    const { timeRange, limit, type, handlerType } = options;
    
    let filteredHistory = this.history;

    // Apply filters
    if (timeRange) {
      const cutoffTime = Date.now() - timeRange;
      filteredHistory = filteredHistory.filter(h => h.timestamp.getTime() >= cutoffTime);
    }
    
    if (type) {
      filteredHistory = filteredHistory.filter(h => h.type === type);
    }
    
    if (handlerType) {
      filteredHistory = filteredHistory.filter(h => h.handlerType === handlerType);
    }

    // Apply limit
    if (limit) {
      filteredHistory = filteredHistory.slice(-limit);
    }

    return {
      total: filteredHistory.length,
      metrics: filteredHistory,
      timeRange: timeRange || 'all'
    };
  }

  /**
   * Get metrics for specific integration
   * @param {string} integrationId - Integration ID
   * @returns {Object|null} Integration metrics
   */
  getIntegrationMetrics(integrationId) {
    const integration = this.metrics.integrations.get(integrationId);
    const performance = this.metrics.performance.get(integrationId);
    const error = this.metrics.errors.get(integrationId);

    if (!integration && !error) {
      return null;
    }

    return {
      integration: integration || null,
      performance: performance || null,
      error: error || null,
      hasError: !!error
    };
  }

  /**
   * Reset metrics
   * @returns {Promise<void>}
   */
  async resetMetrics() {
    this.metrics = {
      integrations: new Map(),
      performance: new Map(),
      errors: new Map(),
      health: new Map(),
      summary: {
        totalIntegrations: 0,
        successfulIntegrations: 0,
        failedIntegrations: 0,
        averageDuration: 0,
        totalDuration: 0,
        lastIntegrationTime: null,
        errorRate: 0
      }
    };
    
    this.history = [];
    this.startTime = Date.now();
  }

  /**
   * Export metrics
   * @param {Object} options - Export options
   * @returns {Object} Exported metrics
   */
  exportMetrics(options = {}) {
    const { includeHistory = true, includeDetails = true } = options;
    
    const exportData = {
      summary: this.metrics.summary,
      current: {
        integrations: includeDetails ? Array.from(this.metrics.integrations.values()) : this.metrics.integrations.size,
        performance: includeDetails ? Array.from(this.metrics.performance.values()) : this.metrics.performance.size,
        errors: includeDetails ? Array.from(this.metrics.errors.values()) : this.metrics.errors.size,
        health: includeDetails ? Array.from(this.metrics.health.values()) : this.metrics.health.size
      },
      uptime: Date.now() - this.startTime,
      startTime: this.startTime,
      exportTime: new Date()
    };

    if (includeHistory) {
      exportData.history = this.history;
    }

    return exportData;
  }

  /**
   * Cleanup metrics collector
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.metrics.integrations.clear();
    this.metrics.performance.clear();
    this.metrics.errors.clear();
    this.metrics.health.clear();
    this.history = [];
  }
}

module.exports = IntegrationMetrics; 