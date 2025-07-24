const AuthService = require('@domain/services/security/AuthService');
const TokenValidator = require('@infrastructure/auth/TokenValidator');
const TokenHasher = require('@infrastructure/auth/TokenHasher');
const UserSession = require('@domain/entities/UserSession');
const User = require('@domain/entities/User');

describe('Secure Token System Integration', () => {
  let authService;
  let tokenValidator;
  let tokenHasher;
  let mockUserRepository;
  let mockUserSessionRepository;
  let testUser;

  beforeEach(() => {
    // Mock repositories
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn()
    };

    mockUserSessionRepository = {
      save: jest.fn(),
      findByAccessToken: jest.fn(),
      findByRefreshToken: jest.fn(),
      delete: jest.fn()
    };

    // Create test user
    testUser = new User(
      'test-user-id',
      'test@example.com',
      '$2a$10$test.hash.here',
      'user',
      new Date(),
      new Date()
    );

    // Initialize services
    authService = new AuthService(
      mockUserRepository,
      mockUserSessionRepository,
      'test-jwt-secret',
      'test-refresh-secret'
    );

    tokenHasher = new TokenHasher('test-salt');
    tokenValidator = new TokenValidator(tokenHasher);
  });

  describe('Token Creation and Validation Flow', () => {
    it('should create secure session with token hash', async () => {
      // Mock user authentication
      mockUserRepository.findByEmail.mockResolvedValue(testUser);
      testUser.verifyPassword = jest.fn().mockResolvedValue(true);

      // Mock session save
      mockUserSessionRepository.save.mockImplementation(async (session) => {
        expect(session.accessTokenHash).toBeDefined();
        expect(session.accessTokenStart).toBeDefined();
        return session;
      });

      // Perform login
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(loginResult.session.accessToken).toBeDefined();
      expect(loginResult.session.refreshToken).toBeDefined();
      expect(mockUserSessionRepository.save).toHaveBeenCalled();
    });

    it('should validate access token using secure validation', async () => {
      // Create a session with secure token
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        hashResult.hash
      );

      // Mock repository to return session
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockUserSessionRepository.findByAccessToken.mockResolvedValue(session);

      // Validate token
      const validationResult = await authService.validateAccessToken(accessToken);

      expect(validationResult.user).toBe(testUser);
      expect(validationResult.session).toBe(session);
    });

    it('should reject invalid access token', async () => {
      // Create a session with secure token
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        hashResult.hash
      );

      // Mock repository to return session
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockUserSessionRepository.findByAccessToken.mockResolvedValue(session);

      // Try to validate with different token
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkaWZmZXJlbnQtdXNlciIsImlhdCI6MTYzNDU2Nzg5MCwiZXhwIjoxNjM0NTcxNDkwfS5kaWZmZXJlbnQtc2lnbmF0dXJl';

      await expect(authService.validateAccessToken(invalidToken))
        .rejects.toThrow('Invalid authentication');
    });
  });

  describe('Session Token Validation', () => {
    it('should validate session token with secure hash', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        hashResult.hash
      );

      const result = tokenValidator.validateSessionToken(accessToken, session);

      expect(result.isValid).toBe(true);
      expect(result.session).toBe(session);
      expect(result.userId).toBe('test-user');
    });

    it('should reject session token with invalid hash', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      // Create session with wrong hash
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        'wrong-hash'
      );

      const result = tokenValidator.validateSessionToken(accessToken, session);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid token hash');
    });

    it('should reject expired session', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU2Nzg5MX0.expired-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() - 3600000), // Expired
        new Date(),
        {},
        hashResult.hash
      );

      const result = tokenValidator.validateSessionToken(accessToken, session);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session inactive');
    });
  });

  describe('Refresh Token Validation', () => {
    it('should validate refresh token successfully', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        hashResult.hash
      );

      const result = tokenValidator.validateRefreshToken('refresh-token', session);

      expect(result.isValid).toBe(true);
      expect(result.session).toBe(session);
      expect(result.userId).toBe('test-user-id');
    });

    it('should reject invalid refresh token', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      const hashResult = tokenHasher.hashToken(accessToken);
      
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        hashResult.hash
      );

      const result = tokenValidator.validateRefreshToken('wrong-refresh-token', session);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid refresh token');
    });
  });

  describe('Secure Token Requirements', () => {
    it('should require token hash for validation', () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
      
      // Create session without hash (should fail)
      const session = new UserSession(
        'session-id',
        'test-user-id',
        accessToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {} // No hash
      );

      const result = tokenValidator.validateSessionToken(accessToken, session);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid token hash');
    });

    it('should always have secure tokens enabled', () => {
      expect(tokenValidator.isSecureTokensEnabled()).toBe(true);
    });
  });

  describe('Token Hash Operations', () => {
    it('should generate consistent hashes for same token', () => {
      const token = 'test-token-123';
      const hash1 = tokenHasher.hashToken(token);
      const hash2 = tokenHasher.hashToken(token);

      expect(hash1.hash).toBe(hash2.hash);
      expect(hash1.prefix).toBe(hash2.prefix);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      
      const hash1 = tokenHasher.hashToken(token1);
      const hash2 = tokenHasher.hashToken(token2);

      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should validate token against stored hash', () => {
      const token = 'test-token-123';
      const hashResult = tokenHasher.hashToken(token);

      const isValid = tokenHasher.validateToken(token, hashResult.hash);
      expect(isValid).toBe(true);

      const isInvalid = tokenHasher.validateToken('different-token', hashResult.hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed tokens gracefully', () => {
      const malformedToken = 'invalid.token.format';
      
      expect(() => tokenHasher.hashToken(malformedToken)).toThrow();
    });

    it('should handle empty tokens gracefully', () => {
      expect(() => tokenHasher.hashToken('')).toThrow('Token is required for hashing');
      expect(() => tokenHasher.hashToken(null)).toThrow('Token is required for hashing');
    });

    it('should handle validation errors gracefully', () => {
      const result = tokenValidator.validateToken('invalid.token', 'prefix', 'hash');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Validation error');
    });
  });

  describe('Performance', () => {
    it('should handle multiple token validations efficiently', () => {
      const tokens = [];
      const sessions = [];
      
      // Create multiple test tokens and sessions
      for (let i = 0; i < 10; i++) {
        const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIt${i}LCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature-${i}`;
        const hashResult = tokenHasher.hashToken(token);
        
        const session = new UserSession(
          `session-${i}`,
          `user-${i}`,
          token,
          `refresh-${i}`,
          new Date(Date.now() + 3600000),
          new Date(),
          {},
          hashResult.hash
        );
        
        tokens.push(token);
        sessions.push(session);
      }

      const startTime = Date.now();
      const result = tokenValidator.validateTokens(tokens, sessions);
      const endTime = Date.now();

      expect(result.results).toHaveLength(10);
      expect(result.errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 