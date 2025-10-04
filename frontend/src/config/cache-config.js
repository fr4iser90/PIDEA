/**
 * Centralized Cache Configuration
 * One configuration for all cache operations across frontend and backend
 * Replaces fragmented cache configurations with one source of truth
 */

const cacheConfig = {
  // Data-type specific TTL configurations (in milliseconds)
  dataTypes: {
    // Analysis data (from backend/config/cache-config.js)
    project: { 
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 'high',
      description: 'Project structure analysis - very stable'
    },
    dependency: { 
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 'high',
      description: 'Dependency analysis - rarely changes'
    },
    codeQuality: { 
      ttl: 6 * 60 * 60 * 1000, // 6 hours
      priority: 'medium',
      description: 'Code quality analysis - moderate frequency'
    },
    security: { 
      ttl: 4 * 60 * 60 * 1000, // 4 hours
      priority: 'medium',
      description: 'Security analysis - frequent updates'
    },
    performance: { 
      ttl: 8 * 60 * 60 * 1000, // 8 hours
      priority: 'medium',
      description: 'Performance analysis - moderate frequency'
    },
    architecture: { 
      ttl: 12 * 60 * 60 * 1000, // 12 hours
      priority: 'high',
      description: 'Architecture analysis - stable'
    },
    techStack: { 
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 'high',
      description: 'Tech stack analysis - very stable'
    },
    repositoryType: { 
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 'high',
      description: 'Repository type detection - very stable'
    },
    
    // Frontend-specific data types
    ide: { 
      ttl: 5 * 60 * 1000, // 5 minutes
      priority: 'medium',
      description: 'IDE switching data - frequent updates'
    },
    chat: { 
      ttl: 5 * 60 * 1000, // 5 minutes
      priority: 'low',
      description: 'Chat history - frequent updates'
    },
    workflow: { 
      ttl: 5 * 60 * 1000, // 5 minutes
      priority: 'low',
      description: 'Workflow data - frequent updates'
    },
    
    // Default configuration
    default: { 
      ttl: 12 * 60 * 60 * 1000, // 12 hours
      priority: 'medium',
      description: 'Default cache duration'
    }
  },
  
  // Memory management settings
  memory: {
    maxSize: 50 * 1024 * 1024, // 50MB total memory limit
    maxEntries: 1000, // Maximum number of cache entries
    evictionStrategy: 'lru', // Least Recently Used
    compressionThreshold: 1024 // Compress entries larger than 1KB
  },
  
  // IndexedDB settings
  indexedDB: {
    enabled: true,
    dbName: 'PIDEA_Cache',
    version: 1,
    maxSize: 200 * 1024 * 1024, // 200MB IndexedDB limit
    maxEntries: 5000
  },
  
  // Cache invalidation settings
  invalidation: {
    staleThreshold: 60 * 60 * 1000, // 1 hour
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    batchSize: 100,
    batchDelay: 1000, // 1 second
    selectiveInvalidation: true, // Enable selective invalidation
    globalClearing: false // Disable global cache clearing
  },
  
  // Performance settings
  performance: {
    hitRateThreshold: 0.8, // 80% target hit rate
    responseTimeThreshold: 100, // 100ms response time target
    monitoringEnabled: true,
    analyticsRetention: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  
  // Namespace configuration for selective invalidation
  namespaces: {
    ide: ['ide:switch', 'ide:data', 'ide:port'],
    project: ['project:analysis', 'project:structure', 'project:dependencies'],
    analysis: ['analysis:codeQuality', 'analysis:security', 'analysis:performance'],
    chat: ['chat:history', 'chat:messages', 'chat:port'],
    workflow: ['workflow:steps', 'workflow:status', 'workflow:progress']
  },
  
  // Event-driven invalidation rules
  invalidationRules: {
    'ide:switch': { namespace: 'ide', pattern: 'ide:*' },
    'project:change': { namespace: 'project', pattern: 'project:*' },
    'analysis:complete': { namespace: 'analysis', pattern: 'analysis:*' },
    'chat:new': { namespace: 'chat', pattern: 'chat:*' },
    'workflow:update': { namespace: 'workflow', pattern: 'workflow:*' }
  },
  
  // Cache warming strategies
  warming: {
    enabled: true,
    strategies: {
      predictive: true, // Predict and cache likely needed data
      preload: true, // Preload critical data
      background: true // Background cache warming
    },
    triggers: ['ide:switch', 'project:load', 'analysis:start']
  },
  
  // Security settings
  security: {
    encryptSensitiveData: true,
    sanitizeKeys: true,
    auditLogging: true,
    rateLimit: {
      enabled: true,
      maxOperations: 1000, // per minute
      windowMs: 60 * 1000
    }
  }
};

/**
 * Get TTL configuration for data type
 * @param {string} dataType - Data type
 * @returns {Object} TTL configuration
 */
function getTTLConfig(dataType) {
  return cacheConfig.dataTypes[dataType] || cacheConfig.dataTypes.default;
}

/**
 * Get TTL value for data type
 * @param {string} dataType - Data type
 * @returns {number} TTL in milliseconds
 */
function getTTL(dataType) {
  const config = getTTLConfig(dataType);
  return config.ttl;
}

/**
 * Get priority for data type
 * @param {string} dataType - Data type
 * @returns {string} Priority level
 */
function getPriority(dataType) {
  const config = getTTLConfig(dataType);
  return config.priority;
}

/**
 * Get invalidation rule for event
 * @param {string} eventType - Event type
 * @returns {Object|null} Invalidation rule
 */
function getInvalidationRule(eventType) {
  return cacheConfig.invalidationRules[eventType] || null;
}

/**
 * Get namespace configuration
 * @param {string} namespace - Namespace name
 * @returns {Array} Namespace patterns
 */
function getNamespacePatterns(namespace) {
  return cacheConfig.namespaces[namespace] || [];
}

/**
 * Check if selective invalidation is enabled
 * @returns {boolean} Selective invalidation enabled
 */
function isSelectiveInvalidationEnabled() {
  return cacheConfig.invalidation.selectiveInvalidation;
}

/**
 * Check if global cache clearing is disabled
 * @returns {boolean} Global clearing disabled
 */
function isGlobalClearingDisabled() {
  return !cacheConfig.invalidation.globalClearing;
}

/**
 * Get memory configuration
 * @returns {Object} Memory configuration
 */
function getMemoryConfig() {
  return cacheConfig.memory;
}

/**
 * Get performance configuration
 * @returns {Object} Performance configuration
 */
function getPerformanceConfig() {
  return cacheConfig.performance;
}

/**
 * Get security configuration
 * @returns {Object} Security configuration
 */
function getSecurityConfig() {
  return cacheConfig.security;
}

/**
 * Update configuration (for runtime configuration changes)
 * @param {Object} updates - Configuration updates
 */
function updateConfig(updates) {
  Object.assign(cacheConfig, updates);
}

/**
 * Validate configuration
 * @returns {Object} Validation result
 */
function validateConfig() {
  const errors = [];
  const warnings = [];
  
  // Validate TTL values
  Object.entries(cacheConfig.dataTypes).forEach(([type, config]) => {
    if (config.ttl <= 0) {
      errors.push(`Invalid TTL for ${type}: ${config.ttl}`);
    }
    if (!['low', 'medium', 'high'].includes(config.priority)) {
      errors.push(`Invalid priority for ${type}: ${config.priority}`);
    }
  });
  
  // Validate memory limits
  if (cacheConfig.memory.maxSize <= 0) {
    errors.push('Invalid max memory size');
  }
  if (cacheConfig.memory.maxEntries <= 0) {
    errors.push('Invalid max entries');
  }
  
  // Validate performance thresholds
  if (cacheConfig.performance.hitRateThreshold < 0 || cacheConfig.performance.hitRateThreshold > 1) {
    warnings.push('Hit rate threshold should be between 0 and 1');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Export configuration and utility functions
export {
  cacheConfig,
  getTTLConfig,
  getTTL,
  getPriority,
  getInvalidationRule,
  getNamespacePatterns,
  isSelectiveInvalidationEnabled,
  isGlobalClearingDisabled,
  getMemoryConfig,
  getPerformanceConfig,
  getSecurityConfig,
  updateConfig,
  validateConfig
};

// Default export for easy importing
export default cacheConfig;
