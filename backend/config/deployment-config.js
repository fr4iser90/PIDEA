/**
 * Deployment Configuration for IDE Unification
 * Environment-specific configurations for IDE API and frontend components
 */

const path = require("path");
const config = require("./index");

class DeploymentConfig {
  constructor() {
    this.environments = {
      development: this.getDevelopmentConfig(),
      staging: this.getStagingConfig(),
      production: this.getProductionConfig(),
    };

    this.currentEnv = process.env.NODE_ENV || "development";
    this.config = this.environments[this.currentEnv];
  }

  /**
   * Get development environment configuration
   */
  getDevelopmentConfig() {
    return {
      // IDE API Configuration
      ide: config.ide.ideConfig,

      // Frontend Configuration
      frontend: {
        port: config.app.frontendPort,
        hotReload: true,
        sourceMaps: true,
        devTools: true,
      },

      // Database Configuration
      database: config.database.databaseConfig,

      // WebSocket Configuration
      websocket: config.app.websocketConfig,

      // Security Configuration
      security: config.security,

      // Monitoring Configuration
      monitoring: config.monitoring.monitoringConfig,

      // Git Workflow Configuration
      gitWorkflow: {
        enabled: true,
        autoMerge: false,
        createPullRequests: true,
        requireReview: true,
        mergeStrategy: "squash",
        branchStrategies: {
          feature: {
            prefix: "feature",
            startPoint: "pidea-features",
            mergeTarget: "pidea-features",
          },
          bug: {
            prefix: "hotfix",
            startPoint: "main",
            mergeTarget: "main",
          },
          refactor: {
            prefix: "refactor",
            startPoint: "main",
            mergeTarget: "develop",
          },
        },
        metrics: {
          enabled: true,
          collectionInterval: 60000,
        },
        audit: {
          enabled: true,
          retentionDays: 90,
        },
      },
    };
  }

  /**
   * Get staging environment configuration
   */
  getStagingConfig() {
    return {
      // IDE API Configuration
      ide: config.ideConfig,

      // Frontend Configuration
      frontend: {
        port: config.frontendPort,
        hotReload: false,
        sourceMaps: false,
        devTools: false,
      },

      // Database Configuration
      database: config.databaseConfig,

      // WebSocket Configuration
      websocket: config.websocketConfig,

      // Security Configuration
      security: config.securityConfig,

      // Monitoring Configuration
      monitoring: config.monitoringConfig,

      // Git Workflow Configuration
      gitWorkflow: {
        enabled: true,
        autoMerge: false,
        createPullRequests: true,
        requireReview: true,
        mergeStrategy: "squash",
        branchStrategies: {
          feature: {
            prefix: "feature",
            startPoint: "pidea-features",
            mergeTarget: "pidea-features",
          },
          bug: {
            prefix: "hotfix",
            startPoint: "main",
            mergeTarget: "main",
          },
          refactor: {
            prefix: "refactor",
            startPoint: "main",
            mergeTarget: "develop",
          },
        },
        metrics: {
          enabled: true,
          collectionInterval: 60000,
        },
        audit: {
          enabled: true,
          retentionDays: 90,
        },
      },
    };
  }

  /**
   * Get production environment configuration
   */
  getProductionConfig() {
    return {
      // IDE API Configuration
      ide: config.ideConfig,

      // Frontend Configuration
      frontend: {
        port: config.frontendPort,
        hotReload: false,
        sourceMaps: false,
        devTools: false,
      },

      // Database Configuration
      database: config.databaseConfig,

      // WebSocket Configuration
      websocket: config.websocketConfig,

      // Security Configuration
      security: config.securityConfig,

      // Monitoring Configuration
      monitoring: config.monitoringConfig,

      // Git Workflow Configuration
      gitWorkflow: {
        enabled: true,
        autoMerge: false,
        createPullRequests: true,
        requireReview: true,
        mergeStrategy: "squash",
        branchStrategies: {
          feature: {
            prefix: "feature",
            startPoint: "pidea-features",
            mergeTarget: "pidea-features",
          },
          bug: {
            prefix: "hotfix",
            startPoint: "main",
            mergeTarget: "main",
          },
          refactor: {
            prefix: "refactor",
            startPoint: "main",
            mergeTarget: "develop",
          },
        },
        metrics: {
          enabled: true,
          collectionInterval: 300000,
        },
        audit: {
          enabled: true,
          retentionDays: 365,
        },
      },
    };
  }

  /**
   * Get current environment configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get configuration for specific environment
   */
  getConfigForEnv(environment) {
    return this.environments[environment] || this.environments.development;
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    // Validate required environment variables for production
    if (this.currentEnv === "production") {
      const requiredEnvVars = [
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
        "JWT_SECRET",
        "VITE_FRONTEND_URL",
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          errors.push(`Missing required environment variable: ${envVar}`);
        }
      }
    }

    // Validate IDE configuration
    const ideConfig = this.config.ide;
    if (!ideConfig.portRange) {
      errors.push("IDE port range configuration is missing");
    }

    // Validate database configuration
    const dbConfig = this.config.database;
    if (dbConfig.type === "postgresql") {
      if (!dbConfig.host || !dbConfig.database || !dbConfig.username) {
        errors.push("PostgreSQL configuration is incomplete");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig() {
    return {
      ide: {
        endpoint: "/api/ide/health",
        interval: this.config.monitoring.healthChecks.interval,
        timeout: this.config.monitoring.healthChecks.timeout,
        retries: 3,
      },
      database: {
        endpoint: "/api/health/database",
        interval: this.config.monitoring.healthChecks.interval,
        timeout: this.config.monitoring.healthChecks.timeout,
        retries: 3,
      },
      websocket: {
        endpoint: "/api/health/websocket",
        interval: this.config.monitoring.healthChecks.interval,
        timeout: this.config.monitoring.healthChecks.timeout,
        retries: 3,
      },
    };
  }

  /**
   * Get performance monitoring configuration
   */
  getPerformanceConfig() {
    return {
      enabled: this.config.monitoring.enabled,
      metrics: {
        enabled: this.config.monitoring.metrics.enabled,
        port: this.config.monitoring.metrics.port,
        collectInterval: 60000,
      },
      logging: {
        level: this.config.ide.logLevel,
        format: "json",
        timestamp: true,
      },
    };
  }

  /**
   * Get deployment utilities
   */
  getDeploymentUtils() {
    return {
      // Environment validation
      validateEnvironment: () => this.validate(),

      // Configuration export
      exportConfig: () => ({
        environment: this.currentEnv,
        config: this.config,
        timestamp: new Date().toISOString(),
      }),

      // Health check endpoints
      getHealthEndpoints: () => [
        "/api/health",
        "/api/ide/health",
        "/api/health/database",
        "/api/health/websocket",
      ],

      // Performance metrics endpoints
      getMetricsEndpoints: () => [
        "/api/metrics",
        "/api/ide/metrics",
        "/api/performance/metrics",
      ],
    };
  }
}

module.exports = DeploymentConfig;
