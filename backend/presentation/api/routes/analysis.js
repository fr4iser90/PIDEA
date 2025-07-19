const express = require('express');
const router = express.Router();

/**
 * Analysis Routes - Professional RESTful API Design
 * 
 * This module provides a clean, modular approach to analysis endpoints
 * using the WorkflowController for execution and AnalysisController for results.
 */

class AnalysisRoutes {
  constructor(workflowController, analysisController, authMiddleware, taskController) {
    this.workflowController = workflowController;
    this.analysisController = analysisController;
    this.authMiddleware = authMiddleware;
    this.taskController = taskController;
  }

  /**
   * Setup all analysis routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Apply authentication middleware to all analysis routes
    app.use('/api/projects/:projectId/analysis', this.authMiddleware.authenticate());

    // ========================================
    // EXECUTION ROUTES - Workflow-based Analysis
    // ========================================
    
    // Core analysis types
    this.setupExecutionRoute(app, 'project', 'project-analysis');
    this.setupExecutionRoute(app, 'architecture', 'architecture-analysis');
    this.setupExecutionRoute(app, 'code-quality', 'code-quality-analysis');
    this.setupExecutionRoute(app, 'tech-stack', 'tech-stack-analysis');
    this.setupExecutionRoute(app, 'manifest', 'manifest-analysis');
    this.setupExecutionRoute(app, 'security', 'security-analysis');
    this.setupExecutionRoute(app, 'performance', 'performance-analysis');
    this.setupExecutionRoute(app, 'dependencies', 'dependency-analysis');
    this.setupExecutionRoute(app, 'comprehensive', 'analysis');

    // ========================================
    // GENERATE ROUTES - Generation Steps
    // ========================================
    
    // Generate recommendations based on analysis results
    this.setupExecutionRoute(app, 'recommendations', 'recommendations');
    
    // Individual recommendation routes
    this.setupExecutionRoute(app, 'security-recommendations', 'security-recommendations');
    this.setupExecutionRoute(app, 'code-quality-recommendations', 'code-quality-recommendations');
    this.setupExecutionRoute(app, 'architecture-recommendations', 'architecture-recommendations');
    
    // Testing routes
    this.setupExecutionRoute(app, 'test', 'test');
    this.setupExecutionRoute(app, 'test-analysis', 'test-analysis');
    this.setupExecutionRoute(app, 'test-generation', 'test-generation');
    this.setupExecutionRoute(app, 'test-fixing', 'test-fixing');

    // ========================================
    // RESULTS ROUTES - Analysis Data Retrieval
    // ========================================
    
    // Analysis history and metadata
    app.get('/api/projects/:projectId/analysis/history', (req, res) => 
      this.analysisController.getAnalysisHistory(req, res));
    app.get('/api/projects/:projectId/analysis/metrics', (req, res) => 
      this.analysisController.getAnalysisMetrics(req, res));
    app.get('/api/projects/:projectId/analysis/status', (req, res) => 
      this.analysisController.getAnalysisStatus(req, res));
    app.get('/api/projects/:projectId/analysis/database', (req, res) => 
      this.analysisController.getAnalysisFromDatabase(req, res));

    // Analysis files
    app.get('/api/projects/:projectId/analysis/files/:filename', (req, res) => 
      this.analysisController.getAnalysisFile(req, res));

    // ========================================
    // COMPONENT ROUTES - Specific Analysis Data
    // ========================================
    
    // Analysis components for UI
    app.get('/api/projects/:projectId/analysis/issues', (req, res) => 
      this.analysisController.getAnalysisIssues(req, res));
    app.get('/api/projects/:projectId/analysis/techstack', (req, res) => 
      this.analysisController.getAnalysisTechStack(req, res));
    app.get('/api/projects/:projectId/analysis/architecture', (req, res) => 
      this.analysisController.getAnalysisArchitecture(req, res));
    app.get('/api/projects/:projectId/analysis/recommendations', (req, res) => 
      this.analysisController.getAnalysisRecommendations(req, res));
    app.get('/api/projects/:projectId/analysis/charts/:type', (req, res) => 
      this.analysisController.getAnalysisCharts(req, res));

    // ========================================
    // LEGACY COMPATIBILITY
    // ========================================
    
    // Generic analysis route for legacy compatibility
    app.get('/api/projects/:projectId/analysis/:analysisId', (req, res) => 
      this.taskController.getProjectAnalysis(req, res));
  }

  /**
   * Setup execution route for a specific analysis type
   * @param {Express.Router} app - Express app instance
   * @param {string} routeName - Route name (e.g., 'project', 'architecture')
   * @param {string} workflowMode - Workflow mode for execution
   */
  setupExecutionRoute(app, routeName, workflowMode) {
    app.post(`/api/projects/:projectId/analysis/${routeName}`, (req, res) => {
      req.body.mode = workflowMode;
      this.workflowController.executeWorkflow(req, res);
    });
  }
}

module.exports = AnalysisRoutes; 