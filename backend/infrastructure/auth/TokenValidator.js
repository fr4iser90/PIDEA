const Token = require('@domain/value-objects/Token');
const TokenHash = require('@domain/value-objects/TokenHash');
const TokenHasher = require('./TokenHasher');
const Logger = require('@logging/Logger');
const logger = new Logger('TokenValidator');

/**
 * TokenValidator - Infrastructure Layer
 * Provides secure token validation operations and utilities
 */
class TokenValidator {
  constructor(tokenHasher = null) {
    this._tokenHasher = tokenHasher || new TokenHasher();
    
    logger.info('🔐 TokenValidator initialized', {
      saltLength: this._tokenHasher.salt.length,
      prefixLength: this._tokenHasher.prefixLength
    });
  }

  // Core validation operations
  validateToken(fullToken, storedPrefix, storedHash = null) {
    if (!fullToken) {
      logger.warn('❌ Token validation failed: no token provided');
      return { isValid: false, reason: 'No token provided' };
    }

    try {
      // Basic token format validation
      const tokenVO = new Token(fullToken);
      
      // Check if token is expired
      if (tokenVO.isExpired()) {
        logger.warn('❌ Token validation failed: token expired', {
          tokenLength: fullToken.length,
          expirationTime: tokenVO.getExpirationTime()
        });
        return { isValid: false, reason: 'Token expired' };
      }

      // Validate hash (secure tokens always enabled)
      if (storedHash) {
        const isValidHash = this._tokenHasher.validateToken(fullToken, storedHash);
        if (!isValidHash) {
          logger.warn('❌ Token validation failed: invalid hash', {
            tokenLength: fullToken.length,
            hashLength: storedHash.length
          });
          return { isValid: false, reason: 'Invalid token hash' };
        }
      }

      // Validate prefix match (for quick lookup)
      if (storedPrefix && !fullToken.startsWith(storedPrefix)) {
        logger.warn('❌ Token validation failed: prefix mismatch', {
          tokenPrefix: tokenVO.prefix,
          storedPrefix: storedPrefix
        });
        return { isValid: false, reason: 'Token prefix mismatch' };
      }

      logger.info('✅ Token validation successful', {
        tokenLength: fullToken.length,
        userId: tokenVO.getUserId(),
        isExpired: tokenVO.isExpired()
      });

      return {
        isValid: true,
        userId: tokenVO.getUserId(),
        expirationTime: tokenVO.getExpirationTime(),
        tokenInfo: tokenVO.toJSON()
      };

    } catch (error) {
      logger.error('❌ Token validation failed with error', { error: error.message });
      return { isValid: false, reason: `Validation error: ${error.message}` };
    }
  }

  // Validate session token
  validateSessionToken(fullToken, session) {
    if (!fullToken || !session) {
      return { isValid: false, reason: 'Token or session not provided' };
    }

    try {
      // Check if session is active
      if (!session.isActive()) {
        logger.warn('❌ Session validation failed: session inactive', {
          sessionId: session.id,
          userId: session.userId
        });
        return { isValid: false, reason: 'Session inactive' };
      }

      // Validate token against session
      const validationResult = this.validateToken(
        fullToken,
        session.accessTokenStart,
        session.accessTokenHash
      );

      if (!validationResult.isValid) {
        return validationResult;
      }

      // Additional session-specific validations
      if (validationResult.userId && validationResult.userId !== session.userId) {
        logger.warn('❌ Session validation failed: user ID mismatch', {
          tokenUserId: validationResult.userId,
          sessionUserId: session.userId
        });
        return { isValid: false, reason: 'User ID mismatch' };
      }

      logger.info('✅ Session token validation successful', {
        sessionId: session.id,
        userId: session.userId,
        tokenLength: fullToken.length
      });

      return {
        isValid: true,
        session: session,
        userId: validationResult.userId,
        expirationTime: validationResult.expirationTime
      };

    } catch (error) {
      logger.error('❌ Session token validation failed with error', { error: error.message });
      return { isValid: false, reason: `Session validation error: ${error.message}` };
    }
  }

  // Validate refresh token
  validateRefreshToken(refreshToken, session) {
    if (!refreshToken || !session) {
      return { isValid: false, reason: 'Refresh token or session not provided' };
    }

    try {
      // Check if session is active
      if (!session.isActive()) {
        logger.warn('❌ Refresh token validation failed: session inactive', {
          sessionId: session.id,
          userId: session.userId
        });
        return { isValid: false, reason: 'Session inactive' };
      }

      // Validate refresh token format
      if (refreshToken.length < 10) {
        logger.warn('❌ Refresh token validation failed: invalid format', {
          tokenLength: refreshToken.length
        });
        return { isValid: false, reason: 'Invalid refresh token format' };
      }

      // Compare refresh tokens
      const isValidRefresh = this._tokenHasher.compareTokens(refreshToken, session.refreshToken);
      if (!isValidRefresh) {
        logger.warn('❌ Refresh token validation failed: token mismatch', {
          sessionId: session.id,
          userId: session.userId
        });
        return { isValid: false, reason: 'Invalid refresh token' };
      }

      logger.info('✅ Refresh token validation successful', {
        sessionId: session.id,
        userId: session.userId
      });

      return {
        isValid: true,
        session: session,
        userId: session.userId
      };

    } catch (error) {
      logger.error('❌ Refresh token validation failed with error', { error: error.message });
      return { isValid: false, reason: `Refresh validation error: ${error.message}` };
    }
  }

  // Batch validation
  validateTokens(tokens, sessions) {
    if (!Array.isArray(tokens) || !Array.isArray(sessions)) {
      throw new Error('Tokens and sessions must be arrays');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < tokens.length; i++) {
      try {
        const session = sessions[i];
        const result = this.validateSessionToken(tokens[i], session);
        
        results.push({
          index: i,
          success: result.isValid,
          data: result
        });

        if (!result.isValid) {
          errors.push({
            index: i,
            success: false,
            error: result.reason
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }

    logger.info('🔐 Batch token validation completed', {
      total: tokens.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length
    });

    return { results, errors };
  }

  // Utility methods
  isSecureTokensEnabled() {
    return true; // Secure tokens are always enabled
  }

  // Configuration
  get tokenHasher() { return this._tokenHasher; }

  setTokenHasher(tokenHasher) {
    this._tokenHasher = tokenHasher;
    logger.info('🔐 TokenValidator hasher updated');
  }
}

module.exports = TokenValidator; 