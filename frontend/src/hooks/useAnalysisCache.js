import { useState, useEffect, useCallback, useRef } from 'react';
import refreshService from '@/infrastructure/services/RefreshService';
import { logger } from '@/infrastructure/logging/Logger';

/**
 * ✅ MIGRATED: Custom hook now uses the unified CacheManager from RefreshService
 * Provides efficient caching with TTL support and automatic cleanup
 */
export const useAnalysisCache = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const statsIntervalRef = useRef(null);

  // Initialize cache monitoring
  useEffect(() => {
    if (!isInitialized) {
      updateCacheStats();
      setIsInitialized(true);
      
      // Update stats every 30 seconds
      statsIntervalRef.current = setInterval(updateCacheStats, 30 * 1000);
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [isInitialized]);

  /**
   * Update cache statistics from RefreshService
   */
  const updateCacheStats = useCallback(() => {
    try {
      const refreshStats = refreshService.getStats();
      const cacheStats = refreshStats.cacheStats || {};
      setCacheStats(cacheStats);
    } catch (error) {
      logger.error('Failed to update cache stats:', error);
    }
  }, []);

  /**
   * Get cached data for project and data type using RefreshService CacheManager
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data (metrics, status, etc.)
   * @param {Object} filters - Optional filters
   * @returns {any|null} Cached data or null if not found/expired
   */
  const getCachedData = useCallback((projectId, dataType, filters = {}) => {
    try {
      const cacheKey = `analysis:${projectId}:${dataType}:${JSON.stringify(filters)}`;
      const data = refreshService.cacheManager.get(cacheKey);
      
      if (data) {
        logger.info(`Cache hit for ${dataType}:`, { projectId, filters });
      } else {
        logger.info(`Cache miss for ${dataType}:`, { projectId, filters });
      }
      
      return data;
    } catch (error) {
      logger.error('Failed to get cached data:', error);
      return null;
    }
  }, []);

  /**
   * Set data in cache using RefreshService CacheManager
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data
   * @param {any} data - Data to cache
   * @param {Object} filters - Optional filters
   */
  const setCachedData = useCallback((projectId, dataType, data, filters = {}) => {
    try {
      const cacheKey = `analysis:${projectId}:${dataType}:${JSON.stringify(filters)}`;
      
      // Use appropriate TTL based on data type
      const ttlMap = {
        metrics: 30 * 60 * 1000,      // 30 minutes
        status: 5 * 60 * 1000,       // 5 minutes
        history: 60 * 60 * 1000,     // 1 hour
        issues: 60 * 60 * 1000,      // 1 hour
        techStack: 120 * 60 * 1000,  // 2 hours
        architecture: 180 * 60 * 1000, // 3 hours
        recommendations: 60 * 60 * 1000 // 1 hour
      };
      
      const ttl = ttlMap[dataType] || 60 * 60 * 1000; // Default 1 hour
      
      const success = refreshService.cacheManager.set(cacheKey, data, ttl);
      
      if (success) {
        logger.info(`Cached ${dataType}:`, { 
          projectId, 
          filters, 
          ttl: `${Math.round(ttl / 1000)}s`,
          dataSize: JSON.stringify(data).length
        });
      } else {
        logger.warn(`Failed to cache ${dataType} (data too large):`, { 
          projectId, 
          filters,
          dataSize: JSON.stringify(data).length
        });
      }
      
      // Update stats after setting data
      updateCacheStats();
      return success;
    } catch (error) {
      logger.error('Failed to set cached data:', error);
      return false;
    }
  }, [updateCacheStats]);

  /**
   * Check if data exists in cache
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data
   * @param {Object} filters - Optional filters
   * @returns {boolean} Whether data exists and is valid
   */
  const hasCachedData = useCallback((projectId, dataType, filters = {}) => {
    try {
      const cacheKey = `analysis:${projectId}:${dataType}:${JSON.stringify(filters)}`;
      return refreshService.cacheManager.has(cacheKey);
    } catch (error) {
      logger.error('Failed to check cached data:', error);
      return false;
    }
  }, []);

  /**
   * Remove specific data from cache
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data
   * @param {Object} filters - Optional filters
   */
  const removeCachedData = useCallback((projectId, dataType, filters = {}) => {
    try {
      const cacheKey = `analysis:${projectId}:${dataType}:${JSON.stringify(filters)}`;
      refreshService.cacheManager.delete(cacheKey);
      
      logger.info(`Removed ${dataType} from cache:`, { projectId, filters });
      updateCacheStats();
    } catch (error) {
      logger.error('Failed to remove cached data:', error);
    }
  }, [updateCacheStats]);

  /**
   * Clear all cached data for a project
   * @param {string} projectId - Project identifier (optional, clears all if not provided)
   */
  const clearProjectCache = useCallback((projectId = null) => {
    try {
      if (projectId) {
        // Remove all data types for specific project
        const dataTypes = ['metrics', 'status', 'history', 'issues', 'techStack', 'architecture', 'recommendations'];
        dataTypes.forEach(dataType => {
          const cacheKey = `analysis:${projectId}:${dataType}`;
          refreshService.cacheManager.delete(cacheKey);
        });
        
        logger.info(`Cleared cache for project:`, { projectId });
      } else {
        // Clear all cache
        refreshService.cacheManager.clear();
        logger.info('Cleared all cache');
      }
      
      updateCacheStats();
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }, [updateCacheStats]);

  /**
   * Clear all cached data
   */
  const clearAllCache = useCallback(() => {
    try {
      refreshService.cacheManager.clear();
      logger.info('Cleared all cache');
      updateCacheStats();
    } catch (error) {
      logger.error('Failed to clear all cache:', error);
    }
  }, [updateCacheStats]);

  /**
   * Force cleanup of expired entries
   * @returns {number} Number of entries cleaned up
   */
  const cleanupExpired = useCallback(() => {
    try {
      refreshService.cacheManager.cleanupExpiredEntries();
      logger.info('Cleaned up expired entries');
      updateCacheStats();
      return 1; // CacheManager doesn't return count, so we return 1 to indicate success
    } catch (error) {
      logger.error('Failed to cleanup expired entries:', error);
      return 0;
    }
  }, [updateCacheStats]);

  /**
   * Get cache configuration from RefreshService
   * @returns {Object} Current cache configuration
   */
  const getCacheConfig = useCallback(() => {
    return refreshService.cacheManager.cacheConfig || {};
  }, []);

  /**
   * Update cache configuration (not supported in unified system)
   * @param {Object} config - New configuration
   */
  const updateCacheConfig = useCallback((config) => {
    logger.warn('Cache configuration updates not supported in unified RefreshService system');
  }, []);

  return {
    // Data operations
    getCachedData,
    setCachedData,
    hasCachedData,
    removeCachedData,
    
    // Cache management
    clearProjectCache,
    clearAllCache,
    cleanupExpired,
    
    // Configuration
    getCacheConfig,
    updateCacheConfig,
    
    // Statistics
    cacheStats,
    updateCacheStats,
    
    // State
    isInitialized
  };
};

export default useAnalysisCache; 