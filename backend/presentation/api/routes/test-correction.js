const express = require('express');
const TestCorrectionController = require('../controllers/TestCorrectionController');
const AuthMiddleware = require('../../middleware/AuthMiddleware');
const ValidationMiddleware = require('../../middleware/ValidationMiddleware');
const RateLimitMiddleware = require('../../middleware/RateLimitMiddleware');
const { logger } = require('@infrastructure/logging/Logger');

const router = express.Router();

// Initialize controller
const testCorrectionController = new TestCorrectionController();

// Middleware
const authMiddleware = new AuthMiddleware();
const validationMiddleware = new ValidationMiddleware();
const rateLimitMiddleware = new RateLimitMiddleware();

// Apply rate limiting to all routes
router.use(rateLimitMiddleware.limit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Health check endpoint (no auth required)
router.get('/health', testCorrectionController.healthCheck.bind(testCorrectionController));

// Apply authentication to all other routes
router.use(authMiddleware.authenticate);

// GET /api/test-correction/status
// Get current status of test correction system
router.get('/status', testCorrectionController.getStatus.bind(testCorrectionController));

// POST /api/test-correction/analyze
// Analyze failing tests and create correction tasks
router.post('/analyze', 
  validationMiddleware.validate({
    body: {
      testResults: { type: 'object', required: true },
      options: { type: 'object', required: false }
    }
  }),
  testCorrectionController.analyzeTests.bind(testCorrectionController)
);

// POST /api/test-correction/fix
// Apply fixes to tests
router.post('/fix',
  validationMiddleware.validate({
    body: {
      corrections: { type: 'array', required: true },
      options: { type: 'object', required: false }
    }
  }),
  testCorrectionController.fixTests.bind(testCorrectionController)
);

// POST /api/test-correction/auto-fix
// Run complete auto-fix workflow
router.post('/auto-fix',
  validationMiddleware.validate({
    body: {
      options: { type: 'object', required: false }
    }
  }),
  testCorrectionController.autoFix.bind(testCorrectionController)
);

// POST /api/test-correction/improve-coverage
// Improve test coverage
router.post('/improve-coverage',
  validationMiddleware.validate({
    body: {
      targetCoverage: { type: 'number', min: 0, max: 100, required: false },
      options: { type: 'object', required: false }
    }
  }),
  testCorrectionController.improveCoverage.bind(testCorrectionController)
);

// GET /api/test-correction/coverage
// Get current test coverage
router.get('/coverage',
  validationMiddleware.validate({
    query: {
      scope: { type: 'string', enum: ['all', 'unit', 'integration', 'e2e'], required: false }
    }
  }),
  testCorrectionController.getCoverage.bind(testCorrectionController)
);

// POST /api/test-correction/refactor
// Refactor specific test types
router.post('/refactor',
  validationMiddleware.validate({
    body: {
      refactorType: { type: 'string', enum: ['complex_tests', 'legacy_tests', 'slow_tests', 'all'], required: true },
      scope: { type: 'string', enum: ['all', 'unit', 'integration', 'e2e'], required: false },
      options: { type: 'object', required: false }
    }
  }),
  testCorrectionController.refactorTests.bind(testCorrectionController)
);

// POST /api/test-correction/stop
// Stop all active corrections
router.post('/stop', testCorrectionController.stopCorrections.bind(testCorrectionController));

// GET /api/test-correction/report
// Get test correction report
router.get('/report',
  validationMiddleware.validate({
    query: {
      format: { type: 'string', enum: ['json', 'markdown'], required: false }
    }
  }),
  testCorrectionController.getReport.bind(testCorrectionController)
);

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Test correction route error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: [
      'GET /health',
      'GET /status',
      'POST /analyze',
      'POST /fix',
      'POST /auto-fix',
      'POST /improve-coverage',
      'GET /coverage',
      'POST /refactor',
      'POST /stop',
      'GET /report'
    ]
  });
});

module.exports = router; 