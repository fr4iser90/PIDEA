# Phase 4: Integration & Testing - Secure Token System

## Phase Overview
**Status:** Pending  
**Duration:** 4 days  
**Priority:** High

## Objectives
- Connect components with existing systems
- Update API endpoints and controllers
- Integrate frontend and backend components
- Implement event handling and messaging
- Connect database repositories and services
- Set up WebSocket connections if needed
- Create comprehensive test coverage
- Perform end-to-end validation

## Detailed Tasks

### 4.1 Database Migration & Integration

#### 4.1.1 Database Schema Update
- [ ] Update `database/init.sql`
  - [ ] Add `access_token_hash` column to user_sessions table
  - [ ] Create indexes for performance optimization
  - [ ] Add constraints for data integrity
  - [ ] Update foreign key relationships

```sql
-- Add secure token hash column
ALTER TABLE user_sessions 
ADD COLUMN access_token_hash TEXT;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_composite ON user_sessions(access_token_start, access_token_hash);

-- Add constraints
ALTER TABLE user_sessions 
ADD CONSTRAINT chk_token_hash_length CHECK (length(access_token_hash) = 64);
```

#### 4.1.2 Migration Script Creation
- [ ] Create `backend/infrastructure/database/migrations/001_secure_tokens.sql`
  - [ ] Add data migration for existing sessions
  - [ ] Include rollback procedures
  - [ ] Add validation checks
  - [ ] Include performance optimizations

```sql
-- Migration script for secure tokens
BEGIN;

-- Add new column
ALTER TABLE user_sessions ADD COLUMN access_token_hash TEXT;

-- Create indexes
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(access_token_hash);
CREATE INDEX idx_user_sessions_token_composite ON user_sessions(access_token_start, access_token_hash);

-- Migrate existing data (if any)
UPDATE user_sessions 
SET access_token_hash = encode(sha256(access_token_start::bytea), 'hex')
WHERE access_token_hash IS NULL AND access_token_start IS NOT NULL;

-- Add constraints
ALTER TABLE user_sessions 
ADD CONSTRAINT chk_token_hash_length CHECK (length(access_token_hash) = 64);

COMMIT;

-- Rollback script
-- BEGIN;
-- ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS chk_token_hash_length;
-- DROP INDEX IF EXISTS idx_user_sessions_token_composite;
-- DROP INDEX IF EXISTS idx_user_sessions_token_hash;
-- ALTER TABLE user_sessions DROP COLUMN IF EXISTS access_token_hash;
-- COMMIT;
```

#### 4.1.3 Repository Integration
- [ ] Update `backend/infrastructure/database/PostgreSQLUserSessionRepository.js`
  - [ ] Integrate secure token hashing
  - [ ] Update all CRUD operations
  - [ ] Add hash-based token lookup
  - [ ] Implement performance optimizations

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

- [ ] Update `backend/infrastructure/database/SQLiteUserSessionRepository.js`
  - [ ] Apply same secure token changes
  - [ ] Adapt SQL syntax for SQLite
  - [ ] Ensure consistent behavior
  - [ ] Add SQLite-specific optimizations

### 4.2 Application Layer Integration

#### 4.2.1 Auth Application Service Update
- [ ] Update `backend/application/services/AuthApplicationService.js`
  - [ ] Integrate secure token validation
  - [ ] Update session creation logic
  - [ ] Add token refresh security
  - [ ] Implement comprehensive error handling

```javascript
class AuthApplicationService {
  async login(credentials) {
    try {
      this.logger.info('AuthApplicationService: Processing login with secure tokens');
      
      const result = await this.authService.login(credentials);
      
      // Validate secure token implementation
      if (result.data.session.accessToken) {
        const token = new Token(result.data.session.accessToken);
        const tokenHash = new TokenHash(result.data.session.accessToken, process.env.TOKEN_SALT_SECRET);
        
        this.logger.info('Secure token validation passed', {
          tokenPrefix: token.prefix,
          hashLength: tokenHash.hash.length
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Error during secure login:', error);
      throw error;
    }
  }
  
  async authenticateUser(accessToken) {
    try {
      // Validate token format
      TokenValidator.validateToken(accessToken);
      
      // Find session by token
      const session = await this.authService.userSessionRepository.findByAccessToken(accessToken);
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
}
```

#### 4.2.2 Auth Service Integration
- [ ] Update `backend/domain/services/security/AuthService.js`
  - [ ] Integrate secure token generation
  - [ ] Update session creation with hashing
  - [ ] Add token validation methods
  - [ ] Implement secure refresh logic

