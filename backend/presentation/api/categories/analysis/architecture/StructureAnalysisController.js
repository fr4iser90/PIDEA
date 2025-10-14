/**
 * StructureAnalysisController - Presentation Layer
 * Project structure analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Project structure analysis API endpoints
 */

const express = require("express");
const Logger = require("@logging/Logger");
const {
  StructureAnalysisService,
} = require("@application/services/categories/analysis/architecture");

class StructureAnalysisController {
  constructor() {
    this.logger = new Logger("StructureAnalysisController");
    this.structureService = new StructureAnalysisService();
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
      this.logger.info("Structure analysis request received", {
        projectId: req.body.projectId,
        userId: req.user?.id,
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest(
          "Missing required parameters: projectId and projectPath",
        );
      }

      const result = await this.structureService.analyze({
        projectId,
        projectPath,
        config,
      });

      this.logger.info("Structure analysis completed", {
        projectId,
        summary: result.data?.summary || {},
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: "structure",
          results: result.data || {},
          metadata: result.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error("Structure analysis failed", {
        projectId: req.body.projectId,
        error: error.message,
      });

      res.error("Structure analysis failed", 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.structureService.getConfiguration();

      res.success(config);
    } catch (error) {
      this.logger.error("Failed to get structure analysis configuration", {
        error: error.message,
      });

      res.error("Failed to get configuration", 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.structureService.getStatus();

      res.success(status);
    } catch (error) {
      this.logger.error("Failed to get structure analysis status", {
        error: error.message,
      });

      res.error("Failed to get status", 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = StructureAnalysisController;
