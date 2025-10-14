/**
 * ZapAnalysisController - Presentation Layer
 * ZAP web security testing API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: ZAP-specific web security testing API endpoints
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  ZapAnalysisService,
} = require("@application/services/categories/analysis/security");

class ZapAnalysisController extends BaseController {
  constructor() {
    super("ZapAnalysis", new ZapAnalysisService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Zap analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      severity: ["critical", "high", "medium", "low"],
      includeWebApps: true,
      includeAPIs: true
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

module.exports = ZapAnalysisController;
