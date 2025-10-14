/**
 * Project Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to project endpoints
 * including CRUD operations, validation, and sub-resource routing.
 */
const express = require("express");
const ProjectController = require("../projects/ProjectController");
const projectMiddleware = require("../../middleware/projectMiddleware");

class ProjectRoutes {
  constructor(projectApplicationService, interfaceManager, authMiddleware) {
    this.projectApplicationService = projectApplicationService;
    this.interfaceManager = interfaceManager;
    this.authMiddleware = authMiddleware;

    this.projectController = new ProjectController(projectApplicationService);
    this.projectMiddleware = new projectMiddleware(projectApplicationService);
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

    // Project interfaces
    app.use(
      "/api/projects/:projectId/interfaces",
      (req, res, next) => {
        // Add project context to request
        req.projectId = req.params.projectId;
        next();
      },
      require("./interfaceRoutes"),
    );

    // Project tasks (existing)
    app.use(
      "/api/projects/:projectId/tasks",
      (req, res, next) => {
        req.projectId = req.params.projectId;
        next();
      },
      require("./taskRoutes"),
    );

    // Project analysis (existing)
    app.use(
      "/api/projects/:projectId/analysis",
      (req, res, next) => {
        req.projectId = req.params.projectId;
        next();
      },
      require("./analysisRoutes"),
    );

    // Project git operations (existing)
    app.use(
      "/api/projects/:projectId/git",
      (req, res, next) => {
        req.projectId = req.params.projectId;
        next();
      },
      require("./gitRoutes"),
    );
  }
}

module.exports = ProjectRoutes;
