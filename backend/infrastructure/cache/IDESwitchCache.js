const Logger = require('@logging/Logger');
const logger = new Logger('IDESwitchCache');

/**
 * Cache for IDE switching results to avoid redundant operations
 * Provides TTL-based caching, automatic cleanup, and health monitoring
 */
class IDESwitchCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 10 * 60 * 1000; // 10 minutes - increased for better performance
    this.maxSize = options.maxSize || 100; // Increased for IDE switches (only 2 ports)
    this.cleanupInterval = options.cleanupInterval || 180000; // 3 minutes - more frequent cleanup
    
    // Performance monitoring
    this.performanceMetrics = {
      totalHits: 0,
      totalMisses: 0,
      totalSets: 0,
      memoryUsage: [],
      lastCleanup: Date.now()
    };
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    
    logger.info(`IDESwitchCache initialized with TTL: ${this.ttl}ms, MaxSize: ${this.maxSize}, CleanupInterval: ${this.cleanupInterval}ms`);
  }

  /**
   * Get cached switch result for a port
   * @param {number} port - The port number
   * @returns {Promise<Object|null>} Cached result or null if not found/expired
   */
  async getCachedSwitch(port) {
    try {
      const cached = this.cache.get(port);
      if (cached && Date.now() - cached.timestamp < this.ttl) {
        this.performanceMetrics.totalHits++;
        logger.debug(`Cache hit for port ${port}`);
        return cached.result;
      }
      
      this.performanceMetrics.totalMisses++;
      
      if (cached) {
        logger.debug(`Cache expired for port ${port}`);
        this.cache.delete(port);
      }
      
      // Debug: Log cache status every 50 requests (less frequent)
      if (this.performanceMetrics.totalMisses % 50 === 0 && this.performanceMetrics.totalMisses > 0) {
        logger.debug(`IDESwitchCache Debug - Cache miss #${this.performanceMetrics.totalMisses}, Cache size: ${this.cache.size}/${this.maxSize}`);
      }
      
      return null;
    } catch (error) {
      this.performanceMetrics.totalMisses++;
      logger.error(`Error getting cached switch for port ${port}:`, error.message);
      return null;
    }
  }

  /**
   * Cache switch result for a port
   * @param {number} port - The port number
   * @param {Object} result - The switch result to cache
   */
  setCachedSwitch(port, result) {
    try {
      this.performanceMetrics.totalSets++;
      
      // Check cache size limit
      if (this.cache.size >= this.maxSize) {
        logger.warn(`IDESwitchCache full (${this.cache.size}/${this.maxSize}), evicting oldest entries`);
        this.evictOldest();
      }
      
      this.cache.set(port, {
        result,
        timestamp: Date.now()
      });
      
      logger.debug(`Cached switch result for port ${port}, cache size: ${this.cache.size}, total sets: ${this.performanceMetrics.totalSets}`);
    } catch (error) {
      logger.error(`Error caching switch for port ${port}:`, error.message);
    }
  }

  /**
   * Invalidate cache for specific port or all entries
   * @param {number|null} port - Port to invalidate, null for all
   */
  invalidateCache(port = null) {
    try {
      if (port) {
        this.cache.delete(port);
        logger.debug(`Invalidated cache for port ${port}`);
      } else {
        this.cache.clear();
        logger.debug('Invalidated all cache entries');
      }
    } catch (error) {
      logger.error('Error invalidating cache:', error.message);
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleaned = 0;
      
      // For IDE switches, we only have 2 ports, so minimal cleanup
      // Only clean if we somehow have more than 10 entries (should never happen with 2 IDEs)
      if (this.cache.size > 10) {
        for (const [port, entry] of this.cache.entries()) {
          // Remove if entry is very old (3x TTL)
          const isVeryOld = now - entry.timestamp > (this.ttl * 3);
          
          if (isVeryOld) {
            this.cache.delete(port);
            cleaned++;
          }
        }
      }
      
      if (cleaned > 0) {
        logger.debug(`Cleaned up ${cleaned} expired cache entries`);
      }
      
      // Track memory usage
      const memUsage = process.memoryUsage();
      this.performanceMetrics.memoryUsage.push({
        timestamp: now,
        heapUsed: memUsage.heapUsed,
        cacheSize: this.cache.size,
        hitRate: this.performanceMetrics.totalHits / Math.max(1, this.performanceMetrics.totalHits + this.performanceMetrics.totalMisses)
      });
      
      // Keep only last 20 memory readings
      if (this.performanceMetrics.memoryUsage.length > 20) {
        this.performanceMetrics.memoryUsage.shift();
      }
      
      // Track memory usage for monitoring only - never clear cache for IDE switches
      const heapUsageMB = memUsage.heapUsed / 1024 / 1024;
      if (heapUsageMB > 50) { // If heap usage > 50MB
        logger.warn(`High memory usage in cache: ${heapUsageMB.toFixed(2)}MB, but keeping cache for IDE switches`);
      }
      
      this.performanceMetrics.lastCleanup = now;
    } catch (error) {
      logger.error('Error during cache cleanup:', error.message);
    }
  }

  /**
   * Evict oldest cache entry when size limit is reached
   */
  evictOldest() {
    try {
      // For IDE switches, we only have 2 ports, so never clear the cache
      // Just log if we somehow reach the size limit
      if (this.cache.size >= this.maxSize * 0.8) {
        logger.warn(`IDESwitchCache very full (${this.cache.size}/${this.maxSize}), but keeping cache for IDE switches`);
        return;
      }
      
      let oldestPort = null;
      let oldestTime = Date.now();
      
      for (const [port, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestPort = port;
        }
      }
      
      if (oldestPort) {
        this.cache.delete(oldestPort);
        logger.debug(`Evicted oldest cache entry for port ${oldestPort}`);
      }
    } catch (error) {
      logger.error('Error evicting oldest cache entry:', error.message);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      entries: Array.from(this.cache.entries()).map(([port, entry]) => ({
        port,
        age: Date.now() - entry.timestamp,
        expiresIn: this.ttl - (Date.now() - entry.timestamp)
      }))
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
    logger.info('IDESwitchCache destroyed');
  }
}

module.exports = IDESwitchCache; 