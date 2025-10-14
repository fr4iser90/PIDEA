/**
 * CpuAnalysisController - Presentation Layer
 * CPU analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: CPU analysis API endpoints
 */

const express = require("express");
const Logger = require("@logging/Logger");
const {
  CpuAnalysisService,
} = require("@application/services/categories/analysis/performance");

class CpuAnalysisController {
  constructor() {
    this.logger = new Logger("CpuAnalysisController");
    this.cpuService = new CpuAnalysisService();
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
      this.logger.info("CPU analysis request received", {
        projectId: req.body.projectId,
        userId: req.user?.id,
      });

      const { projectId, projectPath, config = {} } = req.body;

      if (!projectId || !projectPath) {
        return res.badRequest(
          "Missing required parameters: projectId and projectPath",
        );
      }

      const result = await this.cpuService.analyze({
        projectId,
        projectPath,
        config,
      });

      this.logger.info("CPU analysis completed", {
        projectId,
        samples: result.data?.samples?.length || 0,
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: "cpu",
          results: result.data || {},
          metadata: result.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error("CPU analysis failed", {
        projectId: req.body.projectId,
        error: error.message,
      });

      res.error("CPU analysis failed", 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.cpuService.getConfiguration();

      res.success(config);
    } catch (error) {
      this.logger.error("Failed to get CPU configuration", {
        error: error.message,
      });

      res.error("Failed to get configuration", 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.cpuService.getStatus();

      res.success(status);
    } catch (error) {
      this.logger.error("Failed to get CPU status", { error: error.message });

      res.error("Failed to get status", 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = CpuAnalysisController;
