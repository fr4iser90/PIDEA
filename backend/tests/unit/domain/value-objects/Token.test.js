const Token = require('@domain/value-objects/Token');

describe('Token Value Object', () => {
  const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';

  describe('Constructor', () => {
    it('should create a valid token with default prefix length', () => {
      const token = new Token(validJWT);
      expect(token.value).toBe(validJWT);
      expect(token.prefix).toBe('eyJhbGciOiJIUzI1NiIs');
      expect(token.prefixLength).toBe(20);
      expect(token.length).toBe(validJWT.length);
    });

    it('should create a valid token with custom prefix length', () => {
      const token = new Token(validJWT, 10);
      expect(token.prefix).toBe('eyJhbGciOiJ');
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
      expect(token.prefix).toBe('eyJhbGciOiJIUzI1NiIs');
    });

    it('should correctly decode payload', () => {
      const payload = token._decodePayload();
      expect(payload.userId).toBe('test-user');
      expect(payload.iat).toBe(1634567890);
      expect(payload.exp).toBe(1634571490);
    });

    it('should correctly identify expired token', () => {
      const expiredJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU2Nzg5MX0.expired-signature';
      const expiredToken = new Token(expiredJWT);
      expect(expiredToken.isExpired()).toBe(true);
    });

    it('should correctly identify non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const futureJWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6${futureExp}0.future-signature`;
      const futureToken = new Token(futureJWT);
      expect(futureToken.isExpired()).toBe(false);
    });

    it('should return null for expiration time when no exp claim', () => {
      const noExpJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTB9.no-exp-signature';
      const noExpToken = new Token(noExpJWT);
      expect(noExpToken.getExpirationTime()).toBeNull();
    });

    it('should correctly extract user ID from payload', () => {
      expect(token.getUserId()).toBe('test-user');
    });

    it('should return null for user ID when not present', () => {
      const noUserIdJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.no-user-signature';
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
      const prefix = 'eyJhbGciOiJIUzI1NiIs';
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
      expect(json.prefix).toBe('eyJhbGciOiJIUzI1NiIs');
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
      const malformedJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-base64.signature';
      const token = new Token(malformedJWT);
      
      // Should not throw but return null for payload operations
      expect(token.getUserId()).toBeNull();
      expect(token.getExpirationTime()).toBeNull();
    });

    it('should handle invalid JSON in payload', () => {
      const invalidJSONJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZhbGlkLWpzb24=.signature';
      const token = new Token(invalidJSONJWT);
      
      // Should not throw but return null for payload operations
      expect(token.getUserId()).toBeNull();
      expect(token.getExpirationTime()).toBeNull();
    });
  });
}); 