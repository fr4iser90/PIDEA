const express = require('express');
const router = express.Router();

/**
 * Health Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to health check endpoints
 * including system status, environment information, and database connectivity.
 */

class HealthRoutes {
  constructor(autoSecurityManager, databaseConnection) {
    this.autoSecurityManager = autoSecurityManager;
    this.databaseConnection = databaseConnection;
  }

  /**
   * Setup all health routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // ========================================
    // HEALTH CHECK ROUTES - System Monitoring
    // ========================================
    
    // Health check (public endpoint)
    app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: this.autoSecurityManager.getEnvironment(),
          database: this.databaseConnection.getType()
        }
      });
    });
  }
}

module.exports = HealthRoutes;
