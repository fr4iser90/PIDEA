/**
 * ExecutionCache - Execution result caching for workflow execution
 * Provides caching for workflow results to improve performance
 */
const crypto = require('crypto');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Execution cache for workflow results
 */
class ExecutionCache {
  constructor(options = {}) {
    this.logger = options.logger || console;
    
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 3600000; // 1 hour
    this.enableCaching = options.enableCaching !== false;
    this.enableCompression = options.enableCompression !== false;
    this.cacheHitThreshold = options.cacheHitThreshold || 0.1; // 10% improvement threshold
    
    // Cache storage
    this.cache = new Map();
    this.accessTimes = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalSize: 0
    };
    
    // Cache cleanup interval
    this.cleanupInterval = null;
    this.cleanupIntervalMs = options.cleanupIntervalMs || 300000; // 5 minutes
    
    // Start cleanup if enabled
    if (this.enableCaching) {
      this.startCleanupInterval();
    }
  }

  /**
   * Get cached result
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object|null} Cached result or null
   */
  async getCachedResult(workflow, context) {
    if (!this.enableCaching) {
      return null;
    }

    const cacheKey = this.generateCacheKey(workflow, context);
    
    if (!this.cache.has(cacheKey)) {
      this.cacheStats.misses++;
      return null;
    }

    const cachedItem = this.cache.get(cacheKey);
    
    // Check TTL
    if (Date.now() - cachedItem.timestamp > this.ttl) {
      this.cache.delete(cacheKey);
      this.accessTimes.delete(cacheKey);
      this.cacheStats.misses++;
      return null;
    }

    // Update access time and stats
    this.accessTimes.set(cacheKey, Date.now());
    this.cacheStats.hits++;
    
    this.logger.info('ExecutionCache: Cache hit', {
      cacheKey: cacheKey.substring(0, 20) + '...',
      age: Date.now() - cachedItem.timestamp,
      hitRate: this.getHitRate()
    });

    return cachedItem.result;
  }

  /**
   * Cache result
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} result - Result to cache
   * @param {Object} options - Caching options
   */
  async cacheResult(workflow, context, result, options = {}) {
    if (!this.enableCaching) {
      return;
    }

    const cacheKey = this.generateCacheKey(workflow, context);
    const ttl = options.ttl || this.ttl;
    
    // Check if result is worth caching
    if (!this.isResultWorthCaching(result, options)) {
      this.logger.debug('ExecutionCache: Result not worth caching', {
        cacheKey: cacheKey.substring(0, 20) + '...',
        reason: 'Below threshold'
      });
      return;
    }
    
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Prepare result for caching
    const cachedResult = this.prepareResultForCaching(result, options);
    
    // Cache the result
    this.cache.set(cacheKey, {
      result: cachedResult,
      timestamp: Date.now(),
      ttl,
      size: this.calculateResultSize(cachedResult),
      metadata: {
        workflowName: workflow.getMetadata().name,
        workflowVersion: workflow.getMetadata().version,
        contextHash: this.hashContext(context),
        cachedAt: new Date()
      }
    });
    
    this.accessTimes.set(cacheKey, Date.now());
    this.cacheStats.sets++;
    this.cacheStats.totalSize += this.calculateResultSize(cachedResult);

    this.logger.info('ExecutionCache: Result cached', {
      cacheKey: cacheKey.substring(0, 20) + '...',
      cacheSize: this.cache.size,
      resultSize: this.calculateResultSize(cachedResult)
    });
  }

  /**
   * Check if result is worth caching
   * @param {Object} result - Result to check
   * @param {Object} options - Caching options
   * @returns {boolean} True if worth caching
   */
  isResultWorthCaching(result, options = {}) {
    // Check if result is successful
    if (result && result.success === false) {
      return false;
    }
    
    // Check if result has minimum size
    const resultSize = this.calculateResultSize(result);
    const minSize = options.minSize || 100; // bytes
    if (resultSize < minSize) {
      return false;
    }
    
    // Check if result has minimum complexity
    const complexity = this.calculateResultComplexity(result);
    const minComplexity = options.minComplexity || 1;
    if (complexity < minComplexity) {
      return false;
    }
    
    return true;
  }

  /**
   * Prepare result for caching
   * @param {Object} result - Result to prepare
   * @param {Object} options - Caching options
   * @returns {Object} Prepared result
   */
  prepareResultForCaching(result, options = {}) {
    let preparedResult = { ...result };
    
    // Remove sensitive data
    if (options.excludeSensitive) {
      preparedResult = this.removeSensitiveData(preparedResult);
    }
    
    // Compress if enabled
    if (this.enableCompression && options.compress !== false) {
      preparedResult = this.compressResult(preparedResult);
    }
    
    return preparedResult;
  }

  /**
   * Remove sensitive data from result
   * @param {Object} result - Result to clean
   * @returns {Object} Cleaned result
   */
  removeSensitiveData(result) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const cleaned = { ...result };
    
    const cleanObject = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          cleanObject(value);
        }
      }
    };
    
    cleanObject(cleaned);
    return cleaned;
  }

  /**
   * Compress result
   * @param {Object} result - Result to compress
   * @returns {Object} Compressed result
   */
  compressResult(result) {
    // Simple compression by removing redundant data
    const compressed = { ...result };
    
    // Remove empty arrays and objects
    const cleanObject = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value) && value.length === 0) {
          delete obj[key];
        } else if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
          delete obj[key];
        } else if (typeof value === 'object' && value !== null) {
          cleanObject(value);
        }
      }
    };
    
    cleanObject(compressed);
    return compressed;
  }

  /**
   * Generate cache key
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {string} Cache key
   */
  generateCacheKey(workflow, context) {
    const metadata = workflow.getMetadata();
    const contextHash = this.hashContext(context);
    const workflowHash = this.hashWorkflow(workflow);
    return `${workflowHash}_${contextHash}`;
  }

  /**
   * Hash context for caching
   * @param {WorkflowContext} context - Context
   * @returns {string} Context hash
   */
  hashContext(context) {
    try {
      // Get relevant context data for caching
      const contextData = context.getAll();
      const relevantData = this.extractRelevantContextData(contextData);
      const contextStr = JSON.stringify(relevantData);
      return crypto.createHash('md5').update(contextStr).digest('hex');
    } catch (error) {
      this.logger.warn('ExecutionCache: Failed to hash context', {
        error: error.message
      });
      return 'default';
    }
  }

  /**
   * Hash workflow for caching
   * @param {IWorkflow} workflow - Workflow
   * @returns {string} Workflow hash
   */
  hashWorkflow(workflow) {
    try {
      const metadata = workflow.getMetadata();
      const workflowStr = JSON.stringify({
        name: metadata.name,
        version: metadata.version,
        steps: metadata.steps?.map(step => {
          const stepMetadata = step.getMetadata ? step.getMetadata() : step;
          return {
            type: stepMetadata.type,
            name: stepMetadata.name,
            parameters: stepMetadata.parameters
          };
        })
      });
      return crypto.createHash('md5').update(workflowStr).digest('hex');
    } catch (error) {
      this.logger.warn('ExecutionCache: Failed to hash workflow', {
        error: error.message
      });
      return 'default';
    }
  }

  /**
   * Extract relevant context data for caching
   * @param {Object} contextData - Full context data
   * @returns {Object} Relevant context data
   */
  extractRelevantContextData(contextData) {
    const relevantKeys = [
      'projectId', 'userId', 'environment', 'mode', 'version',
      'config', 'settings', 'parameters'
    ];
    
    const relevant = {};
    for (const key of relevantKeys) {
      if (contextData[key] !== undefined) {
        relevant[key] = contextData[key];
      }
    }
    
    return relevant;
  }

  /**
   * Evict oldest cache entries
   */
  evictOldest() {
    // Find oldest accessed entry
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    // Remove oldest entry
    if (oldestKey) {
      const cachedItem = this.cache.get(oldestKey);
      if (cachedItem) {
        this.cacheStats.totalSize -= cachedItem.size;
      }
      
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
      this.cacheStats.evictions++;
      
      this.logger.info('ExecutionCache: Evicted oldest entry', {
        cacheKey: oldestKey.substring(0, 20) + '...'
      });
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cleanupIntervalMs);

    this.logger.info('ExecutionCache: Cleanup interval started', {
      interval: this.cleanupIntervalMs
    });
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.info('ExecutionCache: Cleanup interval stopped');
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cachedItem] of this.cache.entries()) {
      if (now - cachedItem.timestamp > cachedItem.ttl) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        this.cacheStats.totalSize -= cachedItem.size;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('ExecutionCache: Cleaned expired entries', {
        cleanedCount,
        remainingEntries: this.cache.size
      });
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.cacheStats.totalSize = 0;
    
    this.logger.info('ExecutionCache: Cache cleared');
  }

  /**
   * Calculate result size
   * @param {Object} result - Result to measure
   * @returns {number} Size in bytes
   */
  calculateResultSize(result) {
    try {
      return JSON.stringify(result).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate result complexity
   * @param {Object} result - Result to analyze
   * @returns {number} Complexity score
   */
  calculateResultComplexity(result) {
    if (!result) return 0;
    
    let complexity = 1;
    
    // Count object properties
    if (typeof result === 'object') {
      complexity += Object.keys(result).length;
      
      // Recursively count nested properties
      for (const value of Object.values(result)) {
        if (typeof value === 'object' && value !== null) {
          complexity += this.calculateResultComplexity(value);
        }
      }
    }
    
    return complexity;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStatistics() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hitRate: hitRate,
      hitRatePercentage: (hitRate * 100).toFixed(2),
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      sets: this.cacheStats.sets,
      evictions: this.cacheStats.evictions,
      totalSize: this.cacheStats.totalSize,
      averageSize: this.cache.size > 0 ? this.cacheStats.totalSize / this.cache.size : 0,
      enabled: this.enableCaching,
      compression: this.enableCompression
    };
  }

  /**
   * Get hit rate
   * @returns {number} Hit rate percentage
   */
  getHitRate() {
    const stats = this.getStatistics();
    return parseFloat(stats.hitRatePercentage);
  }

  /**
   * Get cache entries
   * @param {number} limit - Maximum number of entries
   * @returns {Array} Cache entries
   */
  getCacheEntries(limit = 10) {
    const entries = [];
    
    for (const [key, cachedItem] of this.cache.entries()) {
      entries.push({
        key: key.substring(0, 20) + '...',
        timestamp: cachedItem.timestamp,
        age: Date.now() - cachedItem.timestamp,
        size: cachedItem.size,
        metadata: cachedItem.metadata
      });
      
      if (entries.length >= limit) {
        break;
      }
    }
    
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Invalidate cache entries
   * @param {Function} predicate - Predicate function to match entries
   */
  invalidateEntries(predicate) {
    let invalidatedCount = 0;
    
    for (const [key, cachedItem] of this.cache.entries()) {
      if (predicate(cachedItem)) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        this.cacheStats.totalSize -= cachedItem.size;
        invalidatedCount++;
      }
    }
    
    if (invalidatedCount > 0) {
      this.logger.info('ExecutionCache: Invalidated entries', {
        invalidatedCount
      });
    }
    
    return invalidatedCount;
  }

  /**
   * Invalidate entries by workflow
   * @param {string} workflowName - Workflow name
   * @param {string} workflowVersion - Workflow version
   */
  invalidateByWorkflow(workflowName, workflowVersion) {
    return this.invalidateEntries(cachedItem => 
      cachedItem.metadata.workflowName === workflowName &&
      cachedItem.metadata.workflowVersion === workflowVersion
    );
  }

  /**
   * Invalidate entries by age
   * @param {number} maxAge - Maximum age in milliseconds
   */
  invalidateByAge(maxAge) {
    const cutoff = Date.now() - maxAge;
    return this.invalidateEntries(cachedItem => 
      cachedItem.timestamp < cutoff
    );
  }

  /**
   * Shutdown cache
   */
  shutdown() {
    this.logger.info('ExecutionCache: Shutting down');
    
    // Stop cleanup interval
    this.stopCleanupInterval();
    
    // Clear cache
    this.clear();
    
    this.logger.info('ExecutionCache: Shutdown complete');
  }
}

module.exports = ExecutionCache; 