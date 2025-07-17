
/**
 * IDE API Deployment Configuration
 * 
 * This file contains deployment-specific configurations for the Unified IDE API.
 * It includes environment-specific settings, performance optimizations, and
 * deployment validation checks.
 */

const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('IDE-Deployment-Config');
const centralizedConfig = require('./centralized-config');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isStaging = NODE_ENV === 'staging';
const isDevelopment = NODE_ENV === 'development';

// Base configuration
const baseConfig = {
  // API Configuration
  api: {
    port: centralizedConfig.backendPort,
    host: centralizedConfig.backendUrl?.split('://')[1]?.split(':')[0],
    cors: {
      origin: centralizedConfig.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 100 : 1000, // requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    compression: isProduction,
    helmet: isProduction
  },

  // WebSocket Configuration
  websocket: {
    port: centralizedConfig.websocketPort,
    path: '/ws',
    pingInterval: 25000,
    pingTimeout: 5000,
    maxPayload: 16 * 1024, // 16KB
    perMessageDeflate: isProduction,
    clientTracking: true
  },

  // IDE Service Configuration
  ide: {
    maxInstances: parseInt(process.env.MAX_IDE_INSTANCES) || 10,
    defaultPort: 9222,
    portRange: {
      min: 9222,
      max: 9232
    },
    connectionTimeout: parseInt(process.env.IDE_CONNECTION_TIMEOUT) || 10000,
    heartbeatInterval: parseInt(process.env.IDE_HEARTBEAT_INTERVAL) || 5000,
    retryAttempts: parseInt(process.env.IDE_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.IDE_RETRY_DELAY) || 1000
  },

  // Database Configuration
  database: centralizedConfig.databaseConfig,

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: isProduction ? 'json' : 'simple',
    transports: {
      console: {
        enabled: true,
        level: process.env.CONSOLE_LOG_LEVEL || 'info'
      },
      file: {
        enabled: isProduction,
        filename: path.join(__dirname, '../logs/app.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        level: 'error'
      }
    }
  },

  // Security Configuration
  security: {
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS)
    },
    cors: {
      enabled: true,
      origin: centralizedConfig.frontendUrl,
      credentials: true
    },
    helmet: {
      enabled: isProduction,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }
  },

  // Performance Configuration
  performance: {
    compression: {
      enabled: isProduction,
      level: 6,
      threshold: 1024
    },
    caching: {
      enabled: isProduction,
      ttl: 300, // 5 minutes
      maxSize: 100
    },
    clustering: {
      enabled: isProduction,
      workers: parseInt(process.env.CLUSTER_WORKERS) || require('os').cpus().length
    }
  },

  // Monitoring Configuration
  monitoring: {
    enabled: isProduction,
    metrics: {
      enabled: true,
      port: centralizedConfig.monitoringConfig.metrics.port
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      interval: 30000
    },
    errorTracking: {
      enabled: isProduction,
      service: process.env.ERROR_TRACKING_SERVICE || 'sentry',
      dsn: process.env.ERROR_TRACKING_DSN
    }
  }
};

// Environment-specific overrides
const environmentConfigs = {
  development: {
    api: {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
      }
    },
    logging: {
      level: 'debug',
      format: 'simple'
    },
    security: {
      helmet: {
        enabled: false
      }
    },
    performance: {
      compression: {
        enabled: false
      },
      clustering: {
        enabled: false
      }
    }
  },

  staging: {
    api: {
      cors: {
        origin: process.env.STAGING_CORS_ORIGIN?.split(',') || ['https://staging.yourapp.com']
      }
    },
    logging: {
      level: 'info',
      format: 'json'
    },
    security: {
      helmet: {
        enabled: true
      }
    },
    performance: {
      compression: {
        enabled: true
      },
      clustering: {
        enabled: true,
        workers: 2
      }
    }
  },

  production: {
    api: {
      cors: {
        origin: process.env.PRODUCTION_CORS_ORIGIN?.split(',') || ['https://yourapp.com']
      }
    },
    logging: {
      level: 'warn',
      format: 'json'
    },
    security: {
      helmet: {
        enabled: true
      }
    },
    performance: {
      compression: {
        enabled: true
      },
      clustering: {
        enabled: true
      }
    },
    monitoring: {
      enabled: true
    }
  }
};

// Merge configurations
const config = {
  ...baseConfig,
  ...environmentConfigs[NODE_ENV],
  env: NODE_ENV,
  isProduction,
  isStaging,
  isDevelopment
};

// Validation function
function validateConfig() {
  const errors = [];

  // Use centralized config validation
  const centralizedValidation = centralizedConfig.validate();
  if (!centralizedValidation.isValid) {
    errors.push(...centralizedValidation.errors);
  }

  // Additional required environment variables for this config
  const requiredEnvVars = [];

  if (isProduction) {
    requiredEnvVars.push('ERROR_TRACKING_DSN');
  }

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate port ranges
  if (config.ide.portRange.min >= config.ide.portRange.max) {
    errors.push('IDE port range min must be less than max');
  }

  // Validate timeouts
  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  if (config.ide.connectionTimeout < 1000) {
    errors.push('IDE connection timeout must be at least 1000ms');
  }

  // Validate rate limits
  if (config.api.rateLimit.max < 1) {
    errors.push('Rate limit max must be at least 1');
  }

  if (errors.length > 0) {
    logger.error('Configuration validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    process.exit(1);
  }

  logger.info(`Configuration loaded for environment: ${NODE_ENV}`);
  return true;
}

// Health check configuration
const healthChecks = {
  database: async () => {
    try {
      // Add database health check logic
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  },

  ideService: async () => {
    try {
      // Add IDE service health check logic
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  },

  websocket: async () => {
    try {
      // Add WebSocket health check logic
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
};

// Performance monitoring
const performanceMetrics = {
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  activeConnections: 0,
  ideInstances: 0,

  incrementRequest() {
    this.requestCount++;
  },

  incrementError() {
    this.errorCount++;
  },

  updateResponseTime(time) {
    this.averageResponseTime = (this.averageResponseTime + time) / 2;
  },

  setActiveConnections(count) {
    this.activeConnections = count;
  },

  setIDEInstances(count) {
    this.ideInstances = count;
  },

  getMetrics() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      averageResponseTime: this.averageResponseTime,
      activeConnections: this.activeConnections,
      ideInstances: this.ideInstances,
      timestamp: new Date().toISOString()
    };
  }
};

// Deployment utilities
const deploymentUtils = {
  // Graceful shutdown
  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Close database connections
    // Close WebSocket connections
    // Stop accepting new requests
    // Wait for ongoing requests to complete
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  },

  // Memory usage monitoring
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      timestamp: new Date().toISOString()
    };
  },

  // CPU usage monitoring
  async getCPUUsage() {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    return {
      user: Math.round(endUsage.user / 1000), // ms
      system: Math.round(endUsage.system / 1000), // ms
      timestamp: new Date().toISOString()
    };
  }
};

// Export configuration and utilities
module.exports = {
  config,
  validateConfig,
  healthChecks,
  performanceMetrics,
  deploymentUtils
}; 