/**
 * CacheService - One cache service for all cache operations
 * Consolidates 7+ fragmented cache systems into one service
 * Implements selective invalidation, centralized TTL management, and performance monitoring
 */

import { logger } from "@/infrastructure/logging/Logger";
import { EventCoordinator } from "@/infrastructure/services/EventCoordinator";
import { cacheConfig } from "@/config/cache-config";

export class CacheService {
  constructor(options = {}) {
    // One memory cache for all operations
    this.memoryCache = new Map();
    this.indexedDBCache = null;
    
    // Centralized configuration from cache-config.js
    this.config = cacheConfig.dataTypes;
    
    // Memory management
    this.maxMemorySize = cacheConfig.memory.maxSize;
    this.maxMemoryEntries = cacheConfig.memory.maxEntries;
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
    
    // Event coordinator for selective invalidation
    this.eventCoordinator = new EventCoordinator();
    this.setupEventListeners();
    
    // Namespace management for selective invalidation
    this.namespaces = new Map();
    
    this.isInitialized = false;
    
    logger.info('CacheService initialized with centralized configuration', {
      maxMemorySize: this.maxMemorySize,
      maxMemoryEntries: this.maxMemoryEntries,
      dataTypes: Object.keys(this.config).length
    });
  }

  /**
   * Initialize the cache service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize IndexedDB if available
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.initializeIndexedDB();
      }
      
      // Start cleanup intervals
      this.setupCleanupIntervals();
      
      this.isInitialized = true;
      logger.info('CacheService initialization complete');
      
    } catch (error) {
      logger.error('CacheService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PIDEA_Cache', 1);
      
      request.onerror = () => {
        logger.warn('IndexedDB not available, using memory-only cache');
        resolve();
      };
      
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        logger.info('IndexedDB cache initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Set up event listeners for selective invalidation
   */
  setupEventListeners() {
    // IDE switch events - update cache instead of invalidating
    this.eventCoordinator.on('ide:switch', (data) => {
      // Update cache with new IDE data instead of clearing
      this.updateIDECache(data);
    });
    
    // Project change events - invalidate project-related cache
    this.eventCoordinator.on('project:change', (data) => {
      this.invalidateByNamespace('project', data.projectId);
    });
    
    // Analysis complete events - invalidate analysis cache
    this.eventCoordinator.on('analysis:complete', (data) => {
      this.invalidateByNamespace(data.type, data.projectId);
    });
    
    // Chat events - invalidate chat cache
    this.eventCoordinator.on('chat:new', (data) => {
      this.invalidateByNamespace('chat', data.port);
    });
    
    logger.info('Event listeners configured for selective invalidation');
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
    const startTime = performance.now();
    
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
        ttl: config.ttl,
        size: dataSize,
        priority: config.priority,
        dataType,
        namespace,
        expires: timestamp + config.ttl
      };
      
      // Store in memory cache
      this.memoryCache.set(key, cacheItem);
      this.currentMemorySize += dataSize;
      
      // Store in IndexedDB if available
      if (this.indexedDBCache) {
        this.setInIndexedDB(key, cacheItem);
      }
      
      // Track namespace for selective invalidation
      this.trackNamespace(namespace, key);
      
      // Update statistics
      this.stats.sets++;
      this.stats.totalSize += dataSize;
      this.updateResponseTime(performance.now() - startTime);
      
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
    const startTime = performance.now();
    
