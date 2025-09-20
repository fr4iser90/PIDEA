# Phase 3: Core Implementation - Secure Token System

## Phase Overview
**Status:** Pending  
**Duration:** 2 days  
**Priority:** High

## Objectives
- Implement main functionality across all layers
- Create/modify domain entities and value objects
- Implement application services and handlers
- Create/modify infrastructure components
- Implement presentation layer components
- Add error handling and validation logic

## Detailed Tasks

### 3.1 Domain Layer Implementation

#### 3.1.1 Update UserSession Entity
- [ ] Modify `backend/domain/entities/UserSession.js`
  - [ ] Replace `accessToken` with `accessTokenStart` and `accessTokenHash`
  - [ ] Add token validation methods
  - [ ] Update constructor and factory methods
  - [ ] Add secure token comparison logic
  - [ ] Maintain backward compatibility with existing methods

```javascript
class UserSession {
  constructor(id, userId, accessTokenStart, accessTokenHash, refreshToken, expiresAt, createdAt, metadata) {
    this.id = id;
    this.userId = userId;
    this.accessTokenStart = accessTokenStart;
    this.accessTokenHash = accessTokenHash;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.metadata = metadata || {};
  }
  
  validateToken(fullToken) {
    const tokenHash = new TokenHash(fullToken, process.env.TOKEN_SALT_SECRET);
    return tokenHash.compare(this.accessTokenHash);
  }
  
  // Backward compatibility
  get accessToken() {
    return this.accessTokenStart + '...'; // Mock for compatibility
  }
}
```

#### 3.1.2 Implement Token Value Object
- [ ] Complete `backend/domain/value-objects/Token.js`
  - [ ] Add JWT format validation
  - [ ] Implement prefix extraction with configurable length
  - [ ] Add token expiration checking
  - [ ] Include utility methods for token manipulation

```javascript
class Token {
  constructor(value) {
    this.validate(value);
    this.value = value;
    this.prefix = this.extractPrefix(value);
    this.payload = this.decodePayload(value);
  }
  
  validate(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
  }
  
  extractPrefix(token, length = process.env.TOKEN_PREFIX_LENGTH || 20) {
    return token.substring(0, parseInt(length));
  }
  
  isExpired() {
    if (!this.payload.exp) return false;
    return Date.now() >= this.payload.exp * 1000;
  }
}
```

#### 3.1.3 Implement TokenHash Value Object
- [ ] Complete `backend/domain/value-objects/TokenHash.js`
  - [ ] Implement SHA-256 hashing with salt
  - [ ] Add constant-time comparison for security
  - [ ] Include hash validation methods
  - [ ] Add performance optimization

```javascript
const crypto = require('crypto');

class TokenHash {
  constructor(token, salt) {
    this.hash = this.generateHash(token, salt);
    this.salt = salt;
  }
  
  generateHash(token, salt) {
    const hash = crypto.createHash('sha256');
    hash.update(token + salt);
    return hash.digest('hex');
  }
  
  compare(otherHash) {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(this.hash, 'hex'),
      Buffer.from(otherHash, 'hex')
    );
  }
  
  static fromHash(hash, salt) {
    const instance = new TokenHash('', salt);
    instance.hash = hash;
    return instance;
  }
}
```

### 3.2 Infrastructure Layer Implementation

#### 3.2.1 Update Database Connection
- [ ] Modify `backend/infrastructure/database/DatabaseConnection.js`
  - [ ] Update table creation with new secure token columns
  - [ ] Add migration support for existing data
  - [ ] Update indexes for performance
  - [ ] Add rollback procedures

```sql
-- Updated table creation
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'me',
  access_token_start TEXT NOT NULL,
  access_token_hash TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_start ON user_sessions(access_token_start);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
```

#### 3.2.2 Update PostgreSQL Repository
- [ ] Modify `backend/infrastructure/database/PostgreSQLUserSessionRepository.js`
  - [ ] Update all SQL queries to use new columns
  - [ ] Implement secure token storage and retrieval
  - [ ] Add token validation methods
  - [ ] Update all CRUD operations
  - [ ] Add performance optimizations

