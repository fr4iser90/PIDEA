const express = require("express");

class DevRoutes {
  constructor(middlewareSetup, logger) {
    this.middlewareSetup = middlewareSetup;
    this.logger = logger;
  }

  setupRoutes(app) {
    app.get("/api/dev/build-status", (req, res) => {
      try {
        const buildStatus = this.middlewareSetup.getBuildStatus();
        res.json(buildStatus);
      } catch (error) {
        this.logger.error("Failed to get build status:", error);
        res.status(500).json({
          error: "Failed to get build status",
          details: error.message,
        });
      }
    });

    this.logger.info("Development routes configured");
  }
}

module.exports = DevRoutes;