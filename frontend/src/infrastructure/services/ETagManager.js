/**
 * ETagManager - HTTP ETag-based caching without localStorage
 * Provides efficient caching using ETags and HTTP headers only
 * No sensitive data stored in browser storage
 */
class ETagManager {
  constructor() {
    this.etags = new Map();
    this.logger = console;
  }

  /**
   * Get stored ETag for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {string|null} Stored ETag or null
   */
  getStoredETag(endpoint, projectId = null) {
    const key = this.getETagKey(endpoint, projectId);
    const stored = this.etags.get(key);
    
    if (stored && Date.now() < stored.expiresAt) {
      return stored.etag;
    }
    
    // Remove expired ETag
    if (stored) {
      this.etags.delete(key);
    }
    
    return null;
  }

  /**
   * Store ETag for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} etag - ETag value
   * @param {string} projectId - Project identifier
   * @param {number} maxAge - Max age in milliseconds
   */
  storeETag(endpoint, etag, projectId = null, maxAge = 300000) {
    const key = this.getETagKey(endpoint, projectId);
    this.etags.set(key, {
      etag,
      expiresAt: Date.now() + maxAge
    });
    
    this.logger.info(`Stored ETag for ${endpoint}:`, etag.substring(0, 20) + '...');
  }

  /**
   * Remove stored ETag
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   */
  removeETag(endpoint, projectId = null) {
    const key = this.getETagKey(endpoint, projectId);
    this.etags.delete(key);
    this.logger.info(`Removed ETag for ${endpoint}`);
  }

  /**
   * Clear all stored ETags
   */
  clearAllETags() {
    this.etags.clear();
    this.logger.info('Cleared all ETags');
  }

  /**
   * Get all stored ETags
   * @returns {Object} All stored ETags
   */
  getAllETags() {
    const result = {};
    for (const [key, value] of this.etags.entries()) {
      if (Date.now() < value.expiresAt) {
        result[key] = value.etag;
      }
    }
    return result;
  }

  /**
   * Generate ETag key for endpoint and project
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {string} ETag key
   */
  getETagKey(endpoint, projectId = null) {
    return projectId ? `${endpoint}_${projectId}` : endpoint;
  }

  /**
   * Add ETag headers to request options
   * @param {Object} options - Request options
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   * @returns {Object} Updated options with ETag headers
   */
  addETagHeaders(options = {}, endpoint, projectId = null) {
    const storedETag = this.getStoredETag(endpoint, projectId);
    
    if (storedETag) {
      return {
        ...options,
        headers: {
          ...options.headers,
          'If-None-Match': storedETag
        }
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
    this.logger.info(`Using cached data for ${endpoint} (304 Not Modified)`);
    return {
      success: true,
      data: null, // No data in 304 response
      cached: true,
      etag: this.getStoredETag(endpoint, projectId)
    };
  }

  /**
   * Force refresh by removing ETag
   * @param {string} endpoint - API endpoint
   * @param {string} projectId - Project identifier
   */
  forceRefresh(endpoint, projectId = null) {
    this.removeETag(endpoint, projectId);
    this.logger.info(`Forced refresh for ${endpoint}`);
  }

  /**
   * Get ETag statistics
   * @returns {Object} ETag statistics
   */
  getStatistics() {
    const etags = this.getAllETags();
    return {
      etagCount: Object.keys(etags).length,
      etags: Object.keys(etags)
    };
  }
}

// Create singleton instance
const etagManager = new ETagManager();

export default etagManager; 