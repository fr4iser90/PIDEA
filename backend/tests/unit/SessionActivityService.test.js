const Logger = require('@logging/Logger');
const logger = new Logger('SessionActivityService');

// Mock dependencies for testing
const mockUserSessionRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserId: jest.fn()
};

const mockEventBus = {
  emit: jest.fn()
};

describe('SessionActivityService', () => {
  let sessionActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    const dependencies = {
      userSessionRepository: mockUserSessionRepository,
      eventBus: mockEventBus,
      config: {
        activityThreshold: 30 * 1000,
        sessionTimeout: 15 * 60 * 1000,
        extensionThreshold: 5 * 60 * 1000,
        maxExtensions: 10
      }
    };
    
    sessionActivityService = new (require('../../domain/services/security/SessionActivityService'))(dependencies);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (sessionActivityService) {
      sessionActivityService.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(sessionActivityService.activityThreshold).toBe(30 * 1000);
      expect(sessionActivityService.sessionTimeout).toBe(15 * 60 * 1000);
      expect(sessionActivityService.extensionThreshold).toBe(5 * 60 * 1000);
      expect(sessionActivityService.maxExtensions).toBe(10);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        activityThreshold: 60 * 1000,
        sessionTimeout: 30 * 60 * 1000,
        extensionThreshold: 10 * 60 * 1000,
        maxExtensions: 5
      };
      
      const service = new (require('../../domain/services/security/SessionActivityService'))({
        userSessionRepository: mockUserSessionRepository,
        eventBus: mockEventBus,
        config: customConfig
      });
      
      expect(service.activityThreshold).toBe(customConfig.activityThreshold);
      expect(service.sessionTimeout).toBe(customConfig.sessionTimeout);
      expect(service.extensionThreshold).toBe(customConfig.extensionThreshold);
      expect(service.maxExtensions).toBe(customConfig.maxExtensions);
    });

    it('should start cleanup tasks on initialization', () => {
      const mockStartCleanupTasks = jest.spyOn(sessionActivityService, 'startCleanupTasks');
      
      sessionActivityService.start();
      
      expect(mockStartCleanupTasks).toHaveBeenCalled();
    });
  });

  describe('Activity Recording', () => {
    it('should record activity successfully', async () => {
      const sessionId = 'session-1';
      const activityData = {
        type: 'mouse-move',
        details: { x: 100, y: 200 },
        duration: 1000
      };
      
      const result = await sessionActivityService.recordActivity(sessionId, activityData);
      
      expect(result).toEqual({
        sessionId,
        timestamp: expect.any(Number),
        type: 'mouse-move',
        details: { x: 100, y: 200 },
        duration: 1000
      });
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('session-activity', expect.any(Object));
    });

    it('should throw error for missing session ID', async () => {
      await expect(sessionActivityService.recordActivity(null, {})).rejects.toThrow('Session ID is required');
    });

    it('should update activity cache', async () => {
      const sessionId = 'session-1';
      
      await sessionActivityService.recordActivity(sessionId, { type: 'click' });
      await sessionActivityService.recordActivity(sessionId, { type: 'scroll' });
      
      const cachedActivity = sessionActivityService.activityCache.get(sessionId);
      
      expect(cachedActivity.activityCount).toBe(2);
      expect(cachedActivity.lastActivity).toBeGreaterThan(0);
    });

    it('should handle activity recording errors', async () => {
      mockEventBus.emit.mockImplementation(() => {
        throw new Error('Event bus error');
      });
      
      await expect(sessionActivityService.recordActivity('session-1', {})).rejects.toThrow('Event bus error');
    });
  });

  describe('Session Extension', () => {
    beforeEach(() => {
      mockUserSessionRepository.findById.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isActive: () => true
      });
    });

    it('should extend session when activity threshold is met', async () => {
      const sessionId = 'session-1';
      
      // Record activity that meets threshold
      await sessionActivityService.recordActivity(sessionId, { type: 'activity' });
      
      // Advance time to trigger extension check
      jest.advanceTimersByTime(35 * 1000);
      
      const result = await sessionActivityService.checkSessionExtension(sessionId);
      
      expect(result).toBeDefined();
      expect(result.shouldExtend).toBe(true);
    });

    it('should not extend session when threshold not met', async () => {
      const sessionId = 'session-1';
      
      // Record minimal activity
      await sessionActivityService.recordActivity(sessionId, { type: 'minimal' });
      
      // Don't advance time enough
      jest.advanceTimersByTime(10 * 1000);
      
      const result = await sessionActivityService.checkSessionExtension(sessionId);
      
      expect(result.shouldExtend).toBe(false);
    });

    it('should respect maximum extension limit', async () => {
      const sessionId = 'session-1';
      
      // Set extension count to max
      sessionActivityService.extensionCounts.set(sessionId, 10);
      
      const result = await sessionActivityService.checkSessionExtension(sessionId);
      
      expect(result.shouldExtend).toBe(false);
      expect(result.reason).toBe('Maximum extensions reached');
    });

    it('should handle session extension errors', async () => {
      mockUserSessionRepository.findById.mockRejectedValue(new Error('Database error'));
      
      await expect(sessionActivityService.checkSessionExtension('session-1')).rejects.toThrow('Database error');
    });
  });

  describe('Session Analytics', () => {
    it('should get session activity stats', async () => {
      const sessionId = 'session-1';
      
      // Record some activities
      await sessionActivityService.recordActivity(sessionId, { type: 'click', duration: 1000 });
      await sessionActivityService.recordActivity(sessionId, { type: 'scroll', duration: 2000 });
      
      const stats = await sessionActivityService.getSessionActivityStats(sessionId);
      
      expect(stats).toEqual({
        sessionId,
        activityCount: 2,
        totalDuration: 3000,
        lastActivity: expect.any(Number),
        averageActivityInterval: expect.any(Number)
      });
    });

    it('should get user activity stats', async () => {
      const userId = 'user-1';
      const timeRange = 24 * 60 * 60 * 1000; // 24 hours
      
      mockUserSessionRepository.findByUserId.mockResolvedValue([
        { id: 'session-1', userId, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        { id: 'session-2', userId, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) }
      ]);
      
      const stats = await sessionActivityService.getUserActivityStats(userId, timeRange);
      
      expect(stats).toEqual({
        userId,
        sessionCount: 2,
        totalActivityTime: expect.any(Number),
        averageSessionDuration: expect.any(Number),
        timeRange
      });
    });

    it('should handle missing session stats', async () => {
      const stats = await sessionActivityService.getSessionActivityStats('nonexistent-session');
      
      expect(stats).toEqual({
        sessionId: 'nonexistent-session',
        activityCount: 0,
        totalDuration: 0,
        lastActivity: null,
        averageActivityInterval: 0
      });
    });
  });

  describe('Session Cleanup', () => {
    it('should cleanup expired sessions', async () => {
      const expiredSession = {
        id: 'expired-session',
        expiresAt: new Date(Date.now() - 1000),
        isActive: () => false
      };
      
      mockUserSessionRepository.findByUserId.mockResolvedValue([expiredSession]);
      mockUserSessionRepository.delete.mockResolvedValue(true);
      
      const result = await sessionActivityService.cleanupExpiredSessions();
      
      expect(result.cleanedCount).toBe(1);
      expect(mockUserSessionRepository.delete).toHaveBeenCalledWith('expired-session');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockUserSessionRepository.findByUserId.mockRejectedValue(new Error('Database error'));
      
      const result = await sessionActivityService.cleanupExpiredSessions();
      
      expect(result.cleanedCount).toBe(0);
      expect(result.errors).toContain('Database error');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        activityThreshold: 60 * 1000,
        sessionTimeout: 30 * 60 * 1000,
        maxExtensions: 5
      };
      
      sessionActivityService.updateConfig(newConfig);
      
      expect(sessionActivityService.activityThreshold).toBe(newConfig.activityThreshold);
      expect(sessionActivityService.sessionTimeout).toBe(newConfig.sessionTimeout);
      expect(sessionActivityService.maxExtensions).toBe(newConfig.maxExtensions);
    });

    it('should get current configuration', () => {
      const config = sessionActivityService.getConfig();
      
      expect(config).toEqual({
        activityThreshold: sessionActivityService.activityThreshold,
        sessionTimeout: sessionActivityService.sessionTimeout,
        extensionThreshold: sessionActivityService.extensionThreshold,
        maxExtensions: sessionActivityService.maxExtensions
      });
    });
  });

  describe('Service Management', () => {
    it('should start service successfully', () => {
      const mockStartCleanupTasks = jest.spyOn(sessionActivityService, 'startCleanupTasks');
      
      sessionActivityService.start();
      
      expect(mockStartCleanupTasks).toHaveBeenCalled();
    });

    it('should stop service successfully', () => {
      sessionActivityService.start();
      sessionActivityService.stop();
      
      expect(sessionActivityService.cleanupInterval).toBeNull();
      expect(sessionActivityService.analyticsInterval).toBeNull();
    });

    it('should get service status', () => {
      const status = sessionActivityService.getStatus();
      
      expect(status).toEqual({
        isRunning: false,
        activityCacheSize: 0,
        extensionCountsSize: 0,
        config: expect.any(Object)
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup activity cache periodically', () => {
      const mockCleanupCache = jest.spyOn(sessionActivityService, 'cleanupActivityCache');
      
      sessionActivityService.start();
      
      // Advance time to trigger cleanup
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      
      expect(mockCleanupCache).toHaveBeenCalled();
    });

    it('should limit activity cache size', () => {
      // Add many activities to cache
      for (let i = 0; i < 1000; i++) {
        sessionActivityService.activityCache.set(`session-${i}`, {
          lastActivity: Date.now(),
          activityCount: 1
        });
      }
      
      sessionActivityService.cleanupActivityCache();
      
      expect(sessionActivityService.activityCache.size).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle activity recording errors', async () => {
      mockEventBus.emit.mockImplementation(() => {
        throw new Error('Event bus error');
      });
      
      await expect(sessionActivityService.recordActivity('session-1', {})).rejects.toThrow('Event bus error');
    });

    it('should handle session lookup errors', async () => {
      mockUserSessionRepository.findById.mockRejectedValue(new Error('Session not found'));
      
      await expect(sessionActivityService.checkSessionExtension('session-1')).rejects.toThrow('Session not found');
    });

    it('should handle configuration errors', () => {
      expect(() => {
        sessionActivityService.updateConfig({ invalidProperty: 'value' });
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with AuthService', async () => {
      const mockAuthService = {
        extendSession: jest.fn().mockResolvedValue({
          sessionId: 'session-1',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        })
      };
      
      sessionActivityService.authService = mockAuthService;
      
      const result = await sessionActivityService.extendSession('session-1', 'activity');
      
      expect(result).toBeDefined();
      expect(mockAuthService.extendSession).toHaveBeenCalledWith('session-1');
    });

    it('should emit events for external listeners', async () => {
      const mockListener = jest.fn();
      mockEventBus.on = jest.fn();
      
      await sessionActivityService.recordActivity('session-1', { type: 'test' });
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('session-activity', expect.any(Object));
    });
  });
});
