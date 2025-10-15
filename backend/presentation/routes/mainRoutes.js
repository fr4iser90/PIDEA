const express = require("express");
const path = require("path");
const fs = require("fs");
const centralizedConfig = require("../../config/centralized-config");

/**
 * Main Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to main application routes
 * including frontend serving and main page handling.
 */

class MainRoutes {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Setup all main routes
   */
  setupRoutes() {
    // ========================================
    // MAIN PAGE ROUTES - Frontend Serving
    // ========================================

    // Serve the main page
    this.router.get("/", (req, res) => {
      const config = centralizedConfig.pathConfig.project;
      const frontendDistPath = path.join(config.root, config.frontend, "dist");
      const frontendIndexPath = path.join(config.root, config.frontend, "index.html");
      
      if (process.env.NODE_ENV === "development" && fs.existsSync(frontendDistPath)) {
        res.sendFile(path.join(frontendDistPath, "index.html"));
      } else {
        res.sendFile(frontendIndexPath);
      }
    });
  }

  /**
   * Get router instance for Express app
   * @returns {Express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }
}

module.exports = MainRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const mainRoutes = new MainRoutes();
  return mainRoutes.getRouter();
};
