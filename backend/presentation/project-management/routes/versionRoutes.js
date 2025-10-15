/**
 * Version Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to version management routes
 * including version bumping, history, validation, and configuration.
 */

const express = require("express");
const VersionController = require("../controllers/VersionController");
const Logger = require("@logging/Logger");

class VersionRoutes {
  constructor(authMiddleware, serviceRegistry) {
    this.authMiddleware = authMiddleware;
    this.serviceRegistry = serviceRegistry;
    this.logger = new Logger("VersionRoutes");

    // Lazy initialization - only create when needed
    this._versionController = null;
  }

  get versionController() {
    if (!this._versionController) {
      // Get VersionManagementHandler from DI container
      const versionManagementHandler = this.serviceRegistry.getService(
        "versionManagementHandler",
      );
      if (!versionManagementHandler) {
        throw new Error("VersionManagementHandler not found in DI container");
      }

      // Create VersionController with proper dependencies
      this._versionController = new VersionController({
        handler: versionManagementHandler,
        logger: this.serviceRegistry.getService("logger"),
      });
    }
    return this._versionController;
  }

  /**
   * Setup all version routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // ========================================
    // VERSION MANAGEMENT ROUTES - Version Control
    // ========================================

    // Authentication handled by global middleware

    // Health check endpoint
    app.get("/api/versions/health", (req, res) => {
      this.versionController.healthCheck(req, res);
    });

    // Version management endpoints
    app.post("/api/versions/bump", (req, res) => {
      this.versionController.bumpVersion(req, res);
    });

    app.get("/api/versions/current", (req, res) => {
      this.versionController.getCurrentVersion(req, res);
    });

    app.get("/api/versions/history", (req, res) => {
      this.versionController.getVersionHistory(req, res);
    });

    app.post("/api/versions/validate", (req, res) => {
      this.versionController.validateVersion(req, res);
    });

    app.post("/api/versions/compare", (req, res) => {
      this.versionController.compareVersions(req, res);
    });

    app.post("/api/versions/determine-bump-type", (req, res) => {
      this.versionController.determineBumpType(req, res);
    });

    app.post("/api/versions/ai-analysis", (req, res) => {
      this.versionController.getAIAnalysis(req, res);
    });

    app.get("/api/versions/latest", (req, res) => {
      this.versionController.getLatestVersion(req, res);
    });

    // Configuration endpoints
    app.get("/api/versions/config", (req, res) => {
      this.versionController.getConfiguration(req, res);
    });

    app.put("/api/versions/config", (req, res) => {
      this.versionController.updateConfiguration(req, res);
    });
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

module.exports = VersionRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const versionRoutes = new VersionRoutes();
  return versionRoutes.getRouter();
};
