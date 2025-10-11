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
    
    this.setupRoutes();
  }

  /**
   * Set up all interface routes
   * @returns {void}
   */
  setupRoutes() {
    // Apply authentication middleware if provided
    if (this.authMiddleware) {
      this.router.use(this.authMiddleware);
    }

    // Interface management routes
    this.router.get('/', this.interfaceController.getAllInterfaces.bind(this.interfaceController));
    this.router.get('/types', this.interfaceController.getAvailableTypes.bind(this.interfaceController));
    this.router.get('/stats', this.interfaceController.getStats.bind(this.interfaceController));
    this.router.post('/', this.interfaceController.createInterface.bind(this.interfaceController));
    
    // Interface-specific routes
    this.router.get('/:interfaceId', this.interfaceController.getInterface.bind(this.interfaceController));
    this.router.delete('/:interfaceId', this.interfaceController.removeInterface.bind(this.interfaceController));
    this.router.post('/:interfaceId/start', this.interfaceController.startInterface.bind(this.interfaceController));
    this.router.post('/:interfaceId/stop', this.interfaceController.stopInterface.bind(this.interfaceController));
    this.router.post('/:interfaceId/restart', this.interfaceController.restartInterface.bind(this.interfaceController));
    
    // Project-specific interface routes
    this.router.get('/project/:projectId', this.interfaceController.getProjectInterfaces.bind(this.interfaceController));
    this.router.post('/project/:projectId', this.interfaceController.createProjectInterface.bind(this.interfaceController));
    this.router.delete('/project/:projectId/:interfaceId', this.interfaceController.removeProjectInterface.bind(this.interfaceController));
    this.router.get('/project/:projectId/types', this.interfaceController.getAvailableTypesForProject.bind(this.interfaceController));
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
