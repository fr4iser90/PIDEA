const Logger = require('@logging/Logger');
const logger = new Logger('SessionController');

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
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      logger.info('Session extension request', {
        userId: user.id,
        sessionId: session.id
      });

      const result = await this.sessionActivityService.extendSession(
        session.id, 
        'manual'
      );

      res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          expiresAt: result.expiresAt,
          extensionCount: result.extensionCount
        }
      });

    } catch (error) {
      logger.error('Session extension failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to extend session'
      });
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
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const stats = await this.sessionActivityService.getSessionActivityStats(session.id);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get session status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session status'
      });
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
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { type, details, duration } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      const activity = await this.sessionActivityService.recordActivity(session.id, {
        type,
        details,
        duration,
        userAgent,
        ipAddress
      });

      res.json({
        success: true,
        data: activity
      });

    } catch (error) {
      logger.error('Failed to record activity:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to record activity'
      });
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
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { timeRange } = req.query;
      const rangeMs = timeRange ? parseInt(timeRange) : 24 * 60 * 60 * 1000; // 24 hours default

      const analytics = await this.sessionActivityService.getUserActivityStats(
        user.id, 
        rangeMs
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to get session analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session analytics'
      });
    }
  }

  /**
   * GET /api/session/monitor
   * Get monitoring data for admin
   */
  async getMonitoringData(req, res) {
    try {
      const { user } = req;
      
      if (!user || !user.hasPermission('admin:monitor')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permission required'
        });
      }

      const status = this.sessionActivityService.getStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get monitoring data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get monitoring data'
      });
    }
  }

  /**
   * POST /api/session/cleanup
   * Trigger manual session cleanup
   */
  async triggerCleanup(req, res) {
    try {
      const { user } = req;
      
      if (!user || !user.hasPermission('admin:cleanup')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permission required'
        });
      }

      const result = await this.sessionActivityService.cleanupExpiredSessions();

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to trigger cleanup:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger cleanup'
      });
    }
  }

  /**
   * PUT /api/session/config
   * Update session configuration
   */
  async updateConfig(req, res) {
    try {
      const { user } = req;
      
      if (!user || !user.hasPermission('admin:config')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permission required'
        });
      }

      const { config } = req.body;
      
      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration data'
        });
      }

      this.sessionActivityService.updateConfig(config);

      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update configuration'
      });
    }
  }

  /**
   * GET /api/session/health
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const status = this.sessionActivityService.getStatus();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: status
        }
      });

    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Service unhealthy'
      });
    }
  }
}

module.exports = SessionController;




