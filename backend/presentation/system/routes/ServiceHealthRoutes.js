/**
 * Service Health Routes - REST API routes for service health monitoring
 * Provides REST endpoints for health checks, status monitoring, and health history
 */
const express = require("express");
const ServiceHealthController = require("../controllers/ServiceHealthController");
const ServiceLogger = require("@logging/ServiceLogger");

class ServiceHealthRoutes {
  constructor(serviceHealthMonitor = null, options = {}) {
    this.router = express.Router();
    this.healthController = new ServiceHealthController(serviceHealthMonitor, options);
    this.logger = options.logger || new ServiceLogger("ServiceHealthRoutes");

    this.setupRoutes();
  }

  setupRoutes() {
    // Health status endpoints
    this.router.get("/", (req, res) => this.healthController.getOverallHealth(req, res));
    this.router.get("/services", (req, res) => this.healthController.getAllServicesHealth(req, res));
    this.router.get("/:serviceName", (req, res) => this.healthController.getServiceHealth(req, res));

    // Health check execution endpoints
    this.router.post("/:serviceName/check", (req, res) => this.healthController.checkServiceHealth(req, res));
    this.router.post("/check-all", (req, res) => this.healthController.checkAllServicesHealth(req, res));

    // Health history endpoints
    this.router.get("/:serviceName/history", (req, res) => this.healthController.getServiceHealthHistory(req, res));

    // Health monitoring control endpoints
    this.router.post("/monitoring/start", (req, res) => this.healthController.startMonitoring(req, res));
    this.router.post("/monitoring/stop", (req, res) => this.healthController.stopMonitoring(req, res));

    // Health check registration endpoints
    this.router.post("/register", (req, res) => this.healthController.registerHealthCheck(req, res));
    this.router.delete("/:serviceName", (req, res) => this.healthController.unregisterHealthCheck(req, res));

    // Health metrics endpoints
    this.router.get("/metrics", (req, res) => this.healthController.getHealthMetrics(req, res));

    // API information endpoint
    this.router.get("/info", (req, res) => this.healthController.getEndpointsInfo(req, res));

    this.logger.info("Service health routes configured");
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ServiceHealthRoutes;
