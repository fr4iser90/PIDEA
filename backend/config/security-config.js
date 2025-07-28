/**
 * Centralized Security Configuration
 * 
 * This file contains all security-related configurations for the PIDEA application.
 * It provides environment-specific security settings and ensures consistent
 * security policies across all environments.
 */

const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Security-Config');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isStaging = NODE_ENV === 'staging';
const isDevelopment = NODE_ENV === 'development';

class SecurityConfig {
  constructor() {
    this.environment = NODE_ENV;
    this.isProduction = isProduction;
    this.isStaging = isStaging;
    this.isDevelopment = isDevelopment;
    
    logger.info(`🔒 Initializing security config for environment: ${this.environment}`);
  }

  /**
   * Get comprehensive security configuration
   */
  get config() {
    return {
      helmet: this.getHelmetConfig(),
      cors: this.getCorsConfig(),
      rateLimiting: this.getRateLimitingConfig(),
      authentication: this.getAuthenticationConfig(),
      session: this.getSessionConfig(),
      bruteForce: this.getBruteForceConfig(),
      inputValidation: this.getInputValidationConfig(),
      headers: this.getSecurityHeadersConfig(),
      monitoring: this.getSecurityMonitoringConfig()
    };
  }

  /**
   * Helmet security headers configuration
   */
  getHelmetConfig() {
    const baseConfig = {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:", "http://localhost:*"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"],
          workerSrc: ["'self'", "blob:"],
          manifestSrc: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "sameorigin" },
      hidePoweredBy: true,
      hsts: isProduction ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    };

    // Remove null values for helmet
    Object.keys(baseConfig).forEach(key => {
      if (baseConfig[key] === null) {
        delete baseConfig[key];
      }
    });

