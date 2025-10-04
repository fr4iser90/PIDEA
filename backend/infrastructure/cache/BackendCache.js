/**
 * BackendCache - Backend cache coordination service
 * Consolidates backend cache systems and provides frontend integration
 * Implements shared cache configuration and coordination
 */

const Logger = require('@logging/Logger');
const logger = new Logger('BackendCache');

class BackendCache {
  constructor(options = {}) {
    // One memory cache for all backend operations
    this.memoryCache = new Map();
    
    // Centralized configuration (shared with frontend)
    this.config = {
      // Analysis data TTLs (from cache-config.js)
      project: { ttl: 24 * 60 * 60, priority: 'high' },      // 24 hours
      dependency: { ttl: 24 * 60 * 60, priority: 'high' },   // 24 hours
      codeQuality: { ttl: 6 * 60 * 60, priority: 'medium' }, // 6 hours
      security: { ttl: 4 * 60 * 60, priority: 'medium' },    // 4 hours
      performance: { ttl: 8 * 60 * 60, priority: 'medium' }, // 8 hours
      architecture: { ttl: 12 * 60 * 60, priority: 'high' }, // 12 hours
      techStack: { ttl: 24 * 60 * 60, priority: 'high' },    // 24 hours
      repositoryType: { ttl: 24 * 60 * 60, priority: 'high' }, // 24 hours
      
      // Backend-specific data types
      chat: { ttl: 5 * 60, priority: 'low' },               // 5 minutes
      workflow: { ttl: 5 * 60, priority: 'low' },           // 5 minutes
      ide: { ttl: 5 * 60, priority: 'medium' },             // 5 minutes
      default: { ttl: 12 * 60 * 60, priority: 'medium' }   // 12 hours
    };
    
    // Memory management
    this.maxMemorySize = 100 * 1024 * 1024; // 100MB
    this.maxMemoryEntries = 2000;
    this.currentMemorySize = 0;
    
    // Performance monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      selectiveInvalidations: 0,
      totalSize: 0,
      hitRate: 0,
      averageResponseTime: 0
    };
    
    // Namespace management for selective invalidation
    this.namespaces = new Map();
    
    // Event coordination
    this.eventHandlers = new Map();
    
