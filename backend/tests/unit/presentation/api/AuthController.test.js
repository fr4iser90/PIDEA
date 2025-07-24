const AuthController = require('../../../presentation/api/AuthController');

describe('AuthController', () => {
  let controller;
  let mockAuthApplicationService;
  let mockReq;
  let mockRes;
  let mockUser;
  let mockSession;

  beforeEach(() => {
    // Create mock application service
    mockAuthApplicationService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      refresh: jest.fn(),
      validateAccessToken: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      getUserSessions: jest.fn()
    };

    // Create controller instance
    controller = new AuthController({ authApplicationService: mockAuthApplicationService });

    // Create mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      toJSON: jest.fn().mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      }),
      verifyPassword: jest.fn(),
      updateLastActivity: jest.fn(),
      _email: 'test@example.com',
      _passwordHash: 'hashed-password'
    };

    // Create mock session
    mockSession = {
      id: 'session-123',
      userId: 'user-123',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isActive: jest.fn().mockReturnValue(true),
      metadata: { userAgent: 'web', ipAddress: 'unknown' }
    };

    // Create mock request and response objects
    mockReq = {
      body: {},
      user: null,
      params: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Reset console mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with authApplicationService', () => {
      expect(controller.authApplicationService).toBe(mockAuthApplicationService);
    });

    it('should throw error if authApplicationService is missing', () => {
      expect(() => new AuthController({})).toThrow('AuthController requires authApplicationService dependency');
    });
  });

  describe('register', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser'
      };
    });

    it('should register a new user successfully', async () => {
      const userData = { email: 'newuser@example.com', password: 'password123', username: 'newuser' };
      const savedUser = {
        ...mockUser,
        email: 'newuser@example.com',
        username: 'newuser'
      };
      
      mockAuthApplicationService.register.mockResolvedValue({
        success: true,
        data: savedUser
      });

      await controller.register(mockReq, mockRes);

      expect(mockAuthApplicationService.register).toHaveBeenCalledWith(userData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: savedUser
      });
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = { password: 'password123' };

      await controller.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required'
      });
    });

    it('should return 400 when password is missing', async () => {
      mockReq.body = { email: 'test@example.com' };

      await controller.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required'
      });
    });

    it('should return 400 when both email and password are missing', async () => {
      mockReq.body = {};

      await controller.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required'
      });
    });

    it('should handle registration errors', async () => {
      const error = new Error('Database error');
      mockAuthApplicationService.register.mockRejectedValue(error);

      await controller.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('should login user successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const loginResult = {
        success: true,
        data: {
          user: mockUser,
          session: {
            accessToken: mockSession.accessToken,
            refreshToken: mockSession.refreshToken,
            expiresAt: mockSession.expiresAt
          }
        }
      };
      
      mockAuthApplicationService.login.mockResolvedValue(loginResult);

      await controller.login(mockReq, mockRes);

      expect(mockAuthApplicationService.login).toHaveBeenCalledWith(credentials);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          accessToken: mockSession.accessToken,
          refreshToken: mockSession.refreshToken,
          expiresAt: mockSession.expiresAt
        }
      });
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = { password: 'password123' };

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email and password are required'
      });
    });

    it('should return 400 when password is missing', async () => {
      mockReq.body = { email: 'test@example.com' };

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email and password are required'
      });
    });

    it('should return 400 when both email and password are missing', async () => {
      mockReq.body = {};

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email and password are required'
      });
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthApplicationService.login.mockRejectedValue(error);

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials'
      });
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      mockReq.body = {
        refreshToken: 'refresh-token-123'
      };
    });

    it('should refresh token successfully', async () => {
      mockAuthService.refreshUserSession.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await controller.refresh(mockReq, mockRes);

      expect(mockAuthService.refreshUserSession).toHaveBeenCalledWith('refresh-token-123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockSession.userId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser.toJSON(),
          accessToken: mockSession.accessToken,
          refreshToken: mockSession.refreshToken,
          expiresAt: mockSession.expiresAt
        }
      });
    });

    it('should return 400 when refresh token is missing', async () => {
      mockReq.body = {};

      await controller.refresh(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Refresh token is required'
      });
    });

    it('should handle refresh token errors', async () => {
      const error = new Error('Invalid refresh token');
      mockAuthService.refreshUserSession.mockRejectedValue(error);

      await controller.refresh(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid refresh token'
      });
    });

    it('should handle user not found error', async () => {
      mockAuthService.refreshUserSession.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(null);

      await controller.refresh(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid refresh token'
      });
    });
  });

  describe('logout', () => {
    it('should logout specific session when sessionId is provided', async () => {
      mockReq.body = { sessionId: 'session-123' };

      await controller.logout(mockReq, mockRes);

      expect(mockAuthService.logoutSession).toHaveBeenCalledWith('session-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should logout all user sessions when user is authenticated', async () => {
      mockReq.user = mockUser;
      mockReq.body = {};

      await controller.logout(mockReq, mockRes);

      expect(mockAuthService.logoutUser).toHaveBeenCalledWith(mockUser.id);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should return 400 when neither sessionId nor user is provided', async () => {
      mockReq.body = {};

      await controller.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session ID or authentication required'
      });
    });

    it('should handle logout errors', async () => {
      mockReq.body = { sessionId: 'session-123' };
      const error = new Error('Logout failed');
      mockAuthService.logoutSession.mockRejectedValue(error);

      await controller.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Logout failed'
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile when authenticated', async () => {
      mockReq.user = mockUser;
      const profileResult = {
        success: true,
        data: { user: mockUser }
      };
      
      mockAuthApplicationService.getUserProfile.mockResolvedValue(profileResult);

      await controller.getProfile(mockReq, mockRes);

      expect(mockAuthApplicationService.getUserProfile).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;

      await controller.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should handle profile retrieval errors', async () => {
      mockReq.user = mockUser;
      const error = new Error('Profile retrieval failed');
      mockAuthApplicationService.getUserProfile.mockRejectedValue(error);

      await controller.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get profile'
      });
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully when user is authenticated', async () => {
      mockReq.user = mockUser;

      await controller.validateToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser.toJSON()
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;

      await controller.validateToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
    });

    it('should handle token validation errors', async () => {
      mockReq.user = mockUser;
      mockUser.toJSON.mockImplementation(() => {
        throw new Error('Serialization error');
      });

      await controller.validateToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token validation failed'
      });
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      mockReq.user = mockUser;
    });

    it('should update email successfully', async () => {
      mockReq.body = { email: 'newemail@example.com' };
      const profileData = { email: 'newemail@example.com' };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      
      mockAuthApplicationService.updateUserProfile.mockResolvedValue({
        success: true,
        data: { user: updatedUser }
      });

      await controller.updateProfile(mockReq, mockRes);

      expect(mockAuthApplicationService.updateUserProfile).toHaveBeenCalledWith('user-123', profileData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: updatedUser
        }
      });
    });

    it('should update password successfully', async () => {
      mockReq.body = { 
        currentPassword: 'oldpassword',
        newPassword: 'newpassword'
      };
      const profileData = { currentPassword: 'oldpassword', newPassword: 'newpassword' };
      const updatedUser = { ...mockUser };
      
      mockAuthApplicationService.updateUserProfile.mockResolvedValue({
        success: true,
        data: { user: updatedUser }
      });

      await controller.updateProfile(mockReq, mockRes);

      expect(mockAuthApplicationService.updateUserProfile).toHaveBeenCalledWith('user-123', profileData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: updatedUser
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 409 when email is already in use', async () => {
      mockReq.body = { email: 'existing@example.com' };
      const error = new Error('Email already in use');
      mockAuthApplicationService.updateUserProfile.mockRejectedValue(error);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email already in use'
      });
    });

    it('should return 400 when new password is provided without current password', async () => {
      mockReq.body = { newPassword: 'newpassword' };

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is required to change password'
      });
    });

    it('should return 400 when current password is incorrect', async () => {
      mockReq.body = { 
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword'
      };
      const error = new Error('Current password is incorrect');
      mockAuthApplicationService.updateUserProfile.mockRejectedValue(error);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is incorrect'
      });
    });

    it('should handle update profile errors', async () => {
      mockReq.body = { email: 'newemail@example.com' };
      const error = new Error('Database error');
      mockAuthApplicationService.updateUserProfile.mockRejectedValue(error);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update profile'
      });
    });
  });

  describe('getSessions', () => {
    it('should return user sessions when authenticated', async () => {
      mockReq.user = mockUser;
      const mockSessions = [
        {
          id: 'session-1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          isActive: jest.fn().mockReturnValue(true),
          metadata: { userAgent: 'web' }
        },
        {
          id: 'session-2',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 15 * 60 * 1000),
          isActive: jest.fn().mockReturnValue(false),
          metadata: { userAgent: 'mobile' }
        }
      ];
      const sessionsResult = {
        success: true,
        data: {
          sessions: mockSessions.map(session => ({
            id: session.id,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isActive: session.isActive(),
            metadata: session.metadata
          }))
        }
      };
      
      mockAuthApplicationService.getUserSessions.mockResolvedValue(sessionsResult);

      await controller.getSessions(mockReq, mockRes);

      expect(mockAuthApplicationService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sessions: mockSessions.map(session => ({
            id: session.id,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isActive: session.isActive(),
            metadata: session.metadata
          }))
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;

      await controller.getSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should handle get sessions errors', async () => {
      mockReq.user = mockUser;
      const error = new Error('Database error');
      mockAuthApplicationService.getUserSessions.mockRejectedValue(error);

      await controller.getSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get sessions'
      });
    });
  });
}); 