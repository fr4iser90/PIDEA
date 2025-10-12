/**
 * Project Store Cache Hook
 * Provides cache monitoring and management for ProjectStore
 * Includes performance metrics, cache statistics, and management functions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';
import { cacheService } from '@/infrastructure/services/CacheService';

/**
 * Hook for ProjectStore cache monitoring and management
 */
export const useProjectStoreCache = (options = {}) => {
  const {
    enableMonitoring = true,
    updateInterval = 30000, // 30 seconds
    enablePerformanceTracking = true
  } = options;

  const [cacheStats, setCacheStats] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    cacheHitRate: 0,
    totalOperations: 0,
    lastUpdate: null
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  const projectStore = useProjectStore();

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    try {
      const stats = projectStore.getCacheStats();
      setCacheStats(stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }, [projectStore]);

  // Clear ProjectStore cache
  const clearCache = useCallback(() => {
    try {
      projectStore.clearCache();
      logger.info('ProjectStore cache cleared');
      // Refresh stats after clearing
      getCacheStats();
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }, [projectStore, getCacheStats]);

  // Warm cache with frequently accessed data
  const warmCache = useCallback(async () => {
    try {
      logger.info('Warming ProjectStore cache...');
      
      // Load projects if not already loaded
      if (Object.keys(projectStore.projects).length === 0) {
        await projectStore.loadProjects();
      }
      
      // Pre-cache project statistics
      projectStore.getProjectStats();
      
      // Pre-cache active project if available
      if (projectStore.activeProject) {
        projectStore.getProject(projectStore.activeProject);
      }
      
      logger.info('ProjectStore cache warmed successfully');
    } catch (error) {
      logger.error('Failed to warm cache:', error);
    }
  }, [projectStore]);

  // Get cache performance metrics
  const getPerformanceMetrics = useCallback(() => {
    try {
      const stats = getCacheStats();
      if (!stats) return null;

      const metrics = {
        averageResponseTime: stats.averageResponseTime || 0,
        cacheHitRate: stats.hitRate || 0,
        totalOperations: (stats.hits || 0) + (stats.misses || 0),
        lastUpdate: new Date().toISOString()
      };

      setPerformanceMetrics(metrics);
      return metrics;
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      return null;
    }
  }, [getCacheStats]);

  // Monitor cache performance
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    logger.info('Started ProjectStore cache monitoring');

    const interval = setInterval(() => {
      getPerformanceMetrics();
    }, updateInterval);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
      logger.info('Stopped ProjectStore cache monitoring');
    };
  }, [isMonitoring, getPerformanceMetrics, updateInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    if (!enableMonitoring) return;

    const cleanup = startMonitoring();
    return cleanup;
  }, [enableMonitoring, startMonitoring]);

  // Initial stats load
  useEffect(() => {
    getCacheStats();
  }, [getCacheStats]);

  // Cache health check
  const getCacheHealth = useCallback(() => {
    const stats = getCacheStats();
    if (!stats) return 'unknown';

    const hitRate = stats.hitRate || 0;
    const memoryUsage = (stats.memorySize || 0) / (50 * 1024 * 1024); // 50MB limit

    if (hitRate >= 0.8 && memoryUsage <= 0.8) {
      return 'excellent';
    } else if (hitRate >= 0.6 && memoryUsage <= 0.9) {
      return 'good';
    } else if (hitRate >= 0.4 && memoryUsage <= 0.95) {
      return 'fair';
    } else {
      return 'poor';
    }
  }, [getCacheStats]);

  // Cache recommendations
  const getCacheRecommendations = useCallback(() => {
    const stats = getCacheStats();
    if (!stats) return [];

    const recommendations = [];
    const hitRate = stats.hitRate || 0;
    const memoryUsage = (stats.memorySize || 0) / (50 * 1024 * 1024);

    if (hitRate < 0.6) {
      recommendations.push({
        type: 'performance',
        message: 'Low cache hit rate. Consider warming cache or adjusting TTL settings.',
        priority: 'high'
      });
    }

    if (memoryUsage > 0.9) {
      recommendations.push({
        type: 'memory',
        message: 'High memory usage. Consider clearing cache or reducing cache size.',
        priority: 'high'
      });
    }

    if (stats.misses > stats.hits * 2) {
      recommendations.push({
        type: 'efficiency',
        message: 'High cache miss rate. Consider preloading frequently accessed data.',
        priority: 'medium'
      });
    }

    return recommendations;
  }, [getCacheStats]);

  // Cache optimization
  const optimizeCache = useCallback(async () => {
    try {
      logger.info('Optimizing ProjectStore cache...');
      
      // Clear old entries
      projectStore.cleanup();
      
      // Warm cache with current data
      await warmCache();
      
      // Refresh stats
      getCacheStats();
      
      logger.info('ProjectStore cache optimized');
    } catch (error) {
      logger.error('Failed to optimize cache:', error);
    }
  }, [projectStore, warmCache, getCacheStats]);

  // Cache debugging information
  const getCacheDebugInfo = useCallback(() => {
    const stats = getCacheStats();
    const health = getCacheHealth();
    const recommendations = getCacheRecommendations();

    return {
      stats,
      health,
      recommendations,
      isMonitoring,
      performanceMetrics,
      timestamp: new Date().toISOString()
    };
  }, [getCacheStats, getCacheHealth, getCacheRecommendations, isMonitoring, performanceMetrics]);

  // Memoized cache status
  const cacheStatus = useMemo(() => {
    const stats = cacheStats;
    if (!stats) return null;

    return {
      isHealthy: getCacheHealth() === 'excellent' || getCacheHealth() === 'good',
      hitRate: stats.hitRate || 0,
      memoryUsage: (stats.memorySize || 0) / (50 * 1024 * 1024),
      totalEntries: stats.memoryEntries || 0,
      health: getCacheHealth(),
      recommendations: getCacheRecommendations()
    };
  }, [cacheStats, getCacheHealth, getCacheRecommendations]);

  return {
    // State
    cacheStats,
    performanceMetrics,
    isMonitoring,
    cacheStatus,
    
    // Actions
    getCacheStats,
    clearCache,
    warmCache,
    getPerformanceMetrics,
    startMonitoring,
    stopMonitoring,
    optimizeCache,
    getCacheDebugInfo,
    
    // Utilities
    getCacheHealth,
    getCacheRecommendations
  };
};