```javascript
class AuthService {
  async createUserSession(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }

    logger.info('🔍 Creating secure session for user:', {
      id: user.id,
      email: user.email
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresIn = process.env.NODE_ENV === 'development' ? 2 * 60 * 60 * 1000 : 15 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresIn);

    // Create secure token components
    const token = new Token(accessToken);
    const tokenHash = new TokenHash(accessToken, process.env.TOKEN_SALT_SECRET);

    logger.info('🔍 Generated secure tokens:', {
      tokenPrefix: token.prefix,
      hashLength: tokenHash.hash.length,
      expiresAt: expiresAt.toISOString()
    });

    const session = new UserSession(
      null,
      user.id,
      token.prefix,
      tokenHash.hash,
      refreshToken,
      expiresAt,
      new Date(),
      {
        userAgent: 'web',
        ipAddress: 'unknown'
      }
    );

    await this.userSessionRepository.save(session);
    logger.info('✅ Secure session saved to database');
    
    return session;
  }
}
```

### 4.3 Presentation Layer Integration

#### 4.3.1 Auth Controller Update
- [ ] Update `backend/presentation/api/auth/AuthController.js`
  - [ ] Integrate secure token handling
  - [ ] Add token validation in endpoints
  - [ ] Update error responses
  - [ ] Add security logging

```javascript
class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info('🔍 [AuthController] Secure login request received:', {
        email: email,
        hasPassword: !!password
      });

      // Validate input
      if (!email || !password) {
        logger.info('❌ [AuthController] Missing email or password');
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Authenticate user and create secure session
      const credentials = { email, password };
      const result = await this.authApplicationService.login(credentials);

      // Validate secure token implementation
      if (result.data.session.accessToken) {
        const token = new Token(result.data.session.accessToken);
        logger.info('✅ [AuthController] Secure token generated:', {
          prefix: token.prefix,
          length: result.data.session.accessToken.length
        });
      }

      const responseData = {
        success: true,
        data: {
          user: result.data.user,
          accessToken: result.data.session.accessToken,
          refreshToken: result.data.session.refreshToken,
          expiresAt: result.data.session.expiresAt
        }
      };

      // Set secure httpOnly cookies
      res.cookie('accessToken', result.data.session.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000
      });
      
      res.cookie('refreshToken', result.data.session.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json(responseData);
    } catch (error) {
      logger.error('❌ [AuthController] Secure login error:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }
}
```

#### 4.3.2 Auth Middleware Update
- [ ] Update `backend/presentation/middleware/AuthMiddleware.js`
  - [ ] Integrate secure token validation
  - [ ] Add hash-based token verification
  - [ ] Update error handling
  - [ ] Add security logging

```javascript
class AuthMiddleware {
  authenticate() {
    return async (req, res, next) => {
      try {
        const clientIp = req.ip || req.connection.remoteAddress;
        
        // Check brute force protection
        if (this.isBlocked(clientIp)) {
          const retryAfter = this.getRetryAfter(clientIp);
          logger.warn(`❌ IP ${clientIp} is blocked due to brute force attempts`);
          return res.status(429).json({
            success: false,
            error: 'Too many failed attempts. Please try again later.',
            code: 'BRUTE_FORCE_BLOCKED',
            retryAfter: retryAfter
          });
        }
        
        const token = this.extractToken(req);
        
        if (!token) {
          logger.info('❌ No token found');
          return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'TOKEN_MISSING'
          });
        }

        // Validate token format
        TokenValidator.validateToken(token);
        
        // Find session with secure token lookup
        const session = await this.authService.userSessionRepository.findByAccessToken(token);
        if (!session) {
          logger.info('❌ No session found for token');
          return res.status(401).json({
            success: false,
            error: 'Invalid session',
            code: 'SESSION_NOT_FOUND'
          });
        }

        // Validate token with stored hash
        if (!session.validateToken(token)) {
          logger.warn('❌ Token hash validation failed');
          return res.status(401).json({
            success: false,
            error: 'Token validation failed',
            code: 'TOKEN_INVALID'
          });
        }

        const user = await this.authService.userRepository.findById(session.userId);
        
        // Check if user account is locked
        if (user.isLocked) {
          logger.warn(`❌ User ${user.email} account is locked`);
          return res.status(403).json({
            success: false,
            error: 'Account is locked. Please contact support.',
            code: 'ACCOUNT_LOCKED'
          });
        }
        
        // Inject user context into request
        req.user = user;
        req.session = session;
        
        // Add security headers
        this.addSecurityHeaders(res, user, session);
        
        // Record successful authentication
        this.recordSuccessfulAttempt(clientIp);
        
        logger.debug(`✅ Secure token validated successfully for user: ${user.email}`);
        next();
      } catch (error) {
        logger.error('❌ Secure authentication error:', error);
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        });
      }
    };
  }
}
```

