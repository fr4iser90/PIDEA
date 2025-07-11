/**
 * Deployment Configuration for IDE Unification
 * Environment-specific configurations for IDE API and frontend components
 */

const path = require('path');

class DeploymentConfig {
  constructor() {
    this.environments = {
      development: this.getDevelopmentConfig(),
      staging: this.getStagingConfig(),
      production: this.getProductionConfig()
    };
    
    this.currentEnv = process.env.NODE_ENV || 'development';
    this.config = this.environments[this.currentEnv];
  }

  /**
   * Get development environment configuration
   */
  getDevelopmentConfig() {
    return {
      // IDE API Configuration
      ide: {
        portRange: {
          cursor: { start: 9222, end: 9231 },
          vscode: { start: 9232, end: 9241 },
          windsurf: { start: 9242, end: 9251 }
        },
        healthCheckInterval: 30000,
        maxConcurrentIDEs: 5,
        autoStart: false,
        logLevel: 'debug'
      },

      // Frontend Configuration
      frontend: {
        port: 4040,
        hotReload: true,
        sourceMaps: true,
        devTools: true
      },

      // Database Configuration
      database: {
        type: 'sqlite',
        path: path.join(__dirname, '../database/PIDEA-dev.db'),
        logging: true
      },

      // WebSocket Configuration
      websocket: {
        port: 8090,
        cors: {
          origin: ['http://localhost:4040', 'http://127.0.0.1:4040'],
          credentials: true
        }
      },

      // Security Configuration
      security: {
        jwtSecret: 'dev-secret-key-change-in-production',
        cors: {
          origin: ['http://localhost:4040', 'http://127.0.0.1:4040'],
          credentials: true
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000 // limit each IP to 1000 requests per windowMs
        }
      },

      // Monitoring Configuration
      monitoring: {
        enabled: true,
        metrics: {
          enabled: true,
          port: 9090
        },
        healthChecks: {
          enabled: true,
          interval: 30000,
          timeout: 5000
        }
      },

      // Git Workflow Configuration
      gitWorkflow: {
        enabled: true,
        autoMerge: false,
        createPullRequests: true,
        requireReview: true,
        mergeStrategy: 'squash',
        branchStrategies: {
          feature: {
            prefix: 'feature',
            startPoint: 'pidea-features',
            mergeTarget: 'pidea-features'
          },
          bug: {
            prefix: 'hotfix',
            startPoint: 'main',
            mergeTarget: 'main'
          },
          refactor: {
            prefix: 'refactor',
            startPoint: 'main',
            mergeTarget: 'develop'
          }
        },
        metrics: {
          enabled: true,
          collectionInterval: 60000
        },
        audit: {
          enabled: true,
          retentionDays: 90
        }
      }
    };
  }

  /**
   * Get staging environment configuration
   */
  getStagingConfig() {
    return {
      // IDE API Configuration
      ide: {
        portRange: {
          cursor: { start: 9222, end: 9231 },
          vscode: { start: 9232, end: 9241 },
          windsurf: { start: 9242, end: 9251 }
        },
        healthCheckInterval: 60000,
        maxConcurrentIDEs: 10,
        autoStart: false,
        logLevel: 'info'
      },

      // Frontend Configuration
      frontend: {
        port: 4040,
        hotReload: false,
        sourceMaps: false,
        devTools: false
      },

      // Database Configuration
      database: {
        type: 'postgresql',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'pidea_staging',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        logging: false
      },

      // WebSocket Configuration
      websocket: {
        port: 8090,
        cors: {
          origin: process.env.FRONTEND_URL || 'https://staging.pidea.com',
          credentials: true
        }
      },

      // Security Configuration
      security: {
        jwtSecret: process.env.JWT_SECRET || 'staging-secret-key',
        cors: {
          origin: process.env.FRONTEND_URL || 'https://staging.pidea.com',
          credentials: true
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          max: 500
        }
      },

      // Monitoring Configuration
      monitoring: {
        enabled: true,
        metrics: {
          enabled: true,
          port: 9090
        },
        healthChecks: {
          enabled: true,
          interval: 60000,
          timeout: 10000
        }
      },

      // Git Workflow Configuration
      gitWorkflow: {
        enabled: true,
        autoMerge: false,
        createPullRequests: true,
        requireReview: true,
        mergeStrategy: 'squash',
        branchStrategies: {
          feature: {
            prefix: 'feature',
            startPoint: 'pidea-features',
            mergeTarget: 'pidea-features'
          },
          bug: {
            prefix: 'hotfix',
            startPoint: 'main',
            mergeTarget: 'main'
          },
          refactor: {
            prefix: 'refactor',
            startPoint: 'main',
            mergeTarget: 'develop'
          }
        },
        metrics: {
          enabled: true,
          collectionInterval: 60000
        },
        audit: {
          enabled: true,
          retentionDays: 90
        }
      }
    };
  }

