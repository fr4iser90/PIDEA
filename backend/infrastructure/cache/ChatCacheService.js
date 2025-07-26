/**
 * Chat Cache Service
 * Provides in-memory caching for chat history with port-based keys
 * Optimizes performance by reducing browser extraction overhead
 * Includes request deduplication to prevent duplicate API calls
 */

const Logger = require('@logging/Logger');
const logger = new Logger('ChatCacheService');

class ChatCacheService {
  constructor(options = {}) {
    this.memoryCache = new Map(); // port -> { messages, timestamp, metadata }
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
    this.maxCacheSize = options.maxCacheSize || 100; // Maximum cache entries
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute cleanup
    
    // Request deduplication to prevent duplicate API calls
    this.pendingRequests = new Map(); // port -> Promise
    this.requestTimeout = options.requestTimeout || 10000; // 10 seconds timeout
    
    // Performance monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      pendingRequests: 0,
      duplicateRequests: 0
    };
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    logger.info('ChatCacheService initialized', {
      cacheTTL: this.cacheTTL,
      maxCacheSize: this.maxCacheSize,
      cleanupInterval: this.cleanupInterval,
      requestTimeout: this.requestTimeout
    });
  }

  /**
   * Get chat history from cache for a specific port with request deduplication
   * @param {string|number} port - The IDE port (9222, 9224, etc.)
   * @returns {Promise<Array|null>} Cached messages or null if cache miss
   */
  async getChatHistory(port) {
    try {
      const portKey = this.normalizePortKey(port);
      
      // Check cache first
      const cached = this.memoryCache.get(portKey);
      if (cached) {
        const now = Date.now();
        const age = now - cached.timestamp;
        
        if (age <= this.cacheTTL) {
          this.stats.hits++;
          logger.debug(`Cache hit for port ${portKey}, age: ${age}ms, messages: ${cached.messages.length}`);
          return cached.messages;
        } else {
          logger.debug(`Cache expired for port ${portKey}, age: ${age}ms`);
          this.memoryCache.delete(portKey);
        }
      }

      // Cache miss - check if there's already a pending request
      if (this.pendingRequests.has(portKey)) {
        this.stats.duplicateRequests++;
        logger.info(`Duplicate request detected for port ${portKey}, waiting for existing request`);
        
        try {
          const result = await Promise.race([
            this.pendingRequests.get(portKey),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
            )
          ]);
          return result;
        } catch (error) {
          logger.warn(`Pending request failed for port ${portKey}:`, error.message);
          this.pendingRequests.delete(portKey);
          return null;
        }
      }

      // No pending request - create new one
      this.stats.misses++;
      this.stats.pendingRequests++;
      logger.debug(`Cache miss for port ${portKey}, creating new request`);
      
      // Return null immediately for cache miss
      // The actual extraction should be handled by the calling service
      return null;
    } catch (error) {
      logger.error(`Error getting chat history from cache for port ${port}:`, error);
      return null;
    }
  }

  /**
   * Set chat history in cache for a specific port
   * @param {string|number} port - The IDE port (9222, 9224, etc.)
   * @param {Array} messages - Array of chat messages
   * @param {Object} metadata - Optional metadata about the cache entry
   */
  setChatHistory(port, messages, metadata = {}) {
    try {
      const portKey = this.normalizePortKey(port);
      
      if (!Array.isArray(messages)) {
        logger.warn(`Invalid messages format for port ${portKey}, expected array`);
        return;
      }

      // Enforce cache size limit
      if (this.memoryCache.size >= this.maxCacheSize) {
        this.evictOldestEntry();
      }

      const cacheEntry = {
        messages: messages,
        timestamp: Date.now(),
        metadata: {
          port: portKey,
          messageCount: messages.length,
          ...metadata
        }
      };

      this.memoryCache.set(portKey, cacheEntry);
      this.stats.sets++;
      
      logger.debug(`Cached ${messages.length} messages for port ${portKey}`);
    } catch (error) {
      logger.error(`Error setting chat history in cache for port ${port}:`, error);
    }
  }

  /**
   * Create a pending request promise to prevent duplicate API calls
   * @param {string|number} port - The IDE port
   * @param {Function} requestFn - The async function to execute
   * @returns {Promise} The result of the request function
   */
  async executeWithDeduplication(port, requestFn) {
    const portKey = this.normalizePortKey(port);
    
    // Check if there's already a pending request
    if (this.pendingRequests.has(portKey)) {
      this.stats.duplicateRequests++;
      logger.info(`Duplicate request detected for port ${portKey}, waiting for existing request`);
      
      try {
        const result = await Promise.race([
          this.pendingRequests.get(portKey),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
          )
        ]);
        return result;
      } catch (error) {
        logger.warn(`Pending request failed for port ${portKey}:`, error.message);
        this.pendingRequests.delete(portKey);
        throw error;
      }
    }

    // Create new pending request
    this.stats.pendingRequests++;
    const requestPromise = requestFn();
    
    this.pendingRequests.set(portKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache the result
      this.setChatHistory(port, result, {
        extractedAt: new Date().toISOString(),
        source: 'deduplicated_request'
      });
      
      return result;
    } finally {
      // Always clean up the pending request
      this.pendingRequests.delete(portKey);
      this.stats.pendingRequests--;
    }
  }

  /**
   * Invalidate cache for specific port
   * @param {string|number} port - IDE port
   */
  invalidateCache(port) {
    try {
      const portKey = this.normalizePortKey(port);
      this.memoryCache.delete(portKey);
      this.stats.deletes++;
      logger.info(`Cache invalidated for port ${portKey}`);
    } catch (error) {
      logger.error(`Error invalidating cache for port ${port}:`, error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      pendingRequests: this.stats.pendingRequests,
      duplicateRequests: this.stats.duplicateRequests,
      hitRate: `${hitRate}%`,
      cacheSize: this.memoryCache.size,
      maxCacheSize: this.maxCacheSize
    };
  }

  /**
   * Clean up old cache entries
   */
  cleanupOldEntries() {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [portKey, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > this.cacheTTL) {
          this.memoryCache.delete(portKey);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      logger.error('Error during cache cleanup:', error);
    }
  }

  /**
   * Evict oldest cache entry when cache is full
   */
  evictOldestEntry() {
    try {
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        logger.debug(`Evicted oldest cache entry for port ${oldestKey}`);
      }
    } catch (error) {
      logger.error('Error evicting oldest cache entry:', error);
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupOldEntries();
    }, this.cleanupInterval);
  }

  /**
   * Normalize port key to string
   * @param {string|number} port - Port number
   * @returns {string} Normalized port key
   */
  normalizePortKey(port) {
    return String(port);
  }

  /**
   * Clear all cache and pending requests
   */
  clearAll() {
    try {
      this.memoryCache.clear();
      this.pendingRequests.clear();
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        pendingRequests: 0,
        duplicateRequests: 0
      };
      logger.info('All cache and pending requests cleared');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }
}

module.exports = ChatCacheService; 