# Production Security Audit – Phase 2: Security Middleware Enhancement

## Overview
Phase 2 focuses on enhancing the existing security middleware configuration to meet production security standards. This phase implements advanced security features including Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and enhanced CORS configuration.

## Objectives
- [ ] Enhance helmet configuration for production
- [ ] Implement Content Security Policy (CSP)
- [ ] Add HTTP Strict Transport Security (HSTS)
- [ ] Configure CORS for production domains
- [ ] Implement request size limits

## Deliverables

### Configuration Files
- **File**: `backend/config/security-config.js` - Centralized security configuration
- **File**: `backend/Application.js` - Enhanced security middleware setup
- **File**: `backend/config/ide-deployment.js` - Updated production security settings

### Security Features
- **Content Security Policy**: XSS protection with strict directives
- **HTTP Strict Transport Security**: HTTPS enforcement
- **Enhanced CORS**: Production domain restrictions
- **Request Size Limits**: Protection against large payload attacks
- **HTTP Parameter Pollution**: Protection against HPP attacks

## Implementation Details

### Centralized Security Configuration
```javascript
// backend/config/security-config.js
const path = require('path');

class SecurityConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.isProduction = this.environment === 'production';
    this.isStaging = this.environment === 'staging';
  }

  get helmetConfig() {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          prefetchSrc: ["'self'"]
        },
        reportOnly: false
      },
      hsts: this.isProduction ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      frameguard: {
        action: 'deny'
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      },
      contentTypeSniffing: false,
      hidePoweredBy: true,
      ieNoOpen: true,
      permittedCrossDomainPolicies: {
        permittedPolicies: 'none'
      }
    };
  }

  get corsConfig() {
    const allowedOrigins = this.isProduction 
      ? [process.env.FRONTEND_URL, process.env.API_URL].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'X-API-Key',
        'X-CSRF-Token'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400 // 24 hours
    };
  }

  get rateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: this.isProduction ? 100 : 1000, // requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 900 // 15 minutes in seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks and static files
        return req.path === '/api/health' || 
               req.path.startsWith('/web/') || 
               req.path.startsWith('/framework/');
      },
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user ? req.user.id : req.ip;
      }
    };
  }

  get slowDownConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 5, // Allow 5 requests per 15 minutes, then...
      delayMs: 500, // Begin adding 500ms of delay per request above 100
      maxDelayMs: 20000, // Maximum delay of 20 seconds
      skip: (req) => {
        // Skip for health checks
        return req.path === '/api/health';
      }
    };
  }

  get requestSizeConfig() {
    return {
      json: { limit: '1mb' },
      urlencoded: { limit: '1mb', extended: true },
      raw: { limit: '1mb' },
      text: { limit: '1mb' }
    };
  }

  get hppConfig() {
    return {
      whitelist: ['filter', 'sort', 'page', 'limit'] // Allow these parameters to be duplicated
    };
  }
}

module.exports = new SecurityConfig();
```

### Enhanced Application.js Security Setup
```javascript
// backend/Application.js - Updated setupMiddleware method
const securityConfig = require('./config/security-config');
const slowDown = require('express-slow-down');
const hpp = require('hpp');

setupMiddleware() {
  this.logger.info('Setting up enhanced security middleware...');

  // Security middleware (order matters!)
  this.app.use(helmet(securityConfig.helmetConfig));
  this.app.use(cors(securityConfig.corsConfig));
  this.app.use(hpp(securityConfig.hppConfig));

  // Rate limiting
  const limiter = rateLimit(securityConfig.rateLimitConfig);
  this.app.use('/api/', limiter);

  // Slow down (progressive delays)
  const speedLimiter = slowDown(securityConfig.slowDownConfig);
  this.app.use('/api/', speedLimiter);

  // Body parsing with size limits
  this.app.use(express.json(securityConfig.requestSizeConfig.json));
  this.app.use(express.urlencoded(securityConfig.requestSizeConfig.urlencoded));

  // Additional security headers
  this.app.use((req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add security headers for production
    if (this.isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    }
    
    next();
  });

  // Serve static files with security headers
  this.app.use('/web', express.static(path.join(__dirname, '../web'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));

  this.app.use('/framework', express.static(path.join(__dirname, '../framework'), {
    setHeaders: (res, path) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));
}
```

### Updated IDE Deployment Config
```javascript
// backend/config/ide-deployment.js - Updated security section
security: {
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  cors: {
    enabled: true,
    origin: centralizedConfig.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  helmet: {
    enabled: isProduction,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: isProduction ? { 
      maxAge: 31536000, 
      includeSubDomains: true,
      preload: true 
    } : false
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    message: 'Too many requests from this IP'
  }
}
```

## Dependencies
- Requires: Phase 1 (Security Package Updates)
- Blocks: Phase 3 (Authentication & Authorization Hardening)

## Estimated Time
2 hours

## Success Criteria
- [ ] Helmet configuration enhanced with CSP and HSTS
- [ ] CORS configured for production domains
- [ ] Request size limits implemented
- [ ] HTTP Parameter Pollution protection active
- [ ] Progressive rate limiting implemented
- [ ] Security headers properly configured
- [ ] All existing functionality remains intact

## Testing
- [ ] Test CSP headers in browser developer tools
- [ ] Verify HSTS headers in production environment
- [ ] Test CORS with different origins
- [ ] Verify rate limiting functionality
- [ ] Test request size limits with large payloads
- [ ] Run existing tests to ensure no regressions

## Rollback Plan
If issues occur:
1. Revert Application.js to previous middleware setup
2. Remove security-config.js file
3. Restore original helmet and CORS configuration
4. Test application functionality

## Notes
- CSP configuration may need adjustment based on frontend requirements
- HSTS only works in production with HTTPS
- Rate limiting configuration should be monitored and adjusted based on usage
- Security headers are additive and don't break existing functionality 