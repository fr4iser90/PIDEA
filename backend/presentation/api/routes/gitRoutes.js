const express = require('express');
const router = express.Router();

/**
 * Git Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to Git management endpoints
 * including repository operations, branch management, and Pidea-Agent integration.
 */

class GitRoutes {
  constructor(gitController, authMiddleware) {
    this.gitController = gitController;
    this.authMiddleware = authMiddleware;
  }

  /**
   * Setup all Git routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all Git routes
    app.use('/api/projects/:projectId/git', this.authMiddleware.authenticate());

    // ========================================
    // REPOSITORY ROUTES - Basic Git Operations
    // ========================================
    
    // Get Git status
    app.post('/api/projects/:projectId/git/status', (req, res) => this.gitController.getStatus(req, res));
    
    // Get Git branches
    app.post('/api/projects/:projectId/git/branches', (req, res) => this.gitController.getBranches(req, res));
    
    // Validate Git repository
    app.post('/api/projects/:projectId/git/validate', (req, res) => this.gitController.validate(req, res));
    
    // Compare branches/commits
    app.post('/api/projects/:projectId/git/compare', (req, res) => this.gitController.compare(req, res));
    
    // Get repository info
    app.post('/api/projects/:projectId/git/info', (req, res) => this.gitController.getRepositoryInfo(req, res));

    // ========================================
    // BRANCH MANAGEMENT ROUTES - Branch Operations
    // ========================================
    
    // Pull changes
    app.post('/api/projects/:projectId/git/pull', (req, res) => this.gitController.pull(req, res));
    
    // Checkout branch
    app.post('/api/projects/:projectId/git/checkout', (req, res) => this.gitController.checkout(req, res));
    
    // Merge branches
    app.post('/api/projects/:projectId/git/merge', (req, res) => this.gitController.merge(req, res));
    
    // Create new branch
    app.post('/api/projects/:projectId/git/create-branch', (req, res) => this.gitController.createBranch(req, res));

    // ========================================
    // Pidea-Agent Git Routes - Agent Integration
    // ========================================
    
    // Pull from Pidea-Agent branch
    app.post('/api/projects/:projectId/git/pull-pidea-agent', (req, res) => this.gitController.pullPideaAgent(req, res));
    
    // Merge to Pidea-Agent branch
    app.post('/api/projects/:projectId/git/merge-to-pidea-agent', (req, res) => this.gitController.mergeToPideaAgent(req, res));
    
    // Get Pidea-Agent status
    app.post('/api/projects/:projectId/git/pidea-agent-status', (req, res) => this.gitController.getPideaAgentStatus(req, res));
    
    // Compare with Pidea-Agent
    app.post('/api/projects/:projectId/git/compare-pidea-agent', (req, res) => this.gitController.compareWithPideaAgent(req, res));
  }
}

module.exports = GitRoutes;
