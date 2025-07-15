/**
 * AnalysisDataCache - Client-side caching for analysis data with TTL support
 * Provides efficient caching for large analysis datasets to improve performance
 * Now persists data in localStorage to survive browser refreshes
 */

export class AnalysisDataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.storageKey = 'pidea_analysis_cache';
    this.config = {
      metrics: { ttl: 30 * 60 * 1000 }, // 30 minutes (increased)
      status: { ttl: 5 * 60 * 1000 }, // 5 minutes (increased)
      history: { ttl: 60 * 60 * 1000 }, // 1 hour (increased)
      issues: { ttl: 60 * 60 * 1000 }, // 1 hour (increased)
      techStack: { ttl: 120 * 60 * 1000 }, // 2 hours (increased)
      architecture: { ttl: 180 * 60 * 1000 }, // 3 hours (increased)
      recommendations: { ttl: 60 * 60 * 1000 } // 1 hour (increased)
    };
    
    // Load cached data from localStorage on initialization
    this.loadFromStorage();
  }

  /**
   * Load cached data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.cache && data.timestamps) {
          // Only load non-expired entries
          const now = Date.now();
          for (const [key, timestamp] of Object.entries(data.timestamps)) {
            if (now <= timestamp) {
              this.cache.set(key, data.cache[key]);
              this.timestamps.set(key, timestamp);
            }
          }
          console.log(`Loaded ${this.cache.size} cached entries from localStorage`);
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      // Clear corrupted localStorage data
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Save cached data to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        cache: Object.fromEntries(this.cache),
        timestamps: Object.fromEntries(this.timestamps)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
      // If localStorage is full, clear old entries
      this.cleanup();
    }
  }

  /**
   * Set data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
    this.saveToStorage();
  }

  /**
   * Get data from cache if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/not found
   */
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      this.saveToStorage();
      return null;
    }
    return this.cache.get(key);
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists and is valid
   */
  has(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      this.saveToStorage();
      return false;
    }
    return this.cache.has(key);
  }

  /**
   * Remove specific key from cache
   * @param {string} key - Cache key to remove
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.saveToStorage();
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, timestamp] of this.timestamps) {
      if (now > timestamp) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Clean up expired entries
   * @returns {number} Number of entries cleaned up
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, timestamp] of this.timestamps) {
      if (now > timestamp) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        cleanedCount++;
      }
    }

    // Save to localStorage after cleanup
    if (cleanedCount > 0) {
      this.saveToStorage();
    }

    return cleanedCount;
  }

  /**
   * Generate cache key for analysis data
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data (metrics, status, etc.)
   * @param {Object} filters - Optional filters
   * @returns {string} Cache key
   */
  getCacheKey(projectId, dataType, filters = {}) {
    const filterString = Object.keys(filters).length > 0 
      ? JSON.stringify(filters) 
      : '';
    return `${projectId}:${dataType}:${filterString}`;
  }

  /**
   * Get TTL for data type
   * @param {string} dataType - Type of data
   * @returns {number} TTL in milliseconds
   */
  getTTL(dataType) {
    return this.config[dataType]?.ttl || 5 * 60 * 1000; // Default 5 minutes
  }

  /**
   * Estimate memory usage of cache
   * @returns {string} Estimated memory usage
   */
  estimateMemoryUsage() {
    try {
      const cacheSize = JSON.stringify(Array.from(this.cache.entries())).length;
      const timestampsSize = JSON.stringify(Array.from(this.timestamps.entries())).length;
      const totalBytes = cacheSize + timestampsSize;
      
      if (totalBytes < 1024) return `${totalBytes} B`;
      if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(2)} KB`;
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Set cache configuration
   * @param {Object} config - New configuration
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get cache configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export const analysisDataCache = new AnalysisDataCache();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = analysisDataCache.cleanup();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000); 