const TokenHash = require('@domain/value-objects/TokenHash');
const crypto = require('crypto');

describe('TokenHash Value Object', () => {
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
  const testSalt = 'test-salt-123';

  describe('Constructor', () => {
    it('should create a valid token hash with default salt', () => {
      const tokenHash = new TokenHash(testToken);
      expect(tokenHash.token).toBe(testToken);
      expect(tokenHash.salt).toBeDefined();
      expect(tokenHash.hash).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should create a valid token hash with custom salt', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      expect(tokenHash.token).toBe(testToken);
      expect(tokenHash.salt).toBe(testSalt);
      expect(tokenHash.hash).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should throw error for empty token', () => {
      expect(() => new TokenHash('')).toThrow('Token is required for hash generation');
    });

    it('should throw error for null token', () => {
      expect(() => new TokenHash(null)).toThrow('Token is required for hash generation');
    });

    it('should use environment salt when available', () => {
      const originalEnv = process.env.TOKEN_SALT_SECRET;
      process.env.TOKEN_SALT_SECRET = 'env-salt-123';
      
      const tokenHash = new TokenHash(testToken);
      expect(tokenHash.salt).toBe('env-salt-123');
      
      // Restore original environment
      if (originalEnv) {
        process.env.TOKEN_SALT_SECRET = originalEnv;
      } else {
        delete process.env.TOKEN_SALT_SECRET;
      }
    });
  });

  describe('Hash Generation', () => {
    it('should generate consistent hashes for same token and salt', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash(testToken, testSalt);
      expect(hash1.hash).toBe(hash2.hash);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'token1';
      const token2 = 'token2';
      const hash1 = new TokenHash(token1, testSalt);
      const hash2 = new TokenHash(token2, testSalt);
      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should generate different hashes for different salts', () => {
      const salt1 = 'salt1';
      const salt2 = 'salt2';
      const hash1 = new TokenHash(testToken, salt1);
      const hash2 = new TokenHash(testToken, salt2);
      expect(hash1.hash).not.toBe(hash2.hash);
    });

    it('should generate SHA-256 hashes', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      const expectedHash = crypto.createHash('sha256')
        .update(testToken + testSalt)
        .digest('hex');
      expect(tokenHash.hash).toBe(expectedHash);
    });
  });

  describe('Secure Comparison', () => {
    it('should correctly compare identical hashes', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash(testToken, testSalt);
      expect(hash1.compare(hash2.hash)).toBe(true);
    });

    it('should correctly compare different hashes', () => {
      const hash1 = new TokenHash('token1', testSalt);
      const hash2 = new TokenHash('token2', testSalt);
      expect(hash1.compare(hash2.hash)).toBe(false);
    });

    it('should handle null hash comparison', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      expect(hash1.compare(null)).toBe(false);
    });

    it('should handle undefined hash comparison', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      expect(hash1.compare(undefined)).toBe(false);
    });

    it('should handle empty string hash comparison', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      expect(hash1.compare('')).toBe(false);
    });

    it('should handle invalid hex hash comparison', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      expect(hash1.compare('invalid-hex')).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash(testToken, testSalt);
      const differentHash = new TokenHash('different', testSalt);
      
      // Both comparisons should take similar time (constant-time)
      const start1 = Date.now();
      hash1.compare(hash2.hash);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      hash1.compare(differentHash.hash);
      const time2 = Date.now() - start2;
      
      // Times should be similar (within 10ms tolerance)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('Token Verification', () => {
    it('should verify token against hash', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      expect(tokenHash.verify(testToken)).toBe(true);
    });

    it('should reject different token', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      expect(tokenHash.verify('different-token')).toBe(false);
    });

    it('should handle null token verification', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      expect(tokenHash.verify(null)).toBe(false);
    });

    it('should handle undefined token verification', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      expect(tokenHash.verify(undefined)).toBe(false);
    });
  });

  describe('Factory Methods', () => {
    it('should create token hash using static create method', () => {
      const tokenHash = TokenHash.create(testToken, testSalt);
      expect(tokenHash).toBeInstanceOf(TokenHash);
      expect(tokenHash.token).toBe(testToken);
      expect(tokenHash.salt).toBe(testSalt);
    });

    it('should create token hash from existing hash', () => {
      const originalHash = new TokenHash(testToken, testSalt);
      const fromHash = TokenHash.fromHash(originalHash.hash, testSalt);
      
      expect(fromHash).toBeInstanceOf(TokenHash);
      expect(fromHash.hash).toBe(originalHash.hash);
      expect(fromHash.salt).toBe(testSalt);
      expect(fromHash.token).toBe(''); // Token is not stored in fromHash
    });
  });

  describe('Utility Methods', () => {
    it('should generate random salt', () => {
      const salt1 = TokenHash.generateSalt();
      const salt2 = TokenHash.generateSalt();
      
      expect(salt1).toMatch(/^[a-f0-9]{64}$/i);
      expect(salt2).toMatch(/^[a-f0-9]{64}$/i);
      expect(salt1).not.toBe(salt2);
    });

    it('should generate salt with custom length', () => {
      const salt = TokenHash.generateSalt(16);
      expect(salt).toMatch(/^[a-f0-9]{32}$/i); // 16 bytes = 32 hex chars
    });

    it('should validate correct hash format', () => {
      const validHash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      expect(TokenHash.validateHash(validHash)).toBe(true);
    });

    it('should reject invalid hash format', () => {
      expect(TokenHash.validateHash('invalid')).toBe(false);
      expect(TokenHash.validateHash('')).toBe(false);
      expect(TokenHash.validateHash(null)).toBe(false);
      expect(TokenHash.validateHash('a1b2c3')).toBe(false); // Too short
      expect(TokenHash.validateHash('a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567')).toBe(false); // Too long
    });
  });

  describe('Serialization', () => {
    it('should correctly serialize to JSON', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      const json = tokenHash.toJSON();
      
      expect(json.hash).toBe(tokenHash.hash);
      expect(json.salt).toBe(testSalt);
      expect(json.tokenLength).toBe(testToken.length);
    });

    it('should correctly deserialize from JSON', () => {
      const originalHash = new TokenHash(testToken, testSalt);
      const json = originalHash.toJSON();
      const deserializedHash = TokenHash.fromJSON(json);
      
      expect(deserializedHash.hash).toBe(originalHash.hash);
      expect(deserializedHash.salt).toBe(originalHash.salt);
    });
  });

  describe('Error Handling', () => {
    it('should handle hash comparison errors gracefully', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      
      // Should not throw but return false for invalid comparisons
      expect(tokenHash.compare('invalid-hex')).toBe(false);
      expect(tokenHash.compare('')).toBe(false);
      expect(tokenHash.compare(null)).toBe(false);
    });

    it('should handle verification errors gracefully', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      
      // Should not throw but return false for invalid verifications
      expect(tokenHash.verify('')).toBe(false);
      expect(tokenHash.verify(null)).toBe(false);
      expect(tokenHash.verify(undefined)).toBe(false);
    });
  });
}); 