/**
 * RequestDeduplicationService
 * 
 * Central service for preventing duplicate API calls and providing
 * TTL-based caching with automatic cleanup and performance tracking.
 */

import { logger } from '@/infrastructure/logging/Logger';

class RequestDeduplicationService {
  constructor(options = {}) {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      duplicateRequests: 0,
      pendingRequests: 0,
      errors: 0,
      startTime: Date.now()
    };

    // Configuration
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 30 * 1000; // 30 seconds (faster cleanup)
    this.maxCacheSize = options.maxCacheSize || 50; // Reduced from 1000 to 50
    this.requestTimeout = options.requestTimeout || 15 * 1000; // 15 seconds (faster timeout)

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Execute request with deduplication
   * @param {string} key - Unique request key
   * @param {Function} requestFn - Async function to execute
   * @param {Object} options - Request options
   * @returns {Promise} Request result
   */
  async execute(key, requestFn, options = {}) {
    const cacheKey = this.generateCacheKey(key, options);
    const useCache = options.useCache !== false;
    const cacheTTL = options.cacheTTL || this.defaultTTL;
    const timeout = options.timeout || this.requestTimeout;

    this.stats.totalRequests++;
    
    // Debug: Log cache status every 50 requests (less frequent)
    if (this.stats.totalRequests % 50 === 0) {
      logger.debug(`RequestDeduplicationService Debug - Request #${this.stats.totalRequests}:`, {
        cacheSize: this.cache.size,
        pendingRequests: this.pendingRequests.size,
        cacheHitRate: this.stats.cacheHits / this.stats.totalRequests * 100
      });
    }

    // Check cache first
    if (useCache) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return cached.data;
      }
      this.stats.cacheMisses++;
      
      // Debug: Log cache misses for IDE switches
      if (key.includes('switch_ide') || key.includes('store_switch_ide')) {
        logger.warn(`Cache miss for IDE switch: ${key}, cache size: ${this.cache.size}, cache keys: ${Array.from(this.cache.keys()).join(', ')}`);
      }
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      this.stats.duplicateRequests++;
      logger.info(`Duplicate request detected for key: ${cacheKey}, waiting for existing request`);
      
      try {
        const result = await Promise.race([
          this.pendingRequests.get(cacheKey),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
        return result;
      } catch (error) {
        logger.warn(`Pending request failed for key: ${cacheKey}:`, error.message);
        this.pendingRequests.delete(cacheKey);
        this.stats.pendingRequests--;
        throw error;
      }
    }

    // Create new pending request
    this.stats.pendingRequests++;
    const requestPromise = this.executeWithTimeout(requestFn, timeout);
    
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache the result if requested
      if (useCache) {
        this.setCached(cacheKey, result, cacheTTL);
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error(`Request failed for key: ${cacheKey}:`, error);
      throw error;
    } finally {
      // Always clean up the pending request
      this.pendingRequests.delete(cacheKey);
      this.stats.pendingRequests--;
    }
  }

  /**
   * Execute request with timeout
   * @param {Function} requestFn - Request function
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Request result
   */
  async executeWithTimeout(requestFn, timeout) {
    return Promise.race([
      requestFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  /**
   * Generate unique cache key
   * @param {string} key - Base key
   * @param {Object} options - Request options
   * @returns {string} Unique cache key
   */
  generateCacheKey(key, options = {}) {
    const parts = [key];
    
    // Add user-specific data if available
    if (options.userId) {
      parts.push(`user:${options.userId}`);
    }
    
    // Add project-specific data if available
    if (options.projectId) {
      parts.push(`project:${options.projectId}`);
    }
    
    // Add additional parameters
    if (options.params) {
      const sortedParams = Object.keys(options.params)
        .sort()
        .map(k => `${k}:${options.params[k]}`)
        .join(',');
      parts.push(`params:${sortedParams}`);
    }
    
    return parts.join('|');
  }

  /**
   * Get cached result
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      logger.debug(`Cache miss for key: ${key}, cache size: ${this.cache.size}`);
      return null;
    }
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      logger.debug(`Cache expired for key: ${key}, age: ${Date.now() - cached.cachedAt}ms`);
      this.cache.delete(key);
      return null;
    }
    
    logger.debug(`Cache hit for key: ${key}, age: ${Date.now() - cached.cachedAt}ms`);
    return cached;
  }

  /**
   * Set cached result
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setCached(key, data, ttl = this.defaultTTL) {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      logger.warn(`Cache full (${this.cache.size}/${this.maxCacheSize}), evicting oldest entries`);
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl
    });
    
    logger.debug(`Cached data for key: ${key}, TTL: ${ttl}ms, cache size: ${this.cache.size}`);
  }

  /**
   * Remove cached result
   * @param {string} key - Cache key
   */
  removeCached(key) {
    this.cache.delete(key);
    logger.debug(`Removed cached data for key: ${key}`);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Evict oldest cache entries
   */
  evictOldest() {
    const entries = Array.from(this.cache.entries());
    const sortedEntries = entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    
    // For IDE switches, we only have 2 ports, so never clear the cache completely
    if (this.cache.size >= this.maxCacheSize * 0.9) {
      logger.warn(`Cache very full (${this.cache.size}/${this.maxCacheSize}), but keeping cache for IDE switches`);
      return;
    }
    
    // Only evict if we somehow have more than 10 entries (should never happen with 2 IDEs)
    if (this.cache.size > 10) {
      const toRemove = Math.ceil(sortedEntries.length * 0.5);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
      logger.debug(`Evicted ${toRemove} oldest cache entries (50% of cache)`);
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} expired cache entries`);
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const cacheHitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    // Memory usage info
    const memoryInfo = {
      cacheSize: this.cache.size,
      pendingRequestsCount: this.pendingRequests.size,
      cacheMemoryUsage: this.cache.size * 1024, // Rough estimate
      pendingMemoryUsage: this.pendingRequests.size * 512 // Rough estimate
    };
    
    return {
      ...this.stats,
      uptime,
      cacheHitRate: `${cacheHitRate}%`,
      ...memoryInfo,
      duplicateRequestRate: this.stats.totalRequests > 0
        ? (this.stats.duplicateRequests / this.stats.totalRequests * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      duplicateRequests: 0,
      pendingRequests: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy() {
    this.stopCleanupInterval();
    this.clearCache();
    this.pendingRequests.clear();
    logger.info('RequestDeduplicationService destroyed');
  }
}

// Create singleton instance
const requestDeduplicationService = new RequestDeduplicationService();

export default requestDeduplicationService; 