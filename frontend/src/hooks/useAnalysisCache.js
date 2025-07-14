import { useState, useEffect, useCallback, useRef } from 'react';
import { analysisDataCache } from '@/infrastructure/cache/AnalysisDataCache';
import { logger } from '@/infrastructure/logging/Logger';

/**
 * Custom hook for managing analysis data caching
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
   * Update cache statistics
   */
  const updateCacheStats = useCallback(() => {
    try {
      const stats = analysisDataCache.getStats();
      setCacheStats(stats);
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to update cache stats:', error);
    }
  }, []);

  /**
   * Get cached data for project and data type
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data (metrics, status, etc.)
   * @param {Object} filters - Optional filters
   * @returns {any|null} Cached data or null if not found/expired
   */
  const getCachedData = useCallback((projectId, dataType, filters = {}) => {
    try {
      const cacheKey = analysisDataCache.getCacheKey(projectId, dataType, filters);
      const data = analysisDataCache.get(cacheKey);
      
      if (data) {
        logger.log(`[useAnalysisCache] Cache hit for ${dataType}:`, { projectId, filters });
      } else {
        logger.log(`[useAnalysisCache] Cache miss for ${dataType}:`, { projectId, filters });
      }
      
      return data;
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to get cached data:', error);
      return null;
    }
  }, []);

  /**
   * Set data in cache
   * @param {string} projectId - Project identifier
   * @param {string} dataType - Type of data
   * @param {any} data - Data to cache
   * @param {Object} filters - Optional filters
   */
  const setCachedData = useCallback((projectId, dataType, data, filters = {}) => {
    try {
      const cacheKey = analysisDataCache.getCacheKey(projectId, dataType, filters);
      const ttl = analysisDataCache.getTTL(dataType);
      
      analysisDataCache.set(cacheKey, data, ttl);
      
      logger.log(`[useAnalysisCache] Cached ${dataType}:`, { 
        projectId, 
        filters, 
        ttl: `${Math.round(ttl / 1000)}s`,
        dataSize: JSON.stringify(data).length
      });
      
      // Update stats after setting data
      updateCacheStats();
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to set cached data:', error);
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
      const cacheKey = analysisDataCache.getCacheKey(projectId, dataType, filters);
      return analysisDataCache.has(cacheKey);
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to check cached data:', error);
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
      const cacheKey = analysisDataCache.getCacheKey(projectId, dataType, filters);
      analysisDataCache.delete(cacheKey);
      
      logger.log(`[useAnalysisCache] Removed ${dataType} from cache:`, { projectId, filters });
      updateCacheStats();
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to remove cached data:', error);
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
          const cacheKey = analysisDataCache.getCacheKey(projectId, dataType);
          analysisDataCache.delete(cacheKey);
        });
        
        logger.log(`[useAnalysisCache] Cleared cache for project:`, { projectId });
      } else {
        // Clear all cache
        analysisDataCache.clear();
        logger.log('[useAnalysisCache] Cleared all cache');
      }
      
      updateCacheStats();
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to clear cache:', error);
    }
  }, [updateCacheStats]);

  /**
   * Clear all cached data
   */
  const clearAllCache = useCallback(() => {
    try {
      analysisDataCache.clear();
      logger.log('[useAnalysisCache] Cleared all cache');
      updateCacheStats();
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to clear all cache:', error);
    }
  }, [updateCacheStats]);

  /**
   * Force cleanup of expired entries
   * @returns {number} Number of entries cleaned up
   */
  const cleanupExpired = useCallback(() => {
    try {
      const cleanedCount = analysisDataCache.cleanup();
      if (cleanedCount > 0) {
        logger.log(`[useAnalysisCache] Cleaned up ${cleanedCount} expired entries`);
        updateCacheStats();
      }
      return cleanedCount;
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to cleanup expired entries:', error);
      return 0;
    }
  }, [updateCacheStats]);

  /**
   * Get cache configuration
   * @returns {Object} Current cache configuration
   */
  const getCacheConfig = useCallback(() => {
    return analysisDataCache.getConfig();
  }, []);

  /**
   * Update cache configuration
   * @param {Object} config - New configuration
   */
  const updateCacheConfig = useCallback((config) => {
    try {
      analysisDataCache.setConfig(config);
      logger.log('[useAnalysisCache] Updated cache configuration:', config);
    } catch (error) {
      logger.error('[useAnalysisCache] Failed to update cache configuration:', error);
    }
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