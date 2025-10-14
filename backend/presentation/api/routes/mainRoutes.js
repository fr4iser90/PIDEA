const express = require("express");
const path = require("path");
const fs = require("fs");
const centralizedConfig = require("../../../config/centralized-config");

/**
 * Main Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to main application routes
 * including frontend serving and main page handling.
 */

class MainRoutes {
  constructor() {
    // No dependencies needed for main routes
  }

  /**
   * Setup all main routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // ========================================
    // MAIN PAGE ROUTES - Frontend Serving
    // ========================================

    // Serve the main page
    app.get("/", (req, res) => {
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
}

module.exports = MainRoutes;
