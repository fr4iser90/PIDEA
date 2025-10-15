const express = require("express");
const TestCorrectionController = require("../controllers/TestCorrectionController");
const AuthMiddleware = require("@infrastructure/auth/AuthMiddleware");
const Logger = require("@logging/Logger");
const logger = new Logger("Logger");

const router = express.Router();

// Initialize controller with default dependencies
const testCorrectionController = new TestCorrectionController();

// Middleware
const authMiddleware = new AuthMiddleware();

// Health check endpoint (no auth required)
router.get(
  "/health",
  testCorrectionController.healthCheck.bind(testCorrectionController),
);

// Apply authentication to all other routes
router.use(authMiddleware.authenticate);

// GET /api/test-correction/status
// Get current status of test correction system
router.get(
  "/status",
  testCorrectionController.getStatus.bind(testCorrectionController),
);

// POST /api/test-correction/analyze
// Analyze failing tests and create correction tasks
router.post(
  "/analyze",
  testCorrectionController.analyzeTests.bind(testCorrectionController),
);

// POST /api/test-correction/fix
// Apply fixes to tests
router.post(
  "/fix",
  testCorrectionController.fixTests.bind(testCorrectionController),
);

// POST /api/test-correction/auto-fix
// Run complete auto-fix workflow
router.post(
  "/auto-fix",
  testCorrectionController.autoFix.bind(testCorrectionController),
);

// POST /api/test-correction/improve-coverage
// Improve test coverage
router.post(
  "/improve-coverage",
  testCorrectionController.improveCoverage.bind(testCorrectionController),
);

// GET /api/test-correction/coverage
// Get current test coverage
router.get(
  "/coverage",
  testCorrectionController.getCoverage.bind(testCorrectionController),
);

// POST /api/test-correction/refactor
// Refactor specific test types
router.post(
  "/refactor",
  testCorrectionController.refactorTests.bind(testCorrectionController),
);

// POST /api/test-correction/stop
// Stop all active corrections
router.post(
  "/stop",
  testCorrectionController.stopCorrections.bind(testCorrectionController),
);

// GET /api/test-correction/report
// Get test correction report
router.get(
  "/report",
  testCorrectionController.getReport.bind(testCorrectionController),
);

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error("Test correction route error", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.error("Internal server error", 500, {
    details:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler for undefined routes
router.use("*", (req, res) => {
  res.notFound("Route not found", {
    availableRoutes: [
      "GET /health",
      "GET /status",
      "POST /analyze",
      "POST /fix",
      "POST /auto-fix",
      "POST /improve-coverage",
      "GET /coverage",
      "POST /refactor",
      "POST /stop",
      "GET /report",
    ],
  });
});

module.exports = router;

// Export getRouter function for route registry
module.exports.getRouter = () => router;
