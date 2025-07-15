import { logger } from '@/infrastructure/logging/Logger';

/**
 * ETagManager - Frontend ETag handling service
 * 
 * This service manages ETags for API requests, stores them in localStorage,
 * and handles conditional requests to reduce bandwidth usage.
 */
class ETagManager {
  constructor() {
    this.storageKey = 'pidea_etags';
    this.logger = logger;
  }

  /**
   * Get stored ETag for a specific endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {string|null} Stored ETag or null
   */
  getStoredETag(endpoint, projectId = null) {
    try {
      const etags = this.getAllETags();
      const key = this.getETagKey(endpoint, projectId);
      const stored = etags[key];
      
      if (stored && stored.etag && stored.timestamp) {
        // Check if ETag is still valid (not expired)
        const now = Date.now();
        const maxAge = stored.maxAge || 300000; // 5 minutes default
        const isValid = (now - stored.timestamp) < maxAge;
        
        if (isValid) {
          this.logger.info(`Retrieved valid ETag for ${key}:`, stored.etag.substring(0, 20) + '...');
          return stored.etag;
        } else {
          this.logger.info(`ETag expired for ${key}, removing`);
          this.removeETag(endpoint, projectId);
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error getting stored ETag:', error);
      return null;
    }
  }

  /**
   * Store ETag for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} etag - ETag value
   * @param {string} projectId - Project identifier
   * @param {number} maxAge - Max age in milliseconds
   */
  storeETag(endpoint, etag, projectId = null, maxAge = 300000) {
    try {
      const etags = this.getAllETags();
      const key = this.getETagKey(endpoint, projectId);
      
      etags[key] = {
        etag,
        timestamp: Date.now(),
        maxAge,
        endpoint,
        projectId
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(etags));
      
      this.logger.info(`Stored ETag for ${key}:`, etag.substring(0, 20) + '...');
    } catch (error) {
      this.logger.error('Error storing ETag:', error);
    }
  }

  /**
   * Remove ETag for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   */
  removeETag(endpoint, projectId = null) {
    try {
      const etags = this.getAllETags();
      const key = this.getETagKey(endpoint, projectId);
      
      if (etags[key]) {
        delete etags[key];
        localStorage.setItem(this.storageKey, JSON.stringify(etags));
        this.logger.info(`Removed ETag for ${key}`);
      }
    } catch (error) {
      this.logger.error('Error removing ETag:', error);
    }
  }

  /**
   * Clear all ETags
   */
  clearAllETags() {
    try {
      localStorage.removeItem(this.storageKey);
      this.logger.info('Cleared all ETags');
    } catch (error) {
      this.logger.error('Error clearing ETags:', error);
    }
  }

  /**
   * Get all stored ETags
   * @returns {Object} All stored ETags
   */
  getAllETags() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      this.logger.error('Error getting all ETags:', error);
      return {};
    }
  }

  /**
   * Generate ETag key for storage
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {string} ETag key
   */
  getETagKey(endpoint, projectId = null) {
    const components = [endpoint];
    if (projectId) {
      components.push(projectId);
    }
    return components.join(':');
  }

  /**
   * Add ETag headers to fetch request
   * @param {Object} options - Fetch options
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {Object} Updated fetch options
   */
  addETagHeaders(options = {}, endpoint, projectId = null) {
    const etag = this.getStoredETag(endpoint, projectId);
    
    if (etag) {
      const headers = options.headers || {};
      headers['If-None-Match'] = `"${etag}"`;
      
      this.logger.info(`Added If-None-Match header for ${endpoint}:`, etag.substring(0, 20) + '...');
      
      return {
        ...options,
        headers
      };
    }
    
    return options;
  }

