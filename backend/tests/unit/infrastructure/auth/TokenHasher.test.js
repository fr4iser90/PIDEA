const TokenHasher = require('@infrastructure/auth/TokenHasher');
const Token = require('@domain/value-objects/Token');
const TokenHash = require('@domain/value-objects/TokenHash');

describe('TokenHasher', () => {
  // TEST-ONLY dummy JWT token - NOT a real secret
  const testToken = 'test.jwt.token.dummy.header.test.jwt.token.dummy.payload.test.jwt.token.dummy.signature';
  const testSalt = 'test-salt-123';

  let tokenHasher;

  beforeEach(() => {
    tokenHasher = new TokenHasher(testSalt);
  });

  describe('Constructor', () => {
    it('should initialize with custom salt', () => {
      expect(tokenHasher.salt).toBe(testSalt);
      expect(tokenHasher.prefixLength).toBe(20);
    });

    it('should initialize with default salt when none provided', () => {
      const defaultHasher = new TokenHasher();
      expect(defaultHasher.salt).toBeDefined();
      expect(defaultHasher.prefixLength).toBe(20);
    });

    it('should use environment variables for configuration', () => {
      const originalSalt = process.env.TOKEN_SALT_SECRET;
      const originalPrefix = process.env.TOKEN_PREFIX_LENGTH;
      
      process.env.TOKEN_SALT_SECRET = 'env-salt-123';
      process.env.TOKEN_PREFIX_LENGTH = '15';
      
      const envHasher = new TokenHasher();
      expect(envHasher.salt).toBe('env-salt-123');
      expect(envHasher.prefixLength).toBe(15);
      
      // Restore environment
      if (originalSalt) {
        process.env.TOKEN_SALT_SECRET = originalSalt;
      } else {
        delete process.env.TOKEN_SALT_SECRET;
      }
      
      if (originalPrefix) {
        process.env.TOKEN_PREFIX_LENGTH = originalPrefix;
      } else {
        delete process.env.TOKEN_PREFIX_LENGTH;
      }
    });
  });

  describe('hashToken', () => {
    it('should hash token and return prefix and hash', () => {
      const result = tokenHasher.hashToken(testToken);
      
      expect(result.prefix).toBe('test.jwt.token.dummy');
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/i);
      expect(result.token).toBeInstanceOf(Token);
    });

    it('should throw error for empty token', () => {
      expect(() => tokenHasher.hashToken('')).toThrow('Token is required for hashing');
    });

    it('should throw error for null token', () => {
      expect(() => tokenHasher.hashToken(null)).toThrow('Token is required for hashing');
    });

    it('should generate consistent results for same token', () => {
      const result1 = tokenHasher.hashToken(testToken);
      const result2 = tokenHasher.hashToken(testToken);
      
      expect(result1.prefix).toBe(result2.prefix);
      expect(result1.hash).toBe(result2.hash);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'token1';
      const token2 = 'token2';
      
      const result1 = tokenHasher.hashToken(token1);
      const result2 = tokenHasher.hashToken(token2);
      
      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('validateToken', () => {
    it('should validate token against stored hash', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const isValid = tokenHasher.validateToken(testToken, hashResult.hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid token', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const isValid = tokenHasher.validateToken('different-token', hashResult.hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle null token', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const isValid = tokenHasher.validateToken(null, hashResult.hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle null hash', () => {
      const isValid = tokenHasher.validateToken(testToken, null);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty token', () => {
      const hashResult = tokenHasher.hashToken(testToken);
      const isValid = tokenHasher.validateToken('', hashResult.hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('compareTokens', () => {
    it('should compare two tokens correctly', () => {
      const isValid = tokenHasher.compareTokens(testToken, testToken);
      expect(isValid).toBe(true);
    });

    it('should reject different tokens', () => {
      const isValid = tokenHasher.compareTokens(testToken, 'different-token');
      expect(isValid).toBe(false);
    });

    it('should handle null tokens', () => {
      expect(tokenHasher.compareTokens(null, testToken)).toBe(false);
      expect(tokenHasher.compareTokens(testToken, null)).toBe(false);
      expect(tokenHasher.compareTokens(null, null)).toBe(false);
    });
  });

  describe('extractPrefix', () => {
    it('should extract token prefix', () => {
      const prefix = tokenHasher.extractPrefix(testToken);
      expect(prefix).toBe('test.jwt.token.dummy');
    });

    it('should throw error for empty token', () => {
      expect(() => tokenHasher.extractPrefix('')).toThrow('Token is required for prefix extraction');
    });

    it('should throw error for null token', () => {
      expect(() => tokenHasher.extractPrefix(null)).toThrow('Token is required for prefix extraction');
    });
  });

  describe('getTokenInfo', () => {
    it('should return complete token information', () => {
      const info = tokenHasher.getTokenInfo(testToken);
      
      expect(info.prefix).toBe('test.jwt.token.dummy');
      expect(info.hash).toMatch(/^[a-f0-9]{64}$/i);
      expect(info.length).toBe(testToken.length);
      expect(info.isExpired).toBeDefined();
      expect(info.expirationTime).toBeDefined();
      expect(info.userId).toBe('test-user');
    });

    it('should throw error for empty token', () => {
      expect(() => tokenHasher.getTokenInfo('')).toThrow('Token is required for info extraction');
    });

    it('should throw error for null token', () => {
      expect(() => tokenHasher.getTokenInfo(null)).toThrow('Token is required for info extraction');
    });
  });

  describe('hashTokens (Batch Operations)', () => {
    it('should hash multiple tokens', () => {
      const tokens = [testToken, 'token2', 'token3'];
      const result = tokenHasher.hashTokens(tokens);
      
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data.prefix).toBe('test.jwt.token.dummy');
    });

    it('should handle errors in batch operations', () => {
      const tokens = [testToken, '', 'token3'];
      const result = tokenHasher.hashTokens(tokens);
      
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });

    it('should throw error for non-array input', () => {
      expect(() => tokenHasher.hashTokens('not-an-array')).toThrow('Tokens must be an array');
    });
  });

  describe('Utility Methods', () => {
    it('should generate salt', () => {
      const salt = tokenHasher.generateSalt();
      expect(salt).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should generate salt with custom length', () => {
      const salt = tokenHasher.generateSalt(16);
      expect(salt).toMatch(/^[a-f0-9]{32}$/i);
    });

    it('should validate hash format', () => {
      const validHash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      expect(tokenHasher.validateHash(validHash)).toBe(true);
      
      expect(tokenHasher.validateHash('invalid')).toBe(false);
      expect(tokenHasher.validateHash('')).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should update salt', () => {
      const newSalt = 'new-salt-123';
      tokenHasher.setSalt(newSalt);
      expect(tokenHasher.salt).toBe(newSalt);
    });

    it('should update prefix length', () => {
      const newLength = 15;
      tokenHasher.setPrefixLength(newLength);
      expect(tokenHasher.prefixLength).toBe(newLength);
    });
  });

  describe('Error Handling', () => {
    it('should handle token validation errors gracefully', () => {
      // Should not throw but return false for invalid inputs
      expect(tokenHasher.validateToken('', 'some-hash')).toBe(false);
      expect(tokenHasher.validateToken(null, 'some-hash')).toBe(false);
      expect(tokenHasher.validateToken('token', '')).toBe(false);
    });

    it('should handle token comparison errors gracefully', () => {
      // Should not throw but return false for invalid inputs
      expect(tokenHasher.compareTokens('', 'token2')).toBe(false);
      expect(tokenHasher.compareTokens('token1', '')).toBe(false);
      expect(tokenHasher.compareTokens(null, null)).toBe(false);
    });
  });
}); 