const express = require('express');
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
    // Apply authentication middleware to all file routes
    app.use('/api/files', this.authMiddleware.authenticate());

    // ========================================
    // FILE EXPLORER ROUTES - File System Operations
    // ========================================
    
    // Get file tree
    app.get('/api/files', async (req, res) => {
      try {
        const fileTree = await this.browserManager.getFileExplorerTree();
        res.json({
          success: true,
          data: fileTree
        });
      } catch (error) {
        this.logger.error('Error getting file tree:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file tree'
        });
      }
    });

    // Get file content
    app.get('/api/files/content', async (req, res) => {
      try {
        const filePath = req.query.path;
        this.logger.info('/api/files/content called with path:', '[REDACTED_FILE_PATH]');
        if (!filePath) {
          return res.status(400).json({
            success: false,
            error: 'File path is required'
          });
        }
        const content = await this.browserManager.getFileContent(filePath);
        res.json({
          success: true,
          data: {
            path: filePath,
            content: content
          }
        });
      } catch (error) {
        this.logger.error('Error getting file content:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file content'
        });
      }
    });
  }
}

module.exports = FileRoutes;
