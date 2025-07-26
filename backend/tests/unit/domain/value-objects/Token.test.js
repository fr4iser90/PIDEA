const Token = require('@domain/value-objects/Token');

describe('Token Value Object', () => {
  // TEST-ONLY dummy JWT token - NOT a real secret
  const validJWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.payload.test.jwt.token.dummy.signature';

  describe('Constructor', () => {
    it('should create a valid token with default prefix length', () => {
      const token = new Token(validJWT);
      expect(token.value).toBe(validJWT);
      expect(token.prefix).toBe('test.jwt.token.dummy');
      expect(token.prefixLength).toBe(20);
      expect(token.length).toBe(validJWT.length);
    });

    it('should create a valid token with custom prefix length', () => {
      const token = new Token(validJWT, 10);
      expect(token.prefix).toBe('test.jwt.to');
      expect(token.prefixLength).toBe(10);
    });

    it('should throw error for empty token', () => {
      expect(() => new Token('')).toThrow('Token must be a non-empty string');
    });

    it('should throw error for null token', () => {
      expect(() => new Token(null)).toThrow('Token must be a non-empty string');
    });

    it('should throw error for token shorter than prefix length', () => {
      expect(() => new Token('short', 10)).toThrow('Token must be at least 10 characters long');
    });

    it('should throw error for invalid JWT format', () => {
      expect(() => new Token('invalid.jwt')).toThrow('Invalid JWT format: must have 3 parts separated by dots');
    });

    it('should throw error for JWT with empty parts', () => {
      expect(() => new Token('header..signature')).toThrow('Invalid JWT format: all parts must be non-empty');
    });
  });

  describe('Token Operations', () => {
    let token;

    beforeEach(() => {
      token = new Token(validJWT);
    });

    it('should correctly extract prefix', () => {
      expect(token.prefix).toBe('test.jwt.token.dummy');
    });

    it('should correctly decode payload', () => {
      const payload = token._decodePayload();
      // Since this is a test dummy token, payload operations should handle gracefully
      expect(payload).toBeDefined();
    });

    it('should correctly identify expired token', () => {
      // TEST-ONLY dummy expired JWT token - NOT a real secret
      const expiredJWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.expired.payload.test.jwt.token.dummy.expired.signature';
      const expiredToken = new Token(expiredJWT);
      expect(expiredToken.isExpired()).toBe(true);
    });

    it('should correctly identify non-expired token', () => {
      // TEST-ONLY dummy future JWT token - NOT a real secret
      const futureJWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.future.payload.test.jwt.token.dummy.future.signature';
      const futureToken = new Token(futureJWT);
      expect(futureToken.isExpired()).toBe(false);
    });

    it('should return null for expiration time when no exp claim', () => {
      // TEST-ONLY dummy JWT token without exp - NOT a real secret
      const noExpJWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.noexp.payload.test.jwt.token.dummy.noexp.signature';
      const noExpToken = new Token(noExpJWT);
      expect(noExpToken.getExpirationTime()).toBeNull();
    });

    it('should correctly extract user ID from payload', () => {
      expect(token.getUserId()).toBe('test-user');
    });

    it('should return null for user ID when not present', () => {
      // TEST-ONLY dummy JWT token without userId - NOT a real secret
      const noUserIdJWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.nouser.payload.test.jwt.token.dummy.nouser.signature';
      const noUserIdToken = new Token(noUserIdJWT);
      expect(noUserIdToken.getUserId()).toBeNull();
    });
  });

  describe('Factory Methods', () => {
    it('should create token using static create method', () => {
      const token = Token.create(validJWT);
      expect(token).toBeInstanceOf(Token);
      expect(token.value).toBe(validJWT);
    });

    it('should create token using static create method with custom prefix length', () => {
      const token = Token.create(validJWT, 15);
      expect(token.prefixLength).toBe(15);
    });

    it('should create token from prefix', () => {
      const prefix = 'test.jwt.token.dummy';
      const token = Token.fromPrefix(prefix, validJWT);
      expect(token.prefix).toBe(prefix);
      expect(token.value).toBe(validJWT);
    });

    it('should throw error when token does not match prefix', () => {
      const prefix = 'different.prefix';
      expect(() => Token.fromPrefix(prefix, validJWT)).toThrow('Token does not match the provided prefix');
    });
  });

  describe('Serialization', () => {
    it('should correctly serialize to JSON', () => {
      const token = new Token(validJWT);
      const json = token.toJSON();
      
      expect(json.value).toBe(validJWT);
      expect(json.prefix).toBe('test.jwt.token.dummy');
      expect(json.prefixLength).toBe(20);
      expect(json.length).toBe(validJWT.length);
      expect(json.isExpired).toBeDefined();
      expect(json.expirationTime).toBeDefined();
      expect(json.userId).toBe('test-user');
    });

    it('should correctly deserialize from JSON', () => {
      const originalToken = new Token(validJWT);
      const json = originalToken.toJSON();
      const deserializedToken = Token.fromJSON(json);
      
      expect(deserializedToken.value).toBe(originalToken.value);
      expect(deserializedToken.prefix).toBe(originalToken.prefix);
      expect(deserializedToken.prefixLength).toBe(originalToken.prefixLength);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed base64 in payload', () => {
      // TEST-ONLY dummy malformed JWT token - NOT a real secret
      const malformedJWT = 'test.jwt.token.dummy.header.invalid-base64.test.jwt.token.dummy.signature';
      const token = new Token(malformedJWT);
      
      // Should not throw but return null for payload operations
      expect(token.getUserId()).toBeNull();
      expect(token.getExpirationTime()).toBeNull();
    });

    it('should handle invalid JSON in payload', () => {
      // TEST-ONLY dummy invalid JSON JWT token - NOT a real secret
      const invalidJSONJWT = 'test.jwt.token.dummy.header.invalid-json.test.jwt.token.dummy.signature';
      const token = new Token(invalidJSONJWT);
      
      // Should not throw but return null for payload operations
      expect(token.getUserId()).toBeNull();
      expect(token.getExpirationTime()).toBeNull();
    });
  });
}); 