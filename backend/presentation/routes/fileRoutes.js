const express = require("express");
const router = express.Router();

/**
 * File Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to file management endpoints
 * including file tree exploration and content retrieval.
 */

class FileRoutes {
  constructor(browserManager, authMiddleware, logger) {
    this.browserManager = browserManager;
    this.authMiddleware = authMiddleware;
    this.logger = logger;
  }

  /**
   * Setup all file routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Authentication handled by global middleware

    // ========================================
    // FILE EXPLORER ROUTES - File System Operations
    // ========================================

    // Get file tree
    app.get("/api/files", async (req, res) => {
      try {
        const fileTree = await this.browserManager.getFileExplorerTree();
        res.success(fileTree);
      } catch (error) {
        this.logger.error("Error getting file tree:", error);
        res.error("Failed to get file tree", 500);
      }
    });

    // Get file content
    app.get("/api/files/content", async (req, res) => {
      try {
        const filePath = req.query.path;
        this.logger.info(
          "/api/files/content called with path:",
          "[REDACTED_FILE_PATH]",
        );
        if (!filePath) {
          return res.badRequest("File path is required");
        }
        const content = await this.browserManager.getFileContent(filePath);
        res.success({
          path: filePath,
          content: content,
        });
      } catch (error) {
        this.logger.error("Error getting file content:", error);
        res.error("Failed to get file content", 500);
      }
    });
  }
}

module.exports = FileRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const router = express.Router();
  const fileRoutes = new FileRoutes();
  fileRoutes.setupRoutes(router);
  return router;
};
