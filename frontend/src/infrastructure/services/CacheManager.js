import { logger } from "@/infrastructure/logging/Logger";

/**
 * CacheManager - Multi-layer cache management with TTL and invalidation
 * Implements memory + IndexedDB + server fallback caching strategy
 */
export class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.indexedDBCache = null;
    this.cacheConfig = {
      memory: { 
        ttl: 5 * 60 * 1000,        // 5 minutes
        maxSize: 50 * 1024 * 1024, // 50MB
        maxEntries: 1000
      },
      indexedDB: { 
        ttl: 60 * 60 * 1000,      // 1 hour
        maxSize: 200 * 1024 * 1024, // 200MB
        maxEntries: 5000
      },
      server: { 
        ttl: 24 * 60 * 60 * 1000,  // 24 hours
        maxSize: 500 * 1024 * 1024, // 500MB
        maxEntries: 10000
      }
    };
    
    this.stats = {
      memoryHits: 0,
      indexedDBHits: 0,
      serverHits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      totalSize: 0
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the cache manager
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('CacheManager already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing CacheManager...');
      
      // Initialize IndexedDB
      await this.initializeIndexedDB();
      
      // Load existing data from IndexedDB
      await this.loadFromIndexedDB();
      
      // Set up cleanup intervals
      this.setupCleanupIntervals();
      
      this.isInitialized = true;
      logger.info('✅ CacheManager initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize CacheManager:', error);
      throw error;
    }
  }

  /**
   * Initialize IndexedDB
   */
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PIDEA_Cache', 1);
      
      request.onerror = () => {
        logger.warn('IndexedDB not available, using memory cache only');
        resolve();
      };
      
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        logger.info('✅ IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for cache
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
        
        logger.info('✅ IndexedDB schema upgraded');
      };
    });
  }

  /**
   * Load data from IndexedDB to memory cache
   */
  async loadFromIndexedDB() {
    if (!this.indexedDBCache) {
      return;
    }

    try {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result;
          let loadedCount = 0;
          
          results.forEach(item => {
            if (this.isValid(item)) {
              this.memoryCache.set(item.key, {
                data: item.data,
                timestamp: item.timestamp,
                ttl: item.ttl,
                size: item.size
              });
              loadedCount++;
            }
          });
          
          logger.info(`📦 Loaded ${loadedCount} items from IndexedDB`);
          resolve();
        };
        
        request.onerror = () => {
          logger.warn('Failed to load from IndexedDB');
          resolve();
        };
      });
      
    } catch (error) {
      logger.warn('Error loading from IndexedDB:', error);
    }
  }

  /**
   * Set up cleanup intervals
   */
  setupCleanupIntervals() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
    
    // Clean up old entries every 30 minutes
    setInterval(() => {
      this.cleanupOldEntries();
    }, 30 * 60 * 1000);
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {string} priority - Cache priority (high, medium, low)
   * @returns {boolean} Success status
   */
  set(key, data, ttl = 300000, priority = 'medium') {
    try {
      const dataSize = this.calculateSize(data);
      const timestamp = Date.now();
      
      // Check if data is too large
      if (dataSize > this.cacheConfig.memory.maxSize) {
        logger.warn(`Data too large for memory cache: ${dataSize} bytes`);
        return false;
      }
      
      // Check memory cache size limit
      if (this.getMemoryCacheSize() + dataSize > this.cacheConfig.memory.maxSize) {
        this.evictMemoryCache(dataSize);
      }
      
      // Check memory cache entry limit
      if (this.memoryCache.size >= this.cacheConfig.memory.maxEntries) {
        this.evictOldestMemoryEntry();
      }
      
      const cacheItem = {
        data,
        timestamp,
        ttl,
        size: dataSize,
        priority
      };
      
      // Store in memory cache
      this.memoryCache.set(key, cacheItem);
      
      // Store in IndexedDB if available
      if (this.indexedDBCache) {
        this.setInIndexedDB(key, cacheItem);
      }
      
      this.stats.sets++;
      this.stats.totalSize += dataSize;
      
      logger.debug(`💾 Cached data for key: ${key}, size: ${dataSize} bytes, ttl: ${ttl}ms`);
      return true;
      
    } catch (error) {
      logger.error('Failed to set cache data:', error);
      return false;
    }
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key) {
    try {
      // Try memory cache first
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && this.isValid(memoryItem)) {
        this.stats.memoryHits++;
        logger.debug(`💾 Memory cache hit for key: ${key}`);
        return memoryItem.data;
      }
      
      // Try IndexedDB if available
      if (this.indexedDBCache) {
        return this.getFromIndexedDB(key);
      }
      
      this.stats.misses++;
      logger.debug(`❌ Cache miss for key: ${key}`);
      return null;
      
    } catch (error) {
      logger.error('Failed to get cache data:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Get data from IndexedDB
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  async getFromIndexedDB(key) {
    if (!this.indexedDBCache) {
      return null;
    }

    try {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          
          if (result && this.isValid(result)) {
            // Move to memory cache for faster access
            this.memoryCache.set(key, result);
            this.stats.indexedDBHits++;
            logger.debug(`💾 IndexedDB cache hit for key: ${key}`);
            resolve(result.data);
          } else {
            this.stats.misses++;
            resolve(null);
          }
        };
        
        request.onerror = () => {
          this.stats.misses++;
          resolve(null);
        };
      });
      
    } catch (error) {
      logger.error('Failed to get from IndexedDB:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set data in IndexedDB
   * @param {string} key - Cache key
   * @param {Object} item - Cache item
   */
  async setInIndexedDB(key, item) {
    if (!this.indexedDBCache) {
      return;
    }

    try {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const dbItem = {
        key,
        data: item.data,
        timestamp: item.timestamp,
        ttl: item.ttl,
        size: item.size,
        priority: item.priority
      };
      
      store.put(dbItem);
      
    } catch (error) {
      logger.error('Failed to set in IndexedDB:', error);
    }
  }

  /**
   * Check if cache item is valid (not expired)
   * @param {Object} item - Cache item
   * @returns {boolean} Whether item is valid
   */
  isValid(item) {
    if (!item || !item.timestamp || !item.ttl) {
      return false;
    }
    
    const now = Date.now();
    const expiry = item.timestamp + item.ttl;
    
    return now < expiry;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists and is valid
   */
  has(key) {
    const memoryItem = this.memoryCache.get(key);
    return memoryItem && this.isValid(memoryItem);
  }

  /**
   * Remove data from cache
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      let deleted = false;
      
      // Remove from memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem) {
        this.memoryCache.delete(key);
        this.stats.totalSize -= memoryItem.size || 0;
        deleted = true;
      }
      
      // Remove from IndexedDB
      if (this.indexedDBCache) {
        this.deleteFromIndexedDB(key);
      }
      
      if (deleted) {
        this.stats.deletes++;
        logger.debug(`🗑️ Deleted cache key: ${key}`);
      }
      
      return deleted;
      
    } catch (error) {
      logger.error('Failed to delete cache data:', error);
      return false;
    }
  }

  /**
   * Delete data from IndexedDB
   * @param {string} key - Cache key
   */
  async deleteFromIndexedDB(key) {
    if (!this.indexedDBCache) {
      return;
    }

    try {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.delete(key);
      
    } catch (error) {
      logger.error('Failed to delete from IndexedDB:', error);
    }
  }

  /**
   * Invalidate cache (mark as expired)
   * @param {string} key - Cache key
   */
  invalidate(key) {
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      memoryItem.ttl = 0; // Mark as expired
      logger.debug(`⏰ Invalidated cache key: ${key}`);
    }
  }

  /**
   * Clear all cache data
   */
  clear() {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear IndexedDB
      if (this.indexedDBCache) {
        this.clearIndexedDB();
      }
      
      this.stats.totalSize = 0;
      logger.info('🧹 Cleared all cache data');
      
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear IndexedDB
   */
  async clearIndexedDB() {
    if (!this.indexedDBCache) {
      return;
    }

    try {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
      
    } catch (error) {
      logger.error('Failed to clear IndexedDB:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries() {
    let cleanedCount = 0;
    
    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (!this.isValid(item)) {
        this.memoryCache.delete(key);
        this.stats.totalSize -= item.size || 0;
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Clean up old entries to free space
   */
  cleanupOldEntries() {
    const maxEntries = this.cacheConfig.memory.maxEntries;
    const maxSize = this.cacheConfig.memory.maxSize;
    
    if (this.memoryCache.size <= maxEntries && this.getMemoryCacheSize() <= maxSize) {
      return;
    }
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    let removedCount = 0;
    
    // Remove oldest entries until we're under limits
    for (const [key, item] of entries) {
      if (this.memoryCache.size <= maxEntries && this.getMemoryCacheSize() <= maxSize) {
        break;
      }
      
      this.memoryCache.delete(key);
      this.stats.totalSize -= item.size || 0;
      removedCount++;
    }
    
    if (removedCount > 0) {
      logger.debug(`🧹 Cleaned up ${removedCount} old entries`);
    }
  }

  /**
   * Evict memory cache to make space
   * @param {number} requiredSize - Required space in bytes
   */
  evictMemoryCache(requiredSize) {
    const availableSize = this.cacheConfig.memory.maxSize - this.getMemoryCacheSize();
    const needToFree = requiredSize - availableSize;
    
    if (needToFree <= 0) {
      return;
    }
    
    // Sort by priority and timestamp
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a[1].priority] || 2;
        const bPriority = priorityOrder[b[1].priority] || 2;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return a[1].timestamp - b[1].timestamp; // Older first
      });
    
    let freedSize = 0;
    
    for (const [key, item] of entries) {
      if (freedSize >= needToFree) {
        break;
      }
      
      this.memoryCache.delete(key);
      this.stats.totalSize -= item.size || 0;
      freedSize += item.size || 0;
    }
  }

  /**
   * Evict oldest memory entry
   */
  evictOldestMemoryEntry() {
    let oldestKey = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const item = this.memoryCache.get(oldestKey);
      this.memoryCache.delete(oldestKey);
      this.stats.totalSize -= item.size || 0;
    }
  }

  /**
   * Calculate size of data
   * @param {any} data - Data to measure
   * @returns {number} Size in bytes
   */
  calculateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory cache size
   * @returns {number} Size in bytes
   */
  getMemoryCacheSize() {
    let totalSize = 0;
    for (const item of this.memoryCache.values()) {
      totalSize += item.size || 0;
    }
    return totalSize;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalHits = this.stats.memoryHits + this.stats.indexedDBHits + this.stats.serverHits;
    const totalRequests = totalHits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate,
      memoryCacheSize: this.getMemoryCacheSize(),
      memoryCacheEntries: this.memoryCache.size,
      totalRequests
    };
  }

  /**
   * Destroy cache manager
   */
  destroy() {
    this.memoryCache.clear();
    this.indexedDBCache = null;
    this.isInitialized = false;
    logger.info('🧹 CacheManager destroyed');
  }
}
