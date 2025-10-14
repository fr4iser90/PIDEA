/**
 * Interface Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to interface endpoints
 * within project context, including CRUD operations and control operations.
 */
const express = require("express");
const ProjectInterfaceController = require("../../project-management/controllers/ProjectInterfaceController");
const InterfaceMiddleware = require("../../../middleware/interfaceMiddleware");

class InterfaceRoutes {
  constructor(interfaceManager, projectApplicationService, authMiddleware) {
    this.interfaceManager = interfaceManager;
    this.projectApplicationService = projectApplicationService;
    this.authMiddleware = authMiddleware;

    this.interfaceController = new ProjectInterfaceController(
      interfaceManager,
      projectApplicationService,
    );
    this.interfaceMiddleware = new InterfaceMiddleware(
      interfaceManager,
      projectApplicationService,
    );
  }

  /**
   * Setup all interface routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Authentication is already handled globally in MiddlewareSetup.js

    // ========================================
    // INTERFACE CRUD ROUTES - Interface Operations
    // ========================================

    // Create new interface
    app.post(
      "/api/projects/:projectId/interfaces",
      this.interfaceMiddleware.validateCreate,
      (req, res) => this.interfaceController.createInterface(req, res),
    );

    // List project interfaces
    app.get("/api/projects/:projectId/interfaces", (req, res) =>
      this.interfaceController.listInterfaces(req, res),
    );

    // Get specific interface
    app.get(
      "/api/projects/:projectId/interfaces/:interfaceId",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.getInterface(req, res),
    );

    // Update interface
    app.put(
      "/api/projects/:projectId/interfaces/:interfaceId",
      this.interfaceMiddleware.validateInterfaceId,
      this.interfaceMiddleware.validateUpdate,
      (req, res) => this.interfaceController.updateInterface(req, res),
    );

    // Delete interface
    app.delete(
      "/api/projects/:projectId/interfaces/:interfaceId",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.deleteInterface(req, res),
    );

    // ========================================
    // INTERFACE CONTROL ROUTES - Interface Lifecycle
    // ========================================

    // Start interface
    app.post(
      "/api/projects/:projectId/interfaces/:interfaceId/start",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.startInterface(req, res),
    );

    // Stop interface
    app.post(
      "/api/projects/:projectId/interfaces/:interfaceId/stop",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.stopInterface(req, res),
    );

    // Restart interface
    app.post(
      "/api/projects/:projectId/interfaces/:interfaceId/restart",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.restartInterface(req, res),
    );

    // ========================================
    // INTERFACE STATUS ROUTES - Interface Monitoring
    // ========================================

    // Get interface status
    app.get(
      "/api/projects/:projectId/interfaces/:interfaceId/status",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.getInterfaceStatus(req, res),
    );

    // Get interface logs
    app.get(
      "/api/projects/:projectId/interfaces/:interfaceId/logs",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.getInterfaceLogs(req, res),
    );

    // ========================================
    // IDE-SPECIFIC ROUTES - IDE Features
    // ========================================

    // Get available IDEs (without projectId - for general IDE detection)
    app.get("/api/interfaces/available-ides", (req, res) =>
      this.interfaceController.getAvailableIDEsGeneral(req, res),
    );

    // Get available IDEs (with projectId - for project-specific IDE detection)
    app.get("/api/projects/:projectId/interfaces/available-ides", (req, res) =>
      this.interfaceController.getAvailableIDEs(req, res),
    );

    // Get IDE features
    app.get(
      "/api/projects/:projectId/interfaces/:interfaceId/features",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.getIDEFeatures(req, res),
    );

    // Get IDE version
    app.get(
      "/api/projects/:projectId/interfaces/:interfaceId/version",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.getIDEVersion(req, res),
    );

    // Get workspace info
    app.get(
      "/api/projects/:projectId/interfaces/:interfaceId/workspace-info",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.getWorkspaceInfo(req, res),
    );

    // Set workspace path
    app.post(
      "/api/projects/:projectId/interfaces/:interfaceId/set-workspace",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.setWorkspacePath(req, res),
    );

    // Detect workspace paths
    app.post(
      "/api/projects/:projectId/interfaces/:interfaceId/detect-workspace-paths",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.detectWorkspacePaths(req, res),
    );

    // Monitor terminal
    app.post(
      "/api/projects/:projectId/interfaces/:interfaceId/monitor-terminal",
      this.interfaceMiddleware.validateInterfaceId,
      (req, res) => this.interfaceController.monitorTerminal(req, res),
    );
  }
}

module.exports = InterfaceRoutes;
