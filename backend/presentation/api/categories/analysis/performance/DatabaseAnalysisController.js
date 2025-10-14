/**
 * DatabaseAnalysisController - Presentation Layer
 * Database performance analysis API
 *
 * Created: [RUN: date -u +"%Y-%m-%dT%H:%M:%S.000Z"]
 * Purpose: Database performance analysis API endpoints
 */

const express = require("express");
const BaseController = require("@infrastructure/api/BaseController");
const {
  DatabaseAnalysisService,
} = require("@application/services/categories/analysis/performance");

class DatabaseAnalysisController extends BaseController {
  constructor() {
    super("DatabaseAnalysis", new DatabaseAnalysisService());
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post("/analyze", this.wrapAsync(this.analyze.bind(this), "Database analysis"));
    this.router.get("/config", this.wrapAsync(this.getConfiguration.bind(this), "Get configuration"));
    this.router.get("/status", this.wrapAsync(this.getStatus.bind(this), "Get status"));
  }

  async analyze(req, res) {
    await this.handleAnalysis(req, res, this.service.analyze.bind(this.service));
  }

  async getConfiguration(req, res) {
    await this.handleGetConfiguration(req, res, {
      samplingInterval: 1000,
      duration: 30000,
      includeQueries: true
    });
  }

  async getStatus(req, res) {
    await this.handleGetStatus(req, res, {
      activeMonitoring: false,
      lastSample: null
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = DatabaseAnalysisController;