    try {
      const cacheItem = this.memoryCache.get(key);
      
      if (!cacheItem) {
        // Try IndexedDB if available
        if (this.indexedDBCache) {
          return this.getFromIndexedDB(key);
        }
        
        this.stats.misses++;
        this.updateResponseTime(performance.now() - startTime);
        return null;
      }
      
      // Check if expired
      if (Date.now() > cacheItem.expires) {
        this.delete(key);
        this.stats.misses++;
        this.updateResponseTime(performance.now() - startTime);
        return null;
      }
      
      // Update access time for LRU
      cacheItem.lastAccess = Date.now();
      
      this.stats.hits++;
      this.updateHitRate();
      this.updateResponseTime(performance.now() - startTime);
      
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
        
        // Remove from IndexedDB
        if (this.indexedDBCache) {
          this.deleteFromIndexedDB(key);
        }
        
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
   * Get IDE data with automatic caching
   * Centralized function for all IDE data requests
   * @returns {Promise<Object>} IDE data result
   */
  async getIDEData() {
    const cacheKey = 'store_load_available_ides';
    
    // Check cache first
    const cachedResult = this.get(cacheKey);
    if (cachedResult) {
      logger.info('Using cached IDE data');
      logger.info(`📊 Cache data type: ${Array.isArray(cachedResult) ? 'Array' : typeof cachedResult}`);
      logger.info(`📊 Cache data: ${JSON.stringify(cachedResult).substring(0, 100)}...`);
      
      // Ensure we return an array
      const data = Array.isArray(cachedResult) ? cachedResult : [];
      return { success: true, data: data };
    }
    
    // Import apiCall dynamically to avoid circular dependencies
    const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
    
    try {
      const result = await apiCall('/api/ide/available');
      
      // Cache the result if successful
      if (result.success) {
        logger.info(`💾 Caching IDE data: ${JSON.stringify(result.data).substring(0, 100)}...`);
        logger.info(`📊 Data type: ${Array.isArray(result.data) ? 'Array' : typeof result.data}`);
        logger.info(`📊 Data length: ${Array.isArray(result.data) ? result.data.length : 'N/A'}`);
        
        // Only cache if we have valid array data
        if (Array.isArray(result.data) && result.data.length > 0) {
          this.set(cacheKey, result.data, 'ide', 'ide');
          logger.info('IDE data cached successfully');
        } else {
          logger.warn('⚠️ Not caching empty or invalid IDE data');
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to fetch IDE data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Git data with caching
   * @param {string} workspacePath - Workspace path
   * @param {string} projectId - Project ID
   */
  async getGitData(workspacePath, projectId) {
    const cacheKey = `git_status_${projectId}_${workspacePath}`;
    
    // Check cache first
    const cachedResult = this.get(cacheKey);
    if (cachedResult) {
      logger.info('Using cached Git data');
      return { success: true, data: cachedResult };
    }
    
    // Import apiCall dynamically
    const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
    
    try {
      const result = await apiCall(`/api/projects/${projectId}/git/status`, { 
        method: 'POST',
        body: JSON.stringify({ projectPath: workspacePath })
      });
      
      // Cache the result if successful
      if (result.success) {
        this.set(cacheKey, result.data, 'git', 'git');
        logger.info('Git data cached successfully');
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to fetch Git data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Chat data with caching
   * @param {string} port - IDE port
   */
  async getChatData(port) {
    const cacheKey = `chat_history_${port}`;
    
    // Check cache first
    const cachedResult = this.get(cacheKey);
    if (cachedResult) {
      logger.info('Using cached Chat data');
      return { success: true, data: cachedResult };
    }
    
    // Import apiCall dynamically
    const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
    
    try {
      const result = await apiCall(`/api/chat/port/${port}/history`);
      
      // Cache the result if successful
      if (result.success) {
        this.set(cacheKey, result.data, 'chat', 'chat');
        logger.info('Chat data cached successfully');
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to fetch Chat data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update IDE cache with new data instead of clearing
   * @param {object} data - New IDE data
   */
  updateIDECache(data) {
    try {
      const key = 'store_load_available_ides';
      const existingData = this.memoryCache.get(key);
      
      if (existingData && Array.isArray(existingData.data)) {
        // Update existing IDE data
        const updatedData = existingData.data.map(ide => 
          ide.port === data.port ? { ...ide, ...data } : ide
        );
        
        // Set updated data with same TTL
        this.set(key, updatedData, 'ide', 'ide');
        logger.info(`🔄 IDE cache updated for port ${data.port}`);
      }
    } catch (error) {
      logger.error('Failed to update IDE cache:', error);
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
      return new Blob([JSON.stringify(data)]).size;
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
   * Set data in IndexedDB
   * @param {string} key - Cache key
   * @param {Object} cacheItem - Cache item
   */
  setInIndexedDB(key, cacheItem) {
    if (!this.indexedDBCache) return;
    
    const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    store.put({ key, ...cacheItem });
  }

  /**
   * Get data from IndexedDB
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  getFromIndexedDB(key) {
    if (!this.indexedDBCache) return null;
    
    return new Promise((resolve) => {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() <= result.expires) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Delete data from IndexedDB
   * @param {string} key - Cache key
   */
  deleteFromIndexedDB(key) {
    if (!this.indexedDBCache) return;
    
    const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    store.delete(key);
  }

  /**
   * Setup cleanup intervals for expired entries
   */
  setupCleanupIntervals() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
    
    // Cleanup old entries every 30 minutes
    setInterval(() => {
      this.cleanupOldEntries();
    }, 30 * 60 * 1000);
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
      namespaces: this.namespaces.size,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Clear all cache (emergency use only)
   */
  clear() {
    this.memoryCache.clear();
    this.namespaces.clear();
    this.currentMemorySize = 0;
    
    if (this.indexedDBCache) {
      const transaction = this.indexedDBCache.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
    }
    
    logger.warn('⚠️ All cache cleared - this should be avoided in favor of selective invalidation');
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
    logger.info('Cache configuration updated', newConfig);
  }
}

// Export singleton instance
export const cacheService = new CacheService();
