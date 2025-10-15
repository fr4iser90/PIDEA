const express = require("express");
const router = express.Router();

/**
 * Content Library Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to content library endpoints
 * including frameworks, prompts, and templates management.
 */

class ContentLibraryRoutes {
  constructor(contentLibraryController, authMiddleware) {
    this.contentLibraryController = contentLibraryController;
    this.authMiddleware = authMiddleware;
    this.router = express.Router();
    this.setupRoutes(this.router);
  }

  /**
   * Setup all content library routes
   * @param {Express.Router} router - Express router instance
   */
  setupRoutes(router) {
    // ========================================
    // FRAMEWORK ROUTES - Framework Management
    // ========================================

    // Get all frameworks
    router.get("/api/frameworks", (req, res) =>
      this.contentLibraryController.getFrameworks(req, res),
    );

    // Get framework prompts
    router.get("/api/frameworks/:frameworkId/prompts", (req, res) =>
      this.contentLibraryController.getFrameworkPrompts(req, res),
    );

    // Get framework templates
    router.get("/api/frameworks/:frameworkId/templates", (req, res) =>
      this.contentLibraryController.getFrameworkTemplates(req, res),
    );

    // Get specific framework prompt file
    router.get("/api/frameworks/:frameworkId/prompts/:filename", (req, res) =>
      this.contentLibraryController.getFrameworkPromptFile(req, res),
    );

    // Get specific framework template file
    router.get("/api/frameworks/:frameworkId/templates/:filename", (req, res) =>
      this.contentLibraryController.getFrameworkTemplateFile(req, res),
    );

    // ========================================
    // PROMPT ROUTES - Prompt Management
    // ========================================

    // Get all prompts
    router.get("/api/prompts", (req, res) =>
      this.contentLibraryController.getPrompts(req, res),
    );

    // Get specific prompt file
    router.get("/api/prompts/:category/:filename", (req, res) =>
      this.contentLibraryController.getPromptFile(req, res),
    );

    // ========================================
    // TEMPLATE ROUTES - Template Management
    // ========================================

    // Get all templates
    router.get("/api/templates", (req, res) =>
      this.contentLibraryController.getTemplates(req, res),
    );

    // Get specific template file
    router.get("/api/templates/:category/:filename", (req, res) =>
      this.contentLibraryController.getTemplateFile(req, res),
    );
  }

  /**
   * Get router instance for Express app
   * @returns {Express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }
}

module.exports = ContentLibraryRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const contentLibraryRoutes = new ContentLibraryRoutes();
  return contentLibraryRoutes.getRouter();
};
