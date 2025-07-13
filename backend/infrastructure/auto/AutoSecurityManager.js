const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('AutoSecurityManager');


class AutoSecurityManager {
  constructor() {
    this.config = {};
    this.secretsPath = path.join(__dirname, '../../.secrets');
    this.initialize();
  }

  initialize() {
    logger.log('🔐 [AutoSecurityManager] Initializing auto-security...');
    
    // Auto-detect environment
    this.config.environment = this.detectEnvironment();
    
    // Auto-generate secrets
    this.config.jwtSecret = this.getOrGenerateSecret('JWT_SECRET');
    this.config.jwtRefreshSecret = this.getOrGenerateSecret('JWT_REFRESH_SECRET');
    
    // Auto-configure security settings
    this.config.security = this.getSecurityConfig();
    
    // Auto-configure database
    this.config.database = this.getDatabaseConfig();
    
    // Auto-configure rate limiting
    this.config.rateLimiting = this.getRateLimitingConfig();
    
    logger.log('✅ [AutoSecurityManager] Auto-security initialized');
  }

  detectEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    logger.log(`🌍 [AutoSecurityManager] Detected environment: ${env}`);
    return env;
  }

  getOrGenerateSecret(key) {
    const secretsFile = path.join(this.secretsPath, `${key}.txt`);
    
    try {
      // Try to read existing secret
      if (fs.existsSync(secretsFile)) {
        const secret = fs.readFileSync(secretsFile, 'utf8').trim();
        logger.log(`🔑 [AutoSecurityManager] Loaded existing secret: ${key}`);
        return secret;
      }
    } catch (error) {
      logger.warn(`⚠️ [AutoSecurityManager] Could not read secret file: ${error.message}`);
    }

    // Generate new secret
    const secret = crypto.randomBytes(64).toString('hex');
    
    try {
      // Ensure secrets directory exists
      if (!fs.existsSync(this.secretsPath)) {
        fs.mkdirSync(this.secretsPath, { recursive: true });
      }
      
      // Save secret to file
      fs.writeFileSync(secretsFile, secret);
      logger.log(`🔑 [AutoSecurityManager] Generated new secret: ${key}`);
    } catch (error) {
      logger.warn(`⚠️ [AutoSecurityManager] Could not save secret file: ${error.message}`);
    }

    return secret;
  }

  getSecurityConfig() {
    const isProduction = this.config.environment === 'production';
    
    return {
      cors: {
        origin: isProduction ? false : ['http://localhost:4000', 'http://localhost:4005'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
          }
        },
        hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false
      },
      jwt: {
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        algorithm: 'HS256'
      }
    };
  }

  getDatabaseConfig() {
    const isProduction = this.config.environment === 'production';
    
    if (isProduction) {
      // Production: Try PostgreSQL, fallback to SQLite
      return {
        type: 'postgresql',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'PIDEA',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        fallback: {
          type: 'sqlite',
          database: path.join(__dirname, '../../database/PIDEA.db')
        }
      };
    } else {
      // Development: Use SQLite
      return {
        type: 'sqlite',
        database: path.join(__dirname, '../../database/PIDEA-dev.db'),
        fallback: {
          type: 'memory',
          database: ':memory:'
        }
      };
    }
  }

  getRateLimitingConfig() {
    const isProduction = this.config.environment === 'production';
    
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 100 : 1000, // requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
      }
    };
  }

  getConfig() {
    return this.config;
  }

  getJWTSecret() {
    return this.config.jwtSecret;
  }

  getJWTRefreshSecret() {
    return this.config.jwtRefreshSecret;
  }

  getEnvironment() {
    return this.config.environment;
  }

  isProduction() {
    return this.config.environment === 'production';
  }

  isDevelopment() {
    return this.config.environment === 'development';
  }

  // Auto-cleanup expired secrets (older than 30 days)
  async cleanupOldSecrets() {
    try {
      if (!fs.existsSync(this.secretsPath)) return;

      const files = fs.readdirSync(this.secretsPath);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.secretsPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          logger.log(`🗑️ [AutoSecurityManager] Cleaned up old secret: ${file}`);
        }
      }
    } catch (error) {
      logger.warn(`⚠️ [AutoSecurityManager] Could not cleanup old secrets: ${error.message}`);
    }
  }
}

module.exports = AutoSecurityManager; 