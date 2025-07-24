const AuthService = require('@domain/services/security/AuthService');
const TokenValidator = require('./TokenValidator');
const Logger = require('@logging/Logger');
const logger = new Logger('AuthMiddleware');


class AuthMiddleware {
  constructor(authService) {
    this.authService = authService;
    this.tokenValidator = new TokenValidator();
    this.failedAttempts = new Map();
    this.blockedIPs = new Map();
    this.maxFailedAttempts = 5;
    this.blockDuration = 15 * 60 * 1000; // 15 minutes
  }

  // Brute force protection methods
  recordFailedAttempt(ip) {
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

  recordSuccessfulAttempt(ip) {
    // Clear failed attempts on successful login
    this.failedAttempts.delete(ip);
    this.blockedIPs.delete(ip);
    // Only log when there were actually failed attempts to clear
    if (this.failedAttempts.has(ip) || this.blockedIPs.has(ip)) {
      logger.info(`Cleared failed attempts for IP: ${ip}`);
    }
  }

  isBlocked(ip) {
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

  getRetryAfter(ip) {
    const blockTime = this.blockedIPs.get(ip);
    
    if (!blockTime) {
      return 0;
    }

    const remainingTime = this.blockDuration - (Date.now() - blockTime);
    return Math.ceil(remainingTime / 1000);
  }

  // Middleware to extract and validate JWT token
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

        const { user, session } = await this.authService.validateAccessToken(token);
        
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
        
        // Only log on debug level to reduce spam
        logger.debug(`✅ Token validated successfully for user: ${user.email}`);
        next();
      } catch (error) {
        logger.error('❌ Authentication failed:', error.message);
        
        // Record failed attempt for brute force protection
        const clientIp = req.ip || req.connection.remoteAddress;
        this.recordFailedAttempt(clientIp);
        
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired access token',
          code: 'TOKEN_INVALID'
        });
      }
    };
  }

  // Middleware to check user permissions
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!req.user.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Middleware to check if user is admin
  requireAdmin() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!req.user.isAdmin()) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      next();
    };
  }

  // Middleware to check resource ownership
  requireOwnership(resourceType) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceOwnerId = req.params.userId || req.body.userId || req.query.userId;
      
      if (!req.user.canAccessResource(resourceType, resourceOwnerId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this resource'
        });
      }

      next();
    };
  }

  // Extract authentication from various sources
  extractToken(req) {
    // From cookies (primary method)
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    // From Authorization header (fallback)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // From query parameter (for WebSocket)
    if (req.query.token) {
      return req.query.token;
    }

    return null;
  }

  // WebSocket authentication middleware
  authenticateWebSocket() {
    return async (socket, next) => {
      try {
        const token = this.extractWebSocketToken(socket);
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const { user, session } = await this.authService.validateAccessToken(token);
        
        // Attach user to socket
        socket.user = user;
        socket.session = session;
        
        next();
      } catch (error) {
        next(new Error('Invalid or expired authentication'));
      }
    };
  }

  // Extract authentication from WebSocket connection
  extractWebSocketToken(socket) {
    // From query parameters (primary method for WebSocket)
    if (socket.handshake.query.token) {
      return socket.handshake.query.token;
    }

    // From headers (fallback)
    if (socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    return null;
  }

  // Add security headers to responses
  addSecurityHeaders(res, user, session) {
    res.setHeader('X-Auth-Status', 'authenticated');
    res.setHeader('X-User-ID', user.id);
    res.setHeader('X-Session-ID', session.id);
    res.setHeader('X-Auth-Timestamp', new Date().toISOString());
  }

  // Enhanced rate limiting middleware for authenticated users
  rateLimitByUser() {
    const userRequests = new Map();
    
    return (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      
      // Much higher limits for authenticated users
      let maxRequests = 5000; // Increased from 100 to 5000
      
      if (req.user.isAdmin()) {
        maxRequests = 10000; // Increased from 2000 to 10000
      } else if (req.path.includes('/api/auth/')) {
        maxRequests = 200; // Increased from 50 to 200
      } else if (req.path.includes('/api/projects/')) {
        maxRequests = 1000; // Increased from 200 to 1000
      }

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

  // Brute force protection middleware for auth endpoints
  bruteForceProtection() {
    return (req, res, next) => {
      const clientIp = req.ip || req.connection.remoteAddress;
      
      if (this.isBlocked(clientIp)) {
        const retryAfter = this.getRetryAfter(clientIp);
        logger.warn(`❌ Brute force protection blocked IP: ${clientIp}`);
        return res.status(429).json({
          success: false,
          error: 'Too many failed attempts. Please try again later.',
          code: 'BRUTE_FORCE_BLOCKED',
          retryAfter: retryAfter
        });
      }
      
      next();
    };
  }
}

module.exports = AuthMiddleware; 