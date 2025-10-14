/**
 * LayerAnalysisController - Presentation Layer
 * Layer organization analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Layer organization analysis API endpoints
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  LayerAnalysisService,
} = require("@application/services/categories/analysis/architecture");

class LayerAnalysisController extends BaseController {
  constructor() {
    super("LayerAnalysis", new LayerAnalysisService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Layer analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      layers: ["presentation", "application", "domain", "infrastructure"],
      depth: 5,
      includeMetrics: true
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      activeAnalyses: 0,
      lastAnalysis: null,
      layerViolations: 0
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = LayerAnalysisController;
