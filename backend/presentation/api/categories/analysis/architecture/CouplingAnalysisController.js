/**
 * CouplingAnalysisController - Presentation Layer
 * Component coupling analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Component coupling analysis API endpoints
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  CouplingAnalysisService,
} = require("@application/services/categories/analysis/architecture");

class CouplingAnalysisController extends BaseController {
  constructor() {
    super("CouplingAnalysis", new CouplingAnalysisService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Coupling analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      metrics: ["afferent", "efferent", "instability"],
      depth: 3,
      includeMetrics: true
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      activeAnalyses: 0,
      lastAnalysis: null,
      couplingViolations: 0
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = CouplingAnalysisController;