/**
 * Hook for cache performance tracking
 */
export const useProjectStoreCachePerformance = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    operations: []
  });

  const projectStore = useProjectStore();

  // Track operation performance
  const trackOperation = useCallback((operation, startTime, endTime, fromCache = false) => {
    const duration = endTime - startTime;
    
    setMetrics(prev => ({
      ...prev,
      loadTime: prev.loadTime + duration,
      cacheHits: fromCache ? prev.cacheHits + 1 : prev.cacheHits,
      cacheMisses: fromCache ? prev.cacheMisses : prev.cacheMisses + 1,
      operations: [...prev.operations.slice(-9), {
        operation,
        duration,
        fromCache,
        timestamp: new Date().toISOString()
      }]
    }));
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const totalOperations = metrics.cacheHits + metrics.cacheMisses;
    const hitRate = totalOperations > 0 ? metrics.cacheHits / totalOperations : 0;
    const averageLoadTime = metrics.operations.length > 0 
      ? metrics.operations.reduce((sum, op) => sum + op.duration, 0) / metrics.operations.length 
      : 0;

    return {
      totalOperations,
      hitRate,
      averageLoadTime,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      recentOperations: metrics.operations
    };
  }, [metrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      loadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      operations: []
    });
  }, []);

  return {
    metrics,
    trackOperation,
    getPerformanceSummary,
    resetMetrics
  };
};

/**
 * Hook for cache warming strategies
 */
export const useProjectStoreCacheWarming = () => {
  const projectStore = useProjectStore();

  // Warm cache with user's most accessed projects
  const warmUserProjects = useCallback(async () => {
    try {
      logger.info('Warming cache with user projects...');
      
      // Load all projects
      await projectStore.loadProjects();
      
      // Pre-cache project statistics
      projectStore.getProjectStats();
      
      logger.info('User projects cache warmed');
    } catch (error) {
      logger.error('Failed to warm user projects cache:', error);
    }
  }, [projectStore]);

  // Warm cache with active project data
  const warmActiveProject = useCallback(async () => {
    try {
      if (!projectStore.activeProject) return;
      
      logger.info('Warming cache with active project...');
      
      // Pre-cache active project
      projectStore.getProject(projectStore.activeProject);
      
      logger.info('Active project cache warmed');
    } catch (error) {
      logger.error('Failed to warm active project cache:', error);
    }
  }, [projectStore]);

  // Warm cache with frequently accessed data
  const warmFrequentData = useCallback(async () => {
    try {
      logger.info('Warming cache with frequent data...');
      
      // Warm project list
      await projectStore.loadProjects();
      
      // Warm statistics
      projectStore.getProjectStats();
      
      // Warm active project if available
      if (projectStore.activeProject) {
        projectStore.getProject(projectStore.activeProject);
      }
      
      logger.info('Frequent data cache warmed');
    } catch (error) {
      logger.error('Failed to warm frequent data cache:', error);
    }
  }, [projectStore]);

  // Smart cache warming based on usage patterns
  const smartWarmCache = useCallback(async () => {
    try {
      logger.info('Starting smart cache warming...');
      
      // Load projects first
      await projectStore.loadProjects();
      
      // Warm statistics
      projectStore.getProjectStats();
      
      // Warm active project
      if (projectStore.activeProject) {
        projectStore.getProject(projectStore.activeProject);
      }
      
      // Warm recently accessed projects (if metadata available)
      const projects = Object.values(projectStore.projects);
      const recentlyAccessed = projects
        .filter(p => p.metadata?.lastAccessed)
        .sort((a, b) => new Date(b.metadata.lastAccessed) - new Date(a.metadata.lastAccessed))
        .slice(0, 5); // Top 5 recently accessed
      
      recentlyAccessed.forEach(project => {
        projectStore.getProject(project.id);
      });
      
      logger.info('Smart cache warming completed');
    } catch (error) {
      logger.error('Failed to perform smart cache warming:', error);
    }
  }, [projectStore]);

  return {
    warmUserProjects,
    warmActiveProject,
    warmFrequentData,
    smartWarmCache
  };
};

export default useProjectStoreCache;
