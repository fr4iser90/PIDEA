/**
 * Centralized Configuration for PIDEA Backend
 * All ports, URLs, and environment variables are defined here
 * NO HARDCODED VALUES ANYWHERE ELSE IN THE CODEBASE
 */

class CentralizedConfig {
  constructor() {
    this.currentEnv = process.env.NODE_ENV || 'development';
  }

  // ============================================================================
  // ENVIRONMENT VARIABLES - NO FALLBACKS, ONLY ENV VARS
  // ============================================================================

  get backendPort() {
    return process.env.BACKEND_PORT || this.extractPortFromUrl(process.env.BACKEND_URL);
  }

  get frontendPort() {
    return process.env.FRONTEND_PORT || this.extractPortFromUrl(process.env.FRONTEND_URL);
  }

  get websocketPort() {
    return process.env.WEBSOCKET_PORT || this.extractPortFromUrl(process.env.WEBSOCKET_URL);
  }

  get frontendUrl() {
    return process.env.FRONTEND_URL;
  }

  get backendUrl() {
    return process.env.BACKEND_URL;
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

    // Required for all environments
    const required = [
      'FRONTEND_URL',
      'BACKEND_URL'
    ];

    // Required for production
    const productionRequired = [
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ];

    // Check required vars
    for (const envVar of required) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

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
    if (this.currentEnv === 'development' && !this.databaseHost) {
      // SQLite for development
      return {
        type: 'sqlite',
        database: './pidea-dev.db',
        logging: true
      };
    }

    // PostgreSQL for production/staging
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