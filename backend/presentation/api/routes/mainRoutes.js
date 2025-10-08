const express = require('express');
const path = require('path');
const fs = require('fs');

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
    app.get('/', (req, res) => {
      if (process.env.NODE_ENV === 'development') {
        const frontendDistPath = path.join(__dirname, '../../../frontend/dist');
        if (fs.existsSync(frontendDistPath)) {
          res.sendFile(path.join(frontendDistPath, 'index.html'));
        } else {
          res.sendFile(path.join(__dirname, '../../../frontend/index.html'));
        }
      } else {
        res.sendFile(path.join(__dirname, '../../../frontend/index.html'));
      }
    });
  }
}

module.exports = MainRoutes;
