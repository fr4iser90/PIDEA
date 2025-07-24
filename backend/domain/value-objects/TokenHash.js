const crypto = require('crypto');

/**
 * TokenHash Value Object
 * Handles secure token hashing and comparison operations
 */
class TokenHash {
  constructor(token, salt = null) {
    this._token = token;
    this._salt = salt || process.env.TOKEN_SALT_SECRET || 'default-salt';
    this._hash = this._generateHash();
  }

  // Getters
  get hash() { return this._hash; }
  get salt() { return this._salt; }
  get token() { return this._token; }

  // Hash generation
  _generateHash() {
    if (!this._token) {
      throw new Error('Token is required for hash generation');
    }

    const hash = crypto.createHash('sha256');
    hash.update(this._token + this._salt);
    return hash.digest('hex');
  }

  // Secure comparison (constant-time)
  compare(otherHash) {
    if (!otherHash || typeof otherHash !== 'string') {
      return false;
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    try {
      const thisBuffer = Buffer.from(this._hash, 'hex');
      const otherBuffer = Buffer.from(otherHash, 'hex');
      
      if (thisBuffer.length !== otherBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(thisBuffer, otherBuffer);
    } catch (error) {
      // If comparison fails, return false for security
      return false;
    }
  }

  // Verify token against hash
  verify(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const testHash = new TokenHash(token, this._salt);
    return this.compare(testHash.hash);
  }

  // Factory methods
  static create(token, salt = null) {
    return new TokenHash(token, salt);
  }

  static fromHash(hash, salt = null) {
    const instance = new TokenHash('', salt);
    instance._hash = hash;
    return instance;
  }

  // Utility methods
  static generateSalt(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  static validateHash(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    
    // Check if it's a valid SHA-256 hash (64 hex characters)
    return /^[a-f0-9]{64}$/i.test(hash);
  }

  // Serialization
  toJSON() {
    return {
      hash: this._hash,
      salt: this._salt,
      tokenLength: this._token ? this._token.length : 0
    };
  }

  static fromJSON(data) {
    const instance = new TokenHash('', data.salt);
    instance._hash = data.hash;
    return instance;
  }
}

module.exports = TokenHash; 