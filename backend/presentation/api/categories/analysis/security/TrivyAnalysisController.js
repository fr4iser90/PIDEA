/**
 * TrivyAnalysisController - Presentation Layer
 * Trivy vulnerability analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Trivy-specific vulnerability analysis API endpoints
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  TrivyAnalysisService,
} = require("@application/services/categories/analysis/security");

class TrivyAnalysisController extends BaseController {
  constructor() {
    super("TrivyAnalysis", new TrivyAnalysisService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Trivy analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      severity: ["critical", "high", "medium", "low"],
      includeOS: true,
      includeLanguages: true
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      activeScans: 0,
      lastScan: null,
      vulnerabilitiesFound: 0
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = TrivyAnalysisController;
