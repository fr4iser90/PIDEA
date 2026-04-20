const express = require("express");

/**
 * REST routes for AgentLayer / external orchestrators (service API key auth).
 */
class IntegrationRoutes {
  constructor(integrationJobsController) {
    this.controller = integrationJobsController;
  }

  setupRoutes(app) {
    app.post("/api/v1/integration/jobs", (req, res) =>
      this.controller.createJob(req, res),
    );
    app.get("/api/v1/integration/jobs/:jobId", (req, res) =>
      this.controller.getJob(req, res),
    );
    app.post("/api/v1/integration/jobs/:jobId/cancel", (req, res) =>
      this.controller.cancelJob(req, res),
    );
    app.put("/api/v1/integration/webhook", (req, res) =>
      this.controller.registerWebhook(req, res),
    );
    app.get("/api/v1/integration/webhook", (req, res) =>
      this.controller.getWebhookConfig(req, res),
    );
  }

  getRouter() {
    const router = express.Router();
    this.setupRoutes(router);
    return router;
  }
}

module.exports = IntegrationRoutes;
