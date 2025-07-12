/**
 * MigrationMetrics - Tracks migration performance metrics
 */
class MigrationMetrics {
  constructor() {
    this.logger = console;
    this.metrics = new Map();
  }

  /**
   * Collect migration metrics
   * @param {string} migrationId - Migration ID
   * @param {Array} results - Migration results
   * @param {number} duration - Migration duration in milliseconds
   * @returns {Promise<Object>} Metrics result
   */
  async collectMigrationMetrics(migrationId, results, duration) {
    this.logger.info(`[MigrationMetrics] Collecting metrics for migration: ${migrationId}`);
    
    const metrics = {
      migrationId,
      timestamp: new Date(),
      duration,
      totalHandlers: results.length,
      successfulMigrations: results.filter(r => r.success).length,
      failedMigrations: results.filter(r => !r.success).length,
      successRate: results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0,
      averageHandlerDuration: this.calculateAverageHandlerDuration(results),
      handlerTypeBreakdown: this.analyzeHandlerTypes(results),
      performanceMetrics: {
        totalDuration: duration,
        averageDurationPerHandler: duration / results.length,
        handlersPerSecond: results.length / (duration / 1000)
      }
    };

    this.metrics.set(migrationId, metrics);

    this.logger.info(`[MigrationMetrics] Metrics collected:`, {
      migrationId,
      successRate: `${metrics.successRate.toFixed(2)}%`,
      totalDuration: `${duration}ms`,
      handlersPerSecond: metrics.performanceMetrics.handlersPerSecond.toFixed(2)
    });

    return metrics;
  }

  /**
   * Calculate average handler duration
   * @param {Array} results - Migration results
   * @returns {number} Average duration
   */
  calculateAverageHandlerDuration(results) {
    const successfulResults = results.filter(r => r.success && r.duration);
    if (successfulResults.length === 0) return 0;
    
    const totalDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0);
    return totalDuration / successfulResults.length;
  }

  /**
   * Analyze handler types
   * @param {Array} results - Migration results
   * @returns {Object} Handler type breakdown
   */
  analyzeHandlerTypes(results) {
    const breakdown = {};
    
    results.forEach(result => {
      const stepType = result.stepType || 'unknown';
      if (!breakdown[stepType]) {
        breakdown[stepType] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      
      breakdown[stepType].total++;
      if (result.success) {
        breakdown[stepType].successful++;
      } else {
        breakdown[stepType].failed++;
      }
    });

    return breakdown;
  }

  /**
   * Get migration metrics
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Object>} Migration metrics
   */
  async getMigrationMetrics(migrationId) {
    return this.metrics.get(migrationId) || null;
  }

  /**
   * Get all metrics
   * @returns {Promise<Array>} All metrics
   */
  async getAllMetrics() {
    return Array.from(this.metrics.entries()).map(([id, metrics]) => ({
      migrationId: id,
      ...metrics
    }));
  }

  /**
   * Get performance summary
   * @returns {Promise<Object>} Performance summary
   */
  async getPerformanceSummary() {
    const allMetrics = await this.getAllMetrics();
    
    if (allMetrics.length === 0) {
      return {
        totalMigrations: 0,
        averageSuccessRate: 0,
        averageDuration: 0,
        totalHandlers: 0
      };
    }

    const totalMigrations = allMetrics.length;
    const averageSuccessRate = allMetrics.reduce((sum, m) => sum + m.successRate, 0) / totalMigrations;
    const averageDuration = allMetrics.reduce((sum, m) => sum + m.duration, 0) / totalMigrations;
    const totalHandlers = allMetrics.reduce((sum, m) => sum + m.totalHandlers, 0);

    return {
      totalMigrations,
      averageSuccessRate,
      averageDuration,
      totalHandlers,
      overallSuccessRate: totalHandlers > 0 ? 
        (allMetrics.reduce((sum, m) => sum + m.successfulMigrations, 0) / totalHandlers) * 100 : 0
    };
  }

  /**
   * Clear metrics
   * @param {string} migrationId - Migration ID (optional)
   * @returns {Promise<void>}
   */
  async clearMetrics(migrationId = null) {
    if (migrationId) {
      this.metrics.delete(migrationId);
      this.logger.info(`[MigrationMetrics] Cleared metrics for migration: ${migrationId}`);
    } else {
      this.metrics.clear();
      this.logger.info(`[MigrationMetrics] Cleared all metrics`);
    }
  }
}

module.exports = MigrationMetrics; 