    logger.info('BackendCache initialized with centralized configuration', {
      maxMemorySize: this.maxMemorySize,
      maxMemoryEntries: this.maxMemoryEntries,
      dataTypes: Object.keys(this.config).length
    });
  }

  /**
   * Set data in cache with automatic TTL and namespace management
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {string} dataType - Data type for TTL configuration
   * @param {string} namespace - Namespace for selective invalidation
   * @returns {boolean} Success status
   */
  set(key, data, dataType = 'default', namespace = 'global') {
    const startTime = Date.now();
    
    try {
      const config = this.config[dataType] || this.config.default;
      const dataSize = this.calculateSize(data);
      const timestamp = Date.now();
      
      // Check memory limits
      if (this.currentMemorySize + dataSize > this.maxMemorySize) {
        this.evictByPriority(config.priority);
      }
      
      if (this.memoryCache.size >= this.maxMemoryEntries) {
        this.evictOldestEntry();
      }
      
      const cacheItem = {
        data,
        timestamp,
        ttl: config.ttl * 1000, // Convert to milliseconds
        size: dataSize,
        priority: config.priority,
        dataType,
        namespace,
        expires: timestamp + (config.ttl * 1000)
      };
      
      // Store in memory cache
      this.memoryCache.set(key, cacheItem);
      this.currentMemorySize += dataSize;
      
      // Track namespace for selective invalidation
      this.trackNamespace(namespace, key);
      
      // Update statistics
      this.stats.sets++;
      this.stats.totalSize += dataSize;
      this.updateResponseTime(Date.now() - startTime);
      
      logger.debug(`💾 Cached data: ${key}, type: ${dataType}, namespace: ${namespace}, size: ${dataSize} bytes`);
      return true;
      
    } catch (error) {
      logger.error('Failed to set cache data:', error);
      return false;
    }
  }

  /**
   * Get data from cache with automatic TTL checking
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key) {
    const startTime = Date.now();
    
    try {
      const cacheItem = this.memoryCache.get(key);
      
      if (!cacheItem) {
        this.stats.misses++;
        this.updateResponseTime(Date.now() - startTime);
        return null;
      }
      
      // Check if expired
      if (Date.now() > cacheItem.expires) {
        this.delete(key);
        this.stats.misses++;
        this.updateResponseTime(Date.now() - startTime);
        return null;
      }
      
      // Update access time for LRU
      cacheItem.lastAccess = Date.now();
      
      this.stats.hits++;
      this.updateHitRate();
      this.updateResponseTime(Date.now() - startTime);
      
      logger.debug(`✅ Cache hit: ${key}, type: ${cacheItem.dataType}`);
      return cacheItem.data;
      
    } catch (error) {
      logger.error('Failed to get cache data:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      const cacheItem = this.memoryCache.get(key);
      
      if (cacheItem) {
        this.currentMemorySize -= cacheItem.size;
        this.memoryCache.delete(key);
        
        // Remove from namespace tracking
        this.removeFromNamespace(cacheItem.namespace, key);
        
        this.stats.deletes++;
        logger.debug(`🗑️ Deleted cache entry: ${key}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error('Failed to delete cache data:', error);
      return false;
    }
  }

  /**
   * Selective invalidation by namespace (replaces global cache clearing)
   * @param {string} namespace - Namespace to invalidate
   * @param {string} identifier - Optional identifier for more specific invalidation
   */
  invalidateByNamespace(namespace, identifier = null) {
    try {
      const namespaceKeys = this.namespaces.get(namespace) || new Set();
      let invalidatedCount = 0;
      
      for (const key of namespaceKeys) {
        const cacheItem = this.memoryCache.get(key);
        
        if (cacheItem && (!identifier || key.includes(identifier))) {
          this.delete(key);
          invalidatedCount++;
        }
      }
      
      this.stats.selectiveInvalidations++;
      
      logger.info(`🔄 Selective invalidation: ${namespace}${identifier ? ` (${identifier})` : ''}, invalidated: ${invalidatedCount} entries`);
      
    } catch (error) {
      logger.error('Failed to invalidate namespace:', error);
    }
  }

  /**
   * Track cache key in namespace for selective invalidation
   * @param {string} namespace - Namespace
   * @param {string} key - Cache key
   */
  trackNamespace(namespace, key) {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace).add(key);
  }

  /**
   * Remove cache key from namespace tracking
   * @param {string} namespace - Namespace
   * @param {string} key - Cache key
   */
  removeFromNamespace(namespace, key) {
    const namespaceKeys = this.namespaces.get(namespace);
    if (namespaceKeys) {
      namespaceKeys.delete(key);
      if (namespaceKeys.size === 0) {
        this.namespaces.delete(namespace);
      }
    }
  }

  /**
   * Evict cache entries by priority (low priority first)
   * @param {string} priority - Priority level
   */
  evictByPriority(priority) {
    const priorityOrder = { low: 1, medium: 2, high: 3 };
    const currentPriority = priorityOrder[priority] || 2;
    
    for (const [key, cacheItem] of this.memoryCache) {
      if (priorityOrder[cacheItem.priority] < currentPriority) {
        this.delete(key);
        break;
      }
    }
  }

  /**
   * Evict oldest cache entry (LRU)
   */
  evictOldestEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, cacheItem] of this.memoryCache) {
      const accessTime = cacheItem.lastAccess || cacheItem.timestamp;
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Calculate data size for memory management
   * @param {any} data - Data to measure
   * @returns {number} Size in bytes
   */
  calculateSize(data) {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch (error) {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Update hit rate statistics
   */
  updateHitRate() {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update average response time
   * @param {number} responseTime - Response time in milliseconds
   */
  updateResponseTime(responseTime) {
    const total = this.stats.hits + this.stats.misses;
    this.stats.averageResponseTime = total > 0 
      ? (this.stats.averageResponseTime * (total - 1) + responseTime) / total 
      : responseTime;
  }

  /**
   * Get all cache keys (for invalidation)
   * @returns {Array} All cache keys
   */
  getAllKeys() {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Get cache item details
   * @param {string} key - Cache key
   * @returns {Object|null} Cache item details
   */
  getCacheItem(key) {
    return this.memoryCache.get(key) || null;
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, cacheItem] of this.memoryCache) {
      if (now > cacheItem.expires) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Cleanup old cache entries based on access time
   */
  cleanupOldEntries() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    let cleanedCount = 0;
    
    for (const [key, cacheItem] of this.memoryCache) {
      const accessTime = cacheItem.lastAccess || cacheItem.timestamp;
      if (accessTime < cutoffTime) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} old cache entries`);
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      memorySize: this.currentMemorySize,
      memoryEntries: this.memoryCache.size,
      namespaces: this.namespaces.size
    };
  }

  /**
   * Clear all cache (emergency use only)
   */
  clear() {
    this.memoryCache.clear();
    this.namespaces.clear();
    this.currentMemorySize = 0;
    
    logger.warn('⚠️ All backend cache cleared - this should be avoided in favor of selective invalidation');
  }

  /**
   * Get cache configuration
   * @returns {Object} Cache configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Backend cache configuration updated', newConfig);
  }

  /**
   * Register event handler for cache invalidation
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  /**
   * Emit event for cache invalidation
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  emit(eventType, data) {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error(`Error in event handler for ${eventType}:`, error);
      }
    });
  }

  /**
   * Start cleanup intervals
   */
  startCleanupIntervals() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
    
    // Cleanup old entries every 30 minutes
    setInterval(() => {
      this.cleanupOldEntries();
    }, 30 * 60 * 1000);
  }
}

// Export singleton instance
const backendCache = new BackendCache();
backendCache.startCleanupIntervals();

module.exports = backendCache;
