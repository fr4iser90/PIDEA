const express = require("express");
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
    // Authentication handled by global middleware

    // ========================================
    // WORKFLOW EXECUTION ROUTES - Workflow Operations
    // ========================================

    // Execute workflow (REMOVED - migrated to /api/projects/:projectId/tasks/enqueue)

    // Get workflow status
    app.get("/api/projects/:projectId/workflow/status", (req, res) =>
      this.workflowController.getWorkflowStatus(req, res),
    );

    // Stop workflow
    app.post("/api/projects/:projectId/workflow/stop", (req, res) =>
      this.workflowController.stopWorkflow(req, res),
    );

    // Workflow health check
    app.get("/api/projects/:projectId/workflow/health", (req, res) =>
      this.workflowController.healthCheck(req, res),
    );
  }

  /**
   * Get router instance for Express app
   * @returns {Express.Router} Router instance
   */
  getRouter() {
    const router = express.Router();
    this.setupRoutes(router);
    return router;
  }
}

module.exports = WorkflowRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const workflowRoutes = new WorkflowRoutes();
  return workflowRoutes.getRouter();
};