    return baseConfig;
  }

  /**
   * CORS configuration
   */
  getCorsConfig() {
    const allowedOrigins = this.getAllowedOrigins();
    
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-API-Key',
        'X-Client-Version',
        'Cookie'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Set-Cookie'],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204
    };
  }

  /**
   * Rate limiting configuration
   */
  getRateLimitingConfig() {
    const baseConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 100 : 1000, // Stricter limits for unauthenticated users
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
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
      },
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for ${req.ip} - redirecting to GitHub`);
        
        // Redirect to GitHub instead of blocking
        if (req.path.includes('/api/frameworks') || req.path.includes('/api/prompts') || req.path.includes('/api/templates')) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded for content library',
            message: 'Please visit our GitHub repository for direct access to frameworks, prompts, and templates',
            githubUrl: 'https://github.com/fr4iser90/PIDEA',
            retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
          });
        }
        
        // For other endpoints, show standard message
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
        });
      }
    };

    return baseConfig;
  }

  /**
   * Authentication configuration
   */
  getAuthenticationConfig() {
    return {
      jwt: {
        accessToken: {
          secret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
          expiresIn: process.env.NODE_ENV === 'development' ? '2h' : '15m',
          algorithm: 'HS256',
          issuer: 'pidea-backend',
          audience: 'pidea-frontend'
        },
        refreshToken: {
          secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
          expiresIn: '7d',
          algorithm: 'HS256',
          issuer: 'pidea-backend',
          audience: 'pidea-frontend'
        }
      },
      bcrypt: {
        rounds: 12,
        saltRounds: 12
      },
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxLength: 128
      },
      session: {
        maxSessionsPerUser: 5,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        cleanupInterval: 5 * 60 * 1000 // 5 minutes
      }
    };
  }

  /**
   * Session management configuration
   */
  getSessionConfig() {
    return {
      secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production',
      name: 'pidea.sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 30 * 60 * 1000 // 30 minutes
      },
      rolling: true,
      unset: 'destroy'
    };
  }

  /**
   * Brute force protection configuration
   */
  getBruteForceConfig() {
    return {
      freeRetries: 5,
      minWait: 5 * 60 * 1000, // 5 minutes
      maxWait: 15 * 60 * 1000, // 15 minutes
      lifetime: 24 * 60 * 60 * 1000, // 24 hours
      refreshTimeoutOnRequest: false,
      failCallback: (req, res, next, nextValidRequestDate) => {
        logger.warn(`Brute force attempt detected from ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Too many failed attempts',
          retryAfter: nextValidRequestDate
        });
      },
      handleStoreError: (error) => {
        logger.error('Brute force store error:', error);
      }
    };
  }

  /**
   * Input validation configuration
   */
  getInputValidationConfig() {
    return {
      sanitize: {
        enabled: true,
        removeScripts: true,
        removeEventHandlers: true,
        removeComments: true
      },
      validation: {
        strict: isProduction,
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      },
      limits: {
        maxBodySize: '2mb',
        maxFields: 100,
        maxFiles: 10,
        maxFileSize: '5mb'
      }
    };
  }

  /**
   * Security headers configuration
   */
  getSecurityHeadersConfig() {
    return {
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
  }

  /**
   * Security monitoring configuration
   */
  getSecurityMonitoringConfig() {
    return {
      enabled: isProduction,
      logLevel: isProduction ? 'warn' : 'info',
      events: {
        loginAttempts: true,
        failedLogins: true,
        rateLimitExceeded: true,
        suspiciousActivity: true,
        bruteForceAttempts: true,
        unauthorizedAccess: true
      },
      alerts: {
        email: process.env.SECURITY_ALERT_EMAIL,
        webhook: process.env.SECURITY_WEBHOOK_URL,
        slack: process.env.SECURITY_SLACK_WEBHOOK
      },
      retention: {
        logs: 90, // days
        events: 30, // days
        reports: 365 // days
      }
    };
  }

  /**
   * Get allowed origins for CORS
   */
  getAllowedOrigins() {
    const origins = [];
    
    if (isDevelopment) {
      origins.push(
        'http://localhost:3000',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4000'
      );
    }
    
    if (isStaging) {
      origins.push(
        process.env.STAGING_FRONTEND_URL || 'https://staging.pidea.com',
        process.env.STAGING_BACKEND_URL || 'https://api-staging.pidea.com'
      );
    }
    
    if (isProduction) {
      origins.push(
        process.env.PRODUCTION_FRONTEND_URL || 'https://pidea.com',
        process.env.PRODUCTION_BACKEND_URL || 'https://api.pidea.com'
      );
    }
    
    // Add any additional origins from environment
    if (process.env.ALLOWED_ORIGINS) {
      origins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    return origins.filter(Boolean);
  }

  /**
   * Validate security configuration
   */
  validate() {
    const errors = [];
    
    // Check for production secrets
    if (isProduction) {
      if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === 'your-access-secret-key-change-in-production') {
        errors.push('JWT_ACCESS_SECRET must be set in production');
      }
      
      if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
        errors.push('JWT_REFRESH_SECRET must be set in production');
      }
      
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-session-secret-key-change-in-production') {
        errors.push('SESSION_SECRET must be set in production');
      }
    }
    
    // Check CORS origins
    const allowedOrigins = this.getAllowedOrigins();
    if (allowedOrigins.length === 0) {
      errors.push('No CORS origins configured');
    }
    
    if (errors.length > 0) {
      logger.error('Security configuration validation failed:', errors);
      throw new Error(`Security configuration errors: ${errors.join(', ')}`);
    }
    
    logger.info('✅ Security configuration validated successfully');
    return true;
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    return {
      environment: this.environment,
      isProduction: this.isProduction,
      isStaging: this.isStaging,
      isDevelopment: this.isDevelopment,
      allowedOrigins: this.getAllowedOrigins(),
      securityLevel: this.isProduction ? 'HIGH' : this.isStaging ? 'MEDIUM' : 'LOW'
    };
  }
}

// Create singleton instance
const securityConfig = new SecurityConfig();

// Validate configuration on load
try {
  securityConfig.validate();
} catch (error) {
  logger.error('Security configuration validation failed:', error.message);
  if (isProduction) {
    process.exit(1);
  }
}

module.exports = securityConfig; 