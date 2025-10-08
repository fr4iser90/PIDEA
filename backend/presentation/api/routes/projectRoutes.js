const express = require('express');
const router = express.Router();

/**
 * Project Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to project management endpoints
 * including project listing, retrieval, and port management.
 */

class ProjectRoutes {
  constructor(projectController, authMiddleware) {
    this.projectController = projectController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all project routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all project routes
    app.use('/api/projects', this.authMiddleware.authenticate());

    // ========================================
    // PROJECT CRUD ROUTES - Basic Project Operations
    // ========================================
    
    // List all projects
    app.get('/api/projects', (req, res) => this.projectController.list(req, res));
    
    // Get project by ID
    app.get('/api/projects/:id', (req, res) => this.projectController.getById(req, res));

    // ========================================
    // PROJECT PORT ROUTES - Port Management
    // ========================================
    
    // Save port for project
    app.post('/api/projects/:id/save-port', (req, res) => this.projectController.savePort(req, res));
    
    // Update port for project
    app.put('/api/projects/:id/port', (req, res) => this.projectController.updatePort(req, res));
  }
}

module.exports = ProjectRoutes;
