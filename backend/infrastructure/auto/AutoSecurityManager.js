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
    logger.info('🔐 Initializing auto-security...');
    
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
    
    logger.info('✅ Auto-security initialized');
  }

  detectEnvironment() {
    // Automatische Erkennung: Docker vs npm run dev
    let env = process.env.NODE_ENV || 'development';
    
    // Docker-Erkennung
    const isDocker = process.env.DOCKER_ENV === 'true' || 
                     process.env.KUBERNETES_SERVICE_HOST ||
                     process.env.DOCKER_CONTAINER ||
                     process.env.HOSTNAME?.includes('container') ||
                     process.env.HOSTNAME?.includes('docker');
    
    if (isDocker) {
      env = 'production';
      logger.info('🐳 Docker environment detected, using production settings');
    } else {
      logger.info('💻 Local development environment detected');
    }
    
    logger.info(`🌍 Detected environment: ${env}`);
    return env;
  }

  getOrGenerateSecret(key) {
    const secretsFile = path.join(this.secretsPath, `${key}.txt`);
    
    try {
      // Try to read existing secret
      if (fs.existsSync(secretsFile)) {
        const secret = fs.readFileSync(secretsFile, 'utf8').trim();
        logger.info(`🔑 Loaded existing secret: ${key}`);
        return secret;
      }
    } catch (error) {
      logger.warn(`⚠️ Could not read secret file: ${error.message}`);
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
      logger.info(`🔑 [AutoSecurityManager] Generated new secret: ${key}`);
    } catch (error) {
      logger.warn(`⚠️ [AutoSecurityManager] Could not save secret file: ${error.message}`);
    }

    return secret;
  }

  getSecurityConfig() {
    // Get URLs from environment variables
    const frontendUrl = process.env.FRONTEND_URL;
    const backendUrl = process.env.BACKEND_URL;
    
    // Dynamische CORS-Origin: Wenn kein Port in FRONTEND_URL, dann automatisch Port hinzufügen
    let corsOrigin = frontendUrl;
    if (frontendUrl && !frontendUrl.includes(':')) {
      // Kein Port angegeben - automatisch Port basierend auf Environment
      const port = this.config.environment === 'development' ? ':4000' : ':80';
      corsOrigin = frontendUrl + port;
    }
    
    const isProduction = this.config.environment === 'production';
    
    return {
      cors: {
        origin: corsOrigin,
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
        database: path.join(__dirname, '../../database/pidea-dev.db'),
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
          logger.info(`🗑️ [AutoSecurityManager] Cleaned up old secret: ${file}`);
        }
      }
    } catch (error) {
      logger.warn(`⚠️ [AutoSecurityManager] Could not cleanup old secrets: ${error.message}`);
    }
  }
}

module.exports = AutoSecurityManager; 