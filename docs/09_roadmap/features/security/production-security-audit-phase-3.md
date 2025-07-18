# Production Security Audit – Phase 3: Authentication & Authorization Hardening

## Overview
Phase 3 focuses on hardening the existing authentication and authorization system to meet production security standards. This phase implements enhanced JWT token security, per-user rate limiting, brute force protection, and improved session management.

## Objectives
- [ ] Enhance JWT token security (shorter expiry, refresh token rotation)
- [ ] Implement rate limiting per user
- [ ] Add brute force protection
- [ ] Implement session management improvements
- [ ] Add security headers to all responses

## Deliverables

### Authentication Files
- **File**: `backend/infrastructure/auth/AuthMiddleware.js` - Enhanced authentication middleware
- **File**: `backend/domain/services/AuthService.js` - Improved JWT token handling
- **File**: `backend/domain/services/SessionService.js` - New session management service
- **File**: `backend/infrastructure/middleware/BruteForceProtection.js` - New brute force protection

### Security Features
- **Enhanced JWT Security**: Short-lived access tokens with refresh token rotation
- **Per-User Rate Limiting**: Individual user request limits
- **Brute Force Protection**: Progressive delays and account lockout
- **Session Management**: Secure session handling with automatic cleanup
- **Security Headers**: Enhanced response headers for all authenticated routes

## Implementation Details

### Enhanced AuthMiddleware.js
```javascript
// backend/infrastructure/auth/AuthMiddleware.js - Enhanced version
const AuthService = require('@services/AuthService');
const SessionService = require('@services/SessionService');
const BruteForceProtection = require('@middleware/BruteForceProtection');
const Logger = require('@logging/Logger');
const logger = new Logger('AuthMiddleware');

class AuthMiddleware {
  constructor(authService, sessionService, bruteForceProtection) {
    this.authService = authService;
    this.sessionService = sessionService;
    this.bruteForceProtection = bruteForceProtection;
  }

  // Enhanced authentication middleware
  authenticate() {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          logger.info('❌ No token found');
          return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'TOKEN_MISSING'
          });
        }

        // Check brute force protection
        const clientIp = req.ip;
        if (await this.bruteForceProtection.isBlocked(clientIp)) {
          logger.warn(`❌ IP ${clientIp} is blocked due to brute force attempts`);
          return res.status(429).json({
            success: false,
            error: 'Too many failed attempts. Please try again later.',
            code: 'BRUTE_FORCE_BLOCKED',
            retryAfter: await this.bruteForceProtection.getRetryAfter(clientIp)
          });
        }

        // Validate token
        const { user, session } = await this.authService.validateAccessToken(token);
        
        // Check if session is still active
        if (!await this.sessionService.isSessionActive(session.id)) {
          logger.info('❌ Session expired or invalid');
          return res.status(401).json({
            success: false,
            error: 'Session expired. Please log in again.',
            code: 'SESSION_EXPIRED'
          });
        }

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
        this.addSecurityHeaders(res);
        
        // Update session last activity
        await this.sessionService.updateLastActivity(session.id);
        
        logger.info(`✅ Token validated successfully for user: ${user.email}`);
        next();
      } catch (error) {
        logger.error('❌ Authentication failed:', error.message);
        
        // Record failed attempt for brute force protection
        await this.bruteForceProtection.recordFailedAttempt(req.ip);
        
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired access token',
          code: 'TOKEN_INVALID'
        });
      }
    };
  }

  // Enhanced optional authentication
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (token) {
          const { user, session } = await this.authService.validateAccessToken(token);
          
          if (await this.sessionService.isSessionActive(session.id) && !user.isLocked) {
            req.user = user;
            req.session = session;
            await this.sessionService.updateLastActivity(session.id);
          }
        }
        
        next();
      } catch (error) {
        // Continue without authentication
        next();
      }
    };
  }

  // Enhanced permission checking
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (!req.user.hasPermission(permission)) {
        logger.warn(`❌ User ${req.user.email} lacks permission: ${permission}`);
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission
        });
      }

      next();
    };
  }

  // Enhanced admin check
  requireAdmin() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (!req.user.isAdmin()) {
        logger.warn(`❌ User ${req.user.email} attempted admin access`);
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'ADMIN_ACCESS_REQUIRED'
        });
      }

      next();
    };
  }

  // Enhanced resource ownership check
  requireOwnership(resourceType) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const resourceOwnerId = req.params.userId || req.body.userId || req.query.userId;
      
      if (!req.user.canAccessResource(resourceType, resourceOwnerId)) {
        logger.warn(`❌ User ${req.user.email} attempted unauthorized access to ${resourceType}: ${resourceOwnerId}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied to this resource',
          code: 'RESOURCE_ACCESS_DENIED',
          resourceType: resourceType
        });
      }

      next();
    };
  }

  // Enhanced token extraction
  extractToken(req) {
    // From Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // From query parameter (deprecated, for backward compatibility)
    if (req.query.token) {
      logger.warn('Token provided via query parameter (deprecated)');
      return req.query.token;
    }

    // From cookies
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    return null;
  }

  // Add security headers to responses
  addSecurityHeaders(res) {
    res.setHeader('X-Auth-Status', 'authenticated');
    res.setHeader('X-User-ID', req.user.id);
    res.setHeader('X-Session-ID', req.session.id);
  }

  // Enhanced rate limiting per user
  rateLimitByUser() {
    const userRequests = new Map();
    
    return (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxRequests = req.user.isAdmin() ? 2000 : 500; // Higher limits for admins

      if (!userRequests.has(userId)) {
        userRequests.set(userId, []);
      }

      const userRequestsList = userRequests.get(userId);
      
      // Remove old requests outside the window
      const validRequests = userRequestsList.filter(time => now - time < windowMs);
      userRequests.set(userId, validRequests);

      if (validRequests.length >= maxRequests) {
        logger.warn(`❌ Rate limit exceeded for user: ${req.user.email}`);
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded for this user',
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      validRequests.push(now);
      next();
    };
  }
}