  /**
   * Handle response and extract ETag
   * @param {Response} response - Fetch response
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {Object} Response with ETag info
   */
  handleResponse(response, endpoint, projectId = null) {
    const etag = response.headers.get('ETag');
    const cacheControl = response.headers.get('Cache-Control');
    
    if (etag) {
      // Parse max-age from Cache-Control header
      let maxAge = 300000; // 5 minutes default
      if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          maxAge = parseInt(maxAgeMatch[1]) * 1000; // Convert to milliseconds
        }
      }
      
      this.storeETag(endpoint, etag, projectId, maxAge);
      this.logger.info(`Stored ETag from response for ${endpoint}:`, etag.substring(0, 20) + '...');
    }
    
    return {
      response,
      etag,
      isNotModified: response.status === 304
    };
  }

  /**
   * Handle 304 Not Modified response
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {Object} Cached data or null
   */
  handleNotModified(endpoint, projectId = null) {
    try {
      const cachedData = this.getCachedData(endpoint, projectId);
      if (cachedData) {
        this.logger.info(`Using cached data for ${endpoint} (304 Not Modified)`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          etag: this.getStoredETag(endpoint, projectId)
        };
      }
      
      this.logger.warn(`No cached data found for ${endpoint} despite 304 response`);
      return null;
    } catch (error) {
      this.logger.error('Error handling 304 response:', error);
      return null;
    }
  }

  /**
   * Store cached data for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {any} data - Data to cache
   * @param {string} projectId - Project identifier
   */
  cacheData(endpoint, data, projectId = null) {
    try {
      const key = `pidea_cache_${this.getETagKey(endpoint, projectId)}`;
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        endpoint,
        projectId
      };
      
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      this.logger.info(`Cached data for ${endpoint}`);
    } catch (error) {
      this.logger.error('Error caching data:', error);
    }
  }

  /**
   * Get cached data for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {any} Cached data or null
   */
  getCachedData(endpoint, projectId = null) {
    try {
      const key = `pidea_cache_${this.getETagKey(endpoint, projectId)}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const cacheEntry = JSON.parse(stored);
        const now = Date.now();
        const maxAge = 300000; // 5 minutes default
        const isValid = (now - cacheEntry.timestamp) < maxAge;
        
        if (isValid) {
          return cacheEntry.data;
        } else {
          this.removeCachedData(endpoint, projectId);
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Remove cached data for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   */
  removeCachedData(endpoint, projectId = null) {
    try {
      const key = `pidea_cache_${this.getETagKey(endpoint, projectId)}`;
      localStorage.removeItem(key);
      this.logger.info(`Removed cached data for ${endpoint}`);
    } catch (error) {
      this.logger.error('Error removing cached data:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearAllCachedData() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('pidea_cache_'));
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.logger.info(`Cleared ${cacheKeys.length} cached data entries`);
    } catch (error) {
      this.logger.error('Error clearing cached data:', error);
    }
  }

  /**
   * Force refresh by removing ETag and cached data
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   */
  forceRefresh(endpoint, projectId = null) {
    this.removeETag(endpoint, projectId);
    this.removeCachedData(endpoint, projectId);
    this.logger.info(`Forced refresh for ${endpoint}`);
  }

  /**
   * Get ETag statistics
   * @returns {Object} ETag statistics
   */
  getStatistics() {
    try {
      const etags = this.getAllETags();
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('pidea_cache_'));
      
      return {
        etagCount: Object.keys(etags).length,
        cacheCount: cacheKeys.length,
        totalStorage: this.getStorageSize(),
        etags: Object.keys(etags)
      };
    } catch (error) {
      this.logger.error('Error getting statistics:', error);
      return { etagCount: 0, cacheCount: 0, totalStorage: 0, etags: [] };
    }
  }

  /**
   * Get storage size in bytes
   * @returns {number} Storage size in bytes
   */
  getStorageSize() {
    try {
      let total = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        total += key.length + (value ? value.length : 0);
      });
      
      return total;
    } catch (error) {
      this.logger.error('Error calculating storage size:', error);
      return 0;
    }
  }
}

// Create singleton instance
const etagManager = new ETagManager();

export default etagManager; 