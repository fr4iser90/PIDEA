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
      averageResponseTime: 0,
      memorySize: 0,
      memoryEntries: 0,
      namespaces: 0,
      isInitialized: false
    };
    
    // Event coordinator for selective invalidation
    this.eventCoordinator = new EventCoordinator();
    this.setupEventListeners();
    
    // Namespace management for selective invalidation
    this.namespaces = new Map();
    
    this.isInitialized = false;
    
    // ✅ CRITICAL FIX: Don't auto-initialize - let RefreshService handle it
    // this.initialize(); // Disabled to prevent double initialization
    
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
      logger.info('🔄 Initializing CacheService...');
      
      // ✅ CRITICAL FIX: Initialize IndexedDB first
      await this.initializeIndexedDB();
      
      // Load existing data from IndexedDB to memory
      await this.loadFromIndexedDBToMemory();
      
      // Start cleanup intervals
      this.setupCleanupIntervals();
      
      this.isInitialized = true;
      this.stats.isInitialized = true;
      logger.info('✅ CacheService initialization complete');
      
    } catch (error) {
      logger.error('❌ CacheService initialization failed:', error);
      this.isInitialized = true;
      this.stats.isInitialized = true;
      logger.warn('⚠️ CacheService initialized with errors');
    }
  }

  /**
   * Synchronous initialization for immediate cache access
   * Used when cache is accessed before async initialization completes
   */
  initializeSync() {
    if (this.isInitialized) return;
    
    try {
      logger.info('🔄 Synchronous CacheService initialization...');
      
      // ✅ CRITICAL FIX: Try to load from IndexedDB synchronously if available
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          // Try to open IndexedDB synchronously (this might fail)
          const request = indexedDB.open('PIDEA_Cache', 1);
          request.onsuccess = () => {
            this.indexedDBCache = request.result;
            logger.info('✅ IndexedDB opened synchronously');
            // Load data asynchronously but immediately
            this.loadFromIndexedDBToMemory().then(() => {
              logger.info('✅ Synchronous IndexedDB data load complete');
            }).catch(error => {
              logger.warn('⚠️ Synchronous IndexedDB load failed:', error);
            });
          };
          request.onerror = () => {
            logger.warn('⚠️ Synchronous IndexedDB open failed');
          };
        } catch (error) {
          logger.warn('⚠️ Synchronous IndexedDB access failed:', error);
        }
      }
      
      // Start cleanup intervals
      this.setupCleanupIntervals();
      
      this.isInitialized = true;
      this.stats.isInitialized = true;
      logger.info('✅ CacheService synchronous initialization complete');
      
      // Start async initialization in background for full setup
      this.initialize().catch(error => {
        logger.error('❌ Background initialization failed:', error);
      });
      
    } catch (error) {
      logger.error('❌ Synchronous initialization failed:', error);
      this.isInitialized = true;
      this.stats.isInitialized = true;
    }
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  async initializeIndexedDB() {
    // ✅ CRITICAL FIX: Enable IndexedDB for persistent cache
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      logger.warn('IndexedDB not available, using memory-only cache');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PIDEA_Cache', 1);
      
      // ✅ CRITICAL FIX: Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        logger.warn('IndexedDB initialization timeout, using memory-only cache');
        resolve();
      }, 5000); // 5 second timeout
      
      request.onerror = () => {
        clearTimeout(timeout);
        logger.warn('IndexedDB failed, using memory-only cache');
        resolve();
      };
      
      request.onsuccess = () => {
        clearTimeout(timeout);
        this.indexedDBCache = request.result;
        logger.info('✅ IndexedDB cache initialized for persistent storage');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('namespace', 'namespace', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Load all data from IndexedDB into memory cache
   */
  async loadFromIndexedDBToMemory() {
    if (!this.indexedDBCache) {
      logger.warn('⚠️ IndexedDB not available for loading');
      return Promise.resolve();
    }
    
    try {
      logger.info('🔄 Starting IndexedDB to memory load...');
      const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        // ✅ CRITICAL FIX: Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          logger.warn('⚠️ IndexedDB load timeout, continuing without cache');
          resolve();
        }, 5000); // 5 second timeout
        
        request.onsuccess = () => {
          clearTimeout(timeout);
          const results = request.result || [];
          let loadedCount = 0;
          let expiredCount = 0;
          
          logger.info(`📊 Found ${results.length} entries in IndexedDB`);
          
          results.forEach(item => {
            logger.info(`🔍 Loading cache entry: ${item.key}`);
            // Check if not expired
            if (Date.now() <= item.expires) {
              this.memoryCache.set(item.key, item);
              this.currentMemorySize += item.size;
              loadedCount++;
              logger.info(`✅ Loaded: ${item.key}`);
            } else {
              expiredCount++;
              logger.info(`⏰ Expired: ${item.key}`);
            }
          });
          
          logger.info(`✅ Loaded ${loadedCount} cache entries from IndexedDB to memory (${expiredCount} expired)`);
          resolve();
        };
        
        request.onerror = (error) => {
          clearTimeout(timeout);
          logger.error('❌ Failed to load cache from IndexedDB:', error);
          resolve(); // ✅ CRITICAL FIX: Resolve instead of reject to prevent hanging
        };
        
        // ✅ CRITICAL FIX: Add transaction error handler
        transaction.onerror = (error) => {
          clearTimeout(timeout);
          logger.error('❌ IndexedDB transaction error:', error);
          resolve(); // Resolve to prevent hanging
        };
      });
      
    } catch (error) {
      logger.error('❌ Error loading cache from IndexedDB:', error);
      return Promise.resolve(); // ✅ CRITICAL FIX: Always return resolved promise
    }
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
      
      // Store in IndexedDB for persistence
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
      // ✅ CRITICAL FIX: Ensure cache is initialized before any get operation
      if (!this.isInitialized) {
        logger.warn('⚠️ Cache not initialized, initializing synchronously...');
        this.initializeSync();
        
        // ✅ CRITICAL FIX: Load ALL data from IndexedDB immediately
        if (this.indexedDBCache) {
          try {
            const transaction = this.indexedDBCache.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.getAll();
            
            request.onsuccess = () => {
              const results = request.result || [];
              let loadedCount = 0;
              
              results.forEach(item => {
                if (Date.now() <= item.expires) {
                  this.memoryCache.set(item.key, item);
                  loadedCount++;
                }
              });
              
              if (loadedCount > 0) {
                logger.info(`✅ Loaded ${loadedCount} entries from IndexedDB during get operation`);
                
                // ✅ CRITICAL FIX: Check if the requested key is now available
                const cacheItem = this.memoryCache.get(key);
                if (cacheItem) {
                  logger.info(`✅ Found ${key} in IndexedDB, returning cached data`);
                  this.stats.hits++;
                  this.updateHitRate();
                  this.updateResponseTime(performance.now() - startTime);
                  return cacheItem.data;
                }
              }
            };
          } catch (error) {
            logger.warn('⚠️ Failed to load from IndexedDB during get:', error);
          }
        }
      }
      
      const cacheItem = this.memoryCache.get(key);
      
      if (!cacheItem) {
        // Try to load from IndexedDB synchronously (if already loaded)
        // This is a fallback - main loading happens at startup
        this.stats.misses++;
        this.updateHitRate();
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
   * Get data from cache (async - includes IndexedDB fallback)
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  async getAsync(key) {
    const startTime = performance.now();
    
    try {
      // First try memory cache (fast)
      const cacheItem = this.memoryCache.get(key);
      
      if (cacheItem) {
        // Check if expired
        if (Date.now() > cacheItem.expires) {
          this.delete(key);
          this.stats.misses++;
          this.updateHitRate();
          this.updateResponseTime(performance.now() - startTime);
          return null;
        }
        
        // Update access time for LRU
        cacheItem.lastAccess = Date.now();
        
        this.stats.hits++;
        this.updateHitRate();
        this.updateResponseTime(performance.now() - startTime);
        logger.debug(`✅ Cache hit (memory): ${key}, type: ${cacheItem.dataType}`);
        return cacheItem.data;
      }
      
      // Try IndexedDB if available
      if (this.indexedDBCache) {
        const indexedData = await this.getFromIndexedDB(key);
        if (indexedData) {
          // Load back into memory cache for faster access
          const dataSize = this.calculateSize(indexedData);
          const config = this.config.default || { ttl: 300000 }; // 5 min default
          const cacheItem = {
            data: indexedData,
            timestamp: Date.now(),
            expires: Date.now() + config.ttl,
            size: dataSize,
            dataType: 'default',
            namespace: 'global',
            lastAccess: Date.now()
          };
          
          this.memoryCache.set(key, cacheItem);
          this.currentMemorySize += dataSize;
          
          this.stats.hits++;
          this.updateHitRate();
          this.updateResponseTime(performance.now() - startTime);
          logger.debug(`✅ Cache hit (IndexedDB): ${key}`);
          return indexedData;
        }
      }
      
      this.stats.misses++;
      this.updateHitRate();
      this.updateResponseTime(performance.now() - startTime);
      return null;
      
    } catch (error) {
      logger.error('Cache getAsync error:', error);
      this.stats.misses++;
      this.updateHitRate();
      this.updateResponseTime(performance.now() - startTime);
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
   * Generate hierarchical cache key
   * @param {string} namespace - Cache namespace
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data
   * @returns {string} Hierarchical cache key
   */
  generateHierarchicalKey(namespace, port, projectId, dataType) {
    const key = `${namespace}:${port}:${projectId}:${dataType}`;
    logger.debug(`Generated hierarchical key: ${key}`);
    return key;
  }

  /**
   * Cache bundle of related data together
   * @param {string} bundleKey - Bundle identifier
   * @param {Object} bundleData - Object containing multiple data types
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @returns {boolean} Success status
   */
  cacheBundle(bundleKey, bundleData, port, projectId) {
    const startTime = performance.now();
    
    try {
      const bundleCacheKey = this.generateHierarchicalKey('analysisBundle', port, projectId, bundleKey);
      const bundleSize = this.calculateSize(bundleData);
      
      // Cache the bundle
      const success = this.set(bundleCacheKey, bundleData, 'analysisBundle', 'analysisBundle');
      
      if (success) {
        logger.info(`📦 Cached bundle: ${bundleKey}, size: ${bundleSize} bytes, port: ${port}, project: ${projectId}`);
        
        // Also cache individual components for selective access
        Object.entries(bundleData).forEach(([dataType, data]) => {
          const individualKey = this.generateHierarchicalKey(dataType, port, projectId, 'data');
          this.set(individualKey, data, dataType, dataType);
        });
        
        this.updateResponseTime(performance.now() - startTime);
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error('Failed to cache bundle:', error);
      return false;
    }
  }

  /**
   * Get bundle of related data
   * @param {string} bundleKey - Bundle identifier
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @returns {Object|null} Bundle data or null if not found
   */
  getBundle(bundleKey, port, projectId) {
    const bundleCacheKey = this.generateHierarchicalKey('analysisBundle', port, projectId, bundleKey);
    const bundleData = this.get(bundleCacheKey);
    
    if (bundleData) {
      logger.info(`📦 Bundle cache hit: ${bundleKey}, port: ${port}, project: ${projectId}`);
      return bundleData;
    }
    
    logger.info(`📦 Bundle cache miss: ${bundleKey}, port: ${port}, project: ${projectId}`);
    return null;
  }

  /**
   * Warm cache with predictive loading
   * @param {Array} patterns - Array of cache patterns to warm
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Warming results
   */
  async warmCache(patterns, port, projectId) {
    const startTime = performance.now();
    const results = {
      warmed: [],
      failed: [],
      totalTime: 0
    };
    
    try {
      logger.info(`🔥 Starting cache warming for port: ${port}, project: ${projectId}`);
      
      // Warm each pattern
      for (const pattern of patterns) {
        try {
          const key = this.generateHierarchicalKey(pattern.namespace, port, projectId, pattern.dataType);
          
          // Check if already cached
          if (this.get(key)) {
            results.warmed.push({ pattern, status: 'already_cached' });
            continue;
          }
          
          // Load data based on pattern
          const data = await this.loadDataForPattern(pattern, port, projectId);
          
          if (data) {
            this.set(key, data, pattern.dataType, pattern.namespace);
            results.warmed.push({ pattern, status: 'warmed', dataSize: this.calculateSize(data) });
          } else {
            results.failed.push({ pattern, status: 'no_data' });
          }
          
        } catch (error) {
          logger.error(`Failed to warm cache for pattern ${pattern.namespace}:${pattern.dataType}:`, error);
          results.failed.push({ pattern, status: 'error', error: error.message });
        }
      }
      
      results.totalTime = performance.now() - startTime;
      logger.info(`🔥 Cache warming completed in ${results.totalTime.toFixed(2)}ms`, results);
      
      return results;
      
    } catch (error) {
      logger.error('Cache warming failed:', error);
      results.totalTime = performance.now() - startTime;
      return results;
    }
  }

  /**
   * Load data for cache warming pattern
   * @param {Object} pattern - Warming pattern
   * @param {string} port - IDE port
   * @param {string} projectId - Project identifier
   * @returns {Promise<any>} Loaded data
   */
  async loadDataForPattern(pattern, port, projectId) {
    try {
      // Import apiCall dynamically to avoid circular dependencies
      const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
      
      switch (pattern.dataType) {
        case 'tasks':
          const tasksResponse = await apiCall(`/api/projects/${projectId}/tasks`);
          return tasksResponse?.success ? tasksResponse.data : null;
          
        case 'git':
          const gitResponse = await apiCall(`/api/projects/${projectId}/git/status`);
          return gitResponse?.success ? gitResponse.data : null;
          
        case 'analysis':
          const analysisResponse = await apiCall(`/api/projects/${projectId}/analysis`);
          return analysisResponse?.success ? analysisResponse.data : null;
          
        case 'ide':
          const ideResponse = await apiCall(`/api/ide/status?port=${port}`);
          return ideResponse?.success ? ideResponse.data : null;
          
        default:
          logger.warn(`Unknown data type for warming: ${pattern.dataType}`);
          return null;
      }
      
    } catch (error) {
      logger.error(`Failed to load data for pattern ${pattern.dataType}:`, error);
      return null;
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