```javascript
class PostgreSQLUserSessionRepository {
  async save(session) {
    const token = new Token(session.accessToken);
    const tokenHash = new TokenHash(session.accessToken, process.env.TOKEN_SALT_SECRET);
    
    const sql = `
      INSERT INTO user_sessions (id, user_id, access_token_start, access_token_hash, refresh_token, expires_at, created_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        access_token_start = EXCLUDED.access_token_start,
        access_token_hash = EXCLUDED.access_token_hash,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        metadata = EXCLUDED.metadata
    `;
    
    await this.db.execute(sql, [
      session.id,
      session.userId,
      token.prefix,
      tokenHash.hash,
      session.refreshToken,
      session.expiresAt,
      session.createdAt,
      JSON.stringify(session.metadata)
    ]);
  }
  
  async findByAccessToken(accessToken) {
    const token = new Token(accessToken);
    const tokenHash = new TokenHash(accessToken, process.env.TOKEN_SALT_SECRET);
    
    const sql = 'SELECT * FROM user_sessions WHERE access_token_start = $1';
    const rows = await this.db.query(sql, [token.prefix]);
    
    // Find matching session by hash comparison
    for (const row of rows) {
      const storedHash = TokenHash.fromHash(row.access_token_hash, process.env.TOKEN_SALT_SECRET);
      if (storedHash.compare(tokenHash.hash)) {
        return this.mapRowToSession(row);
      }
    }
    
    return null;
  }
}
```

#### 3.2.3 Update SQLite Repository
- [ ] Modify `backend/infrastructure/database/SQLiteUserSessionRepository.js`
  - [ ] Apply same changes as PostgreSQL repository
  - [ ] Adapt SQL syntax for SQLite
  - [ ] Ensure consistent behavior across databases
  - [ ] Add SQLite-specific optimizations

#### 3.2.4 Implement Token Validator
- [ ] Complete `backend/infrastructure/auth/TokenValidator.js`
  - [ ] Add comprehensive JWT validation
  - [ ] Implement expiration checking
  - [ ] Add signature verification (if needed)
  - [ ] Include rate limiting support

```javascript
const jwt = require('jsonwebtoken');

class TokenValidator {
  static validateToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Invalid token format');
      }
      
      // Check expiration
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new Error('Token expired');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }
  
  static isExpired(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded.exp && Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}
```

#### 3.2.5 Implement Token Hasher
- [ ] Complete `backend/infrastructure/auth/TokenHasher.js`
  - [ ] Implement secure hashing with salt
  - [ ] Add hash comparison utilities
  - [ ] Include performance optimizations
  - [ ] Add comprehensive error handling

```javascript
const crypto = require('crypto');

class TokenHasher {
  static hash(token, salt) {
    if (!token || !salt) {
      throw new Error('Token and salt are required');
    }
    
    const hash = crypto.createHash('sha256');
    hash.update(token + salt);
    return hash.digest('hex');
  }
  
  static verify(token, hash, salt) {
    const computedHash = this.hash(token, salt);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }
  
  static generateSalt() {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### 3.3 Application Layer Implementation

#### 3.3.1 Update Auth Application Service
- [ ] Modify `backend/application/services/AuthApplicationService.js`
  - [ ] Update authentication logic to use secure tokens
  - [ ] Add token validation and hashing
  - [ ] Implement secure session management
  - [ ] Add comprehensive error handling

```javascript
class AuthApplicationService {
  async authenticateUser(accessToken) {
    try {
      // Validate token format
      TokenValidator.validateToken(accessToken);
      
      // Find session by token
      const session = await this.userSessionRepository.findByAccessToken(accessToken);
      if (!session) {
        throw new Error('Invalid session');
      }
      
      // Validate token with stored hash
      if (!session.validateToken(accessToken)) {
        throw new Error('Token validation failed');
      }
      
      return session;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  
  async createSession(userId, accessToken, refreshToken) {
    const token = new Token(accessToken);
    const tokenHash = new TokenHash(accessToken, process.env.TOKEN_SALT_SECRET);
    
    const session = new UserSession(
      uuid(),
      userId,
      token.prefix,
      tokenHash.hash,
      refreshToken,
      new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      new Date(),
      {}
    );
    
    await this.userSessionRepository.save(session);
    return session;
  }
}
```

#### 3.3.2 Update Auth Handlers
- [ ] Modify `backend/application/handlers/auth/LoginHandler.js`
- [ ] Modify `backend/application/handlers/auth/LogoutHandler.js`
- [ ] Modify `backend/application/handlers/auth/RefreshTokenHandler.js`
  - [ ] Update all handlers to use secure token system
  - [ ] Add proper error handling
  - [ ] Implement secure token generation
  - [ ] Add validation and security checks

### 3.4 Presentation Layer Implementation

#### 3.4.1 Update Auth Controller
- [ ] Modify `backend/presentation/api/auth/AuthController.js`
  - [ ] Update authentication endpoints
  - [ ] Add secure token handling
  - [ ] Implement proper error responses
  - [ ] Add security headers

#### 3.4.2 Update Auth Middleware
- [ ] Modify `backend/presentation/middleware/AuthMiddleware.js`
  - [ ] Update token extraction and validation
  - [ ] Add secure token verification
  - [ ] Implement proper error handling
  - [ ] Add security logging

## Success Criteria
- [ ] All domain entities updated with secure token support
- [ ] Infrastructure components implement secure token handling
- [ ] Application services use secure token validation
- [ ] Presentation layer properly handles secure tokens
- [ ] All error handling implemented
- [ ] Performance optimizations in place
- [ ] Security best practices followed
- [ ] Backward compatibility maintained

## Risk Mitigation
- **Feature Flags:** Use environment variables to control rollout
- **Gradual Migration:** Implement in phases with fallback options
- **Comprehensive Testing:** Extensive test coverage for all changes
- **Performance Monitoring:** Track impact of new token handling

## Next Phase Preparation
- [ ] Verify all core components are working correctly
- [ ] Test secure token flow end-to-end
- [ ] Validate performance impact
- [ ] Prepare for Phase 4: Integration & Connectivity

## Notes
- All implementations prioritize security over performance
- Comprehensive logging added for debugging and monitoring
- Error handling follows consistent patterns
- Performance optimizations implemented where possible 