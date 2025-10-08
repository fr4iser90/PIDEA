const express = require('express');
const router = express.Router();

/**
 * Workflow Routes - Professional RESTful API Design
 * 
 * ⚠️ DEPRECATED: These workflow routes are deprecated and will be removed in a future version
 * TODO: Migrate to POST /api/projects/:projectId/tasks/enqueue for proper queue-based execution
 * 
 * This module provides a clean, modular approach to workflow endpoints
 * including workflow execution, status monitoring, and health checks.
 */

class WorkflowRoutes {
  constructor(workflowController, authMiddleware) {
    this.workflowController = workflowController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all workflow routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all workflow routes
    app.use('/api/projects/:projectId/workflow', this.authMiddleware.authenticate());

    // ========================================
    // WORKFLOW EXECUTION ROUTES - Workflow Operations
    // ========================================
    
    // Execute workflow (DEPRECATED)
    app.post('/api/projects/:projectId/workflow/execute', (req, res) => this.workflowController.executeWorkflow(req, res));
    
    // Get workflow status
    app.get('/api/projects/:projectId/workflow/status', (req, res) => this.workflowController.getWorkflowStatus(req, res));
    
    // Stop workflow
    app.post('/api/projects/:projectId/workflow/stop', (req, res) => this.workflowController.stopWorkflow(req, res));
    
    // Workflow health check
    app.get('/api/projects/:projectId/workflow/health', (req, res) => this.workflowController.healthCheck(req, res));
  }
}

module.exports = WorkflowRoutes;
