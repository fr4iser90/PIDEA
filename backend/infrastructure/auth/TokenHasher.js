const TokenHash = require('@domain/value-objects/TokenHash');
const Token = require('@domain/value-objects/Token');
const Logger = require('@logging/Logger');
const logger = new Logger('TokenHasher');

/**
 * TokenHasher - Infrastructure Layer
 * Provides secure token hashing operations and utilities
 */
class TokenHasher {
  constructor(salt = null) {
    this._salt = salt || process.env.TOKEN_SALT_SECRET || 'default-salt';
    this._prefixLength = parseInt(process.env.TOKEN_PREFIX_LENGTH) || 20;
    
    // TokenHasher initialization logs removed for cleaner output
  }

  // Core hashing operations
  hashToken(token) {
    if (!token) {
      throw new Error('Token is required for hashing');
    }

    try {
      const tokenVO = new Token(token, this._prefixLength);
      const tokenHash = new TokenHash(token, this._salt);
      
      logger.debug('🔐 Token hashed successfully', {
        tokenLength: token.length,
        prefix: tokenVO.prefix,
        hashLength: tokenHash.hash.length
      });

      return {
        prefix: tokenVO.prefix,
        hash: tokenHash.hash,
        token: tokenVO
      };
    } catch (error) {
      logger.error('❌ Token hashing failed', { error: error.message });
      throw new Error(`Token hashing failed: ${error.message}`);
    }
  }

  // Token validation
  validateToken(fullToken, storedHash) {
    if (!fullToken || !storedHash) {
      return false;
    }

    try {
      const tokenHash = new TokenHash(fullToken, this._salt);
      const isValid = tokenHash.compare(storedHash);
      
      logger.debug('🔐 Token validation result', {
        isValid,
        tokenLength: fullToken.length,
        hashLength: storedHash.length
      });

      return isValid;
    } catch (error) {
      logger.error('❌ Token validation failed', { error: error.message });
      return false;
    }
  }

  // Secure token comparison
  compareTokens(token1, token2) {
    if (!token1 || !token2) {
      return false;
    }

    try {
      const hash1 = new TokenHash(token1, this._salt);
      const hash2 = new TokenHash(token2, this._salt);
      
      return hash1.compare(hash2.hash);
    } catch (error) {
      logger.error('❌ Token comparison failed', { error: error.message });
      return false;
    }
  }

  // Token prefix operations
  extractPrefix(token) {
    if (!token) {
      throw new Error('Token is required for prefix extraction');
    }

    try {
      const tokenVO = new Token(token, this._prefixLength);
      return tokenVO.prefix;
    } catch (error) {
      logger.error('❌ Token prefix extraction failed', { error: error.message });
      throw new Error(`Token prefix extraction failed: ${error.message}`);
    }
  }

  // Token information extraction
  getTokenInfo(token) {
    if (!token) {
      throw new Error('Token is required for info extraction');
    }

    try {
      const tokenVO = new Token(token, this._prefixLength);
      const tokenHash = new TokenHash(token, this._salt);
      
      return {
        prefix: tokenVO.prefix,
        hash: tokenHash.hash,
        length: tokenVO.length,
        isExpired: tokenVO.isExpired(),
        expirationTime: tokenVO.getExpirationTime(),
        userId: tokenVO.getUserId()
      };
    } catch (error) {
      logger.error('❌ Token info extraction failed', { error: error.message });
      throw new Error(`Token info extraction failed: ${error.message}`);
    }
  }

  // Batch operations
  hashTokens(tokens) {
    if (!Array.isArray(tokens)) {
      throw new Error('Tokens must be an array');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < tokens.length; i++) {
      try {
        const result = this.hashToken(tokens[i]);
        results.push({
          index: i,
          success: true,
          data: result
        });
      } catch (error) {
        errors.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }

    logger.info('🔐 Batch token hashing completed', {
      total: tokens.length,
      successful: results.length,
      failed: errors.length
    });

    return { results, errors };
  }

  // Utility methods
  generateSalt(length = 32) {
    return TokenHash.generateSalt(length);
  }

  validateHash(hash) {
    return TokenHash.validateHash(hash);
  }

  // Configuration
  get salt() { return this._salt; }
  get prefixLength() { return this._prefixLength; }

  setSalt(salt) {
    this._salt = salt;
    logger.info('🔐 TokenHasher salt updated', { saltLength: salt.length });
  }

  setPrefixLength(length) {
    this._prefixLength = length;
    logger.info('🔐 TokenHasher prefix length updated', { prefixLength: length });
  }
}

module.exports = TokenHasher; 