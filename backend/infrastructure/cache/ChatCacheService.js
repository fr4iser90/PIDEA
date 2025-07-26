/**
 * Chat Cache Service
 * Provides in-memory caching for chat history with port-based keys
 * Optimizes performance by reducing browser extraction overhead
 */

const Logger = require('@logging/Logger');
const logger = new Logger('ChatCacheService');

class ChatCacheService {
  constructor(options = {}) {
    this.memoryCache = new Map(); // port -> { messages, timestamp, metadata }
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
    this.maxCacheSize = options.maxCacheSize || 100; // Maximum cache entries
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute cleanup
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    logger.info('ChatCacheService initialized', {
      cacheTTL: this.cacheTTL,
      maxCacheSize: this.maxCacheSize,
      cleanupInterval: this.cleanupInterval
    });
  }

  /**
   * Get chat history from cache for a specific port
   * @param {string|number} port - The IDE port (9222, 9224, etc.)
   * @returns {Array|null} Cached messages or null if cache miss
   */
  getChatHistory(port) {
    try {
      const portKey = this.normalizePortKey(port);
      const cached = this.memoryCache.get(portKey);
      
      if (!cached) {
        logger.debug(`Cache miss for port ${portKey}`);
        return null;
      }

      const now = Date.now();
      const age = now - cached.timestamp;
      
      if (age > this.cacheTTL) {
        logger.debug(`Cache expired for port ${portKey}, age: ${age}ms`);
        this.memoryCache.delete(portKey);
        return null;
      }

      logger.debug(`Cache hit for port ${portKey}, age: ${age}ms, messages: ${cached.messages.length}`);
      return cached.messages;
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
      
      logger.debug(`Cached ${messages.length} messages for port ${portKey}`);
    } catch (error) {
      logger.error(`Error setting chat history in cache for port ${port}:`, error);
    }
  }

  /**
   * Invalidate cache for a specific port
   * @param {string|number} port - The IDE port to invalidate
   */
  invalidateCache(port) {
    try {
      const portKey = this.normalizePortKey(port);
      const deleted = this.memoryCache.delete(portKey);
      
      if (deleted) {
        logger.debug(`Cache invalidated for port ${portKey}`);
      } else {
        logger.debug(`No cache entry found for port ${portKey} to invalidate`);
      }
    } catch (error) {
      logger.error(`Error invalidating cache for port ${port}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    try {
      const size = this.memoryCache.size;
      this.memoryCache.clear();
      logger.info(`Cleared all cache entries (${size} entries)`);
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    try {
      const now = Date.now();
      let validEntries = 0;
      let expiredEntries = 0;
      let totalMessages = 0;

      for (const [portKey, entry] of this.memoryCache.entries()) {
        const age = now - entry.timestamp;
        if (age <= this.cacheTTL) {
          validEntries++;
          totalMessages += entry.messages.length;
        } else {
          expiredEntries++;
        }
      }

      return {
        totalEntries: this.memoryCache.size,
        validEntries,
        expiredEntries,
        totalMessages,
        cacheTTL: this.cacheTTL,
        maxCacheSize: this.maxCacheSize
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {};
    }
  }

  /**
   * Normalize port key to string format
   * @param {string|number} port - The port to normalize
   * @returns {string} Normalized port key
   */
  normalizePortKey(port) {
    return String(port).trim();
  }

  /**
   * Evict the oldest cache entry when cache is full
   */
  evictOldestEntry() {
    try {
      let oldestKey = null;
      let oldestTimestamp = Date.now();

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
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
   * Start cleanup timer to remove expired entries
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cleanupInterval);
  }

  /**
   * Remove expired cache entries
   */
  cleanupExpiredEntries() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [portKey, entry] of this.memoryCache.entries()) {
        const age = now - entry.timestamp;
        if (age > this.cacheTTL) {
          this.memoryCache.delete(portKey);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired cache entries:', error);
    }
  }

  /**
   * Check if cache is healthy
   * @returns {boolean} True if cache is healthy
   */
  isHealthy() {
    try {
      const stats = this.getStats();
      return stats.validEntries >= 0 && stats.totalEntries <= this.maxCacheSize;
    } catch (error) {
      logger.error('Error checking cache health:', error);
      return false;
    }
  }
}

module.exports = ChatCacheService; 