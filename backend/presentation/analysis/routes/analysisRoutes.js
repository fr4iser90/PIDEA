const express = require("express");
const router = express.Router();

/**
 * Analysis Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular this.routerroach to analysis endpoints
 * using the WorkflowController for execution and AnalysisController for results.
 */

class AnalysisRoutes {
  constructor(
    workflowController,
    analysisController,
    authMiddleware,
    taskController,
  ) {
    this.workflowController = workflowController;
    this.analysisController = analysisController;
    this.authMiddleware = authMiddleware;
    this.taskController = taskController;
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Get router instance
   * @returns {express.Router} Router instance
   */
  getRouter() {
    return this.router;
  }

  /**
   * Setup all analysis routes
   */
  setupRoutes() {
    // Authentication handled by global middleware

    // ========================================
    // EXECUTION ROUTES - Workflow-based Analysis
    // ========================================

    // Core analysis types
    this.setupExecutionRoute(this.router, "project", "project-analysis");
    this.setupExecutionRoute(this.router, "architecture", "architecture-analysis");
    this.setupExecutionRoute(this.router, "code-quality", "code-quality-analysis");
    this.setupExecutionRoute(this.router, "tech-stack", "tech-stack-analysis");
    this.setupExecutionRoute(this.router, "manifest", "manifest-analysis");
    this.setupExecutionRoute(this.router, "security", "security-analysis");
    this.setupExecutionRoute(this.router, "performance", "performance-analysis");
    this.setupExecutionRoute(this.router, "dependencies", "dependency-analysis");
    this.setupExecutionRoute(this.router, "comprehensive", "analysis");

    // ========================================
    // GENERATE ROUTES - Generation Steps
    // ========================================

    // Generate recommendations based on analysis results
    this.setupExecutionRoute(this.router, "recommendations", "recommendations");

    // Individual recommendation routes
    this.setupExecutionRoute(
      this.router,
      "security-recommendations",
      "security-recommendations",
    );
    this.setupExecutionRoute(
      this.router,
      "code-quality-recommendations",
      "code-quality-recommendations",
    );
    this.setupExecutionRoute(
      this.router,
      "architecture-recommendations",
      "architecture-recommendations",
    );

    // Testing routes
    this.setupExecutionRoute(this.router, "test", "test");
    this.setupExecutionRoute(this.router, "test-analysis", "test-analysis");
    this.setupExecutionRoute(this.router, "test-generation", "test-generation");
    this.setupExecutionRoute(this.router, "test-fixing", "test-fixing");

    // ========================================
    // RESULTS ROUTES - Analysis Data Retrieval
    // ========================================

    // Analysis history and metadata
    this.router.get("/api/projects/:projectId/analysis/history", (req, res) =>
      this.analysisController.getAnalysisHistory(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/metrics", (req, res) =>
      this.analysisController.getAnalysisMetrics(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/status", (req, res) =>
      this.analysisController.getAnalysisStatus(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/database", (req, res) =>
      this.analysisController.getAnalysisFromDatabase(req, res),
    );

    // Analysis files
    this.router.get("/api/projects/:projectId/analysis/files/:filename", (req, res) =>
      this.analysisController.getAnalysisFile(req, res),
    );

    // ========================================
    // COMPONENT ROUTES - Specific Analysis Data (LEGACY - KEEP FOR COMPATIBILITY)
    // ========================================

    // Analysis components for UI
    this.router.get("/api/projects/:projectId/analysis/issues", (req, res) =>
      this.analysisController.getAnalysisIssues(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/techstack", (req, res) =>
      this.analysisController.getAnalysisTechStack(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/architecture", (req, res) =>
      this.analysisController.getAnalysisArchitecture(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/recommendations", (req, res) =>
      this.analysisController.getAnalysisRecommendations(req, res),
    );
    this.router.get("/api/projects/:projectId/analysis/charts/:type", (req, res) =>
      this.analysisController.getAnalysisCharts(req, res),
    );

    // ========================================
    // CATEGORY-BASED ROUTES - NEW STRUCTURE
    // ========================================

    // Category-based analysis data retrieval
    // Format: /api/projects/:projectId/analysis/:categoryId/:itemId

    // Security category
    this.router.get(
      "/api/projects/:projectId/analysis/security/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "security",
        ),
    );
    this.router.get("/api/projects/:projectId/analysis/security/issues", (req, res) =>
      this.analysisController.getCategoryIssues(req, res, "security"),
    );
    this.router.get("/api/projects/:projectId/analysis/security/tasks", (req, res) =>
      this.analysisController.getCategoryTasks(req, res, "security"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/security/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(req, res, "security"),
    );
    this.router.get("/api/projects/:projectId/analysis/security/metrics", (req, res) =>
      this.analysisController.getCategoryMetrics(req, res, "security"),
    );
    this.router.get("/api/projects/:projectId/analysis/security/summary", (req, res) =>
      this.analysisController.getCategorySummary(req, res, "security"),
    );
    this.router.get("/api/projects/:projectId/analysis/security/results", (req, res) =>
      this.analysisController.getCategoryResults(req, res, "security"),
    );

    // Performance category
    this.router.get(
      "/api/projects/:projectId/analysis/performance/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "performance",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/performance/issues",
      (req, res) =>
        this.analysisController.getCategoryIssues(req, res, "performance"),
    );
    this.router.get("/api/projects/:projectId/analysis/performance/tasks", (req, res) =>
      this.analysisController.getCategoryTasks(req, res, "performance"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/performance/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(
          req,
          res,
          "performance",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/performance/metrics",
      (req, res) =>
        this.analysisController.getCategoryMetrics(req, res, "performance"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/performance/summary",
      (req, res) =>
        this.analysisController.getCategorySummary(req, res, "performance"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/performance/results",
      (req, res) =>
        this.analysisController.getCategoryResults(req, res, "performance"),
    );

    // Architecture category
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "architecture",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/issues",
      (req, res) =>
        this.analysisController.getCategoryIssues(req, res, "architecture"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/tasks",
      (req, res) =>
        this.analysisController.getCategoryTasks(req, res, "architecture"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(
          req,
          res,
          "architecture",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/metrics",
      (req, res) =>
        this.analysisController.getCategoryMetrics(req, res, "architecture"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/summary",
      (req, res) =>
        this.analysisController.getCategorySummary(req, res, "architecture"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/architecture/results",
      (req, res) =>
        this.analysisController.getCategoryResults(req, res, "architecture"),
    );

    // Code Quality category
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "code-quality",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/issues",
      (req, res) =>
        this.analysisController.getCategoryIssues(req, res, "code-quality"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/tasks",
      (req, res) =>
        this.analysisController.getCategoryTasks(req, res, "code-quality"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(
          req,
          res,
          "code-quality",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/metrics",
      (req, res) =>
        this.analysisController.getCategoryMetrics(req, res, "code-quality"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/summary",
      (req, res) =>
        this.analysisController.getCategorySummary(req, res, "code-quality"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/code-quality/results",
      (req, res) =>
        this.analysisController.getCategoryResults(req, res, "code-quality"),
    );

    // Tech Stack category
    this.router.get(
      "/api/projects/:projectId/analysis/tech-stack/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "tech-stack",
        ),
    );
    this.router.get("/api/projects/:projectId/analysis/tech-stack/issues", (req, res) =>
      this.analysisController.getCategoryIssues(req, res, "tech-stack"),
    );
    this.router.get("/api/projects/:projectId/analysis/tech-stack/tasks", (req, res) =>
      this.analysisController.getCategoryTasks(req, res, "tech-stack"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/tech-stack/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(
          req,
          res,
          "tech-stack",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/tech-stack/metrics",
      (req, res) =>
        this.analysisController.getCategoryMetrics(req, res, "tech-stack"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/tech-stack/summary",
      (req, res) =>
        this.analysisController.getCategorySummary(req, res, "tech-stack"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/tech-stack/results",
      (req, res) =>
        this.analysisController.getCategoryResults(req, res, "tech-stack"),
    );

    // Dependencies category
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "dependencies",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/issues",
      (req, res) =>
        this.analysisController.getCategoryIssues(req, res, "dependencies"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/tasks",
      (req, res) =>
        this.analysisController.getCategoryTasks(req, res, "dependencies"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(
          req,
          res,
          "dependencies",
        ),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/metrics",
      (req, res) =>
        this.analysisController.getCategoryMetrics(req, res, "dependencies"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/summary",
      (req, res) =>
        this.analysisController.getCategorySummary(req, res, "dependencies"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/dependencies/results",
      (req, res) =>
        this.analysisController.getCategoryResults(req, res, "dependencies"),
    );

    // Manifest category
    this.router.get(
      "/api/projects/:projectId/analysis/manifest/recommendations",
      (req, res) =>
        this.analysisController.getCategoryRecommendations(
          req,
          res,
          "manifest",
        ),
    );
    this.router.get("/api/projects/:projectId/analysis/manifest/issues", (req, res) =>
      this.analysisController.getCategoryIssues(req, res, "manifest"),
    );
    this.router.get("/api/projects/:projectId/analysis/manifest/tasks", (req, res) =>
      this.analysisController.getCategoryTasks(req, res, "manifest"),
    );
    this.router.get(
      "/api/projects/:projectId/analysis/manifest/documentation",
      (req, res) =>
        this.analysisController.getCategoryDocumentation(req, res, "manifest"),
    );
    this.router.get("/api/projects/:projectId/analysis/manifest/metrics", (req, res) =>
      this.analysisController.getCategoryMetrics(req, res, "manifest"),
    );
    this.router.get("/api/projects/:projectId/analysis/manifest/summary", (req, res) =>
      this.analysisController.getCategorySummary(req, res, "manifest"),
    );
    this.router.get("/api/projects/:projectId/analysis/manifest/results", (req, res) =>
      this.analysisController.getCategoryResults(req, res, "manifest"),
    );

    // ========================================
    // WORKFLOW EXECUTION ROUTES - Complex Analysis Runs
    // ========================================

    // Execute analysis workflow (for complex runs like "Run All Analysis")
    // This uses StepRegistry and is slower but handles complex workflows
    this.router.post("/api/projects/:projectId/analysis/execute", (req, res) =>
      this.analysisController.executeAnalysisWorkflow(req, res),
    );
  }

  /**
   * Setup execution route for a specific analysis type
   * @param {Express.Router} router - Express router instance
   * @param {string} routeName - Route name (e.g., 'project', 'architecture')
   * @param {string} workflowMode - Workflow mode for execution
   */
  setupExecutionRoute(router, routeName, workflowMode) {
    router.post(`/api/projects/:projectId/analysis/${routeName}`, (req, res) => {
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

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const analysisRoutes = new AnalysisRoutes();
  return analysisRoutes.getRouter();
};
