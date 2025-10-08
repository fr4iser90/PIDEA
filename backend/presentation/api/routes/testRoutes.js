const express = require('express');
const router = express.Router();

/**
 * Test Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to test management endpoints
 * including Playwright test configuration, execution, and browser environment management.
 */

class TestRoutes {
  constructor(testManagementController, authMiddleware) {
    this.testManagementController = testManagementController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all test routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all test routes
    app.use('/api/projects/:projectId/tests/playwright', this.authMiddleware.authenticate());
    app.use('/api/tests/browser-environment', this.authMiddleware.authenticate());

    // ========================================
    // PLAYWRIGHT CONFIGURATION ROUTES - Test Configuration
    // ========================================
    
    // Get Playwright test configuration
    app.get('/api/projects/:projectId/tests/playwright/config', (req, res) => this.testManagementController.getPlaywrightTestConfig(req, res));
    
    // Update Playwright test configuration
    app.put('/api/projects/:projectId/tests/playwright/config', (req, res) => this.testManagementController.updatePlaywrightTestConfig(req, res));

    // ========================================
    // PLAYWRIGHT PROJECT ROUTES - Test Project Management
    // ========================================
    
    // Get Playwright test projects
    app.get('/api/projects/:projectId/tests/playwright/projects', (req, res) => this.testManagementController.getPlaywrightTestProjects(req, res));
    
    // Create Playwright test project
    app.post('/api/projects/:projectId/tests/playwright/projects', (req, res) => this.testManagementController.createPlaywrightTestProject(req, res));

    // ========================================
    // PLAYWRIGHT EXECUTION ROUTES - Test Execution
    // ========================================
    
    // Execute Playwright tests
    app.post('/api/projects/:projectId/tests/playwright/execute', (req, res) => this.testManagementController.executePlaywrightTests(req, res));
    
    // Stop Playwright tests
    app.post('/api/projects/:projectId/tests/playwright/stop', (req, res) => this.testManagementController.stopPlaywrightTests(req, res));

    // ========================================
    // PLAYWRIGHT RESULTS ROUTES - Test Results Management
    // ========================================
    
    // Get Playwright test results
    app.get('/api/projects/:projectId/tests/playwright/results', (req, res) => this.testManagementController.getPlaywrightTestResults(req, res));
    
    // Get specific Playwright test result
    app.get('/api/projects/:projectId/tests/playwright/results/:testId', (req, res) => this.testManagementController.getPlaywrightTestResultById(req, res));
    
    // Get Playwright test history
    app.get('/api/projects/:projectId/tests/playwright/history', (req, res) => this.testManagementController.getPlaywrightTestHistory(req, res));

    // ========================================
    // BROWSER ENVIRONMENT ROUTES - Browser Management
    // ========================================
    
    // Get browser environment
    app.get('/api/tests/browser-environment', (req, res) => this.testManagementController.getBrowserEnvironment(req, res));
  }
}

module.exports = TestRoutes;
