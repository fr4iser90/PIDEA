/**
 * PerformanceMonitor - Database performance monitoring core
 * Provides comprehensive performance tracking, metrics collection, and alerting
 */
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const crypto = require('crypto');

class PerformanceMonitor extends EventEmitter {
  constructor(databaseConnection, options = {}) {
    super();
    
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('PerformanceMonitor');
    this.enabled = options.enabled !== false;
    this.slowQueryThreshold = options.slowQueryThreshold || 1000; // 1 second
    this.metricsRetentionDays = options.metricsRetentionDays || 30;
    this.maxCacheSize = options.maxCacheSize || 1000;
    
    // Performance tracking
    this.queryMetrics = new Map();
    this.performanceHistory = [];
    this.slowQueries = [];
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0
    };
    
    // Configuration
    this.config = {
      trackQueries: true,
      trackCache: true,
      trackMetrics: true,
      alertSlowQueries: true,
      ...options
    };
    
    this.logger.info('PerformanceMonitor initialized');
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (!this.enabled) {
      this.logger.info('Performance monitoring disabled');
      return;
    }

    this.logger.info('Starting performance monitoring');
    
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
    
    this.emit('started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.logger.info('Performance monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Track query execution
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} result - Query result
   * @param {string} databaseType - Database type
   */
  async trackQuery(query, params, executionTime, result, databaseType) {
    if (!this.config.trackQueries) return;

    try {
      const queryHash = this.generateQueryHash(query, params);
      const queryText = this.sanitizeQuery(query);
      
      const queryMetric = {
        queryHash,
        queryText,
        executionTime,
        rowsAffected: result?.rowCount || 0,
        rowsReturned: result?.rows?.length || 0,
        databaseType,
        timestamp: new Date().toISOString()
      };

      // Store metric
      this.queryMetrics.set(queryHash, queryMetric);
      
      // Add to performance history
      this.performanceHistory.push(queryMetric);
      
      // Check for slow queries
      if (executionTime > this.slowQueryThreshold) {
        await this.handleSlowQuery(queryMetric);
      }
      
      // Store in database
      await this.storeQueryMetric(queryMetric);
      
      this.emit('queryTracked', queryMetric);
      
    } catch (error) {
      this.logger.error('Error tracking query:', error.message);
    }
  }

  /**
   * Track cache performance
   * @param {string} cacheKey - Cache key
   * @param {boolean} hit - Cache hit or miss
   * @param {number} responseTime - Response time in milliseconds
   */
  trackCache(cacheKey, hit, responseTime = 0) {
    if (!this.config.trackCache) return;

    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    const cacheMetric = {
      cacheKey,
      hit,
      responseTime,
      timestamp: new Date().toISOString()
    };

    this.emit('cacheTracked', cacheMetric);
  }

  /**
   * Record performance metric
   * @param {string} metricType - Type of metric
   * @param {number} value - Metric value
   * @param {string} unit - Metric unit
   * @param {string} databaseType - Database type
   */
  async recordMetric(metricType, value, unit, databaseType) {
    if (!this.config.trackMetrics) return;

    try {
      const metric = {
        metricType,
        value,
        unit,
        databaseType,
        timestamp: new Date().toISOString()
      };

      // Store in database
      await this.storePerformanceMetric(metric);
      
      this.emit('metricRecorded', metric);
      
    } catch (error) {
      this.logger.error('Error recording metric:', error.message);
    }
  }

