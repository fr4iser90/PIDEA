const request = require('supertest');
const app = require('../../Application');
const SessionController = require('../../presentation/api/SessionController');
const SessionActivityService = require('../../domain/services/security/SessionActivityService');
const AuthService = require('../../domain/services/security/AuthService');

// Mock dependencies
const mockUserSessionRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn()
};

const mockUserRepository = {
  findByEmail: jest.fn(),
  save: jest.fn()
};

const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn()
};

describe('Session Management Integration Tests', () => {
  let sessionController;
  let sessionActivityService;
  let authService;
  let testUser;
  let testSession;
  let authToken;

  beforeAll(async () => {
    // Initialize services
    sessionActivityService = new SessionActivityService({
      userSessionRepository: mockUserSessionRepository,
      eventBus: mockEventBus
    });

    authService = new AuthService(
      mockUserRepository,
      mockUserSessionRepository,
      'test-jwt-secret',
      'test-refresh-secret',
      sessionActivityService
    );

    sessionController = new SessionController({
      sessionActivityService,
      authService,
      userSessionRepository: mockUserSessionRepository
    });

    // Create test user
    testUser = {
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed-password',
      isActive: true
    };

    // Create test session
    testSession = {
      id: 'session-1',
      userId: testUser.id,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isActive: () => true
    };

    authToken = 'Bearer test-access-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUserSessionRepository.findById.mockResolvedValue(testSession);
    mockUserRepository.findByEmail.mockResolvedValue(testUser);
  });

  describe('Session Extension Flow', () => {
    it('should extend session successfully', async () => {
      const mockExtendSession = jest.spyOn(sessionActivityService, 'extendSession')
        .mockResolvedValue({
          sessionId: testSession.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          extensionCount: 1
        });

      const response = await request(app)
        .post('/api/session/extend')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sessionId: testSession.id,
          expiresAt: expect.any(String),
          extensionCount: 1
        }
      });

      expect(mockExtendSession).toHaveBeenCalledWith(testSession.id, 'manual');
    });

    it('should handle session extension failure', async () => {
      const mockExtendSession = jest.spyOn(sessionActivityService, 'extendSession')
        .mockRejectedValue(new Error('Extension failed'));

      const response = await request(app)
        .post('/api/session/extend')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Extension failed'
      });
    });

    it('should require authentication for session extension', async () => {
      const response = await request(app)
        .post('/api/session/extend')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('Session Status Monitoring', () => {
    it('should get session status successfully', async () => {
      const mockGetStats = jest.spyOn(sessionActivityService, 'getSessionActivityStats')
        .mockResolvedValue({
          sessionId: testSession.id,
          activityCount: 10,
          totalDuration: 5 * 60 * 1000,
          lastActivity: Date.now(),
          averageActivityInterval: 30 * 1000
        });

      const response = await request(app)
        .get('/api/session/status')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sessionId: testSession.id,
          activityCount: 10,
          totalDuration: 5 * 60 * 1000,
          lastActivity: expect.any(Number),
          averageActivityInterval: 30 * 1000
        }
      });

      expect(mockGetStats).toHaveBeenCalledWith(testSession.id);
    });

    it('should handle session status errors', async () => {
      const mockGetStats = jest.spyOn(sessionActivityService, 'getSessionActivityStats')
        .mockRejectedValue(new Error('Stats unavailable'));

      const response = await request(app)
        .get('/api/session/status')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Stats unavailable'
      });
    });
  });

  describe('Activity Recording', () => {
    it('should record user activity successfully', async () => {
      const mockRecordActivity = jest.spyOn(sessionActivityService, 'recordActivity')
        .mockResolvedValue({
          sessionId: testSession.id,
          timestamp: Date.now(),
          type: 'mouse-move',
          details: { x: 100, y: 200 },
          duration: 1000
        });

      const activityData = {
        type: 'mouse-move',
        details: { x: 100, y: 200 },
        duration: 1000
      };

      const response = await request(app)
        .post('/api/session/activity')
        .set('Authorization', authToken)
        .send(activityData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sessionId: testSession.id,
          timestamp: expect.any(Number),
          type: 'mouse-move',
          details: { x: 100, y: 200 },
          duration: 1000
        }
      });

      expect(mockRecordActivity).toHaveBeenCalledWith(testSession.id, {
        type: 'mouse-move',
        details: { x: 100, y: 200 },
        duration: 1000,
        userAgent: expect.any(String),
        ipAddress: expect.any(String)
      });
    });

    it('should handle activity recording errors', async () => {
      const mockRecordActivity = jest.spyOn(sessionActivityService, 'recordActivity')
        .mockRejectedValue(new Error('Recording failed'));

      const response = await request(app)
        .post('/api/session/activity')
        .set('Authorization', authToken)
        .send({ type: 'test' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Recording failed'
      });
    });
  });

  describe('Session Analytics', () => {
    it('should get session analytics successfully', async () => {
      const mockGetUserStats = jest.spyOn(sessionActivityService, 'getUserActivityStats')
        .mockResolvedValue({
          userId: testUser.id,
          sessionCount: 5,
          totalActivityTime: 2 * 60 * 60 * 1000,
          averageSessionDuration: 24 * 60 * 1000,
          timeRange: 24 * 60 * 60 * 1000
        });

      const response = await request(app)
        .get('/api/session/analytics')
        .set('Authorization', authToken)
        .query({ timeRange: '86400000' }) // 24 hours
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          userId: testUser.id,
          sessionCount: 5,
          totalActivityTime: 2 * 60 * 60 * 1000,
          averageSessionDuration: 24 * 60 * 1000,
          timeRange: 24 * 60 * 60 * 1000
        }
      });

      expect(mockGetUserStats).toHaveBeenCalledWith(testUser.id, 86400000);
    });

    it('should use default time range when not specified', async () => {
      const mockGetUserStats = jest.spyOn(sessionActivityService, 'getUserActivityStats')
        .mockResolvedValue({
          userId: testUser.id,
          sessionCount: 3,
          totalActivityTime: 1 * 60 * 60 * 1000,
          averageSessionDuration: 20 * 60 * 1000,
          timeRange: 24 * 60 * 60 * 1000
        });

      const response = await request(app)
        .get('/api/session/analytics')
        .set('Authorization', authToken)
        .expect(200);

      expect(mockGetUserStats).toHaveBeenCalledWith(testUser.id, 24 * 60 * 60 * 1000);
    });
  });

  describe('Admin Functions', () => {
    beforeEach(() => {
      // Mock admin user
      testUser.hasPermission = jest.fn().mockReturnValue(true);
    });

    it('should get monitoring data for admin', async () => {
      const mockGetStatus = jest.spyOn(sessionActivityService, 'getStatus')
        .mockReturnValue({
          isRunning: true,
          activityCacheSize: 10,
          extensionCountsSize: 5,
          config: {
            activityThreshold: 30 * 1000,
            sessionTimeout: 15 * 60 * 1000
          }
        });

      const response = await request(app)
        .get('/api/session/monitor')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          isRunning: true,
          activityCacheSize: 10,
          extensionCountsSize: 5,
          config: {
            activityThreshold: 30 * 1000,
            sessionTimeout: 15 * 60 * 1000
          }
        }
      });
    });

    it('should trigger manual cleanup for admin', async () => {
      const mockCleanup = jest.spyOn(sessionActivityService, 'cleanupExpiredSessions')
        .mockResolvedValue({
          cleanedCount: 3,
          errors: []
        });

      const response = await request(app)
        .post('/api/session/cleanup')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          cleanedCount: 3,
          errors: []
        }
      });

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should update configuration for admin', async () => {
      const mockUpdateConfig = jest.spyOn(sessionActivityService, 'updateConfig')
        .mockImplementation(() => {});

      const newConfig = {
        activityThreshold: 60 * 1000,
        sessionTimeout: 30 * 60 * 1000,
        maxExtensions: 5
      };

      const response = await request(app)
        .put('/api/session/config')
        .set('Authorization', authToken)
        .send({ config: newConfig })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Configuration updated successfully'
      });

      expect(mockUpdateConfig).toHaveBeenCalledWith(newConfig);
    });

    it('should reject admin functions for non-admin users', async () => {
      testUser.hasPermission = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .get('/api/session/monitor')
        .set('Authorization', authToken)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin permission required'
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const mockGetStatus = jest.spyOn(sessionActivityService, 'getStatus')
        .mockReturnValue({
          isRunning: true,
          activityCacheSize: 5,
          extensionCountsSize: 2
        });

      const response = await request(app)
        .get('/api/session/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          service: {
            isRunning: true,
            activityCacheSize: 5,
            extensionCountsSize: 2
          }
        }
      });
    });

    it('should handle health check errors', async () => {
      const mockGetStatus = jest.spyOn(sessionActivityService, 'getStatus')
        .mockImplementation(() => {
          throw new Error('Service error');
        });

      const response = await request(app)
        .get('/api/session/health')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service unhealthy'
      });
    });
  });

  describe('Complete Session Lifecycle', () => {
    it('should handle complete session lifecycle', async () => {
      // 1. Record initial activity
      const mockRecordActivity = jest.spyOn(sessionActivityService, 'recordActivity')
        .mockResolvedValue({
          sessionId: testSession.id,
          timestamp: Date.now(),
          type: 'login',
          duration: 0
        });

      await request(app)
        .post('/api/session/activity')
        .set('Authorization', authToken)
        .send({ type: 'login', duration: 0 })
        .expect(200);

      // 2. Check session status
      const mockGetStats = jest.spyOn(sessionActivityService, 'getSessionActivityStats')
        .mockResolvedValue({
          sessionId: testSession.id,
          activityCount: 1,
          totalDuration: 0,
          lastActivity: Date.now()
        });

      await request(app)
        .get('/api/session/status')
        .set('Authorization', authToken)
        .expect(200);

      // 3. Record more activity
      mockRecordActivity.mockResolvedValue({
        sessionId: testSession.id,
        timestamp: Date.now(),
        type: 'mouse-move',
        duration: 1000
      });

      await request(app)
        .post('/api/session/activity')
        .set('Authorization', authToken)
        .send({ type: 'mouse-move', duration: 1000 })
        .expect(200);

      // 4. Extend session
      const mockExtendSession = jest.spyOn(sessionActivityService, 'extendSession')
        .mockResolvedValue({
          sessionId: testSession.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          extensionCount: 1
        });

      await request(app)
        .post('/api/session/extend')
        .set('Authorization', authToken)
        .expect(200);

      // Verify all methods were called
      expect(mockRecordActivity).toHaveBeenCalledTimes(2);
      expect(mockGetStats).toHaveBeenCalledTimes(1);
      expect(mockExtendSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database connection errors', async () => {
      mockUserSessionRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/session/status')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle invalid request data', async () => {
      const response = await request(app)
        .post('/api/session/activity')
        .set('Authorization', authToken)
        .send({ invalidField: 'value' })
        .expect(200); // Should still process the request

      expect(response.body.success).toBe(true);
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .post('/api/session/extend')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });
});
