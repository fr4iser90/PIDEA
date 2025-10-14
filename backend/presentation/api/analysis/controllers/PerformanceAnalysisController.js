/**
 * PerformanceAnalysisController - Presentation Layer
 * Main performance analysis API endpoints
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Main performance analysis API endpoints for orchestrating performance monitoring
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  PerformanceAnalysisOrchestratorService,
} = require("@application/services/categories/analysis/performance");

class PerformanceAnalysisController extends BaseController {
  constructor() {
    super("PerformanceAnalysis", new PerformanceAnalysisOrchestratorService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Performance analysis"));
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
      metrics: ["cpu", "memory", "network", "database"],
      samplingInterval: 1000,
      duration: 30000
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      activeAnalyses: 0,
      lastAnalysis: null
    });
  }

  async getResults(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.badRequest("Missing result ID");
      }

      const results = await this.service.getResults(id);

      if (!results) {
        return res.notFound("Results not found");
      }

      res.success(results);
    } catch (error) {
      this.logger.error("Failed to get performance results", {
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
        return res.badRequest("Missing result ID");
      }

      await this.service.deleteResults(id);

      res.success({ message: "Results deleted successfully" });
    } catch (error) {
      this.logger.error("Failed to delete performance results", {
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

module.exports = PerformanceAnalysisController;
