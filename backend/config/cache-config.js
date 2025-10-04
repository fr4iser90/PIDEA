/**
 * Cache Configuration for Analysis Data Caching System
 * Centralized TTL settings and cache parameters for different analysis types
 * UPDATED: Now uses centralized configuration from config/cache-config.js
 */

// Import centralized configuration
const centralizedConfig = require('../../config/cache-config');

const cacheConfig = {
  // Analysis Steps (in analysis_results table) - using centralized TTLs
  project: { 
    ttl: centralizedConfig.dataTypes.project.ttl / 1000, // Convert from milliseconds to seconds
    description: centralizedConfig.dataTypes.project.description
  },
  dependency: { 
    ttl: centralizedConfig.dataTypes.dependency.ttl / 1000,
    description: centralizedConfig.dataTypes.dependency.description
  },
  codeQuality: { 
    ttl: centralizedConfig.dataTypes.codeQuality.ttl / 1000,
    description: centralizedConfig.dataTypes.codeQuality.description
  },
  security: { 
    ttl: centralizedConfig.dataTypes.security.ttl / 1000,
    description: centralizedConfig.dataTypes.security.description
  },
  performance: { 
    ttl: centralizedConfig.dataTypes.performance.ttl / 1000,
    description: centralizedConfig.dataTypes.performance.description
  },
  architecture: { 
    ttl: centralizedConfig.dataTypes.architecture.ttl / 1000,
    description: centralizedConfig.dataTypes.architecture.description
  },
  techStack: { 
    ttl: centralizedConfig.dataTypes.techStack.ttl / 1000,
    description: centralizedConfig.dataTypes.techStack.description
  },
  'repository-type': { 
    ttl: centralizedConfig.dataTypes.repositoryType.ttl / 1000,
    description: centralizedConfig.dataTypes.repositoryType.description
  },
  
  // Default cache settings
  default: {
    ttl: centralizedConfig.dataTypes.default.ttl / 1000,
    description: centralizedConfig.dataTypes.default.description
  },
  
  // Cache invalidation settings - using centralized configuration
  invalidation: {
    staleThreshold: centralizedConfig.invalidation.staleThreshold / 1000,
    maxAge: centralizedConfig.invalidation.maxAge / 1000,
    batchSize: centralizedConfig.invalidation.batchSize,
    batchDelay: centralizedConfig.invalidation.batchDelay,
    selectiveInvalidation: centralizedConfig.invalidation.selectiveInvalidation,
    globalClearing: centralizedConfig.invalidation.globalClearing
  },
  
  // Performance settings - using centralized configuration
  performance: {
    maxMemoryItems: centralizedConfig.memory.maxEntries,
    hitRateThreshold: centralizedConfig.performance.hitRateThreshold,
    responseTimeThreshold: centralizedConfig.performance.responseTimeThreshold
  }
};

/**
 * Get TTL for analysis type
 * @param {string} analysisType - Analysis type
 * @returns {number} TTL in seconds
 */
function getTTL(analysisType) {
  const config = cacheConfig[analysisType];
  return config ? config.ttl : cacheConfig.default.ttl;
}

/**
 * Get full config for analysis type
 * @param {string} analysisType - Analysis type
 * @returns {Object} Cache configuration
 */
function getConfig(analysisType) {
  return cacheConfig[analysisType] || cacheConfig.default;
}

/**
 * Check if caching is enabled for analysis type
 * @param {string} analysisType - Analysis type
 * @returns {boolean} True if caching enabled
 */
function isCacheEnabled(analysisType) {
  return cacheConfig[analysisType] !== undefined;
}

/**
 * Get all cacheable analysis types
 * @returns {Array} Array of cacheable analysis types
 */
function getCacheableTypes() {
  return Object.keys(cacheConfig).filter(key => 
    key !== 'default' && key !== 'invalidation' && key !== 'performance'
  );
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  const cacheableTypes = getCacheableTypes();
  const totalTTL = cacheableTypes.reduce((sum, type) => sum + getTTL(type), 0);
  const avgTTL = totalTTL / cacheableTypes.length;
  
  return {
    totalTypes: cacheableTypes.length,
    averageTTL: avgTTL,
    cacheableTypes: cacheableTypes,
    performance: cacheConfig.performance,
    invalidation: cacheConfig.invalidation
  };
}

module.exports = {
  cacheConfig,
  getTTL,
  getConfig,
  isCacheEnabled,
  getCacheableTypes,
  getCacheStats
}; 