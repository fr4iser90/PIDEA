const express = require('express');
const router = express.Router();

/**
 * Session Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to session management endpoints
 * including session extension, monitoring, analytics, and cleanup operations.
 */

class SessionRoutes {
  constructor(sessionController, authMiddleware) {
    this.sessionController = sessionController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all session routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all session routes
    app.use('/api/session', this.authMiddleware.authenticate());

    // ========================================
    // SESSION MANAGEMENT ROUTES - Core Session Operations
    // ========================================
    
    // Extend session
    app.post('/api/session/extend', (req, res) => this.sessionController.extendSession(req, res));
    
    // Get session status
    app.get('/api/session/status', (req, res) => this.sessionController.getSessionStatus(req, res));
    
    // Record session activity
    app.post('/api/session/activity', (req, res) => this.sessionController.recordActivity(req, res));

    // ========================================
    // SESSION ANALYTICS ROUTES - Analytics & Monitoring
    // ========================================
    
    // Get session analytics
    app.get('/api/session/analytics', (req, res) => this.sessionController.getSessionAnalytics(req, res));
    
    // Get monitoring data
    app.get('/api/session/monitor', (req, res) => this.sessionController.getMonitoringData(req, res));

    // ========================================
    // SESSION MAINTENANCE ROUTES - Cleanup & Configuration
    // ========================================
    
    // Trigger cleanup
    app.post('/api/session/cleanup', (req, res) => this.sessionController.triggerCleanup(req, res));
    
    // Update session configuration
    app.put('/api/session/config', (req, res) => this.sessionController.updateConfig(req, res));
    
    // Health check
    app.get('/api/session/health', (req, res) => this.sessionController.healthCheck(req, res));
  }
}

module.exports = SessionRoutes;
