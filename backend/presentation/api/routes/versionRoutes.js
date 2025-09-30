/**
 * Version Routes - API routes for version management
 * Defines HTTP endpoints for version management operations
 */

const express = require('express');
const VersionController = require('../controllers/VersionController');
const Logger = require('@logging/Logger');

const logger = new Logger('VersionRoutes');
const router = express.Router();

// Initialize controller
const versionController = new VersionController();

// Middleware for request logging
router.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date()
  });
  next();
});

// Middleware for error handling
router.use((error, req, res, next) => {
  logger.error('Route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date()
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  versionController.healthCheck(req, res);
});

// Version management endpoints
router.post('/bump', (req, res) => {
  versionController.bumpVersion(req, res);
});

router.get('/current', (req, res) => {
  versionController.getCurrentVersion(req, res);
});

router.get('/history', (req, res) => {
  versionController.getVersionHistory(req, res);
});

router.post('/validate', (req, res) => {
  versionController.validateVersion(req, res);
});

router.post('/compare', (req, res) => {
  versionController.compareVersions(req, res);
});

router.post('/determine-bump-type', (req, res) => {
  versionController.determineBumpType(req, res);
});

router.get('/latest', (req, res) => {
  versionController.getLatestVersion(req, res);
});

// Configuration endpoints
router.get('/config', (req, res) => {
  versionController.getConfiguration(req, res);
});

router.put('/config', (req, res) => {
  versionController.updateConfiguration(req, res);
});

// Catch-all for undefined routes
router.use('*', (req, res) => {
  logger.warn('Undefined route accessed', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableRoutes: [
      'GET /health',
      'POST /bump',
      'GET /current',
      'GET /history',
      'POST /validate',
      'POST /compare',
      'POST /determine-bump-type',
      'GET /latest',
      'GET /config',
      'PUT /config'
    ],
    timestamp: new Date()
  });
});

module.exports = router;
