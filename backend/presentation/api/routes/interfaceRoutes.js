/**
 * InterfaceRoutes - Express routes for interface management
 * 
 * This module defines all REST API routes for interface management,
 * including interface CRUD operations, lifecycle management, and
 * project-specific interface operations.
 */
const express = require('express');

class InterfaceRoutes {
  /**
   * Constructor for InterfaceRoutes
   * @param {Object} interfaceController - Interface controller instance
   * @param {Object} authMiddleware - Authentication middleware
   */
  constructor(interfaceController, authMiddleware = null) {
    this.interfaceController = interfaceController;
    this.authMiddleware = authMiddleware;
    this.router = express.Router();
  }

  /**
   * Set up all interface routes
   * @param {Express.App} app - Express app instance
   * @returns {void}
   */
  setupRoutes(app) {
    // Apply authentication middleware if provided
    if (this.authMiddleware && typeof this.authMiddleware === 'function') {
      app.use('/api/interfaces', this.authMiddleware);
    }

    // Interface management routes
    app.get('/api/interfaces/', this.interfaceController.getAllInterfaces.bind(this.interfaceController));
    app.get('/api/interfaces/types', this.interfaceController.getAvailableTypes.bind(this.interfaceController));
    app.get('/api/interfaces/stats', this.interfaceController.getStats.bind(this.interfaceController));
    app.post('/api/interfaces/', this.interfaceController.createInterface.bind(this.interfaceController));
    
    // Interface-specific routes
    app.get('/api/interfaces/:interfaceId', this.interfaceController.getInterface.bind(this.interfaceController));
    app.delete('/api/interfaces/:interfaceId', this.interfaceController.removeInterface.bind(this.interfaceController));
    app.post('/api/interfaces/:interfaceId/start', this.interfaceController.startInterface.bind(this.interfaceController));
    app.post('/api/interfaces/:interfaceId/stop', this.interfaceController.stopInterface.bind(this.interfaceController));
    app.post('/api/interfaces/:interfaceId/restart', this.interfaceController.restartInterface.bind(this.interfaceController));
    
    // Project-specific interface routes
    app.get('/api/interfaces/project/:projectId', this.interfaceController.getProjectInterfaces.bind(this.interfaceController));
    app.post('/api/interfaces/project/:projectId', this.interfaceController.createProjectInterface.bind(this.interfaceController));
    app.delete('/api/interfaces/project/:projectId/:interfaceId', this.interfaceController.removeProjectInterface.bind(this.interfaceController));
    app.get('/api/interfaces/project/:projectId/types', this.interfaceController.getAvailableTypesForProject.bind(this.interfaceController));
  }

  /**
   * Get the Express router
   * @returns {express.Router} Express router instance
   */
  getRouter() {
    return this.router;
  }
}

module.exports = InterfaceRoutes;