  /**
   * Get production environment configuration
   */
  getProductionConfig() {
    return {
      // IDE API Configuration
      ide: {
        portRange: {
          cursor: { start: 9222, end: 9231 },
          vscode: { start: 9232, end: 9241 },
          windsurf: { start: 9242, end: 9251 }
        },
        healthCheckInterval: 120000,
        maxConcurrentIDEs: 20,
        autoStart: false,
        logLevel: 'warn'
      },

      // Frontend Configuration
      frontend: {
        port: 4040,
        hotReload: false,
        sourceMaps: false,
        devTools: false
      },

      // Database Configuration
      database: {
        type: 'postgresql',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        logging: false,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      },

      // WebSocket Configuration
      websocket: {
        port: 8090,
        cors: {
          origin: process.env.FRONTEND_URL,
          credentials: true
        }
      },

      // Security Configuration
      security: {
        jwtSecret: process.env.JWT_SECRET,
        cors: {
          origin: process.env.FRONTEND_URL,
          credentials: true
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          max: 200
        }
      },

      // Monitoring Configuration
      monitoring: {
        enabled: true,
        metrics: {
          enabled: true,
          port: 9090
        },
        healthChecks: {
          enabled: true,
          interval: 120000,
          timeout: 15000
        }
      },

      // Git Workflow Configuration
      gitWorkflow: {
        enabled: true,
        autoMerge: false,
        createPullRequests: true,
        requireReview: true,
        mergeStrategy: 'squash',
        branchStrategies: {
          feature: {
            prefix: 'feature',
            startPoint: 'pidea-features',
            mergeTarget: 'pidea-features'
          },
          bug: {
            prefix: 'hotfix',
            startPoint: 'main',
            mergeTarget: 'main'
          },
          refactor: {
            prefix: 'refactor',
            startPoint: 'main',
            mergeTarget: 'develop'
          }
        },
        metrics: {
          enabled: true,
          collectionInterval: 300000
        },
        audit: {
          enabled: true,
          retentionDays: 365
        }
      }
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
    if (this.currentEnv === 'production') {
      const requiredEnvVars = [
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'JWT_SECRET',
        'FRONTEND_URL'
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
      errors.push('IDE port range configuration is missing');
    }

    // Validate database configuration
    const dbConfig = this.config.database;
    if (dbConfig.type === 'postgresql') {
      if (!dbConfig.host || !dbConfig.database || !dbConfig.username) {
        errors.push('PostgreSQL configuration is incomplete');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig() {
    return {
      ide: {
        endpoint: '/api/ide/health',
        interval: this.config.monitoring.healthChecks.interval,
        timeout: this.config.monitoring.healthChecks.timeout,
        retries: 3
      },
      database: {
        endpoint: '/api/health/database',
        interval: this.config.monitoring.healthChecks.interval,
        timeout: this.config.monitoring.healthChecks.timeout,
        retries: 3
      },
      websocket: {
        endpoint: '/api/health/websocket',
        interval: this.config.monitoring.healthChecks.interval,
        timeout: this.config.monitoring.healthChecks.timeout,
        retries: 3
      }
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
        collectInterval: 60000
      },
      logging: {
        level: this.config.ide.logLevel,
        format: 'json',
        timestamp: true
      }
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
        timestamp: new Date().toISOString()
      }),

      // Health check endpoints
      getHealthEndpoints: () => [
        '/api/health',
        '/api/ide/health',
        '/api/health/database',
        '/api/health/websocket'
      ],

      // Performance metrics endpoints
      getMetricsEndpoints: () => [
        '/api/metrics',
        '/api/ide/metrics',
        '/api/performance/metrics'
      ]
    };
  }
}

module.exports = DeploymentConfig; 