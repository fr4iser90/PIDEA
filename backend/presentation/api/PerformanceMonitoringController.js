/**
 * PerformanceMonitoringController - API endpoints for performance monitoring
 * Provides REST API for accessing performance monitoring data and statistics
 */
const Logger = require('@logging/Logger');

class PerformanceMonitoringController {
  constructor(databaseConnection) {
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('PerformanceMonitoringController');
  }

  /**
   * Get performance monitoring status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatus(req, res) {
    try {
      const status = this.databaseConnection.getConnectionStatus();
      
      res.json({
        success: true,
        data: {
          enabled: status.performanceMonitoring?.enabled || false,
          performanceMonitor: status.performanceMonitoring?.performanceMonitor || null,
          queryMonitor: status.performanceMonitoring?.queryMonitor || null,
          queryCache: status.performanceMonitoring?.queryCache || null
        }
      });
      
    } catch (error) {
      this.logger.error('Error getting performance monitoring status:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance monitoring status',
        message: error.message
      });
    }
  }

  /**
   * Get performance statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStats(req, res) {
    try {
      const performanceMonitor = this.databaseConnection.getPerformanceMonitor();
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      const queryCache = this.databaseConnection.getQueryCache();
      
      const stats = {
        performance: performanceMonitor ? performanceMonitor.getStats() : null,
        queries: queryMonitor ? queryMonitor.getStats() : null,
        cache: queryCache ? queryCache.getStats() : null
      };
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      this.logger.error('Error getting performance statistics:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance statistics',
        message: error.message
      });
    }
  }

  /**
   * Get recent query history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getQueryHistory(req, res) {
    try {
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      if (!queryMonitor) {
        return res.status(404).json({
          success: false,
          error: 'Query monitoring not available'
        });
      }
      
      const limit = parseInt(req.query.limit) || 100;
      const filter = req.query.filter || null;
      
      const history = queryMonitor.getRecentHistory(limit, filter);
      
      res.json({
        success: true,
        data: {
          history,
          count: history.length,
          limit,
          filter
        }
      });
      
    } catch (error) {
      this.logger.error('Error getting query history:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get query history',
        message: error.message
      });
    }
  }

  /**
   * Get slow queries
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSlowQueries(req, res) {
    try {
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      if (!queryMonitor) {
        return res.status(404).json({
          success: false,
          error: 'Query monitoring not available'
        });
      }
      
      const limit = parseInt(req.query.limit) || 50;
      const slowQueries = queryMonitor.getSlowQueries(limit);
      
      res.json({
        success: true,
        data: {
          slowQueries,
          count: slowQueries.length,
          limit
        }
      });
      
    } catch (error) {
      this.logger.error('Error getting slow queries:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get slow queries',
        message: error.message
      });
    }
  }

  /**
   * Get top queries by execution time
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTopQueriesByTime(req, res) {
    try {
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      if (!queryMonitor) {
        return res.status(404).json({
          success: false,
          error: 'Query monitoring not available'
        });
      }
      
      const limit = parseInt(req.query.limit) || 10;
      const topQueries = queryMonitor.getTopQueriesByTime(limit);
      
      res.json({
        success: true,
        data: {
          topQueries,
          count: topQueries.length,
          limit
        }
      });
      
    } catch (error) {
      this.logger.error('Error getting top queries by time:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get top queries by time',
        message: error.message
      });
    }
  }

  /**
   * Get most frequent queries
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMostFrequentQueries(req, res) {
    try {
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      if (!queryMonitor) {
        return res.status(404).json({
          success: false,
          error: 'Query monitoring not available'
        });
      }
      
      const limit = parseInt(req.query.limit) || 10;
      const frequentQueries = queryMonitor.getMostFrequentQueries(limit);
      
      res.json({
        success: true,
        data: {
          frequentQueries,
          count: frequentQueries.length,
          limit
        }
      });
      
    } catch (error) {
      this.logger.error('Error getting most frequent queries:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get most frequent queries',
        message: error.message
      });
    }
  }

  /**
   * Clear query history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearQueryHistory(req, res) {
    try {
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      if (!queryMonitor) {
        return res.status(404).json({
          success: false,
          error: 'Query monitoring not available'
        });
      }
      
      queryMonitor.clearHistory();
      
      res.json({
        success: true,
        message: 'Query history cleared successfully'
      });
      
    } catch (error) {
      this.logger.error('Error clearing query history:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to clear query history',
        message: error.message
      });
    }
  }

  /**
   * Clear query cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearQueryCache(req, res) {
    try {
      const queryCache = this.databaseConnection.getQueryCache();
      if (!queryCache) {
        return res.status(404).json({
          success: false,
          error: 'Query cache not available'
        });
      }
      
      await queryCache.clear();
      
      res.json({
        success: true,
        message: 'Query cache cleared successfully'
      });
      
    } catch (error) {
      this.logger.error('Error clearing query cache:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to clear query cache',
        message: error.message
      });
    }
  }

  /**
   * Export performance data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportData(req, res) {
    try {
      const queryMonitor = this.databaseConnection.getQueryMonitor();
      if (!queryMonitor) {
        return res.status(404).json({
          success: false,
          error: 'Query monitoring not available'
        });
      }
      
      const format = req.query.format || 'json';
      const data = queryMonitor.exportData(format);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="performance_data.csv"');
        res.send(data);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="performance_data.json"');
        res.send(data);
      }
      
    } catch (error) {
      this.logger.error('Error exporting performance data:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to export performance data',
        message: error.message
      });
    }
  }

  /**
   * Enable performance monitoring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async enableMonitoring(req, res) {
    try {
      this.databaseConnection.enablePerformanceMonitoring();
      
      res.json({
        success: true,
        message: 'Performance monitoring enabled successfully'
      });
      
    } catch (error) {
      this.logger.error('Error enabling performance monitoring:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to enable performance monitoring',
        message: error.message
      });
    }
  }

  /**
   * Disable performance monitoring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async disableMonitoring(req, res) {
    try {
      this.databaseConnection.disablePerformanceMonitoring();
      
      res.json({
        success: true,
        message: 'Performance monitoring disabled successfully'
      });
      
    } catch (error) {
      this.logger.error('Error disabling performance monitoring:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to disable performance monitoring',
        message: error.message
      });
    }
  }
}

module.exports = PerformanceMonitoringController;
