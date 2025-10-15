/**
 * Project Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to project endpoints
 * including CRUD operations, validation, and sub-resource routing.
 */
const express = require("express");
const ProjectController = require("../controllers/ProjectController");
const projectMiddleware = require("../middleware/projectMiddleware");

class ProjectRoutes {
  constructor(projectApplicationService, interfaceManager, authMiddleware) {
    this.projectApplicationService = projectApplicationService;
    this.interfaceManager = interfaceManager;
    this.authMiddleware = authMiddleware;

    // Lazy initialization - only create when needed
    this._projectController = null;
    this._projectMiddleware = null;
  }

  get projectController() {
    if (!this._projectController) {
      this._projectController = new ProjectController(this.projectApplicationService);
    }
    return this._projectController;
  }

  get projectMiddleware() {
    if (!this._projectMiddleware) {
      this._projectMiddleware = new projectMiddleware(this.projectApplicationService);
    }
    return this._projectMiddleware;
  }

  /**
   * Setup all project routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Authentication handled by global middleware

    // ========================================
    // PROJECT CRUD ROUTES - Project Operations
    // ========================================

    // Create new project
    app.post(
      "/api/projects",
      this.projectMiddleware.validateCreate,
      (req, res) => this.projectController.createProject(req, res),
    );

    // List all projects
    app.get("/api/projects", (req, res) => {
      this.projectController.listProjects(req, res);
    });

    // Get specific project
    app.get(
      "/api/projects/:projectId",
      this.projectMiddleware.validateProjectId,
      (req, res) => this.projectController.getProject(req, res),
    );

    // Update project
    app.put(
      "/api/projects/:projectId",
      this.projectMiddleware.validateProjectId,
      this.projectMiddleware.validateUpdate,
      (req, res) => this.projectController.updateProject(req, res),
    );

    // Delete project
    app.delete(
      "/api/projects/:projectId",
      this.projectMiddleware.validateProjectId,
      (req, res) => this.projectController.deleteProject(req, res),
    );

    // ========================================
    // PROJECT SUB-RESOURCES - Nested Resources
    // ========================================

    // Project interfaces - handled by InterfaceRoutes in Application.js
    // The InterfaceRoutes class handles all /api/projects/:projectId/interfaces/* routes

    // Project tasks (existing)
    app.use(
      "/api/projects/:projectId/tasks",
      (req, res, next) => {
        req.projectId = req.params.projectId;
        next();
      },
      require("../../task-management/routes/taskRoutes"),
    );

    // Project analysis (existing)
    app.use(
      "/api/projects/:projectId/analysis",
      (req, res, next) => {
        req.projectId = req.params.projectId;
        next();
      },
      require("../../analysis/routes/analysisRoutes"),
    );

    // Project git operations (existing)
    app.use(
      "/api/projects/:projectId/git",
      (req, res, next) => {
        req.projectId = req.params.projectId;
        next();
      },
      require("../../tools/routes/gitRoutes"),
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

module.exports = ProjectRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const projectRoutes = new ProjectRoutes();
  return projectRoutes.getRouter();
};