  /**
   * Handle slow query detection
   * @param {Object} queryMetric - Query metric
   */
  async handleSlowQuery(queryMetric) {
    if (!this.config.alertSlowQueries) return;

    try {
      const slowQuery = {
        ...queryMetric,
        threshold: this.slowQueryThreshold,
        alertLevel: queryMetric.executionTime > this.slowQueryThreshold * 2 ? 'critical' : 'warning'
      };

      this.slowQueries.push(slowQuery);
      
      // Store alert in database
      await this.storeSlowQueryAlert(slowQuery);
      
      this.logger.warn(`Slow query detected: ${queryMetric.executionTime}ms - ${queryMetric.queryText.substring(0, 100)}...`);
      this.emit('slowQueryDetected', slowQuery);
      
    } catch (error) {
      this.logger.error('Error handling slow query:', error.message);
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const totalQueries = this.queryMetrics.size;
    const avgExecutionTime = totalQueries > 0 
      ? Array.from(this.queryMetrics.values()).reduce((sum, metric) => sum + metric.executionTime, 0) / totalQueries
      : 0;
    
    const slowQueryCount = this.slowQueries.length;
    const cacheHitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
      : 0;

    return {
      totalQueries,
      avgExecutionTime: Math.round(avgExecutionTime),
      slowQueryCount,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheStats: { ...this.cacheStats },
      enabled: this.enabled,
      config: this.config
    };
  }

  /**
   * Get recent performance history
   * @param {number} limit - Number of recent entries
   * @returns {Array} Recent performance history
   */
  getRecentHistory(limit = 100) {
    return this.performanceHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get slow queries
   * @param {number} limit - Number of recent slow queries
   * @returns {Array} Recent slow queries
   */
  getSlowQueries(limit = 50) {
    return this.slowQueries
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Generate query hash for tracking
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Query hash
   */
  generateQueryHash(query, params) {
    const normalizedQuery = this.normalizeQuery(query);
    const queryString = normalizedQuery + JSON.stringify(params || []);
    return crypto.createHash('sha256').update(queryString).digest('hex').substring(0, 16);
  }

  /**
   * Normalize query for consistent hashing
   * @param {string} query - SQL query
   * @returns {string} Normalized query
   */
  normalizeQuery(query) {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .trim()
      .toLowerCase();
  }

  /**
   * Sanitize query for logging
   * @param {string} query - SQL query
   * @returns {string} Sanitized query
   */
  sanitizeQuery(query) {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Store query metric in database
   * @param {Object} metric - Query metric
   */
  async storeQueryMetric(metric) {
    try {
      const sql = `
        INSERT INTO query_performance (
          query_hash, query_text, execution_time_ms, rows_affected, 
          rows_returned, database_type, user_id, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        metric.queryHash,
        metric.queryText,
        metric.executionTime,
        metric.rowsAffected,
        metric.rowsReturned,
        metric.databaseType,
        'system',
        metric.timestamp,
        JSON.stringify({})
      ];

      await this.databaseConnection.execute(sql, params);
      
    } catch (error) {
      this.logger.error('Error storing query metric:', error.message);
    }
  }

  /**
   * Store performance metric in database
   * @param {Object} metric - Performance metric
   */
  async storePerformanceMetric(metric) {
    try {
      const sql = `
        INSERT INTO performance_metrics (
          metric_type, metric_value, metric_unit, database_type, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        metric.metricType,
        metric.value,
        metric.unit,
        metric.databaseType,
        metric.timestamp,
        JSON.stringify({})
      ];

      await this.databaseConnection.execute(sql, params);
      
    } catch (error) {
      this.logger.error('Error storing performance metric:', error.message);
    }
  }

  /**
   * Store slow query alert in database
   * @param {Object} alert - Slow query alert
   */
  async storeSlowQueryAlert(alert) {
    try {
      const sql = `
        INSERT INTO slow_query_alerts (
          query_hash, query_text, execution_time_ms, threshold_ms, 
          alert_level, database_type, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        alert.queryHash,
        alert.queryText,
        alert.executionTime,
        alert.threshold,
        alert.alertLevel,
        alert.databaseType,
        alert.timestamp,
        JSON.stringify({})
      ];

      await this.databaseConnection.execute(sql, params);
      
    } catch (error) {
      this.logger.error('Error storing slow query alert:', error.message);
    }
  }

  /**
   * Cleanup old metrics
   */
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.metricsRetentionDays);
      
      // Cleanup in-memory data
      this.performanceHistory = this.performanceHistory.filter(
        metric => new Date(metric.timestamp) > cutoffDate
      );
      
      this.slowQueries = this.slowQueries.filter(
        query => new Date(query.timestamp) > cutoffDate
      );
      
      // Cleanup database
      const sql = 'DELETE FROM query_performance WHERE timestamp < ?';
      await this.databaseConnection.execute(sql, [cutoffDate.toISOString()]);
      
      this.logger.info('Old metrics cleaned up');
      
    } catch (error) {
      this.logger.error('Error cleaning up old metrics:', error.message);
    }
  }
}

module.exports = PerformanceMonitor;
