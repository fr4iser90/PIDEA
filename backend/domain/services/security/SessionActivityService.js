const Logger = require('@logging/Logger');
const logger = new Logger('SessionActivityService');

/**
 * SessionActivityService - Backend service for session activity tracking and management
 * 
 * Features:
 * - Session activity logging
 * - Activity-based session extension
 * - Session analytics and reporting
 * - Session cleanup and maintenance
 * - Performance monitoring
 */
class SessionActivityService {
  constructor(dependencies = {}) {
    this.userSessionRepository = dependencies.userSessionRepository;
    this.eventBus = dependencies.eventBus;
    this.config = dependencies.config || {};
    
    // Activity tracking configuration
    this.activityThreshold = this.config.activityThreshold || 30 * 1000; // 30 seconds
    this.sessionTimeout = this.config.sessionTimeout || 15 * 60 * 1000; // 15 minutes
    this.extensionThreshold = this.config.extensionThreshold || 5 * 60 * 1000; // 5 minutes
    this.maxExtensions = this.config.maxExtensions || 10; // Max extensions per session
    
    // Activity storage
    this.activityCache = new Map(); // sessionId -> activity data
    this.extensionCounts = new Map(); // sessionId -> extension count
    
    // Cleanup intervals
    this.cleanupInterval = null;
    this.analyticsInterval = null;
    
    logger.info('SessionActivityService initialized');
  }

  /**
   * Start the service
   */
  start() {
    this.startCleanupTasks();
    this.startAnalyticsTasks();
    logger.info('SessionActivityService started');
  }

  /**
   * Stop the service
   */
  stop() {
    this.stopCleanupTasks();
    this.stopAnalyticsTasks();
    logger.info('SessionActivityService stopped');
  }

  /**
   * Record user activity for a session
   */
  async recordActivity(sessionId, activityData = {}) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const now = Date.now();
      const activity = {
        sessionId,
        timestamp: now,
        type: activityData.type || 'general',
        details: activityData.details || {},
        userAgent: activityData.userAgent,
        ipAddress: activityData.ipAddress,
        duration: activityData.duration || 0
      };

      // Store in cache
      this.activityCache.set(sessionId, {
        ...this.activityCache.get(sessionId),
        lastActivity: now,
        activityCount: (this.activityCache.get(sessionId)?.activityCount || 0) + 1,
        totalDuration: (this.activityCache.get(sessionId)?.totalDuration || 0) + activity.duration
      });

      // Log activity
      logger.debug('Activity recorded', {
        sessionId,
        type: activity.type,
        timestamp: new Date(now).toISOString()
      });

      // Emit activity event
      this.eventBus?.emit('session-activity', activity);

      // Check if session should be extended
      await this.checkSessionExtension(sessionId);