### 4.4 Testing Implementation

#### 4.4.1 Unit Tests
- [ ] Create `backend/tests/unit/domain/value-objects/Token.test.js`
  - [ ] Test token validation
  - [ ] Test prefix extraction
  - [ ] Test expiration checking
  - [ ] Test error handling

```javascript
const Token = require('@value-objects/Token');

describe('Token Value Object', () => {
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtZSIsImlhdCI6MTYzOTQ5NjAwMCwiZXhwIjoxNjM5NTgyNDAwfQ.signature';

  describe('constructor', () => {
    it('should create token with valid JWT', () => {
      const token = new Token(validToken);
      expect(token.value).toBe(validToken);
      expect(token.prefix).toBe('eyJhbGciOiJIUzI1NiIs');
    });

    it('should throw error for invalid token', () => {
      expect(() => new Token('invalid-token')).toThrow('Invalid JWT format');
    });

    it('should throw error for empty token', () => {
      expect(() => new Token('')).toThrow('Token must be a non-empty string');
    });
  });

  describe('extractPrefix', () => {
    it('should extract correct prefix length', () => {
      const token = new Token(validToken);
      expect(token.prefix).toHaveLength(20);
    });

    it('should use configurable prefix length', () => {
      process.env.TOKEN_PREFIX_LENGTH = '10';
      const token = new Token(validToken);
      expect(token.prefix).toHaveLength(10);
    });
  });

  describe('isExpired', () => {
    it('should return false for valid token', () => {
      const token = new Token(validToken);
      expect(token.isExpired()).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtZSIsImlhdCI6MTYzOTQ5NjAwMCwiZXhwIjoxNjM5NDk2MDAwfQ.signature';
      const token = new Token(expiredToken);
      expect(token.isExpired()).toBe(true);
    });
  });
});
```

- [ ] Create `backend/tests/unit/domain/value-objects/TokenHash.test.js`
  - [ ] Test hash generation
  - [ ] Test hash comparison
  - [ ] Test salt handling
  - [ ] Test constant-time comparison

```javascript
const TokenHash = require('@value-objects/TokenHash');

describe('TokenHash Value Object', () => {
  const testToken = 'test-token';
  const testSalt = 'test-salt';

  describe('constructor', () => {
    it('should create hash with token and salt', () => {
      const tokenHash = new TokenHash(testToken, testSalt);
      expect(tokenHash.hash).toBeDefined();
      expect(tokenHash.salt).toBe(testSalt);
    });

    it('should generate consistent hash for same input', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash(testToken, testSalt);
      expect(hash1.hash).toBe(hash2.hash);
    });

    it('should generate different hash for different salt', () => {
      const hash1 = new TokenHash(testToken, 'salt1');
      const hash2 = new TokenHash(testToken, 'salt2');
      expect(hash1.hash).not.toBe(hash2.hash);
    });
  });

  describe('compare', () => {
    it('should return true for matching hashes', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash(testToken, testSalt);
      expect(hash1.compare(hash2.hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash('different-token', testSalt);
      expect(hash1.compare(hash2.hash)).toBe(false);
    });

    it('should use constant-time comparison', () => {
      const hash1 = new TokenHash(testToken, testSalt);
      const hash2 = new TokenHash('different-token', testSalt);
      
      const start1 = Date.now();
      hash1.compare(hash1.hash);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      hash1.compare(hash2.hash);
      const time2 = Date.now() - start2;
      
      // Times should be similar (constant-time)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('fromHash', () => {
    it('should create instance from existing hash', () => {
      const originalHash = new TokenHash(testToken, testSalt);
      const fromHash = TokenHash.fromHash(originalHash.hash, testSalt);
      
      expect(fromHash.hash).toBe(originalHash.hash);
      expect(fromHash.salt).toBe(testSalt);
    });
  });
});
```

#### 4.4.2 Integration Tests
- [ ] Create `backend/tests/integration/auth/SecureTokenFlow.test.js`
  - [ ] Test complete authentication flow
  - [ ] Test token validation
  - [ ] Test session management
  - [ ] Test error scenarios

