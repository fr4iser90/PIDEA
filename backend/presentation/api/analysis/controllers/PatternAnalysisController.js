/**
 * PatternAnalysisController - Presentation Layer
 * Code pattern analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Code pattern analysis API endpoints
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  PatternAnalysisService,
} = require("@application/services/categories/analysis/architecture");

class PatternAnalysisController extends BaseController {
  constructor() {
    super("PatternAnalysis", new PatternAnalysisService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Pattern analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      patterns: ["singleton", "factory", "observer", "strategy"],
      depth: 3,
      includeTests: true
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      patternsDetected: 0,
      lastAnalysis: null
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = PatternAnalysisController;
