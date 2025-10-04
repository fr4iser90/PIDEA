/**
 * CacheAnalytics - Performance monitoring and analytics
 * Tracks cache performance metrics and provides insights
 * Implements real-time monitoring and reporting
 */

import { logger } from "@/infrastructure/logging/Logger";
import { cacheConfig } from "@/config/cache-config";

export class CacheAnalytics {
  constructor(cacheService) {
    this.cacheService = cacheService;
    
    // Analytics data storage
    this.metrics = {
      // Performance metrics
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      totalOperations: 0,
      
      // Memory metrics
      memoryUsage: 0,
      memoryEfficiency: 0,
      entryCount: 0,
      
      // Invalidation metrics
      invalidationCount: 0,
      selectiveInvalidations: 0,
      globalInvalidations: 0,
      
      // Data type metrics
      dataTypeStats: {},
      
      // Time-based metrics
      hourlyStats: new Map(),
      dailyStats: new Map(),
      
      // Performance thresholds
      thresholds: {
        hitRate: cacheConfig.performance.hitRateThreshold,
        responseTime: cacheConfig.performance.responseTimeThreshold,
        memoryUsage: cacheConfig.memory.maxSize,
        invalidationRate: 0.1 // 10%
      }
    };
    
    // Monitoring intervals
    this.monitoringInterval = null;
    this.reportingInterval = null;
    
    // Alert thresholds
    this.alerts = {
      hitRateLow: false,
      responseTimeHigh: false,
      memoryUsageHigh: false,
      invalidationRateHigh: false
    };
    
    this.startMonitoring();
    
    logger.info('CacheAnalytics initialized with performance monitoring');
  }

  /**
   * Start monitoring cache performance
   */
  startMonitoring() {
    // Update metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000);
    
    // Generate reports every 5 minutes
    this.reportingInterval = setInterval(() => {
      this.generateReport();
    }, 300000);
    
    logger.info('Cache analytics monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    logger.info('Cache analytics monitoring stopped');
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    try {
      const cacheStats = this.cacheService.getStats();
      
      // Update basic metrics
      this.metrics.hitRate = cacheStats.hitRate || 0;
      this.metrics.missRate = 1 - this.metrics.hitRate;
      this.metrics.averageResponseTime = cacheStats.averageResponseTime || 0;
      this.metrics.totalOperations = cacheStats.hits + cacheStats.misses;
      this.metrics.memoryUsage = cacheStats.memorySize || 0;
      this.metrics.entryCount = cacheStats.memoryEntries || 0;
      
      // Calculate memory efficiency
      this.metrics.memoryEfficiency = this.metrics.entryCount > 0 
        ? this.metrics.memoryUsage / this.metrics.entryCount 
        : 0;
      
      // Update time-based metrics
      this.updateTimeBasedMetrics();
      
      // Check for alerts
      this.checkAlerts();
      
    } catch (error) {
      logger.error('Failed to update cache metrics:', error);
    }
  }

  /**
   * Update time-based metrics
   */
  updateTimeBasedMetrics() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.toDateString();
    
    // Hourly stats
    if (!this.metrics.hourlyStats.has(hour)) {
      this.metrics.hourlyStats.set(hour, {
        hitRate: 0,
        operations: 0,
        memoryUsage: 0,
        invalidations: 0
      });
    }
    
    const hourlyStats = this.metrics.hourlyStats.get(hour);
    hourlyStats.hitRate = this.metrics.hitRate;
    hourlyStats.operations = this.metrics.totalOperations;
    hourlyStats.memoryUsage = this.metrics.memoryUsage;
    hourlyStats.invalidations = this.metrics.invalidationCount;
    
    // Daily stats
    if (!this.metrics.dailyStats.has(day)) {
      this.metrics.dailyStats.set(day, {
        hitRate: 0,
        operations: 0,
        memoryUsage: 0,
        invalidations: 0,
        peakMemory: 0
      });
    }
    
    const dailyStats = this.metrics.dailyStats.get(day);
    dailyStats.hitRate = this.metrics.hitRate;
    dailyStats.operations = this.metrics.totalOperations;
    dailyStats.memoryUsage = this.metrics.memoryUsage;
    dailyStats.invalidations = this.metrics.invalidationCount;
    dailyStats.peakMemory = Math.max(dailyStats.peakMemory, this.metrics.memoryUsage);
  }

