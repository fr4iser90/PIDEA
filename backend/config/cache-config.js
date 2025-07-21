/**
 * Cache Configuration for Analysis Data Caching System
 * Centralized TTL settings and cache parameters for different analysis types
 */

const cacheConfig = {
  // Analysis Steps (in analysis_results table)
  project: { 
    ttl: 24 * 60 * 60, // 24 hours - ProjectAnalysisStep
    description: 'Project structure analysis - very stable'
  },
  dependency: { 
    ttl: 24 * 60 * 60, // 24 hours - DependencyAnalysisStep
    description: 'Dependency analysis - rarely changes'
  },
  codeQuality: { 
    ttl: 6 * 60 * 60, // 6 hours - CodeQualityAnalysisStep
    description: 'Code quality analysis - moderate frequency'
  },
  security: { 
    ttl: 4 * 60 * 60, // 4 hours - SecurityAnalysisStep
    description: 'Security analysis - frequent updates'
  },
  performance: { 
    ttl: 8 * 60 * 60, // 8 hours - PerformanceAnalysisStep
    description: 'Performance analysis - moderate frequency'
  },
  architecture: { 
    ttl: 12 * 60 * 60, // 12 hours - ArchitectureAnalysisStep
    description: 'Architecture analysis - stable'
  },
  techStack: { 
    ttl: 24 * 60 * 60, // 24 hours - TechStackAnalysisStep
    description: 'Tech stack analysis - very stable'
  },
  'repository-type': { 
    ttl: 24 * 60 * 60, // 24 hours - RepositoryTypeAnalysisStep
    description: 'Repository type detection - very stable'
  },
  
  // Default cache settings
  default: {
    ttl: 12 * 60 * 60, // 12 hours
    description: 'Default cache duration'
  },
  
  // Cache invalidation settings
  invalidation: {
    staleThreshold: 60 * 60, // 1 hour
    maxAge: 7 * 24 * 60 * 60, // 7 days
    batchSize: 100,
    batchDelay: 1000 // 1 second
  },
  
  // Performance settings
  performance: {
    maxMemoryItems: 1000,
    hitRateThreshold: 0.8, // 80%
    responseTimeThreshold: 100 // 100ms
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