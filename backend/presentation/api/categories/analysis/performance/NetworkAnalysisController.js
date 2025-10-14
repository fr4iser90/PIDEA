/**
 * NetworkAnalysisController - Presentation Layer
 * Network analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Network analysis API endpoints
 */

const express = require("express");
const Logger = require("@logging/Logger");
const {
  NetworkAnalysisService,
} = require("@application/services/categories/analysis/performance");

class NetworkAnalysisController {
  constructor() {
    this.logger = new Logger("NetworkAnalysisController");
    this.networkService = new NetworkAnalysisService();
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
      this.logger.info("Network analysis request received", {
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

      const result = await this.networkService.analyze({
        projectId,
        projectPath,
        config,
      });

      this.logger.info("Network analysis completed", {
        projectId,
        samples: result.data?.samples?.length || 0,
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: "network",
          results: result.data || {},
          metadata: result.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error("Network analysis failed", {
        projectId: req.body.projectId,
        error: error.message,
      });

      res.error("Network analysis failed", 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.networkService.getConfiguration();

      res.success(config);
    } catch (error) {
      this.logger.error("Failed to get network configuration", {
        error: error.message,
      });

      res.error("Failed to get configuration", 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.networkService.getStatus();

      res.success(status);
    } catch (error) {
      this.logger.error("Failed to get network status", {
        error: error.message,
      });

      res.error("Failed to get status", 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = NetworkAnalysisController;
