
/**
 * IDE API Deployment Configuration
 * 
 * This file contains deployment-specific configurations for the Unified IDE API.
 * It includes environment-specific settings, performance optimizations, and
 * deployment validation checks.
 */

const path = require('path');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isStaging = NODE_ENV === 'staging';
const isDevelopment = NODE_ENV === 'development';

// Base configuration
const baseConfig = {
  // API Configuration
  api: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
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
    port: parseInt(process.env.WS_PORT) || 3001,
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
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/pidea',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: isProduction ? 10 : 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0
    }
  },

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
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || '*',
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
const { logger } = require('@infrastructure/logging/Logger');
    }
  },

  // Monitoring Configuration
  monitoring: {
    enabled: isProduction,
    metrics: {
      enabled: true,
      port: parseInt(process.env.METRICS_PORT) || 9090
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

  // Required environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];

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

  logger.log(`Configuration loaded for environment: ${NODE_ENV}`);
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
    logger.log(`Received ${signal}. Starting graceful shutdown...`);
    
    // Close database connections
    // Close WebSocket connections
    // Stop accepting new requests
    // Wait for ongoing requests to complete
    
    logger.log('Graceful shutdown completed');
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