/**
 * Monitoring Configuration
 * Health checks, metrics, performance monitoring settings
 */

const appConfig = require("./app-config");

class MonitoringConfig {
  constructor() {
    this.enabled = true;
  }

  // ============================================================================
  // METRICS CONFIGURATION
  // ============================================================================

  get metricsConfig() {
    return {
      enabled: true,
      port: process.env.METRICS_PORT || 9090,
      collectionInterval: appConfig.isProduction ? 60000 : 30000,
      retentionPeriod: appConfig.isProduction ? 86400000 : 3600000, // 24h vs 1h
    };
  }

  get performanceConfig() {
    return {
      enabled: true,
      slowQueryThreshold: appConfig.isProduction ? 1000 : 500,
      memoryThreshold: appConfig.isProduction ? 0.8 : 0.9,
      cpuThreshold: appConfig.isProduction ? 0.8 : 0.9,
    };
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  get healthChecksConfig() {
    return {
      enabled: true,
      interval: appConfig.isProduction ? 120000 : 30000,
      timeout: appConfig.isProduction ? 15000 : 5000,
      retries: appConfig.isProduction ? 3 : 1,
    };
  }

  get serviceHealthConfig() {
    return {
      database: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
      },
      eventBus: {
        enabled: true,
        interval: 30000,
        timeout: 2000,
      },
      ideManager: {
        enabled: true,
        interval: 60000,
        timeout: 10000,
      },
    };
  }

  // ============================================================================
  // LOGGING CONFIGURATION
  // ============================================================================

  get loggingConfig() {
    return {
      level: appConfig.isProduction ? "warn" : "debug",
      format: appConfig.isProduction ? "json" : "pretty",
      maxFiles: appConfig.isProduction ? 10 : 5,
      maxSize: appConfig.isProduction ? "10m" : "5m",
      directory: "logs",
    };
  }

  get auditConfig() {
    return {
      enabled: appConfig.isProduction,
      logLevel: "info",
      includeRequestBody: false,
      includeResponseBody: false,
      sensitiveFields: ["password", "token", "secret"],
    };
  }

  // ============================================================================
  // ALERTING CONFIGURATION
  // ============================================================================

  get alertingConfig() {
    return {
      enabled: appConfig.isProduction,
      thresholds: {
        errorRate: 0.05, // 5%
        responseTime: 2000, // 2s
        memoryUsage: 0.9, // 90%
        cpuUsage: 0.8, // 80%
      },
      channels: {
        email: {
          enabled: appConfig.isProduction,
          recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(",") || [],
        },
        webhook: {
          enabled: appConfig.isProduction,
          url: process.env.ALERT_WEBHOOK_URL,
        },
      },
    };
  }

  // ============================================================================
  // CACHE CONFIGURATION
  // ============================================================================

  get cacheConfig() {
    return {
      enabled: true,
      maxMemorySize: 104857600, // 100MB
      maxMemoryEntries: 2000,
      ttl: appConfig.isProduction ? 300000 : 60000, // 5min vs 1min
      cleanupInterval: 60000,
    };
  }

  get queryCacheConfig() {
    return {
      enabled: true,
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      cleanupInterval: 300000,
    };
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  validate() {
    const errors = [];
    const warnings = [];

    if (appConfig.isProduction) {
      if (!process.env.METRICS_PORT) {
        warnings.push("METRICS_PORT not set, using default 9090");
      }

      if (this.alertingConfig.enabled) {
        if (!process.env.ALERT_EMAIL_RECIPIENTS && !process.env.ALERT_WEBHOOK_URL) {
          warnings.push("No alerting channels configured for production");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getFullConfig() {
    return {
      metrics: this.metricsConfig,
      performance: this.performanceConfig,
      healthChecks: this.healthChecksConfig,
      serviceHealth: this.serviceHealthConfig,
      logging: this.loggingConfig,
      audit: this.auditConfig,
      alerting: this.alertingConfig,
      cache: this.cacheConfig,
      queryCache: this.queryCacheConfig,
    };
  }

  isMonitoringEnabled() {
    return this.enabled;
  }

  shouldLogLevel(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.loggingConfig.level] || 2;
    const messageLevel = levels[level] || 2;
    
    return messageLevel <= currentLevel;
  }
}

module.exports = new MonitoringConfig();
