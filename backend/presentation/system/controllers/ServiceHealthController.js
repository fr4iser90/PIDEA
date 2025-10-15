/**
 * ServiceHealthController - REST API controller for service health monitoring
 * Provides REST endpoints for health checks, status monitoring, and health history
 */
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceHealthController {
  constructor(serviceHealthMonitor, options = {}) {
    this.healthMonitor = serviceHealthMonitor;
    this.logger = options.logger || new ServiceLogger("ServiceHealthController");

    // Configuration options
    this.enableHealthEndpoints = options.enableHealthEndpoints !== false;
    this.enableHistoryEndpoints = options.enableHistoryEndpoints !== false;
    this.enableMetricsEndpoints = options.enableMetricsEndpoints !== false;
    this.maxHistoryEntries = options.maxHistoryEntries || 100;

    this.logger.info("ServiceHealthController initialized");
  }

  /**
   * Get overall system health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOverallHealth(req, res) {
    try {
      const overallHealth = this.healthMonitor.getOverallHealth();
      
      res.status(200).json({
        success: true,
        data: overallHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get overall health:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get overall health",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get health status for a specific service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getServiceHealth(req, res) {
    try {
      const { serviceName } = req.params;
      
      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: "Service name is required",
          timestamp: new Date().toISOString(),
        });
      }

      const serviceHealth = this.healthMonitor.getServiceHealth(serviceName);
      
      res.status(200).json({
        success: true,
        data: serviceHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to get health for service ${req.params.serviceName}:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get service health",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get health status for all services
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllServicesHealth(req, res) {
    try {
      const allServicesHealth = this.healthMonitor.getAllServicesHealth();
      
      res.status(200).json({
        success: true,
        data: allServicesHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get all services health:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get all services health",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Execute health check for a specific service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkServiceHealth(req, res) {
    try {
      const { serviceName } = req.params;
      
      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: "Service name is required",
          timestamp: new Date().toISOString(),
        });
      }

      const healthCheckResult = await this.healthMonitor.checkServiceHealth(serviceName);
      
      res.status(200).json({
        success: true,
        data: healthCheckResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to check health for service ${req.params.serviceName}:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to check service health",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Execute health checks for all services
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkAllServicesHealth(req, res) {
    try {
      const healthCheckResults = await this.healthMonitor.performHealthChecks();
      
      res.status(200).json({
        success: true,
        data: healthCheckResults,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to check all services health:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to check all services health",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get health check history for a service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getServiceHealthHistory(req, res) {
    try {
      const { serviceName } = req.params;
      const { limit = this.maxHistoryEntries } = req.query;
      
      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: "Service name is required",
          timestamp: new Date().toISOString(),
        });
      }

      const history = this.healthMonitor.getServiceHealthHistory(serviceName, parseInt(limit));
      
      res.status(200).json({
        success: true,
        data: {
          serviceName,
          history,
          count: history.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to get health history for service ${req.params.serviceName}:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get service health history",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get health monitoring metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHealthMetrics(req, res) {
    try {
      const metrics = this.healthMonitor.getMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to get health metrics:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get health metrics",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start health monitoring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startMonitoring(req, res) {
    try {
      this.healthMonitor.startMonitoring();
      
      res.status(200).json({
        success: true,
        message: "Health monitoring started",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to start health monitoring:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to start health monitoring",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Stop health monitoring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async stopMonitoring(req, res) {
    try {
      this.healthMonitor.stopMonitoring();
      
      res.status(200).json({
        success: true,
        message: "Health monitoring stopped",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to stop health monitoring:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to stop health monitoring",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Register health check for a service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async registerHealthCheck(req, res) {
    try {
      const { serviceName, healthCheck, options = {} } = req.body;
      
      if (!serviceName || !healthCheck) {
        return res.status(400).json({
          success: false,
          error: "Service name and health check function are required",
          timestamp: new Date().toISOString(),
        });
      }

      // Convert health check function from string to function
      let healthCheckFunction;
      try {
        healthCheckFunction = eval(`(${healthCheck})`);
      } catch (evalError) {
        return res.status(400).json({
          success: false,
          error: "Invalid health check function",
          message: evalError.message,
          timestamp: new Date().toISOString(),
        });
      }

      this.healthMonitor.registerHealthCheck(serviceName, healthCheckFunction, options);
      
      res.status(201).json({
        success: true,
        message: `Health check registered for service: ${serviceName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to register health check:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to register health check",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Unregister health check for a service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async unregisterHealthCheck(req, res) {
    try {
      const { serviceName } = req.params;
      
      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: "Service name is required",
          timestamp: new Date().toISOString(),
        });
      }

      this.healthMonitor.unregisterHealthCheck(serviceName);
      
      res.status(200).json({
        success: true,
        message: `Health check unregistered for service: ${serviceName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to unregister health check for service ${req.params.serviceName}:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to unregister health check",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get health check endpoints information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEndpointsInfo(req, res) {
    try {
      const endpoints = {
        overall: "GET /api/health",
        service: "GET /api/health/:serviceName",
        allServices: "GET /api/health/services",
        checkService: "POST /api/health/:serviceName/check",
        checkAll: "POST /api/health/check-all",
        history: "GET /api/health/:serviceName/history",
        metrics: "GET /api/health/metrics",
        startMonitoring: "POST /api/health/monitoring/start",
        stopMonitoring: "POST /api/health/monitoring/stop",
        register: "POST /api/health/register",
        unregister: "DELETE /api/health/:serviceName",
      };
      
      res.status(200).json({
        success: true,
        data: {
          endpoints,
          description: "Service Health Monitoring API",
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
}

module.exports = ServiceHealthController;
