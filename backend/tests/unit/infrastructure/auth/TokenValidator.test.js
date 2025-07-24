const TokenValidator = require('@infrastructure/auth/TokenValidator');
const TokenHasher = require('@infrastructure/auth/TokenHasher');
const UserSession = require('@domain/entities/UserSession');

describe('TokenValidator', () => {
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
  const testSalt = 'test-salt-123';

  let tokenValidator;
  let tokenHasher;
  let mockSession;

  beforeEach(() => {
    tokenHasher = new TokenHasher(testSalt);
    tokenValidator = new TokenValidator(tokenHasher);
    
    // Create a mock session
    const hashResult = tokenHasher.hashToken(testToken);
    mockSession = new UserSession(
      'session-id',
      'test-user',
      testToken,
      'refresh-token',
      new Date(Date.now() + 3600000), // 1 hour from now
      new Date(),
      {},
      hashResult.hash
    );
  });

  describe('Constructor', () => {
    it('should initialize with custom token hasher', () => {
      expect(tokenValidator.tokenHasher).toBe(tokenHasher);
      expect(tokenValidator.enableSecureTokens).toBeDefined();
    });

    it('should initialize with default token hasher when none provided', () => {
      const defaultValidator = new TokenValidator();
      expect(defaultValidator.tokenHasher).toBeInstanceOf(TokenHasher);
    });

    it('should always have secure tokens enabled', () => {
      const validator = new TokenValidator();
      expect(validator.isSecureTokensEnabled()).toBe(true);
    });
  });

  describe('validateToken', () => {
    it('should validate token with prefix and hash', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const result = tokenValidator.validateToken(testToken, hashResult.prefix, hashResult.hash);
      
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('test-user');
      expect(result.expirationTime).toBeDefined();
    });

    it('should reject expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU2Nzg5MX0.expired-signature';
      const hashResult = tokenHasher.hashToken(expiredToken);
      const result = tokenValidator.validateToken(expiredToken, hashResult.prefix, hashResult.hash);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token expired');
    });

    it('should reject token with invalid hash', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const result = tokenValidator.validateToken(testToken, hashResult.prefix, 'invalid-hash');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid token hash');
    });

    it('should reject token with prefix mismatch', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const result = tokenValidator.validateToken(testToken, 'different-prefix', hashResult.hash);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token prefix mismatch');
    });

    it('should handle null token', () => {
      const result = tokenValidator.validateToken(null, 'prefix', 'hash');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No token provided');
    });

    it('should handle empty token', () => {
      const result = tokenValidator.validateToken('', 'prefix', 'hash');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No token provided');
    });

    it('should require hash for validation', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const result = tokenValidator.validateToken(testToken, hashResult.prefix, null);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid token hash');
    });
  });

  describe('validateSessionToken', () => {
    it('should validate session token successfully', () => {
      const result = tokenValidator.validateSessionToken(testToken, mockSession);
      
      expect(result.isValid).toBe(true);
      expect(result.session).toBe(mockSession);
      expect(result.userId).toBe('test-user');
    });

    it('should reject when session is inactive', () => {
      // Create expired session
      const expiredSession = new UserSession(
        'session-id',
        'test-user',
        testToken,
        'refresh-token',
        new Date(Date.now() - 3600000), // 1 hour ago
        new Date(),
        {},
        tokenHasher.hashToken(testToken).hash
      );
      
      const result = tokenValidator.validateSessionToken(testToken, expiredSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session inactive');
    });

    it('should reject when token validation fails', () => {
      const invalidToken = 'invalid.token.here';
      const result = tokenValidator.validateSessionToken(invalidToken, mockSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Validation error');
    });

    it('should reject when user ID mismatch', () => {
      // Create session with different user ID
      const differentUserSession = new UserSession(
        'session-id',
        'different-user',
        testToken,
        'refresh-token',
        new Date(Date.now() + 3600000),
        new Date(),
        {},
        tokenHasher.hashToken(testToken).hash
      );
      
      const result = tokenValidator.validateSessionToken(testToken, differentUserSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('User ID mismatch');
    });

    it('should handle null token', () => {
      const result = tokenValidator.validateSessionToken(null, mockSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token or session not provided');
    });

    it('should handle null session', () => {
      const result = tokenValidator.validateSessionToken(testToken, null);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token or session not provided');
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate refresh token successfully', () => {
      const result = tokenValidator.validateRefreshToken('refresh-token', mockSession);
      
      expect(result.isValid).toBe(true);
      expect(result.session).toBe(mockSession);
      expect(result.userId).toBe('test-user');
    });

    it('should reject when session is inactive', () => {
      const expiredSession = new UserSession(
        'session-id',
        'test-user',
        testToken,
        'refresh-token',
        new Date(Date.now() - 3600000), // 1 hour ago
        new Date(),
        {},
        tokenHasher.hashToken(testToken).hash
      );
      
      const result = tokenValidator.validateRefreshToken('refresh-token', expiredSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session inactive');
    });

    it('should reject invalid refresh token format', () => {
      const result = tokenValidator.validateRefreshToken('short', mockSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid refresh token format');
    });

    it('should reject mismatched refresh token', () => {
      const result = tokenValidator.validateRefreshToken('different-refresh-token', mockSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid refresh token');
    });

    it('should handle null refresh token', () => {
      const result = tokenValidator.validateRefreshToken(null, mockSession);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Refresh token or session not provided');
    });

    it('should handle null session', () => {
      const result = tokenValidator.validateRefreshToken('refresh-token', null);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Refresh token or session not provided');
    });
  });

  describe('validateTokens (Batch Operations)', () => {
    it('should validate multiple tokens', () => {
      const tokens = [testToken, testToken, testToken];
      const sessions = [mockSession, mockSession, mockSession];
      
      const result = tokenValidator.validateTokens(tokens, sessions);
      
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.results[0].success).toBe(true);
    });

    it('should handle errors in batch validation', () => {
      const tokens = [testToken, 'invalid-token', testToken];
      const sessions = [mockSession, mockSession, mockSession];
      
      const result = tokenValidator.validateTokens(tokens, sessions);
      
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });

    it('should throw error for mismatched arrays', () => {
      const tokens = [testToken, testToken];
      const sessions = [mockSession]; // Different length
      
      expect(() => tokenValidator.validateTokens(tokens, sessions)).toThrow('Tokens and sessions must be arrays');
    });

    it('should throw error for non-array input', () => {
      expect(() => tokenValidator.validateTokens('not-array', [])).toThrow('Tokens and sessions must be arrays');
      expect(() => tokenValidator.validateTokens([], 'not-array')).toThrow('Tokens and sessions must be arrays');
    });
  });

  describe('Configuration Methods', () => {
    it('should check if secure tokens are enabled', () => {
      expect(tokenValidator.isSecureTokensEnabled()).toBe(true);
    });

    it('should set token hasher', () => {
      const newHasher = new TokenHasher('new-salt');
      tokenValidator.setTokenHasher(newHasher);
      expect(tokenValidator.tokenHasher).toBe(newHasher);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      // Should not throw but return error results
      const result = tokenValidator.validateToken('invalid.token', 'prefix', 'hash');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Validation error');
    });

    it('should handle session validation errors gracefully', () => {
      // Should not throw but return error results
      const result = tokenValidator.validateSessionToken('invalid.token', mockSession);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Session validation error');
    });

    it('should handle refresh token validation errors gracefully', () => {
      // Should not throw but return error results
      const result = tokenValidator.validateRefreshToken('invalid-token', mockSession);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid refresh token');
    });
  });
}); 