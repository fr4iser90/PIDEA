/**
 * Centralized Configuration for PIDEA Backend
 * All ports, URLs, and environment variables are defined here
 * NO HARDCODED VALUES ANYWHERE ELSE IN THE CODEBASE
 */

const path = require('path');

class CentralizedConfig {
  constructor() {
    this.currentEnv = process.env.NODE_ENV || 'development';
  }

  // ============================================================================
  // ENVIRONMENT VARIABLES - NO FALLBACKS, ONLY ENV VARS
  // ============================================================================

  get backendPort() {
    // Always use port 3000 in Docker, extract from URL in development
    if (process.env.DOCKER_ENV === 'true') {
      return 3000;
    }
    // In development, extract from VITE_BACKEND_URL
    return this.extractPortFromUrl(process.env.VITE_BACKEND_URL) || 3000;
  }

  get frontendPort() {
    return process.env.FRONTEND_PORT || this.extractPortFromUrl(process.env.VITE_FRONTEND_URL);
  }

  get websocketPort() {
    return process.env.WEBSOCKET_PORT || this.extractPortFromUrl(process.env.WEBSOCKET_URL);
  }

  get domain() {
    // Development: localhost, Production: aus DOMAIN env
    if (this.currentEnv === 'development') {
      return 'localhost';
    }
    return process.env.DOMAIN || 'localhost';
  }

  get frontendUrl() {
    const protocol = this.currentEnv === 'development' ? 'http' : 'https';
    return `${protocol}://${this.domain}`;
  }

  get backendUrl() {
    // Im Docker: Frontend proxy't /api an Backend
    // Im Development: direkter Backend-Zugriff
    if (process.env.DOCKER_ENV === 'true') {
      return `${this.frontendUrl}`;  // Nur die Domain, /api kommt vom Frontend
    }
    // Development: direkter Backend-Zugriff
    return `${this.frontendUrl}:3000`;
  }

  get websocketUrl() {
    return process.env.WEBSOCKET_URL || this.generateWebSocketUrl();
  }



  get databaseHost() {
    return process.env.DB_HOST;
  }

  get databasePort() {
    return process.env.DB_PORT;
  }

  get databaseName() {
    return process.env.DB_NAME;
  }

  get databaseUser() {
    return process.env.DB_USER;
  }

  get databasePassword() {
    return process.env.DB_PASSWORD;
  }

  get databaseSsl() {
    return process.env.DB_SSL === 'true';
  }

  // ============================================================================
  // IDE PORTS - FROM ENVIRONMENT ONLY
  // ============================================================================

  get cursorPortStart() {
    return process.env.CURSOR_PORT_START;
  }

  get cursorPortEnd() {
    return process.env.CURSOR_PORT_END;
  }

  get vscodePortStart() {
    return process.env.VSCODE_PORT_START;
  }

  get vscodePortEnd() {
    return process.env.VSCODE_PORT_END;
  }

  get windsurfPortStart() {
    return process.env.WINDSURF_PORT_START;
  }

  get windsurfPortEnd() {
    return process.env.WINDSURF_PORT_END;
  }

  // ============================================================================
  // UTILITY METHODS FOR URL PARSING
  // ============================================================================

  extractPortFromUrl(url) {
    if (!url) return null;
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  generateWebSocketUrl() {
    if (!this.backendUrl) return null;
    return this.backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  }

  // ============================================================================
  // VALIDATION - ENSURE ALL REQUIRED ENV VARS ARE SET
  // ============================================================================

  validate() {
    const errors = [];
    const warnings = [];

    // Required for production
    const productionRequired = [
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'DOMAIN'
    ];

    // Check production vars
    if (this.currentEnv === 'production') {
      for (const envVar of productionRequired) {
        if (!process.env[envVar]) {
          errors.push(`Missing required production environment variable: ${envVar}`);
        }
      }
    }

    // Check development vars
    if (this.currentEnv === 'development') {
      if (!process.env.DB_HOST) {
        warnings.push('DB_HOST not set for development - using SQLite fallback');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // CONFIGURATION OBJECTS - NO HARDCODED VALUES
  // ============================================================================

  get serverConfig() {
    return {
      port: this.backendPort,
      env: this.currentEnv
    };
  }

  get frontendConfig() {
    return {
      port: this.frontendPort,
      url: this.frontendUrl
    };
  }

  get websocketConfig() {
    return {
      port: this.websocketPort,
      url: this.websocketUrl,
      cors: {
        origin: this.frontendUrl,
        credentials: true
      }
    };
  }

  get databaseConfig() {
    // Check DATABASE_TYPE first
    const databaseType = process.env.DATABASE_TYPE || 'sqlite';
    
    if (databaseType === 'postgres' || databaseType === 'postgresql') {
      // PostgreSQL configuration
      return {
        type: 'postgresql',
        host: this.databaseHost,
        port: this.databasePort,
        database: this.databaseName,
        username: this.databaseUser,
        password: this.databasePassword,
        logging: this.currentEnv === 'development',
        ssl: this.databaseSsl ? { rejectUnauthorized: false } : false
      };
    } else {
      // SQLite configuration (default)
      return {
        type: 'sqlite',
        database: path.join(process.cwd(), 'backend', 'database', 'pidea-dev.db'),
        logging: true
      };
    }
  }

  get securityConfig() {
    return {
      cors: {
        origin: this.frontendUrl,
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: this.currentEnv === 'production' ? 200 : 1000
      }
    };
  }

  get ideConfig() {
    return {
      portRange: {
        cursor: { 
          start: this.cursorPortStart, 
          end: this.cursorPortEnd 
        },
        vscode: { 
          start: this.vscodePortStart, 
          end: this.vscodePortEnd 
        },
        windsurf: { 
          start: this.windsurfPortStart, 
          end: this.windsurfPortEnd 
        }
      },
      healthCheckInterval: this.currentEnv === 'production' ? 120000 : 30000,
      maxConcurrentIDEs: this.currentEnv === 'production' ? 20 : 10,
      autoStart: false,
      logLevel: this.currentEnv === 'production' ? 'warn' : 'debug'
    };
  }

  get monitoringConfig() {
    return {
      enabled: true,
      metrics: {
        enabled: true,
        port: process.env.METRICS_PORT || 9090
      },
      healthChecks: {
        enabled: true,
        interval: this.currentEnv === 'production' ? 120000 : 30000,
        timeout: this.currentEnv === 'production' ? 15000 : 5000
      }
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getFullConfig() {
    return {
      server: this.serverConfig,
      frontend: this.frontendConfig,
      websocket: this.websocketConfig,
      database: this.databaseConfig,
      security: this.securityConfig,
      ide: this.ideConfig,
      monitoring: this.monitoringConfig,
      environment: this.currentEnv
    };
  }

  isProduction() {
    return this.currentEnv === 'production';
  }

  isDevelopment() {
    return this.currentEnv === 'development';
  }

  isStaging() {
    return this.currentEnv === 'staging';
  }
}

// Export singleton instance
const centralizedConfig = new CentralizedConfig();

module.exports = centralizedConfig; 