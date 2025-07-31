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
    // COMPONENT ROUTES - Specific Analysis Data (LEGACY - KEEP FOR COMPATIBILITY)
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
    // CATEGORY-BASED ROUTES - NEW STRUCTURE
    // ========================================
    
    // Category-based analysis data retrieval
    // Format: /api/projects/:projectId/analysis/:categoryId/:itemId
    
    // Security category
    app.get('/api/projects/:projectId/analysis/security/recommendations', (req, res) => 
      this.analysisController.getCategoryRecommendations(req, res, 'security'));
    app.get('/api/projects/:projectId/analysis/security/issues', (req, res) => 
      this.analysisController.getCategoryIssues(req, res, 'security'));
    app.get('/api/projects/:projectId/analysis/security/metrics', (req, res) => 
      this.analysisController.getCategoryMetrics(req, res, 'security'));
    app.get('/api/projects/:projectId/analysis/security/summary', (req, res) => 
      this.analysisController.getCategorySummary(req, res, 'security'));
    app.get('/api/projects/:projectId/analysis/security/results', (req, res) => 
      this.analysisController.getCategoryResults(req, res, 'security'));

    // Performance category
    app.get('/api/projects/:projectId/analysis/performance/recommendations', (req, res) => 
      this.analysisController.getCategoryRecommendations(req, res, 'performance'));
    app.get('/api/projects/:projectId/analysis/performance/issues', (req, res) => 
      this.analysisController.getCategoryIssues(req, res, 'performance'));
    app.get('/api/projects/:projectId/analysis/performance/metrics', (req, res) => 
      this.analysisController.getCategoryMetrics(req, res, 'performance'));
    app.get('/api/projects/:projectId/analysis/performance/summary', (req, res) => 
      this.analysisController.getCategorySummary(req, res, 'performance'));
    app.get('/api/projects/:projectId/analysis/performance/results', (req, res) => 
      this.analysisController.getCategoryResults(req, res, 'performance'));

    // Architecture category
    app.get('/api/projects/:projectId/analysis/architecture/recommendations', (req, res) => 
      this.analysisController.getCategoryRecommendations(req, res, 'architecture'));
    app.get('/api/projects/:projectId/analysis/architecture/issues', (req, res) => 
      this.analysisController.getCategoryIssues(req, res, 'architecture'));
    app.get('/api/projects/:projectId/analysis/architecture/metrics', (req, res) => 
      this.analysisController.getCategoryMetrics(req, res, 'architecture'));
    app.get('/api/projects/:projectId/analysis/architecture/summary', (req, res) => 
      this.analysisController.getCategorySummary(req, res, 'architecture'));
    app.get('/api/projects/:projectId/analysis/architecture/results', (req, res) => 
      this.analysisController.getCategoryResults(req, res, 'architecture'));

    // Code Quality category
    app.get('/api/projects/:projectId/analysis/code-quality/recommendations', (req, res) => 
      this.analysisController.getCategoryRecommendations(req, res, 'code-quality'));
    app.get('/api/projects/:projectId/analysis/code-quality/issues', (req, res) => 
      this.analysisController.getCategoryIssues(req, res, 'code-quality'));
    app.get('/api/projects/:projectId/analysis/code-quality/metrics', (req, res) => 
      this.analysisController.getCategoryMetrics(req, res, 'code-quality'));
    app.get('/api/projects/:projectId/analysis/code-quality/summary', (req, res) => 
      this.analysisController.getCategorySummary(req, res, 'code-quality'));
    app.get('/api/projects/:projectId/analysis/code-quality/results', (req, res) => 
      this.analysisController.getCategoryResults(req, res, 'code-quality'));

    // Tech Stack category
    app.get('/api/projects/:projectId/analysis/tech-stack/recommendations', (req, res) => 
      this.analysisController.getCategoryRecommendations(req, res, 'tech-stack'));
    app.get('/api/projects/:projectId/analysis/tech-stack/issues', (req, res) => 
      this.analysisController.getCategoryIssues(req, res, 'tech-stack'));
    app.get('/api/projects/:projectId/analysis/tech-stack/metrics', (req, res) => 
      this.analysisController.getCategoryMetrics(req, res, 'tech-stack'));
    app.get('/api/projects/:projectId/analysis/tech-stack/summary', (req, res) => 
      this.analysisController.getCategorySummary(req, res, 'tech-stack'));
    app.get('/api/projects/:projectId/analysis/tech-stack/results', (req, res) => 
      this.analysisController.getCategoryResults(req, res, 'tech-stack'));

    // Dependencies category
    app.get('/api/projects/:projectId/analysis/dependencies/recommendations', (req, res) => 
      this.analysisController.getCategoryRecommendations(req, res, 'dependencies'));
    app.get('/api/projects/:projectId/analysis/dependencies/issues', (req, res) => 
      this.analysisController.getCategoryIssues(req, res, 'dependencies'));
    app.get('/api/projects/:projectId/analysis/dependencies/metrics', (req, res) => 
      this.analysisController.getCategoryMetrics(req, res, 'dependencies'));
    app.get('/api/projects/:projectId/analysis/dependencies/summary', (req, res) => 
      this.analysisController.getCategorySummary(req, res, 'dependencies'));
    app.get('/api/projects/:projectId/analysis/dependencies/results', (req, res) => 
      this.analysisController.getCategoryResults(req, res, 'dependencies'));

    // ========================================
    // WORKFLOW EXECUTION ROUTES - Complex Analysis Runs
    // ========================================
    
    // Execute analysis workflow (for complex runs like "Run All Analysis")
    // This uses StepRegistry and is slower but handles complex workflows
    app.post('/api/projects/:projectId/analysis/execute', (req, res) => 
      this.analysisController.executeAnalysisWorkflow(req, res));
  }

  /**
   * Setup execution route for a specific analysis type
   * @param {Express.Router} app - Express app instance
   * @param {string} routeName - Route name (e.g., 'project', 'architecture')
   * @param {string} workflowMode - Workflow mode for execution
   */
  setupExecutionRoute(app, routeName, workflowMode) {
    app.post(`/api/projects/:projectId/analysis/${routeName}`, (req, res) => {
      // Ensure req.body exists and set the mode
      req.body = req.body || {};
      req.body.mode = workflowMode;
      req.body.projectId = req.params.projectId;
      
      // Add analysis type for tracking
      req.body.analysisType = routeName;
      
      this.workflowController.executeWorkflow(req, res);
    });
  }
}

module.exports = AnalysisRoutes; 