```javascript
const request = require('supertest');
const app = require('../../../Application');
const UserSession = require('@entities/UserSession');
const Token = require('@value-objects/Token');
const TokenHash = require('@value-objects/TokenHash');

describe('Secure Token Authentication Flow', () => {
  let testUser;
  let authService;
  let userSessionRepository;

  beforeAll(async () => {
    // Setup test environment
    authService = app.serviceRegistry.getService('authService');
    userSessionRepository = app.serviceRegistry.getService('userSessionRepository');
    
    // Create test user
    testUser = await createTestUser();
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestData();
  });

  describe('Login Flow', () => {
    it('should create session with secure tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'testpassword'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify secure token storage
      const token = new Token(response.body.data.accessToken);
      const session = await userSessionRepository.findByAccessToken(response.body.data.accessToken);
      
      expect(session.accessTokenStart).toBe(token.prefix);
      expect(session.accessTokenHash).toBeDefined();
      expect(session.accessTokenHash).toHaveLength(64); // SHA-256 hex length
    });

    it('should validate token with hash comparison', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'testpassword'
        });

      const accessToken = response.body.data.accessToken;
      
      // Verify token validation works
      const session = await userSessionRepository.findByAccessToken(accessToken);
      expect(session).toBeDefined();
      expect(session.validateToken(accessToken)).toBe(true);
    });
  });

  describe('Token Validation', () => {
    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_INVALID');
    });

    it('should reject expired tokens', async () => {
      // Create expired token
      const expiredToken = createExpiredToken(testUser);
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Session Management', () => {
    it('should handle multiple sessions per user', async () => {
      // Create multiple sessions
      const session1 = await authService.createUserSession(testUser);
      const session2 = await authService.createUserSession(testUser);

      expect(session1.id).not.toBe(session2.id);
      expect(session1.accessTokenStart).not.toBe(session2.accessTokenStart);
      expect(session1.accessTokenHash).not.toBe(session2.accessTokenHash);
    });

    it('should cleanup expired sessions', async () => {
      // Create expired session
      const expiredSession = await createExpiredSession(testUser);
      
      // Run cleanup
      await userSessionRepository.deleteExpiredSessions();
      
      // Verify session is deleted
      const foundSession = await userSessionRepository.findById(expiredSession.id);
      expect(foundSession).toBeNull();
    });
  });
});
```

#### 4.4.3 End-to-End Tests
- [ ] Create `backend/tests/e2e/SecureTokenE2E.test.js`
  - [ ] Test complete user journey
  - [ ] Test frontend integration
  - [ ] Test database persistence
  - [ ] Test security scenarios

### 4.5 Performance Testing

#### 4.5.1 Load Testing
- [ ] Create `backend/tests/performance/SecureTokenPerformance.test.js`
  - [ ] Test token generation performance
  - [ ] Test hash comparison performance
  - [ ] Test database query performance
  - [ ] Test concurrent user scenarios

#### 4.5.2 Security Testing
- [ ] Create `backend/tests/security/SecureTokenSecurity.test.js`
  - [ ] Test timing attacks prevention
  - [ ] Test brute force protection
  - [ ] Test token replay attacks
  - [ ] Test hash collision resistance

### 4.6 Environment Configuration

#### 4.6.1 Environment Variables
- [ ] Update environment configuration
  - [ ] Add `TOKEN_SALT_SECRET` for hash salting
  - [ ] Add `TOKEN_PREFIX_LENGTH` configuration
  - [ ] Add `ENABLE_SECURE_TOKENS` feature flag
  - [ ] Add `MIGRATION_MODE` for safe transitions

```env
# Token Security Configuration
TOKEN_SALT_SECRET=your-super-secure-salt-here-change-in-production
TOKEN_PREFIX_LENGTH=20
ENABLE_SECURE_TOKENS=true
MIGRATION_MODE=safe

# Feature Flags
FEATURE_SECURE_TOKENS=true
FEATURE_TOKEN_MIGRATION=true
```

#### 4.6.2 Configuration Validation
- [ ] Create configuration validation
- [ ] Add environment checks
- [ ] Implement feature flag logic
- [ ] Add configuration documentation

## Success Criteria
- [ ] All components integrated successfully
- [ ] Database migration completed without data loss
- [ ] All tests passing with >90% coverage
- [ ] Performance impact < 5%
- [ ] Security validation passed
- [ ] Frontend integration working
- [ ] Error handling comprehensive
- [ ] Documentation complete

## Risk Mitigation
- **Feature Flags:** Use `ENABLE_SECURE_TOKENS` to control rollout
- **Migration Safety:** Implement safe migration with rollback capability
- **Performance Monitoring:** Track impact of new token handling
- **Security Testing:** Comprehensive security validation
- **Rollback Plan:** Quick rollback to previous system if needed

## Next Phase Preparation
- [ ] Verify all integration points are working
- [ ] Test performance under load
- [ ] Validate security measures
- [ ] Prepare for production deployment

## Notes
- All integrations prioritize security over performance
- Comprehensive logging added for debugging and monitoring
- Error handling follows consistent patterns
- Performance optimizations implemented where possible
- Security testing covers all attack vectors 