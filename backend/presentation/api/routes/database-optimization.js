/**
 * Database Optimization API Routes
 * Handles database optimization endpoints
 */
const express = require("express");
const DatabaseOptimizationController = require("../tools/controllers/DatabaseOptimizationController");

function createDatabaseOptimizationRoutes(databaseOptimizationService) {
  const router = express.Router();
  const controller = new DatabaseOptimizationController(
    databaseOptimizationService,
  );

  // Database optimization endpoints
  router.post("/optimize", controller.optimizeDatabase.bind(controller));
  router.get(
    "/recommendations",
    controller.getOptimizationRecommendations.bind(controller),
  );
  router.get("/status", controller.getOptimizationStatus.bind(controller));
  router.post("/schedule", controller.scheduleOptimization.bind(controller));
  router.delete(
    "/schedule/:scheduleId",
    controller.cancelOptimization.bind(controller),
  );
  router.get("/history", controller.getOptimizationHistory.bind(controller));
  router.get("/metrics", controller.getOptimizationMetrics.bind(controller));

  return router;
}

module.exports = createDatabaseOptimizationRoutes;
