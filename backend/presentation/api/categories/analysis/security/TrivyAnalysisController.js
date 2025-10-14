/**
 * TrivyAnalysisController - Presentation Layer
 * Trivy vulnerability analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Trivy-specific vulnerability analysis API endpoints
 */

const express = require("express");
const Logger = require("@logging/Logger");
const {
  TrivyAnalysisService,
} = require("@application/services/categories/analysis/security");

class TrivyAnalysisController {
  constructor() {
    this.logger = new Logger("TrivyAnalysisController");
    this.trivyService = new TrivyAnalysisService();
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
      this.logger.info("Trivy analysis request received", {
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

      const result = await this.trivyService.analyze({
        projectId,
        projectPath,
        config,
      });

      this.logger.info("Trivy analysis completed", {
        projectId,
        vulnerabilities: result.data?.vulnerabilities?.length || 0,
      });

      res.success({
        data: {
          projectId: projectId,
          timestamp: new Date().toISOString(),
          scanner: "trivy",
          results: result.data || {},
          metadata: result.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error("Trivy analysis failed", {
        projectId: req.body.projectId,
        error: error.message,
      });

      res.error("Trivy analysis failed", 500, { details: error.message });
    }
  }

  async getConfiguration(req, res) {
    try {
      const config = await this.trivyService.getConfiguration();

      res.success(config);
    } catch (error) {
      this.logger.error("Failed to get Trivy configuration", {
        error: error.message,
      });

      res.error("Failed to get configuration", 500, { details: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = await this.trivyService.getStatus();

      res.success(status);
    } catch (error) {
      this.logger.error("Failed to get Trivy status", { error: error.message });

      res.error("Failed to get status", 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = TrivyAnalysisController;
