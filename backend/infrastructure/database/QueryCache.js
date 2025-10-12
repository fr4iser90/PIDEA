/**
 * QueryCache - Query result caching implementation
 * Provides intelligent caching for database query results with TTL and invalidation
 */
const EventEmitter = require('events');
const Logger = require('@logging/Logger');
const crypto = require('crypto');

class QueryCache extends EventEmitter {
  constructor(databaseConnection, options = {}) {
    super();
    
    this.databaseConnection = databaseConnection;
    this.logger = new Logger('QueryCache');
    this.enabled = options.enabled !== false;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    
    // Cache storage
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Configuration
    this.config = {
      useMemoryCache: true,
      useDatabaseCache: true,
      enableCompression: options.enableCompression || false,
      enableEncryption: options.enableEncryption || false,
      ...options
    };
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    this.logger.info('QueryCache initialized');
  }

  /**
   * Start cache cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cache cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get cached result
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object|null} Cached result or null
   */
  async get(query, params = []) {
    if (!this.enabled) return null;

    try {
      const cacheKey = this.generateCacheKey(query, params);
      
      // Try memory cache first
      if (this.config.useMemoryCache) {
        const memoryResult = this.getFromMemoryCache(cacheKey);
        if (memoryResult) {
          this.cacheStats.hits++;
          this.emit('cacheHit', { cacheKey, source: 'memory' });
          return memoryResult;
        }
      }
      
      // Try database cache
      if (this.config.useDatabaseCache) {
        const dbResult = await this.getFromDatabaseCache(cacheKey);
        if (dbResult) {
          this.cacheStats.hits++;
          
          // Store in memory cache for faster access
          if (this.config.useMemoryCache) {
            this.setInMemoryCache(cacheKey, dbResult);
          }
          
          this.emit('cacheHit', { cacheKey, source: 'database' });
          return dbResult;
        }
      }
      
      this.cacheStats.misses++;
      this.emit('cacheMiss', { cacheKey });
      return null;
      
    } catch (error) {
      this.logger.error('Error getting cached result:', error.message);
      return null;
    }
  }

  /**
   * Set cached result
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} result - Query result
   * @param {number} ttl - Time to live in milliseconds
   */
  async set(query, params = [], result, ttl = null) {
    if (!this.enabled) return;

    try {
      const cacheKey = this.generateCacheKey(query, params);
      const actualTTL = ttl || this.defaultTTL;
      const expiresAt = new Date(Date.now() + actualTTL);
      
      const cacheEntry = {
        query,
        params,
        result: this.prepareResult(result),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        ttl: actualTTL
      };
      
      // Store in memory cache
      if (this.config.useMemoryCache) {
        this.setInMemoryCache(cacheKey, cacheEntry);
      }
      
      // Store in database cache
      if (this.config.useDatabaseCache) {
        await this.setInDatabaseCache(cacheKey, cacheEntry);
      }
      
      this.cacheStats.sets++;
      this.emit('cacheSet', { cacheKey, ttl: actualTTL });
      
    } catch (error) {
      this.logger.error('Error setting cached result:', error.message);
    }
  }

