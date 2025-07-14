const AuthService = require('@services/AuthService');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class AuthMiddleware {
  constructor(authService) {
    this.authService = authService;
  }

  // Middleware to extract and validate JWT token
  authenticate() {
    return async (req, res, next) => {
      try {
        logger.info('🔍 [AuthMiddleware] Authenticating request to:', req.path);
        logger.info('🔍 [AuthMiddleware] Headers:', {
          authorization: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'null',
          'content-type': req.headers['content-type']
        });
        
        const token = this.extractToken(req);
        // logger.info('🔍 [AuthMiddleware] Extracted token:', token ? token.substring(0, 20) + '...' : 'null');
        
        if (!token) {
          logger.info('❌ [AuthMiddleware] No token found');
          return res.status(401).json({
            success: false,
            error: 'Access token required'
          });
        }

        logger.info('🔍 [AuthMiddleware] Validating token...');
        const { user, session } = await this.authService.validateAccessToken(token);
        logger.info('✅ [AuthMiddleware] Token validated successfully for user:', user.email);
        
        // Inject user context into request
        req.user = user;
        req.session = session;
        
        next();
      } catch (error) {
        logger.error('❌ [AuthMiddleware] Authentication failed:', error.message);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired access token'
        });
      }
    };
  }

  // Middleware for optional authentication (for public routes)
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (token) {
          const { user, session } = await this.authService.validateAccessToken(token);
          req.user = user;
          req.session = session;
        }
        
        next();
      } catch (error) {
        // Continue without authentication
        next();
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

  // Extract token from various sources
  extractToken(req) {
    // From Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // From query parameter
    if (req.query.token) {
      return req.query.token;
    }

    // From cookies
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    return null;
  }

  // WebSocket authentication middleware
  authenticateWebSocket() {
    return async (socket, next) => {
      try {
        const token = this.extractWebSocketToken(socket);
        
        if (!token) {
          return next(new Error('Access token required'));
        }

        const { user, session } = await this.authService.validateAccessToken(token);
        
        // Attach user to socket
        socket.user = user;
        socket.session = session;
        
        next();
      } catch (error) {
        next(new Error('Invalid or expired access token'));
      }
    };
  }

  // Extract token from WebSocket connection
  extractWebSocketToken(socket) {
    // From query parameters
    if (socket.handshake.query.token) {
      return socket.handshake.query.token;
    }

    // From headers
    if (socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    return null;
  }

  // Rate limiting middleware for authenticated users
  rateLimitByUser() {
    const userRequests = new Map();
    
    return (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxRequests = req.user.isAdmin() ? 1000 : 100;

      if (!userRequests.has(userId)) {
        userRequests.set(userId, []);
      }

      const userRequestsList = userRequests.get(userId);
      
      // Remove old requests outside the window
      const validRequests = userRequestsList.filter(time => now - time < windowMs);
      userRequests.set(userId, validRequests);

      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded for this user'
        });
      }

      validRequests.push(now);
      next();
    };
  }
}

module.exports = AuthMiddleware; 