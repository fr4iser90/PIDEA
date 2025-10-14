const Logger = require("@logging/Logger");
const logger = new Logger("SessionController");

/**
 * SessionController - API controller for session management endpoints
 *
 * Features:
 * - Session extension API
 * - Session monitoring API
 * - Session analytics API
 * - Activity tracking API
 * - Session cleanup API
 */
class SessionController {
  constructor(dependencies = {}) {
    this.sessionActivityService = dependencies.sessionActivityService;
    this.authService = dependencies.authService;
    this.userSessionRepository = dependencies.userSessionRepository;
  }

  /**
   * POST /api/session/extend
   * Extend current session
   */
  async extendSession(req, res) {
    try {
      const { user, session } = req;

      if (!user || !session) {
        return res.unauthorized("Authentication required");
      }

      logger.info("Session extension request", {
        userId: user.id,
        sessionId: session.id,
      });

      const result = await this.sessionActivityService.extendSession(
        session.id,
        "manual",
      );

      res.success({
        sessionId: result.sessionId,
        expiresAt: result.expiresAt,
        extensionCount: result.extensionCount,
      });
    } catch (error) {
      logger.error("Session extension failed:", error);
      res.error(error.message || "Failed to extend session", 500);
    }
  }

  /**
   * GET /api/session/status
   * Get current session status
   */
  async getSessionStatus(req, res) {
    try {
      const { user, session } = req;

      if (!user || !session) {
        return res.unauthorized("Authentication required");
      }

      const stats = await this.sessionActivityService.getSessionActivityStats(
        session.id,
      );

      res.success(stats);
    } catch (error) {
      logger.error("Failed to get session status:", error);
      res.error(error.message || "Failed to get session status", 500);
    }
  }

  /**
   * POST /api/session/activity
   * Record user activity
   */
  async recordActivity(req, res) {
    try {
      const { user, session } = req;

      if (!user || !session) {
        return res.unauthorized("Authentication required");
      }

      const { type, details, duration } = req.body;
      const userAgent = req.get("User-Agent");
      const ipAddress = req.ip || req.connection.remoteAddress;

      const activity = await this.sessionActivityService.recordActivity(
        session.id,
        {
          type,
          details,
          duration,
          userAgent,
          ipAddress,
        },
      );

      res.success(activity);
    } catch (error) {
      logger.error("Failed to record activity:", error);
      res.error(error.message || "Failed to record activity", 500);
    }
  }

  /**
   * GET /api/session/analytics
   * Get session analytics for user
   */
  async getSessionAnalytics(req, res) {
    try {
      const { user } = req;

      if (!user) {
        return res.unauthorized("Authentication required");
      }

      const { timeRange } = req.query;
      const rangeMs = timeRange ? parseInt(timeRange) : 24 * 60 * 60 * 1000; // 24 hours default

      const analytics = await this.sessionActivityService.getUserActivityStats(
        user.id,
        rangeMs,
      );

      res.success(analytics);
    } catch (error) {
      logger.error("Failed to get session analytics:", error);
      res.error(error.message || "Failed to get session analytics", 500);
    }
  }

  /**
   * GET /api/session/monitor
   * Get monitoring data for admin
   */
  async getMonitoringData(req, res) {
    try {
      const { user } = req;

      if (!user || !user.hasPermission("admin:monitor")) {
        return res.forbidden("Admin permission required");
      }

      const status = this.sessionActivityService.getStatus();

      res.success(status);
    } catch (error) {
      logger.error("Failed to get monitoring data:", error);
      res.error(error.message || "Failed to get monitoring data", 500);
    }
  }

  /**
   * POST /api/session/cleanup
   * Trigger manual session cleanup
   */
  async triggerCleanup(req, res) {
    try {
      const { user } = req;

      if (!user || !user.hasPermission("admin:cleanup")) {
        return res.forbidden("Admin permission required");
      }

      const result = await this.sessionActivityService.cleanupExpiredSessions();

      res.success(result);
    } catch (error) {
      logger.error("Failed to trigger cleanup:", error);
      res.error(error.message || "Failed to trigger cleanup", 500);
    }
  }

  /**
   * PUT /api/session/config
   * Update session configuration
   */
  async updateConfig(req, res) {
    try {
      const { user } = req;

      if (!user || !user.hasPermission("admin:config")) {
        return res.forbidden("Admin permission required");
      }

      const { config } = req.body;

      if (!config || typeof config !== "object") {
        return res.badRequest("Invalid configuration data");
      }

      this.sessionActivityService.updateConfig(config);

      res.success({ message: "Configuration updated successfully" });
    } catch (error) {
      logger.error("Failed to update config:", error);
      res.error(error.message || "Failed to update configuration", 500);
    }
  }

  /**
   * GET /api/session/health
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const status = this.sessionActivityService.getStatus();

      res.success({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: status,
      });
    } catch (error) {
      logger.error("Health check failed:", error);
      res.error("Service unhealthy", 500);
    }
  }
}

module.exports = SessionController;
