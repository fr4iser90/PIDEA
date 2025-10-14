/**
 * DatabaseAnalysisController - Presentation Layer
 * Database performance analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Database performance analysis API endpoints
 */

const express = require("express");
const Logger = require("@logging/Logger");
const {
  DatabaseAnalysisService,
} = require("@application/services/categories/analysis/performance");

class DatabaseAnalysisController {
  constructor() {
    this.logger = new Logger("DatabaseAnalysisController");
    this.databaseService = new DatabaseAnalysisService();
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.analyze.bind(this));
    this.router.get("/config", this.getConfiguration.bind(this));
    this.router.get("/status", this.getStatus.bind(this));
  }

  async analyze(req, res) {
    try {
      this.logger.info("Database analysis request received", {
        projectId: req.body.projectId,
        userId: req.user?.id,
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest(
          "Missing required parameters: projectId and projectPath",
          { data: null },
        );
      }

      const result = await this.databaseService.analyze({
        projectId,
        projectPath,
        config,
      });

      this.logger.info("Database analysis completed", {
        projectId,
        samples: result.data?.samples?.length || 0,
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: "database",
          results: result.data || {},
          metadata: result.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error("Database analysis failed", {
        projectId: req.body.projectId,
        error: error.message,
      });

      res.error("Database analysis failed", 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.databaseService.getConfiguration();

      res.success(config);
    } catch (error) {
      this.logger.error("Failed to get database configuration", {
        error: error.message,
      });

      res.error("Failed to get configuration", 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.databaseService.getStatus();

      res.success(status);
    } catch (error) {
      this.logger.error("Failed to get database status", {
        error: error.message,
      });

      res.error("Failed to get status", 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = DatabaseAnalysisController;
