const AuthController = require('@/presentation/api/AuthController');
const User = require('@/domain/entities/User');
const UserSession = require('@/domain/entities/UserSession');
const bcrypt = require('bcryptjs');

// Mock bcrypt
jest.mock('bcryptjs');

describe('AuthController', () => {
  let controller;
  let mockAuthService;
  let mockUserRepository;
  let mockReq;
  let mockRes;
  let mockUser;
  let mockSession;

  beforeEach(() => {
    // Create mock services
    mockAuthService = {
      authenticateUser: jest.fn(),
      createUserSession: jest.fn(),
      refreshUserSession: jest.fn(),
      logoutSession: jest.fn(),
      logoutUser: jest.fn(),
      getUserSessions: jest.fn(),
      validateAccessToken: jest.fn()
    };

    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    };

    // Create controller instance
    controller = new AuthController(mockAuthService, mockUserRepository);

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
    it('should initialize with dependencies', () => {
      expect(controller.authService).toBe(mockAuthService);
      expect(controller.userRepository).toBe(mockUserRepository);
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
      const hashedPassword = 'hashed-password-123';
      bcrypt.hash.mockResolvedValue(hashedPassword);

      const savedUser = {
        ...mockUser,
        email: 'newuser@example.com',
        username: 'newuser'
      };
      mockUserRepository.save.mockResolvedValue(savedUser);

      await controller.register(mockReq, mockRes);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        passwordHash: hashedPassword,
        username: 'newuser',
        role: 'user',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        metadata: {}
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: savedUser.toJSON()
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
      mockUserRepository.save.mockRejectedValue(error);

      await controller.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should handle bcrypt hash errors', async () => {
      const error = new Error('Hash error');
      bcrypt.hash.mockRejectedValue(error);

      await controller.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Hash error'
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
      mockAuthService.authenticateUser.mockResolvedValue(mockUser);
      mockAuthService.createUserSession.mockResolvedValue(mockSession);

      await controller.login(mockReq, mockRes);

      expect(mockAuthService.authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockAuthService.createUserSession).toHaveBeenCalledWith(mockUser);
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
      mockAuthService.authenticateUser.mockRejectedValue(error);

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials'
      });
    });

    it('should handle session creation errors', async () => {
      mockAuthService.authenticateUser.mockResolvedValue(mockUser);
      const error = new Error('Session creation failed');
      mockAuthService.createUserSession.mockRejectedValue(error);

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

      await controller.getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser.toJSON()
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
      mockUser.toJSON.mockImplementation(() => {
        throw new Error('Serialization error');
      });

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
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newemail@example.com');
      expect(mockUser._email).toBe('newemail@example.com');
      expect(mockUser.updateLastActivity).toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser.toJSON()
        }
      });
    });

    it('should update password successfully', async () => {
      mockReq.body = { 
        currentPassword: 'oldpassword',
        newPassword: 'newpassword'
      };
      mockUser.verifyPassword.mockResolvedValue(true);
      
      // Mock User.createUser static method
      const mockNewUser = {
        passwordHash: 'new-hashed-password'
      };
      User.createUser = jest.fn().mockResolvedValue(mockNewUser);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockUser.verifyPassword).toHaveBeenCalledWith('oldpassword');
      expect(User.createUser).toHaveBeenCalledWith('temp', 'newpassword');
      expect(mockUser._passwordHash).toBe('new-hashed-password');
      expect(mockUser.updateLastActivity).toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser);
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
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'other-user' });

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
      mockUser.verifyPassword.mockResolvedValue(false);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is incorrect'
      });
    });

    it('should handle update profile errors', async () => {
      mockReq.body = { email: 'newemail@example.com' };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const error = new Error('Database error');
      mockUserRepository.update.mockRejectedValue(error);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update profile'
      });
    });

    it('should handle User.createUser errors', async () => {
      mockReq.body = { 
        currentPassword: 'oldpassword',
        newPassword: 'newpassword'
      };
      mockUser.verifyPassword.mockResolvedValue(true);
      const error = new Error('Hash error');
      User.createUser = jest.fn().mockRejectedValue(error);

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
      mockAuthService.getUserSessions.mockResolvedValue(mockSessions);

      await controller.getSessions(mockReq, mockRes);

      expect(mockAuthService.getUserSessions).toHaveBeenCalledWith(mockUser.id);
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
      mockAuthService.getUserSessions.mockRejectedValue(error);

      await controller.getSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get sessions'
      });
    });
  });
}); 