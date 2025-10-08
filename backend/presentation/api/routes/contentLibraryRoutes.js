const express = require('express');
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
  }

  /**
   * Setup all content library routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // ========================================
    // FRAMEWORK ROUTES - Framework Management
    // ========================================
    
    // Get all frameworks
    app.get('/api/frameworks', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getFrameworks(req, res));
    
    // Get framework prompts
    app.get('/api/frameworks/:frameworkId/prompts', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getFrameworkPrompts(req, res));
    
    // Get framework templates
    app.get('/api/frameworks/:frameworkId/templates', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getFrameworkTemplates(req, res));
    
    // Get specific framework prompt file
    app.get('/api/frameworks/:frameworkId/prompts/:filename', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getFrameworkPromptFile(req, res));
    
    // Get specific framework template file
    app.get('/api/frameworks/:frameworkId/templates/:filename', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getFrameworkTemplateFile(req, res));

    // ========================================
    // PROMPT ROUTES - Prompt Management
    // ========================================
    
    // Get all prompts
    app.get('/api/prompts', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getPrompts(req, res));
    
    // Get specific prompt file
    app.get('/api/prompts/:category/:filename', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getPromptFile(req, res));

    // ========================================
    // TEMPLATE ROUTES - Template Management
    // ========================================
    
    // Get all templates
    app.get('/api/templates', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getTemplates(req, res));
    
    // Get specific template file
    app.get('/api/templates/:category/:filename', this.authMiddleware.authenticate(), (req, res) => this.contentLibraryController.getTemplateFile(req, res));
  }
}

module.exports = ContentLibraryRoutes;
