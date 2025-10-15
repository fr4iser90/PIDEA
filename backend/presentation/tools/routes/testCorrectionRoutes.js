const express = require("express");
const TestCorrectionController = require("../controllers/TestCorrectionController");
const AuthMiddleware = require("@infrastructure/auth/AuthMiddleware");
const Logger = require("@logging/Logger");

/**
 * Test Correction Routes - Professional RESTful API Design
 *
 * This module provides a clean, modular approach to test correction endpoints
 * including test analysis, fixing, and coverage improvement.
 */

class TestCorrectionRoutes {
  constructor(testCorrectionService, coverageAnalyzer, commandBus, eventBus, authMiddleware) {
    this.testCorrectionService = testCorrectionService;
    this.coverageAnalyzer = coverageAnalyzer;
    this.commandBus = commandBus;
    this.eventBus = eventBus;
    this.authMiddleware = authMiddleware;
    this.logger = new Logger("TestCorrectionRoutes");

    // Lazy initialization - only create when needed
    this._testCorrectionController = null;
  }

  get testCorrectionController() {
    if (!this._testCorrectionController) {
      this._testCorrectionController = new TestCorrectionController({
        testCorrectionService: this.testCorrectionService,
        coverageAnalyzer: this.coverageAnalyzer,
        commandBus: this.commandBus,
        eventBus: this.eventBus
      });
    }
    return this._testCorrectionController;
  }

  /**
   * Setup all test correction routes
   * @param {Express.Router} app - Express app instance
   */
  setupRoutes(app) {
    // Authentication handled by global middleware

    // ========================================
    // TEST CORRECTION ROUTES - Test Operations
    // ========================================

    // Health check endpoint (no auth required)
    app.get("/api/test-correction/health", (req, res) =>
      this.testCorrectionController.healthCheck(req, res),
    );

    // GET /api/test-correction/status
    // Get current status of test correction system
    app.get("/api/test-correction/status", (req, res) =>
      this.testCorrectionController.getStatus(req, res),
    );

    // POST /api/test-correction/analyze
    // Analyze failing tests and create correction tasks
    app.post("/api/test-correction/analyze", (req, res) =>
      this.testCorrectionController.analyzeTests(req, res),
    );

    // POST /api/test-correction/fix
    // Apply fixes to tests
    app.post("/api/test-correction/fix", (req, res) =>
      this.testCorrectionController.fixTests(req, res),
    );

    // POST /api/test-correction/auto-fix
    // Run complete auto-fix workflow
    app.post("/api/test-correction/auto-fix", (req, res) =>
      this.testCorrectionController.autoFix(req, res),
    );

    // POST /api/test-correction/improve-coverage
    // Improve test coverage
    app.post("/api/test-correction/improve-coverage", (req, res) =>
      this.testCorrectionController.improveCoverage(req, res),
    );

    // GET /api/test-correction/coverage
    // Get current test coverage
    app.get("/api/test-correction/coverage", (req, res) =>
      this.testCorrectionController.getCoverage(req, res),
    );

    // POST /api/test-correction/refactor
    // Refactor specific test types
    app.post("/api/test-correction/refactor", (req, res) =>
      this.testCorrectionController.refactorTests(req, res),
    );

    // POST /api/test-correction/stop
    // Stop all active corrections
    app.post("/api/test-correction/stop", (req, res) =>
      this.testCorrectionController.stopCorrections(req, res),
    );

    // GET /api/test-correction/report
    // Get test correction report
    app.get("/api/test-correction/report", (req, res) =>
      this.testCorrectionController.getReport(req, res),
    );
  }

  /**
   * Get router instance for Express app
   * @returns {Express.Router} Router instance
   */
  getRouter() {
    const router = express.Router();
    this.setupRoutes(router);
    return router;
  }
}

module.exports = TestCorrectionRoutes;

// Export getRouter function for route registry
module.exports.getRouter = () => {
  const testCorrectionRoutes = new TestCorrectionRoutes();
  return testCorrectionRoutes.getRouter();
};