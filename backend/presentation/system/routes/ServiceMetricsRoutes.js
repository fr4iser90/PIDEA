/**
 * Service Metrics Routes - REST API routes for service metrics
 * Provides REST endpoints for metrics collection, performance data, and analytics
 */
const express = require("express");
const ServiceMetricsController = require("../controllers/ServiceMetricsController");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceMetricsRoutes {
  constructor(serviceMetrics = null, options = {}) {
    this.router = express.Router();
    this.metricsController = new ServiceMetricsController(serviceMetrics, options);
    this.logger = options.logger || new ServiceLogger("ServiceMetricsRoutes");

    this.setupRoutes();
  }

  setupRoutes() {
    // Metrics retrieval endpoints
    this.router.get("/services", (req, res) => this.metricsController.getAllServiceMetrics(req, res));
    this.router.get("/services/:serviceName", (req, res) => this.metricsController.getServiceMetrics(req, res));
    this.router.get("/aggregated", (req, res) => this.metricsController.getAggregatedMetrics(req, res));
    this.router.get("/real-time", (req, res) => this.metricsController.getRealTimeMetrics(req, res));
    this.router.get("/performance", (req, res) => this.metricsController.getPerformanceSummary(req, res));

    // Metrics recording endpoints
    this.router.post("/initialization", (req, res) => this.metricsController.recordInitialization(req, res));
    this.router.post("/performance", (req, res) => this.metricsController.recordPerformance(req, res));
    this.router.post("/memory", (req, res) => this.metricsController.recordMemoryUsage(req, res));
    this.router.post("/operation", (req, res) => this.metricsController.recordOperation(req, res));

    // Metrics collection control endpoints
    this.router.post("/collection/start", (req, res) => this.metricsController.startMetricsCollection(req, res));
    this.router.post("/collection/stop", (req, res) => this.metricsController.stopMetricsCollection(req, res));

    // Metrics export endpoints
    this.router.get("/export", (req, res) => this.metricsController.exportMetrics(req, res));

    // Metrics management endpoints
    this.router.delete("/", (req, res) => this.metricsController.clearMetrics(req, res));

    // API information endpoint
    this.router.get("/info", (req, res) => this.metricsController.getEndpointsInfo(req, res));

    this.logger.info("Service metrics routes configured");
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ServiceMetricsRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const serviceMetricsRoutes = new ServiceMetricsRoutes();
  return serviceMetricsRoutes.getRouter();
};
