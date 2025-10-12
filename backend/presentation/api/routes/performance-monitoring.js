/**
 * Performance Monitoring API Routes
 * REST API endpoints for database performance monitoring
 */
const express = require('express');
const PerformanceMonitoringController = require('../PerformanceMonitoringController');

const router = express.Router();

/**
 * Initialize performance monitoring controller
 * @param {Object} databaseConnection - Database connection instance
 * @returns {Object} Express router
 */
function createPerformanceMonitoringRoutes(databaseConnection) {
  const controller = new PerformanceMonitoringController(databaseConnection);

  // GET /api/performance-monitoring/status
  router.get('/status', controller.getStatus.bind(controller));

  // GET /api/performance-monitoring/stats
  router.get('/stats', controller.getStats.bind(controller));

  // GET /api/performance-monitoring/queries/history
  router.get('/queries/history', controller.getQueryHistory.bind(controller));

  // GET /api/performance-monitoring/queries/slow
  router.get('/queries/slow', controller.getSlowQueries.bind(controller));

  // GET /api/performance-monitoring/queries/top-by-time
  router.get('/queries/top-by-time', controller.getTopQueriesByTime.bind(controller));

  // GET /api/performance-monitoring/queries/most-frequent
  router.get('/queries/most-frequent', controller.getMostFrequentQueries.bind(controller));

  // DELETE /api/performance-monitoring/queries/history
  router.delete('/queries/history', controller.clearQueryHistory.bind(controller));

  // DELETE /api/performance-monitoring/cache
  router.delete('/cache', controller.clearQueryCache.bind(controller));

  // GET /api/performance-monitoring/export
  router.get('/export', controller.exportData.bind(controller));

  // POST /api/performance-monitoring/enable
  router.post('/enable', controller.enableMonitoring.bind(controller));

  // POST /api/performance-monitoring/disable
  router.post('/disable', controller.disableMonitoring.bind(controller));

  return router;
}

module.exports = createPerformanceMonitoringRoutes;