  /**
   * Check for performance alerts
   */
  checkAlerts() {
    const thresholds = this.metrics.thresholds;
    
    // Hit rate alert
    if (this.metrics.hitRate < thresholds.hitRate && !this.alerts.hitRateLow) {
      this.alerts.hitRateLow = true;
      this.triggerAlert('hitRateLow', `Hit rate below threshold: ${(this.metrics.hitRate * 100).toFixed(1)}%`);
    } else if (this.metrics.hitRate >= thresholds.hitRate && this.alerts.hitRateLow) {
      this.alerts.hitRateLow = false;
      this.clearAlert('hitRateLow');
    }
    
    // Response time alert
    if (this.metrics.averageResponseTime > thresholds.responseTime && !this.alerts.responseTimeHigh) {
      this.alerts.responseTimeHigh = true;
      this.triggerAlert('responseTimeHigh', `Response time above threshold: ${this.metrics.averageResponseTime.toFixed(1)}ms`);
    } else if (this.metrics.averageResponseTime <= thresholds.responseTime && this.alerts.responseTimeHigh) {
      this.alerts.responseTimeHigh = false;
      this.clearAlert('responseTimeHigh');
    }
    
    // Memory usage alert
    if (this.metrics.memoryUsage > thresholds.memoryUsage && !this.alerts.memoryUsageHigh) {
      this.alerts.memoryUsageHigh = true;
      this.triggerAlert('memoryUsageHigh', `Memory usage above threshold: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    } else if (this.metrics.memoryUsage <= thresholds.memoryUsage && this.alerts.memoryUsageHigh) {
      this.alerts.memoryUsageHigh = false;
      this.clearAlert('memoryUsageHigh');
    }
  }

  /**
   * Trigger performance alert
   * @param {string} alertType - Alert type
   * @param {string} message - Alert message
   */
  triggerAlert(alertType, message) {
    logger.warn(`🚨 Cache Performance Alert: ${alertType} - ${message}`);
    
    // Emit alert event for external handling
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('cache:alert', {
        detail: { type: alertType, message, metrics: this.metrics }
      }));
    }
  }

  /**
   * Clear performance alert
   * @param {string} alertType - Alert type
   */
  clearAlert(alertType) {
    logger.info(`✅ Cache Performance Alert Cleared: ${alertType}`);
    
    // Emit alert cleared event
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('cache:alertCleared', {
        detail: { type: alertType, metrics: this.metrics }
      }));
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          hitRate: this.metrics.hitRate,
          averageResponseTime: this.metrics.averageResponseTime,
          memoryUsage: this.metrics.memoryUsage,
          entryCount: this.metrics.entryCount,
          totalOperations: this.metrics.totalOperations
        },
        alerts: Object.keys(this.alerts).filter(key => this.alerts[key]),
        recommendations: this.generateRecommendations(),
        trends: this.calculateTrends()
      };
      
      logger.info('📊 Cache Performance Report Generated', report);
      
      // Emit report event
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('cache:report', {
          detail: report
        }));
      }
      
    } catch (error) {
      logger.error('Failed to generate cache report:', error);
    }
  }

  /**
   * Generate performance recommendations
   * @returns {Array} Recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Hit rate recommendations
    if (this.metrics.hitRate < 0.7) {
      recommendations.push({
        type: 'hitRate',
        priority: 'high',
        message: 'Consider increasing TTL for frequently accessed data',
        action: 'Review cache configuration and increase TTL values'
      });
    }
    
    // Response time recommendations
    if (this.metrics.averageResponseTime > 150) {
      recommendations.push({
        type: 'responseTime',
        priority: 'medium',
        message: 'Cache operations are slower than expected',
        action: 'Check for memory pressure and consider cache optimization'
      });
    }
    
    // Memory usage recommendations
    if (this.metrics.memoryUsage > this.metrics.thresholds.memoryUsage * 0.8) {
      recommendations.push({
        type: 'memoryUsage',
        priority: 'medium',
        message: 'Memory usage is approaching limits',
        action: 'Consider implementing cache compression or reducing TTL values'
      });
    }
    
    // Invalidation recommendations
    if (this.metrics.invalidationCount > this.metrics.totalOperations * 0.2) {
      recommendations.push({
        type: 'invalidation',
        priority: 'low',
        message: 'High invalidation rate detected',
        action: 'Review invalidation patterns and consider more selective invalidation'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate performance trends
   * @returns {Object} Trend data
   */
  calculateTrends() {
    const trends = {
      hitRate: 'stable',
      responseTime: 'stable',
      memoryUsage: 'stable'
    };
    
    // Calculate trends based on hourly data
    const hourlyData = Array.from(this.metrics.hourlyStats.values());
    
    if (hourlyData.length >= 2) {
      const recent = hourlyData.slice(-2);
      const older = hourlyData.slice(-4, -2);
      
      if (recent.length >= 2 && older.length >= 2) {
        const recentAvg = recent.reduce((sum, stat) => sum + stat.hitRate, 0) / recent.length;
        const olderAvg = older.reduce((sum, stat) => sum + stat.hitRate, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.05) {
          trends.hitRate = 'improving';
        } else if (recentAvg < olderAvg * 0.95) {
          trends.hitRate = 'declining';
        }
      }
    }
    
    return trends;
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      alerts: { ...this.alerts },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get historical data
   * @param {string} period - Period (hourly, daily)
   * @returns {Object} Historical data
   */
  getHistoricalData(period = 'hourly') {
    const data = period === 'hourly' ? this.metrics.hourlyStats : this.metrics.dailyStats;
    
    return {
      period,
      data: Array.from(data.entries()).map(([key, value]) => ({
        time: key,
        ...value
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export analytics data
   * @returns {Object} Exported data
   */
  exportData() {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      thresholds: this.metrics.thresholds,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset analytics data
   */
  reset() {
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      totalOperations: 0,
      memoryUsage: 0,
      memoryEfficiency: 0,
      entryCount: 0,
      invalidationCount: 0,
      selectiveInvalidations: 0,
      globalInvalidations: 0,
      dataTypeStats: {},
      hourlyStats: new Map(),
      dailyStats: new Map(),
      thresholds: this.metrics.thresholds
    };
    
    this.alerts = {
      hitRateLow: false,
      responseTimeHigh: false,
      memoryUsageHigh: false,
      invalidationRateHigh: false
    };
    
    logger.info('Cache analytics data reset');
  }

  /**
   * Update invalidation metrics
   * @param {string} type - Invalidation type
   * @param {number} count - Invalidation count
   */
  updateInvalidationMetrics(type, count) {
    this.metrics.invalidationCount += count;
    
    if (type === 'selective') {
      this.metrics.selectiveInvalidations += count;
    } else if (type === 'global') {
      this.metrics.globalInvalidations += count;
    }
  }

  /**
   * Update data type metrics
   * @param {string} dataType - Data type
   * @param {Object} stats - Data type statistics
   */
  updateDataTypeMetrics(dataType, stats) {
    if (!this.metrics.dataTypeStats[dataType]) {
      this.metrics.dataTypeStats[dataType] = {
        hits: 0,
        misses: 0,
        operations: 0,
        averageSize: 0
      };
    }
    
    const dataTypeStats = this.metrics.dataTypeStats[dataType];
    dataTypeStats.hits += stats.hits || 0;
    dataTypeStats.misses += stats.misses || 0;
    dataTypeStats.operations += stats.operations || 0;
    dataTypeStats.averageSize = dataTypeStats.operations > 0 
      ? (dataTypeStats.averageSize * (dataTypeStats.operations - 1) + stats.size) / dataTypeStats.operations
      : stats.size;
  }
}

// Export singleton instance
export const cacheAnalytics = new CacheAnalytics();