      return activity;

    } catch (error) {
      logger.error('Failed to record activity:', error);
      throw error;
    }
  }

  /**
   * Check if session should be extended based on activity
   */
  async checkSessionExtension(sessionId) {
    try {
      const session = await this.userSessionRepository.findById(sessionId);
      if (!session) {
        logger.warn(`Session ${sessionId} not found for extension check`);
        return false;
      }

      const activityData = this.activityCache.get(sessionId);
      if (!activityData) {
        return false;
      }

      const timeSinceLastActivity = Date.now() - activityData.lastActivity;
      const timeUntilExpiry = session.expiresAt.getTime() - Date.now();

      // Check if session is close to expiry and user is active
      if (timeUntilExpiry <= this.extensionThreshold && timeSinceLastActivity <= this.activityThreshold) {
        const extensionCount = this.extensionCounts.get(sessionId) || 0;
        
        if (extensionCount < this.maxExtensions) {
          await this.extendSession(sessionId, 'activity-based');
          return true;
        } else {
          logger.warn(`Session ${sessionId} has reached maximum extensions`);
        }
      }

      return false;

    } catch (error) {
      logger.error('Failed to check session extension:', error);
      return false;
    }
  }

  /**
   * Extend session based on activity
   */
  async extendSession(sessionId, reason = 'manual') {
    try {
      const session = await this.userSessionRepository.findById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Calculate new expiry time
      const now = Date.now();
      const newExpiryTime = now + this.sessionTimeout;
      const newExpiresAt = new Date(newExpiryTime);

      // Update session
      session.expiresAt = newExpiresAt;
      session.updateLastActivity();
      
      await this.userSessionRepository.save(session);

      // Update extension count
      const currentCount = this.extensionCounts.get(sessionId) || 0;
      this.extensionCounts.set(sessionId, currentCount + 1);

      logger.info('Session extended', {
        sessionId,
        reason,
        newExpiryTime: newExpiresAt.toISOString(),
        extensionCount: currentCount + 1
      });

      // Emit session extended event
      this.eventBus?.emit('session-extended', {
        sessionId,
        userId: session.userId,
        expiresAt: newExpiresAt,
        reason
      });

      return {
        sessionId,
        expiresAt: newExpiresAt,
        extensionCount: currentCount + 1
      };

    } catch (error) {
      logger.error('Failed to extend session:', error);
      throw error;
    }
  }

  /**
   * Get session activity statistics
   */
  async getSessionActivityStats(sessionId) {
    try {
      const activityData = this.activityCache.get(sessionId);
      const session = await this.userSessionRepository.findById(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const extensionCount = this.extensionCounts.get(sessionId) || 0;
      const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
      const sessionDuration = Date.now() - session.createdAt.getTime();

      return {
        sessionId,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        timeUntilExpiry,
        sessionDuration,
        activityCount: activityData?.activityCount || 0,
        totalDuration: activityData?.totalDuration || 0,
        lastActivity: activityData?.lastActivity ? new Date(activityData.lastActivity) : null,
        extensionCount,
        isActive: timeUntilExpiry > 0
      };

    } catch (error) {
      logger.error('Failed to get session activity stats:', error);
      throw error;
    }
  }

  /**
   * Get user activity statistics
   */
  async getUserActivityStats(userId, timeRange = 24 * 60 * 60 * 1000) {
    try {
      const sessions = await this.userSessionRepository.findByUserId(userId);
      const cutoffTime = Date.now() - timeRange;
      
      const recentSessions = sessions.filter(session => 
        session.createdAt.getTime() > cutoffTime
      );

      let totalActivity = 0;
      let totalDuration = 0;
      let totalExtensions = 0;

      for (const session of recentSessions) {
        const activityData = this.activityCache.get(session.id);
        if (activityData) {
          totalActivity += activityData.activityCount || 0;
          totalDuration += activityData.totalDuration || 0;
        }
        
        const extensionCount = this.extensionCounts.get(session.id) || 0;
        totalExtensions += extensionCount;
      }

      return {
        userId,
        timeRange,
        sessionCount: recentSessions.length,
        totalActivity,
        totalDuration,
        totalExtensions,
        averageSessionDuration: recentSessions.length > 0 ? totalDuration / recentSessions.length : 0,
        averageActivityPerSession: recentSessions.length > 0 ? totalActivity / recentSessions.length : 0
      };

    } catch (error) {
      logger.error('Failed to get user activity stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions and old activity data
   */
  async cleanupExpiredSessions() {
    try {
      const now = Date.now();
      const expiredSessions = [];
      const cleanedActivity = [];

      // Clean up activity cache
      for (const [sessionId, activityData] of this.activityCache.entries()) {
        const session = await this.userSessionRepository.findById(sessionId);
        
        if (!session || session.expiresAt.getTime() < now) {
          this.activityCache.delete(sessionId);
          this.extensionCounts.delete(sessionId);
          cleanedActivity.push(sessionId);
          
          if (session) {
            expiredSessions.push(sessionId);
          }
        }
      }

      logger.info('Session cleanup completed', {
        expiredSessions: expiredSessions.length,
        cleanedActivity: cleanedActivity.length
      });

      return {
        expiredSessions,
        cleanedActivity
      };

    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      throw error;
    }
  }

  /**
   * Start cleanup tasks
   */
  startCleanupTasks() {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        logger.error('Cleanup task failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup tasks
   */
  stopCleanupTasks() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Start analytics tasks
   */
  startAnalyticsTasks() {
    // Analytics every hour
    this.analyticsInterval = setInterval(async () => {
      try {
        await this.generateAnalyticsReport();
      } catch (error) {
        logger.error('Analytics task failed:', error);
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Stop analytics tasks
   */
  stopAnalyticsTasks() {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
  }

  /**
   * Generate analytics report
   */
  async generateAnalyticsReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        activeSessions: this.activityCache.size,
        totalExtensions: Array.from(this.extensionCounts.values()).reduce((sum, count) => sum + count, 0),
        averageActivityPerSession: 0,
        topActiveSessions: []
      };

      // Calculate average activity
      let totalActivity = 0;
      for (const activityData of this.activityCache.values()) {
        totalActivity += activityData.activityCount || 0;
      }
      report.averageActivityPerSession = this.activityCache.size > 0 ? totalActivity / this.activityCache.size : 0;

      // Get top active sessions
      const sessionActivities = Array.from(this.activityCache.entries())
        .map(([sessionId, data]) => ({ sessionId, activityCount: data.activityCount || 0 }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10);

      report.topActiveSessions = sessionActivities;

      logger.info('Analytics report generated', report);

      // Emit analytics event
      this.eventBus?.emit('session-analytics', report);

      return report;

    } catch (error) {
      logger.error('Failed to generate analytics report:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.cleanupInterval !== null,
      activeSessions: this.activityCache.size,
      totalExtensions: Array.from(this.extensionCounts.values()).reduce((sum, count) => sum + count, 0),
      config: {
        activityThreshold: this.activityThreshold,
        sessionTimeout: this.sessionTimeout,
        extensionThreshold: this.extensionThreshold,
        maxExtensions: this.maxExtensions
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.activityThreshold) {
      this.activityThreshold = newConfig.activityThreshold;
    }
    if (newConfig.sessionTimeout) {
      this.sessionTimeout = newConfig.sessionTimeout;
    }
    if (newConfig.extensionThreshold) {
      this.extensionThreshold = newConfig.extensionThreshold;
    }
    if (newConfig.maxExtensions) {
      this.maxExtensions = newConfig.maxExtensions;
    }

    logger.info('Configuration updated', newConfig);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.activityCache.clear();
    this.extensionCounts.clear();
    logger.info('SessionActivityService destroyed');
  }
}

module.exports = SessionActivityService;




