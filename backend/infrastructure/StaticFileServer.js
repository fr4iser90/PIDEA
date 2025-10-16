const express = require("express");
const path = require("path");
const fs = require("fs");

/**
 * StaticFileServer - Handles static file serving for frontend
 * 
 * Responsibilities:
 * - Serve frontend build files
 * - Handle fallback for missing dist
 * - Static asset serving
 */
class StaticFileServer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Setup static file serving for frontend
   * @param {Express} app - Express application instance
   */
  setupStaticFileServing(app) {
    // Serve frontend build files in development
    if (process.env.NODE_ENV === "development") {
      const config = require("@config");
      const pathConfig = config.app.pathConfig.project;
      const frontendDistPath = path.join(pathConfig.root, pathConfig.frontend, "dist");

      if (fs.existsSync(frontendDistPath)) {
        app.use(express.static(frontendDistPath));
        this.logger.info("📁 Serving frontend from:", frontendDistPath);
      } else {
        this.logger.warn("⚠️ Frontend dist not found, serving fallback");
        this.serveFallback(app);
      }
    } else {
      // Production: serve from dist
      const config = require("@config");
      const pathConfig = config.app.pathConfig.project;
      const frontendDistPath = path.join(pathConfig.root, pathConfig.frontend, "dist");
      
      if (fs.existsSync(frontendDistPath)) {
        app.use(express.static(frontendDistPath));
        this.logger.info("📁 Serving frontend from:", frontendDistPath);
      } else {
        this.logger.error("❌ Frontend dist not found in production!");
        this.serveFallback(app);
      }
    }
  }

  /**
   * Serve fallback when frontend dist is not available
   * @param {Express} app - Express application instance
   */
  serveFallback(app) {
    app.get("*", (req, res) => {
      res.status(503).json({
        error: "Frontend not available",
        message: "Please build the frontend first: npm run build",
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Setup framework static files (if needed)
   * @param {Express} app - Express application instance
   */
  setupFrameworkStaticFiles(app) {
    const pathConfig = this.config.app.pathConfig.project;
    const frameworkPath = path.join(pathConfig.root, pathConfig.framework);

    if (fs.existsSync(frameworkPath)) {
      app.use(
        "/framework",
        express.static(path.join(__dirname, "../framework"))
      );
      this.logger.info("📁 Serving framework files from:", frameworkPath);
    }
  }
}

module.exports = StaticFileServer;
