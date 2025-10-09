/**
 * Version Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to version management routes
 * including version bumping, history, validation, and configuration.
 */

const express = require('express');
const VersionController = require('../controllers/VersionController');
const Logger = require('@logging/Logger');

class VersionRoutes {
  constructor(authMiddleware, serviceRegistry) {
    this.authMiddleware = authMiddleware;
    this.serviceRegistry = serviceRegistry;
    this.logger = new Logger('VersionRoutes');
    
    // Get VersionManagementHandler from DI container
    const versionManagementHandler = serviceRegistry.getService('versionManagementHandler');
    if (!versionManagementHandler) {
      throw new Error('VersionManagementHandler not found in DI container');
    }
    
    // Create VersionController with proper dependencies
    this.versionController = new VersionController({
      handler: versionManagementHandler,
      logger: serviceRegistry.getService('logger')
    });
  }

  /**
   * Setup all version routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // ========================================
    // VERSION MANAGEMENT ROUTES - Version Control
    // ========================================
    
    // Apply authentication middleware to version routes
    app.use('/api/versions', this.authMiddleware.authenticate());
    
    // Health check endpoint
    app.get('/api/versions/health', (req, res) => {
      this.versionController.healthCheck(req, res);
    });

    // Version management endpoints
    app.post('/api/versions/bump', (req, res) => {
      this.versionController.bumpVersion(req, res);
    });

    app.get('/api/versions/current', (req, res) => {
      this.versionController.getCurrentVersion(req, res);
    });

    app.get('/api/versions/history', (req, res) => {
      this.versionController.getVersionHistory(req, res);
    });

    app.post('/api/versions/validate', (req, res) => {
      this.versionController.validateVersion(req, res);
    });

    app.post('/api/versions/compare', (req, res) => {
      this.versionController.compareVersions(req, res);
    });

    app.post('/api/versions/determine-bump-type', (req, res) => {
      this.versionController.determineBumpType(req, res);
    });

    app.post('/api/versions/ai-analysis', (req, res) => {
      this.versionController.getAIAnalysis(req, res);
    });

    app.get('/api/versions/latest', (req, res) => {
      this.versionController.getLatestVersion(req, res);
    });

    // Configuration endpoints
    app.get('/api/versions/config', (req, res) => {
      this.versionController.getConfiguration(req, res);
    });

    app.put('/api/versions/config', (req, res) => {
      this.versionController.updateConfiguration(req, res);
    });
  }
}

module.exports = VersionRoutes;