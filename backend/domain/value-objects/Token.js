const crypto = require('crypto');

/**
 * Token Value Object
 * Handles JWT token validation, prefix extraction, and secure token operations
 */
class Token {
  constructor(token, prefixLength = 20) {
    this._token = token;
    this._prefixLength = prefixLength;
    this._validate();
  }

  // Getters
  get value() { return this._token; }
  get prefix() { return this._token.substring(0, this._prefixLength); }
  get prefixLength() { return this._prefixLength; }
  get length() { return this._token.length; }

  // Validation
  _validate() {
    if (!this._token || typeof this._token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    if (this._token.length < this._prefixLength) {
      throw new Error(`Token must be at least ${this._prefixLength} characters long`);
    }

    // Basic JWT format validation (header.payload.signature)
    const parts = this._token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format: must have 3 parts separated by dots');
    }

    // Validate each part is not empty
    if (!parts[0] || !parts[1] || !parts[2]) {
      throw new Error('Invalid JWT format: all parts must be non-empty');
    }
  }

  // Token operations
  isExpired() {
    try {
      const payload = this._decodePayload();
      if (!payload.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      // If we can't decode, assume expired for security
      return true;
    }
  }

  getExpirationTime() {
    try {
      const payload = this._decodePayload();
      return payload.exp ? new Date(payload.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }

  getUserId() {
    try {
      const payload = this._decodePayload();
      return payload.userId || payload.sub || null;
    } catch (error) {
      return null;
    }
  }

  // Utility methods
  _decodePayload() {
    const parts = this._token.split('.');
    const payload = parts[1];
    
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    try {
      const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid JWT payload format');
    }
  }

  // Factory methods
  static create(token, prefixLength = 20) {
    return new Token(token, prefixLength);
  }

  static fromPrefix(prefix, fullToken) {
    if (!fullToken.startsWith(prefix)) {
      throw new Error('Token does not match the provided prefix');
    }
    return new Token(fullToken, prefix.length);
  }

  // Serialization
  toJSON() {
    return {
      value: this._token,
      prefix: this.prefix,
      prefixLength: this._prefixLength,
      length: this.length,
      isExpired: this.isExpired(),
      expirationTime: this.getExpirationTime(),
      userId: this.getUserId()
    };
  }

  static fromJSON(data) {
    return new Token(data.value, data.prefixLength);
  }
}

module.exports = Token; 