const Logger = require('@logging/Logger');
const logger = new Logger('IDESwitchOptimizationService');

/**
 * IDESwitchOptimizationService - Centralized optimization logic and monitoring
 * Provides performance tracking, connection health monitoring, and optimization recommendations
 */
class IDESwitchOptimizationService {
  constructor(browserManager) {
    this.browserManager = browserManager;
    this.optimizationEnabled = true;
    this.performanceThreshold = 100; // 100ms target
  }

  /**
   * Get comprehensive optimization status
   * @returns {Promise<Object>} Optimization status with recommendations
   */
  async getOptimizationStatus() {
    try {
      const poolHealth = await this.browserManager.getConnectionPoolHealth();
      const poolStats = await this.browserManager.getConnectionPoolStats();
      const performanceStats = this.browserManager.getPerformanceStats();
      
      return {
        optimizationEnabled: this.optimizationEnabled,
        poolHealth,
        poolStats,
        performanceStats,
        recommendations: this.generateRecommendations(poolHealth, poolStats, performanceStats)
      };
    } catch (error) {
      logger.error('Error getting optimization status:', error.message);
      return {
        optimizationEnabled: false,
        error: error.message
      };
    }
  }

  /**
   * Generate optimization recommendations based on current state
   * @param {Object} poolHealth - Connection pool health data
   * @param {Object} poolStats - Connection pool statistics
   * @param {Object} performanceStats - Performance statistics
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(poolHealth, poolStats, performanceStats) {
    const recommendations = [];
    
    // Check connection pool health
    if (poolHealth.healthyConnections < poolStats.totalConnections * 0.8) {
      recommendations.push({
        type: 'warning',
        message: 'Connection pool has unhealthy connections',
        action: 'Consider restarting connection pool',
        priority: 'medium'
      });
    }
    
    // Check performance
    if (performanceStats.averageTime > this.performanceThreshold) {
      recommendations.push({
        type: 'performance',
        message: `Average switch time (${performanceStats.averageTime.toFixed(2)}ms) exceeds target (${this.performanceThreshold}ms)`,
        action: 'Monitor connection pool usage and consider increasing max connections',
        priority: 'high'
      });
    }
    
    // Check connection pool utilization
    if (poolStats.totalConnections < poolStats.maxConnections * 0.5) {
      recommendations.push({
        type: 'info',
        message: 'Connection pool underutilized',
        action: 'Consider reducing max connections to save memory',
        priority: 'low'
      });
    }
    
    // Check for rapid switching patterns
    if (performanceStats.totalSwitches > 50 && performanceStats.recentAverage > this.performanceThreshold * 1.5) {
      recommendations.push({
        type: 'performance',
        message: 'High switching frequency detected with degraded performance',
        action: 'Consider implementing connection pre-warming for frequently used ports',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Run connection pool optimization
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeConnectionPool() {
    try {
      logger.info('Running connection pool optimization...');
      
      // Get current stats
      const stats = await this.browserManager.getConnectionPoolStats();
      
      // Clean up unhealthy connections
      const health = await this.browserManager.getConnectionPoolHealth();
      if (health.unhealthyConnections > 0) {
        logger.info(`Cleaning up ${health.unhealthyConnections} unhealthy connections`);
        // ConnectionPool will handle cleanup automatically
      }
      
      // Pre-warm connections if needed
      if (stats.totalConnections < stats.maxConnections * 0.3) {
        logger.info('Pre-warming additional connections...');
        await this.browserManager.preWarmConnections();
      }
      
      logger.info('Connection pool optimization completed');
      return { success: true };
    } catch (error) {
      logger.error('Error optimizing connection pool:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    try {
      const stats = this.browserManager.getPerformanceStats();
      
      return {
        totalSwitches: stats.totalSwitches,
        averageTime: stats.averageTime,
        recentAverage: stats.recentAverage,
        performance: this.calculatePerformanceScore(stats),
        recommendations: this.getPerformanceRecommendations(stats)
      };
    } catch (error) {
      logger.error('Error getting performance summary:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Calculate performance score (0-100)
   * @param {Object} stats - Performance statistics
   * @returns {number} Performance score
   */
  calculatePerformanceScore(stats) {
    if (stats.totalSwitches === 0) return 0;
    
    // Score based on average time vs threshold
    const timeScore = Math.max(0, 100 - (stats.averageTime / this.performanceThreshold) * 100);
    
    // Score based on consistency (recent vs overall average)
    const consistencyScore = stats.averageTime > 0 ? 
      Math.max(0, 100 - Math.abs(stats.recentAverage - stats.averageTime) / stats.averageTime * 100) : 100;
    
    // Weighted average
    return Math.round((timeScore * 0.7) + (consistencyScore * 0.3));
  }

  /**
   * Get performance-specific recommendations
   * @param {Object} stats - Performance statistics
   * @returns {Array} Performance recommendations
   */
  getPerformanceRecommendations(stats) {
    const recommendations = [];
    
    if (stats.averageTime > this.performanceThreshold) {
      recommendations.push('Consider increasing connection pool size');
      recommendations.push('Monitor for connection leaks');
      recommendations.push('Check network latency to IDE instances');
    }
    
    if (stats.recentAverage > stats.averageTime * 1.5) {
      recommendations.push('Performance degradation detected - check system resources');
    }
    
    if (stats.totalSwitches > 100 && stats.averageTime < this.performanceThreshold * 0.5) {
      recommendations.push('Excellent performance - consider reducing connection pool size to save memory');
    }
    
    return recommendations;
  }

  /**
   * Set optimization enabled/disabled
   * @param {boolean} enabled - Whether optimization is enabled
   */
  setOptimizationEnabled(enabled) {
    this.optimizationEnabled = enabled;
    logger.info(`IDE switching optimization ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set performance threshold
   * @param {number} threshold - Performance threshold in milliseconds
   */
  setPerformanceThreshold(threshold) {
    this.performanceThreshold = threshold;
    logger.info(`Performance threshold set to ${threshold}ms`);
  }

  /**
   * Get optimization configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return {
      optimizationEnabled: this.optimizationEnabled,
      performanceThreshold: this.performanceThreshold
    };
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats() {
    if (this.browserManager.switchTimes) {
      this.browserManager.switchTimes = [];
      logger.info('Performance statistics reset');
    }
  }
}

module.exports = IDESwitchOptimizationService; 