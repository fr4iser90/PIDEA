/**
 * WorkflowCache
 * Service for managing workflow caching and performance optimization
 */
const { v4: uuidv4 } = require('uuid');
const { logger } = require('@infrastructure/logging/Logger');

class WorkflowCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    this.logger = options.logger || console;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {any} value - Cache value
   * @param {Object} options - Cache options
   */
  set(key, value, options = {}) {
    try {
      const ttl = options.ttl || this.ttl;
      const timestamp = Date.now();
      const expiresAt = timestamp + ttl;

      // Check if cache is full and evict if necessary
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }

      // Store in cache
      this.cache.set(key, {
        value,
        timestamp,
        expiresAt,
        metadata: options.metadata || {}
      });

      // Set expiration timer
      this.setExpirationTimer(key, ttl);

      this.stats.sets++;
      this.logger.debug('WorkflowCache: Cache entry set', {
        key,
        ttl,
        cacheSize: this.cache.size
      });

      return true;
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to set cache entry', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache entry
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  get(key) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.logger.debug('WorkflowCache: Cache miss', { key });
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        this.logger.debug('WorkflowCache: Cache entry expired', { key });
        return null;
      }

      this.stats.hits++;
      this.logger.debug('WorkflowCache: Cache hit', { key });
      return entry.value;
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to get cache entry', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      const deleted = this.cache.delete(key);
      
      if (deleted) {
        // Clear expiration timer
        this.clearExpirationTimer(key);
        this.stats.deletes++;
        this.logger.debug('WorkflowCache: Cache entry deleted', { key });
      }

      return deleted;
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to delete cache entry', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to check cache entry', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    try {
      // Clear all timers
      for (const [key] of this.cache) {
        this.clearExpirationTimer(key);
      }

      this.cache.clear();
      this.timers.clear();
      
      this.logger.info('WorkflowCache: Cache cleared', {
        previousSize: this.cache.size
      });
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to clear cache', {
        error: error.message
      });
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests
    };
  }

  /**
   * Get cache keys
   * @returns {Array<string>} Cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache values
   * @returns {Array<any>} Cache values
   */
  values() {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get cache entries
   * @returns {Array<Object>} Cache entries with metadata
   */
  entries() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      metadata: entry.metadata
    }));
  }

  /**
   * Set expiration timer for cache entry
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in milliseconds
   */
  setExpirationTimer(key, ttl) {
    // Clear existing timer
    this.clearExpirationTimer(key);

    // Set new timer
    const timer = setTimeout(() => {
      this.delete(key);
      this.stats.evictions++;
      this.logger.debug('WorkflowCache: Cache entry expired and removed', { key });
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Clear expiration timer for cache entry
   * @param {string} key - Cache key
   */
  clearExpirationTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Evict oldest cache entry
   */
  evictOldest() {
    try {
      let oldestKey = null;
      let oldestTimestamp = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.delete(oldestKey);
        this.stats.evictions++;
        this.logger.debug('WorkflowCache: Oldest cache entry evicted', { key: oldestKey });
      }
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to evict oldest cache entry', {
        error: error.message
      });
    }
  }

  /**
   * Clean up expired entries
   * @returns {number} Number of cleaned entries
   */
  cleanup() {
    try {
      let cleanedCount = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info('WorkflowCache: Cleaned up expired entries', {
          cleanedCount,
          remainingSize: this.cache.size
        });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to cleanup expired entries', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Set cache configuration
   * @param {Object} config - Configuration options
   */
  setConfig(config) {
    if (config.maxSize !== undefined) {
      this.maxSize = config.maxSize;
    }
    if (config.ttl !== undefined) {
      this.ttl = config.ttl;
    }
    if (config.logger !== undefined) {
      this.logger = config.logger;
    }

    this.logger.info('WorkflowCache: Configuration updated', {
      maxSize: this.maxSize,
      ttl: this.ttl
    });
  }

  /**
   * Get cache size
   * @returns {number} Number of cache entries
   */
  size() {
    return this.cache.size;
  }

  /**
   * Check if cache is full
   * @returns {boolean} True if cache is at maximum size
   */
  isFull() {
    return this.cache.size >= this.maxSize;
  }

  /**
   * Get cache entry metadata
   * @param {string} key - Cache key
   * @returns {Object|null} Entry metadata or null
   */
  getMetadata(key) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        return null;
      }

      return {
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        metadata: entry.metadata
      };
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to get cache entry metadata', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update cache entry metadata
   * @param {string} key - Cache key
   * @param {Object} metadata - New metadata
   * @returns {boolean} Success status
   */
  updateMetadata(key, metadata) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        return false;
      }

      entry.metadata = { ...entry.metadata, ...metadata };
      
      this.logger.debug('WorkflowCache: Cache entry metadata updated', {
        key,
        metadata
      });

      return true;
    } catch (error) {
      this.logger.error('WorkflowCache: Failed to update cache entry metadata', {
        key,
        error: error.message
      });
      return false;
    }
  }
}

module.exports = WorkflowCache; 