module.exports = AuthMiddleware;
```

### New SessionService.js
```javascript
// backend/domain/services/SessionService.js
const UserSession = require('@entities/UserSession');
const UserSessionRepository = require('@repositories/UserSessionRepository');
const Logger = require('@logging/Logger');
const logger = new Logger('SessionService');

class SessionService {
  constructor(userSessionRepository) {
    this.userSessionRepository = userSessionRepository;
    this.sessionTimeout = 15 * 60 * 1000; // 15 minutes
    this.maxSessionsPerUser = 5;
  }

  async createSession(userId, options = {}) {
    try {
      // Check existing sessions for user
      const existingSessions = await this.userSessionRepository.findByUserId(userId);
      
      // Limit sessions per user
      if (existingSessions.length >= this.maxSessionsPerUser) {
        // Remove oldest session
        const oldestSession = existingSessions
          .sort((a, b) => a.createdAt - b.createdAt)[0];
        await this.userSessionRepository.delete(oldestSession.id);
        logger.info(`Removed oldest session for user: ${userId}`);
      }

      // Create new session
      const session = new UserSession({
        userId,
        expiresAt: new Date(Date.now() + this.sessionTimeout),
        userAgent: options.userAgent,
        ipAddress: options.ipAddress,
        isActive: true
      });

      const savedSession = await this.userSessionRepository.save(session);
      logger.info(`Created new session for user: ${userId}`);
      
      return savedSession;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  async isSessionActive(sessionId) {
    try {
      const session = await this.userSessionRepository.findById(sessionId);
      
      if (!session) {
        return false;
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.userSessionRepository.delete(sessionId);
        return false;
      }

      // Check if session is marked as inactive
      if (!session.isActive) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check session status:', error);
      return false;
    }
  }

  async updateLastActivity(sessionId) {
    try {
      const session = await this.userSessionRepository.findById(sessionId);
      
      if (session) {
        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + this.sessionTimeout);
        await this.userSessionRepository.save(session);
      }
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  async invalidateSession(sessionId) {
    try {
      const session = await this.userSessionRepository.findById(sessionId);
      
      if (session) {
        session.isActive = false;
        await this.userSessionRepository.save(session);
        logger.info(`Invalidated session: ${sessionId}`);
      }
    } catch (error) {
      logger.error('Failed to invalidate session:', error);
    }
  }

  async invalidateAllUserSessions(userId) {
    try {
      const sessions = await this.userSessionRepository.findByUserId(userId);
      
      for (const session of sessions) {
        session.isActive = false;
        await this.userSessionRepository.save(session);
      }
      
      logger.info(`Invalidated all sessions for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to invalidate user sessions:', error);
    }
  }

  async cleanupExpiredSessions() {
    try {
      const expiredSessions = await this.userSessionRepository.findExpired();
      
      for (const session of expiredSessions) {
        await this.userSessionRepository.delete(session.id);
      }
      
      if (expiredSessions.length > 0) {
        logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}

module.exports = SessionService;
```

### New BruteForceProtection.js
```javascript
// backend/infrastructure/middleware/BruteForceProtection.js
const Logger = require('@logging/Logger');
const logger = new Logger('BruteForceProtection');

class BruteForceProtection {
  constructor() {
    this.failedAttempts = new Map();
    this.blockedIPs = new Map();
    this.maxFailedAttempts = 5;
    this.blockDuration = 15 * 60 * 1000; // 15 minutes
    this.progressiveDelay = true;
  }

  async recordFailedAttempt(ip) {
    const now = Date.now();
    
    if (!this.failedAttempts.has(ip)) {
      this.failedAttempts.set(ip, []);
    }

    const attempts = this.failedAttempts.get(ip);
    attempts.push(now);

    // Remove attempts older than block duration
    const recentAttempts = attempts.filter(time => now - time < this.blockDuration);
    this.failedAttempts.set(ip, recentAttempts);

    // Check if IP should be blocked
    if (recentAttempts.length >= this.maxFailedAttempts) {
      this.blockedIPs.set(ip, now);
      logger.warn(`IP ${ip} blocked due to ${recentAttempts.length} failed attempts`);
    }
  }

  async recordSuccessfulAttempt(ip) {
    // Clear failed attempts on successful login
    this.failedAttempts.delete(ip);
    this.blockedIPs.delete(ip);
    logger.info(`Cleared failed attempts for IP: ${ip}`);
  }

  async isBlocked(ip) {
    const blockTime = this.blockedIPs.get(ip);
    
    if (!blockTime) {
      return false;
    }

    // Check if block has expired
    if (Date.now() - blockTime > this.blockDuration) {
      this.blockedIPs.delete(ip);
      this.failedAttempts.delete(ip);
      return false;
    }

    return true;
  }

  async getRetryAfter(ip) {
    const blockTime = this.blockedIPs.get(ip);
    
    if (!blockTime) {
      return 0;
    }

    const remainingTime = this.blockDuration - (Date.now() - blockTime);
    return Math.ceil(remainingTime / 1000);
  }

  async getFailedAttempts(ip) {
    const attempts = this.failedAttempts.get(ip) || [];
    const now = Date.now();
    
    // Return only recent attempts
    return attempts.filter(time => now - time < this.blockDuration).length;
  }

  async getDelayMs(ip) {
    if (!this.progressiveDelay) {
      return 0;
    }

    const attempts = await this.getFailedAttempts(ip);
    
    if (attempts === 0) {
      return 0;
    }

    // Progressive delay: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attempts - 1), 16000);
  }
}

module.exports = BruteForceProtection;
```

### Enhanced AuthService.js JWT Configuration
```javascript
// backend/domain/services/AuthService.js - Updated JWT configuration
getJWTConfig() {
  return {
    accessToken: {
      secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      expiresIn: '15m', // Short-lived access tokens
      algorithm: 'HS256'
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: '7d', // Longer-lived refresh tokens
      algorithm: 'HS256'
    }
  };
}

async generateTokens(user) {
  const config = this.getJWTConfig();
  
  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      type: 'access'
    },
    config.accessToken.secret,
    { 
      expiresIn: config.accessToken.expiresIn,
      algorithm: config.accessToken.algorithm
    }
  );

  const refreshToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      type: 'refresh'
    },
    config.refreshToken.secret,
    { 
      expiresIn: config.refreshToken.expiresIn,
      algorithm: config.refreshToken.algorithm
    }
  );

  return { accessToken, refreshToken };
}
```

## Dependencies
- Requires: Phase 2 (Security Middleware Enhancement)
- Blocks: Phase 4 (Production Configuration & Testing)

## Estimated Time
2 hours

## Success Criteria
- [ ] JWT tokens have shorter expiry times
- [ ] Refresh token rotation implemented
- [ ] Per-user rate limiting active
- [ ] Brute force protection working
- [ ] Session management improved
- [ ] Security headers added to all responses
- [ ] All authentication flows tested

## Testing
- [ ] Test JWT token expiry and refresh
- [ ] Verify per-user rate limiting
- [ ] Test brute force protection with multiple failed attempts
- [ ] Verify session management and cleanup
- [ ] Test security headers in responses
- [ ] Run existing authentication tests

## Rollback Plan
If issues occur:
1. Revert AuthMiddleware.js to previous version
2. Remove SessionService.js and BruteForceProtection.js
3. Restore original JWT configuration
4. Test authentication functionality

## Notes
- JWT token expiry times should be monitored and adjusted based on usage patterns
- Brute force protection should be tuned based on actual attack patterns
- Session management helps prevent session hijacking
- Security headers provide additional protection layers 