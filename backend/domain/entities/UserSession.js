const { v4: uuidv4 } = require('uuid');
const Token = require('@domain/value-objects/Token');
const TokenHash = require('@domain/value-objects/TokenHash');

class UserSession {
  constructor(id, userId, accessToken, refreshToken, expiresAt, createdAt, metadata = {}, accessTokenHash = null) {
    this._id = id || uuidv4();
    this._userId = userId;
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    this._expiresAt = expiresAt;
    this._createdAt = createdAt || new Date();
    this._metadata = metadata;
    this._accessTokenHash = accessTokenHash;
    this._validate();
  }

  // Getters
  get id() { return this._id; }
  get userId() { return this._userId; }
  get accessToken() { return this._accessToken; }
  get refreshToken() { return this._refreshToken; }
  get expiresAt() { return this._expiresAt; }
  get createdAt() { return this._createdAt; }
  get metadata() { return { ...this._metadata }; }
  get accessTokenHash() { return this._accessTokenHash; }
  
  // Secure token getters
  get accessTokenStart() { 
    return this._accessToken ? this._accessToken.substring(0, 20) : null; 
  }

  // Domain methods
  isExpired() {
    return new Date() > this._expiresAt;
  }

  isActive() {
    return !this.isExpired();
  }

  getTimeUntilExpiry() {
    return this._expiresAt.getTime() - new Date().getTime();
  }

  shouldRefresh() {
    // Refresh if less than 5 minutes remaining
    return this.getTimeUntilExpiry() < 5 * 60 * 1000;
  }

  updateLastActivity() {
    this._metadata.lastActivity = new Date();
  }

  // Business rules validation
  _validate() {
    if (!this._userId) {
      throw new Error('UserSession userId cannot be empty');
    }
    if (!this._accessToken || this._accessToken.length < 10) {
      throw new Error('UserSession accessToken is invalid');
    }
    if (!this._refreshToken || this._refreshToken.length < 10) {
      throw new Error('UserSession refreshToken is invalid');
    }
    if (!(this._expiresAt instanceof Date)) {
      throw new Error('UserSession expiresAt must be a Date object');
    }
    if (!(this._createdAt instanceof Date)) {
      throw new Error('UserSession createdAt must be a Date object');
    }
  }

  // Secure token validation
  validateToken(fullToken) {
    if (!fullToken || !this._accessTokenHash) {
      return false;
    }

    try {
      const tokenHash = new TokenHash(fullToken);
      return tokenHash.compare(this._accessTokenHash);
    } catch (error) {
      return false;
    }
  }

  // Set token hash (for secure token migration)
  setAccessTokenHash(hash) {
    this._accessTokenHash = hash;
  }

  // Factory methods
  static createSession(userId, accessToken, refreshToken, expiresAt, metadata = {}) {
    return new UserSession(
      null,
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      new Date(),
      metadata
    );
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      accessToken: this._accessToken,
      refreshToken: this._refreshToken,
      expiresAt: this._expiresAt.toISOString(),
      createdAt: this._createdAt.toISOString(),
      metadata: this._metadata,
      accessTokenHash: this._accessTokenHash
    };
  }

  static fromJSON(data) {
    return new UserSession(
      data.id,
      data.userId,
      data.accessToken,
      data.refreshToken,
      new Date(data.expiresAt),
      new Date(data.createdAt),
      data.metadata,
      data.accessTokenHash
    );
  }
}

module.exports = UserSession; 