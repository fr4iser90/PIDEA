/**
 * ServiceMetricsController - REST API controller for service metrics
 * Provides REST endpoints for metrics collection, performance data, and analytics
 */
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceMetricsController {
  constructor(serviceMetrics, options = {}) {
    this.metrics = serviceMetrics;
    this.logger = options.logger || new ServiceLogger("ServiceMetricsController");

    // Configuration options
    this.enableMetricsEndpoints = options.enableMetricsEndpoints !== false;
    this.enableExportEndpoints = options.enableExportEndpoints !== false;
    this.enableAnalyticsEndpoints = options.enableAnalyticsEndpoints !== false;
    this.maxExportEntries = options.maxExportEntries || 1000;

    this.logger.info("ServiceMetricsController initialized");
  }

  /**
   * Get metrics for a specific service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getServiceMetrics(req, res) {
    try {
      const { serviceName } = req.params;
      
      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: "Service name is required",
          timestamp: new Date().toISOString(),
        });
      }

      const serviceMetrics = this.metrics.getServiceMetrics(serviceName);
      
      res.status(200).json({
        success: true,
        data: serviceMetrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to get metrics for service ${req.params.serviceName}:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get service metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get metrics for all services
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllServiceMetrics(req, res) {
    try {
      const allServiceMetrics = this.metrics.getAllServiceMetrics();
      
      res.status(200).json({
        success: true,
        data: allServiceMetrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get all service metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get all service metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get aggregated metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAggregatedMetrics(req, res) {
    try {
      const aggregatedMetrics = this.metrics.getAggregatedMetrics();
      
      res.status(200).json({
        success: true,
        data: aggregatedMetrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get aggregated metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get aggregated metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get real-time metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRealTimeMetrics(req, res) {
    try {
      const realTimeMetrics = this.metrics.getRealTimeMetrics();
      
      res.status(200).json({
        success: true,
        data: realTimeMetrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get real-time metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get real-time metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get performance summary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPerformanceSummary(req, res) {
    try {
      const { serviceName } = req.query;
      const performanceSummary = this.metrics.getPerformanceSummary(serviceName);
      
      res.status(200).json({
        success: true,
        data: performanceSummary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get performance summary:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get performance summary",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Export metrics data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportMetrics(req, res) {
    try {
      const {
        includeHistory = false,
        includeRealTime = true,
        includeAggregated = true,
        serviceFilter = null,
        format = "json",
      } = req.query;

      const exportOptions = {
        includeHistory: includeHistory === "true",
        includeRealTime: includeRealTime === "true",
        includeAggregated: includeAggregated === "true",
        serviceFilter,
      };

      const exportData = this.metrics.exportMetrics(exportOptions);

      if (format === "csv") {
        const csvData = this.convertToCSV(exportData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=service-metrics.csv");
        res.status(200).send(csvData);
      } else {
        res.status(200).json({
          success: true,
          data: exportData,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error("Failed to export metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to export metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Record initialization metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordInitialization(req, res) {
    try {
      const { serviceName, metrics } = req.body;
      
      if (!serviceName || !metrics) {
        return res.status(400).json({
          success: false,
          error: "Service name and metrics are required",
          timestamp: new Date().toISOString(),
        });
      }

      this.metrics.recordInitialization(serviceName, metrics);
      
      res.status(201).json({
        success: true,
        message: `Initialization metrics recorded for service: ${serviceName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to record initialization metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to record initialization metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Record performance metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordPerformance(req, res) {
    try {
      const { serviceName, metrics } = req.body;
      
      if (!serviceName || !metrics) {
        return res.status(400).json({
          success: false,
          error: "Service name and metrics are required",
          timestamp: new Date().toISOString(),
        });
      }

      this.metrics.recordPerformance(serviceName, metrics);
      
      res.status(201).json({
        success: true,
        message: `Performance metrics recorded for service: ${serviceName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to record performance metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to record performance metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Record memory usage metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordMemoryUsage(req, res) {
    try {
      const { serviceName, metrics } = req.body;
      
      if (!serviceName || !metrics) {
        return res.status(400).json({
          success: false,
          error: "Service name and metrics are required",
          timestamp: new Date().toISOString(),
        });
      }

      this.metrics.recordMemoryUsage(serviceName, metrics);
      
      res.status(201).json({
        success: true,
        message: `Memory usage metrics recorded for service: ${serviceName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to record memory usage metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to record memory usage metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Record operational metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recordOperation(req, res) {
    try {
      const { serviceName, metrics } = req.body;
      
      if (!serviceName || !metrics) {
        return res.status(400).json({
          success: false,
          error: "Service name and metrics are required",
          timestamp: new Date().toISOString(),
        });
      }

      this.metrics.recordOperation(serviceName, metrics);
      
      res.status(201).json({
        success: true,
        message: `Operation metrics recorded for service: ${serviceName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to record operation metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to record operation metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start metrics collection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startMetricsCollection(req, res) {
    try {
      this.metrics.startMetricsCollection();
      
      res.status(200).json({
        success: true,
        message: "Metrics collection started",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to start metrics collection:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to start metrics collection",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Stop metrics collection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async stopMetricsCollection(req, res) {
    try {
      this.metrics.stopMetricsCollection();
      
      res.status(200).json({
        success: true,
        message: "Metrics collection stopped",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to stop metrics collection:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to stop metrics collection",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Clear metrics data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearMetrics(req, res) {
    try {
      const { serviceName } = req.query;
      
      this.metrics.clearMetrics(serviceName);
      
      res.status(200).json({
        success: true,
        message: serviceName 
          ? `Metrics cleared for service: ${serviceName}`
          : "All metrics cleared",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to clear metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to clear metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get metrics endpoints information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEndpointsInfo(req, res) {
    try {
      const endpoints = {
        service: "GET /api/metrics/:serviceName",
        allServices: "GET /api/metrics/services",
        aggregated: "GET /api/metrics/aggregated",
        realTime: "GET /api/metrics/real-time",
        performance: "GET /api/metrics/performance",
        export: "GET /api/metrics/export",
        recordInitialization: "POST /api/metrics/initialization",
        recordPerformance: "POST /api/metrics/performance",
        recordMemory: "POST /api/metrics/memory",
        recordOperation: "POST /api/metrics/operation",
        startCollection: "POST /api/metrics/collection/start",
        stopCollection: "POST /api/metrics/collection/stop",
        clear: "DELETE /api/metrics",
      };
      
      res.status(200).json({
        success: true,
        data: {
          endpoints,
          description: "Service Metrics API",
          version: "1.0.0",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get endpoints info:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get endpoints info",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Convert metrics data to CSV format
   * @param {Object} data - Metrics data
   * @returns {string} CSV formatted data
   */
  convertToCSV(data) {
    const csvRows = [];
    
    // Add header
    csvRows.push("timestamp,serviceName,metricType,value");
    
    // Add data rows
    if (data.services) {
      for (const [serviceName, serviceData] of Object.entries(data.services)) {
        if (serviceData.metrics) {
          csvRows.push(`${data.timestamp},${serviceName},totalOperations,${serviceData.metrics.totalOperations || 0}`);
          csvRows.push(`${data.timestamp},${serviceName},successfulOperations,${serviceData.metrics.successfulOperations || 0}`);
          csvRows.push(`${data.timestamp},${serviceName},averageDuration,${serviceData.metrics.averageDuration || 0}`);
        }
      }
    }
    
    return csvRows.join("\n");
  }
}

module.exports = ServiceMetricsController;
