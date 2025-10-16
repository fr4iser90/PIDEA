const express = require("express");
const router = express.Router();

/**
 * Health Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to health check endpoints
 * including system status, environment information, and database connectivity.
 */

class HealthRoutes {
  constructor(autoSecurityManager = null, databaseConnection = null) {
    this.autoSecurityManager = autoSecurityManager;
    this.databaseConnection = databaseConnection;
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Get router instance
   * @returns {express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }

  /**
   * Setup all health routes
   */
  setupRoutes() {
    // ========================================
    // HEALTH CHECK ROUTES - System Monitoring
    // ========================================

    // Health check (public endpoint)
    this.router.get("/api/health", (req, res) => {
      try {
        const healthData = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development",
          database: this.databaseConnection ? this.databaseConnection.getType() : "unknown",
        };
        
        res.json(healthData);
      } catch (error) {
        res.status(500).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });
  }

  /**
   * Get router instance for Express app
   * @returns {Express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }
}

module.exports = HealthRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const healthRoutes = new HealthRoutes();
  return healthRoutes.getRouter();
};
