/**
 * SecurityAnalysisController - Presentation Layer
 * Main security analysis API endpoints
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Main security analysis API endpoints for orchestrating security scans
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  SecurityAnalysisOrchestratorService,
} = require("@application/services/categories/analysis/security");

class SecurityAnalysisController extends BaseController {
  constructor() {
    super("SecurityAnalysis", new SecurityAnalysisOrchestratorService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Security analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
    this.router.get("/results/:id", this.wrapAsync(this.getResults.bind(this), "Get results"));
    this.router.delete("/results/:id", this.wrapAsync(this.deleteResults.bind(this), "Delete results"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      scanners: ["trivy", "snyk", "semgrep", "zap"],
      severity: ["critical", "high", "medium", "low"],
      includeSecrets: true
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      activeScans: 0,
      lastScan: null,
      vulnerabilitiesFound: 0
    });
  }

  async getResults(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.badRequest("Missing result ID", { data: null });
      }

      const results = await this.securityService.getResults(id);

      if (!results) {
        return res.notFound("Results not found", { data: null });
      }

      res.success(results);
    } catch (error) {
      this.logger.error("Failed to get security results", {
        id: req.params.id,
        error: error.message,
      });

      res.error("Failed to get results", 500, { details: error.message });
    }
  }

  async deleteResults(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.badRequest("Missing result ID", { data: null });
      }

      await this.securityService.deleteResults(id);

      res.success({ message: "Results deleted successfully" });
    } catch (error) {
      this.logger.error("Failed to delete security results", {
        id: req.params.id,
        error: error.message,
      });

      res.error("Failed to delete results", 500, { details: error.message });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = SecurityAnalysisController;