  /**
   * Delete cached result
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   */
  async delete(query, params = []) {
    if (!this.enabled) return;

    try {
      const cacheKey = this.generateCacheKey(query, params);
      
      // Delete from memory cache
      if (this.config.useMemoryCache) {
        this.memoryCache.delete(cacheKey);
      }
      
      // Delete from database cache
      if (this.config.useDatabaseCache) {
        await this.deleteFromDatabaseCache(cacheKey);
      }
      
      this.cacheStats.deletes++;
      this.emit('cacheDelete', { cacheKey });
      
    } catch (error) {
      this.logger.error('Error deleting cached result:', error.message);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    if (!this.enabled) return;

    try {
      // Clear memory cache
      if (this.config.useMemoryCache) {
        this.memoryCache.clear();
      }
      
      // Clear database cache
      if (this.config.useDatabaseCache) {
        await this.clearDatabaseCache();
      }
      
      this.emit('cacheClear');
      this.logger.info('Cache cleared');
      
    } catch (error) {
      this.logger.error('Error clearing cache:', error.message);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.memoryCache.size,
      enabled: this.enabled,
      config: this.config
    };
  }

  /**
   * Get cache keys
   * @returns {Array} Cache keys
   */
  getKeys() {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Check if cache key exists
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {boolean} True if cache key exists
   */
  async has(query, params = []) {
    if (!this.enabled) return false;

    const cacheKey = this.generateCacheKey(query, params);
    
    // Check memory cache
    if (this.config.useMemoryCache && this.memoryCache.has(cacheKey)) {
      return true;
    }
    
    // Check database cache
    if (this.config.useDatabaseCache) {
      return await this.hasInDatabaseCache(cacheKey);
    }
    
    return false;
  }

  /**
   * Generate cache key
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(query, params) {
    const normalizedQuery = this.normalizeQuery(query);
    const queryString = normalizedQuery + JSON.stringify(params || []);
    return crypto.createHash('sha256').update(queryString).digest('hex').substring(0, 16);
  }

  /**
   * Normalize query for consistent caching
   * @param {string} query - SQL query
   * @returns {string} Normalized query
   */
  normalizeQuery(query) {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .trim()
      .toLowerCase();
  }

  /**
   * Prepare result for caching
   * @param {Object} result - Query result
   * @returns {Object} Prepared result
   */
  prepareResult(result) {
    if (!result) return null;
    
    // Extract relevant data from result
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      fields: result.fields || [],
      command: result.command || 'SELECT'
    };
  }

  /**
   * Get from memory cache
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result or null
   */
  getFromMemoryCache(cacheKey) {
    const entry = this.memoryCache.get(cacheKey);
    if (!entry) return null;
    
    // Check expiration
    if (new Date(entry.expiresAt) <= new Date()) {
      this.memoryCache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }

  /**
   * Set in memory cache
   * @param {string} cacheKey - Cache key
   * @param {Object} cacheEntry - Cache entry
   */
  setInMemoryCache(cacheKey, cacheEntry) {
    // Check cache size limit
    if (this.memoryCache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }
    
    this.memoryCache.set(cacheKey, cacheEntry);
  }

  /**
   * Evict oldest cache entry
   */
  evictOldestEntry() {
    const oldestKey = this.memoryCache.keys().next().value;
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Get from database cache
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result or null
   */
  async getFromDatabaseCache(cacheKey) {
    try {
      this.logger.debug(`QueryCache using database type: ${this.databaseConnection.getType()}`);
      const sql = 'SELECT * FROM query_cache WHERE cache_key = $1 AND expires_at > $2';
      const params = [cacheKey, new Date().toISOString()];
      
      // Use direct database connection to avoid infinite loop
      const result = await this.databaseConnection.dbConnection.query(sql, params);
      if (!result || !result.rows || result.rows.length === 0) return null;
      
      const entry = result.rows[0];
      
      // Update last accessed time
      await this.updateLastAccessed(cacheKey);
      
      return JSON.parse(entry.result_data);
      
    } catch (error) {
      this.logger.error('Error getting from database cache:', error.message);
      this.logger.error('Full error:', error);
      return null;
    }
  }

  /**
   * Set in database cache
   * @param {string} cacheKey - Cache key
   * @param {Object} cacheEntry - Cache entry
   */
  async setInDatabaseCache(cacheKey, cacheEntry) {
    try {
      const sql = `
        INSERT INTO query_cache (cache_key, query_hash, result_data, expires_at, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(cache_key) DO UPDATE SET
          result_data = EXCLUDED.result_data,
          expires_at = EXCLUDED.expires_at,
          last_accessed = CURRENT_TIMESTAMP
      `;
      
      const params = [
        cacheKey,
        this.generateQueryHash(cacheEntry.query),
        JSON.stringify(cacheEntry.result),
        cacheEntry.expiresAt,
        JSON.stringify({})
      ];
      
      await this.databaseConnection.dbConnection.query(sql, params);
      
    } catch (error) {
      this.logger.error('Error setting in database cache:', error.message);
      this.logger.error('Full error:', error);
    }
  }

  /**
   * Delete from database cache
   * @param {string} cacheKey - Cache key
   */
  async deleteFromDatabaseCache(cacheKey) {
    try {
      const sql = 'DELETE FROM query_cache WHERE cache_key = ?';
      await this.databaseConnection.dbConnection.query(sql, [cacheKey]);
      
    } catch (error) {
      this.logger.error('Error deleting from database cache:', error.message);
    }
  }

  /**
   * Clear database cache
   */
  async clearDatabaseCache() {
    try {
      const sql = 'DELETE FROM query_cache';
      await this.databaseConnection.dbConnection.query(sql);
      
    } catch (error) {
      this.logger.error('Error clearing database cache:', error.message);
    }
  }

  /**
   * Check if cache key exists in database
   * @param {string} cacheKey - Cache key
   * @returns {boolean} True if exists
   */
  async hasInDatabaseCache(cacheKey) {
    try {
      const sql = 'SELECT 1 FROM query_cache WHERE cache_key = $1 AND expires_at > $2';
      const params = [cacheKey, new Date().toISOString()];
      
      const result = await this.databaseConnection.dbConnection.query(sql, params);
      return result && result.rows && result.rows.length > 0;
      
    } catch (error) {
      this.logger.error('Error checking database cache:', error.message);
      return false;
    }
  }

  /**
   * Update last accessed time
   * @param {string} cacheKey - Cache key
   */
  async updateLastAccessed(cacheKey) {
    try {
      const sql = 'UPDATE query_cache SET last_accessed = CURRENT_TIMESTAMP WHERE cache_key = $1';
      await this.databaseConnection.dbConnection.query(sql, [cacheKey]);
      
    } catch (error) {
      this.logger.error('Error updating last accessed time:', error.message);
    }
  }

  /**
   * Generate query hash
   * @param {string} query - SQL query
   * @returns {string} Query hash
   */
  generateQueryHash(query) {
    return crypto.createHash('sha256').update(query).digest('hex').substring(0, 16);
  }

  /**
   * Cleanup expired entries
   */
  async cleanup() {
    if (!this.enabled) return;

    try {
      // Cleanup memory cache
      if (this.config.useMemoryCache) {
        const now = new Date();
        for (const [key, entry] of this.memoryCache.entries()) {
          if (new Date(entry.expiresAt) <= now) {
            this.memoryCache.delete(key);
          }
        }
      }
      
      // Cleanup database cache
      if (this.config.useDatabaseCache) {
        const sql = 'DELETE FROM query_cache WHERE expires_at <= ?';
        await this.databaseConnection.execute(sql, [new Date().toISOString()]);
      }
      
      this.emit('cacheCleanup');
      
    } catch (error) {
      this.logger.error('Error during cache cleanup:', error.message);
    }
  }

  /**
   * Destroy cache instance
   */
  destroy() {
    this.stopCleanupTimer();
    this.memoryCache.clear();
    this.emit('destroyed');
  }

  /**
   * Track cache usage
   * @param {string} cacheKey - Cache key
   * @param {boolean} hit - Whether it was a cache hit
   */
  trackCache(cacheKey, hit) {
    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }
  }
}

module.exports = QueryCache;
