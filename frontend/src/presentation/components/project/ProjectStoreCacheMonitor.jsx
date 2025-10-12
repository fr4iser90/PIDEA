/**
 * Project Store Cache Monitor Component
 * Displays cache statistics, performance metrics, and provides cache management controls
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useProjectStoreCache, useProjectStoreCachePerformance, useProjectStoreCacheWarming } from '@/hooks/useProjectStoreCache';

const ProjectStoreCacheMonitor = ({ onCacheAction, showDetails = false }) => {
  // Hooks
  const {
    cacheStats,
    performanceMetrics,
    isMonitoring,
    cacheStatus,
    getCacheStats,
    clearCache,
    warmCache,
    getPerformanceMetrics,
    startMonitoring,
    stopMonitoring,
    optimizeCache,
    getCacheDebugInfo
  } = useProjectStoreCache({
    enableMonitoring: true,
    updateInterval: 10000 // 10 seconds
  });

  const { getPerformanceSummary, resetMetrics } = useProjectStoreCachePerformance();
  const { smartWarmCache, warmFrequentData } = useProjectStoreCacheWarming();

  // Local state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isWarming, setIsWarming] = useState(false);

  // Performance summary
  const performanceSummary = getPerformanceSummary();

  // Handle cache actions
  const handleClearCache = async () => {
    try {
      await clearCache();
      onCacheAction?.('clear');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  };

  const handleWarmCache = async () => {
    try {
      setIsWarming(true);
      await warmCache();
      onCacheAction?.('warm');
    } catch (error) {
      logger.error('Failed to warm cache:', error);
    } finally {
      setIsWarming(false);
    }
  };

  const handleSmartWarmCache = async () => {
    try {
      setIsWarming(true);
      await smartWarmCache();
      onCacheAction?.('smartWarm');
    } catch (error) {
      logger.error('Failed to smart warm cache:', error);
    } finally {
      setIsWarming(false);
    }
  };

  const handleOptimizeCache = async () => {
    try {
      setIsOptimizing(true);
      await optimizeCache();
      onCacheAction?.('optimize');
    } catch (error) {
      logger.error('Failed to optimize cache:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleResetMetrics = () => {
    resetMetrics();
    onCacheAction?.('resetMetrics');
  };

  // Render cache health indicator
  const renderHealthIndicator = () => {
    if (!cacheStatus) return null;

    const healthColors = {
      excellent: 'text-green-600',
      good: 'text-green-500',
      fair: 'text-yellow-500',
      poor: 'text-red-500',
      unknown: 'text-gray-500'
    };

    const healthIcons = {
      excellent: '🟢',
      good: '🟢',
      fair: '🟡',
      poor: '🔴',
      unknown: '⚪'
    };

    return (
      <div className="health-indicator">
        <span className={`health-status ${healthColors[cacheStatus.health]}`}>
          {healthIcons[cacheStatus.health]} {cacheStatus.health.toUpperCase()}
        </span>
        <span className="health-details">
          Hit Rate: {(cacheStatus.hitRate * 100).toFixed(1)}% | 
          Memory: {(cacheStatus.memoryUsage * 100).toFixed(1)}%
        </span>
      </div>
    );
  };

  // Render cache statistics
  const renderCacheStats = () => {
    if (!cacheStats) return null;

    return (
      <div className="cache-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Cache Hits:</span>
            <span className="stat-value">{cacheStats.hits || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cache Misses:</span>
            <span className="stat-value">{cacheStats.misses || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hit Rate:</span>
            <span className="stat-value">{((cacheStats.hitRate || 0) * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Memory Usage:</span>
            <span className="stat-value">
              {((cacheStats.memorySize || 0) / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Entries:</span>
            <span className="stat-value">{cacheStats.memoryEntries || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Response:</span>
            <span className="stat-value">{cacheStats.averageResponseTime?.toFixed(1) || 0}ms</span>
          </div>
        </div>
      </div>
    );
  };

  // Render performance metrics
  const renderPerformanceMetrics = () => {
    if (!performanceSummary) return null;

    return (
      <div className="performance-metrics">
        <h4>Performance Metrics</h4>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Total Operations:</span>
            <span className="metric-value">{performanceSummary.totalOperations}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Cache Hit Rate:</span>
            <span className="metric-value">{(performanceSummary.hitRate * 100).toFixed(1)}%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Avg Load Time:</span>
            <span className="metric-value">{performanceSummary.averageLoadTime.toFixed(1)}ms</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Cache Hits:</span>
            <span className="metric-value">{performanceSummary.cacheHits}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Cache Misses:</span>
            <span className="metric-value">{performanceSummary.cacheMisses}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render recommendations
  const renderRecommendations = () => {
    if (!cacheStatus?.recommendations?.length) return null;

    return (
      <div className="recommendations">
        <h4>Recommendations</h4>
        {cacheStatus.recommendations.map((rec, index) => (
          <div key={index} className={`recommendation ${rec.priority}`}>
            <span className="recommendation-type">{rec.type}:</span>
            <span className="recommendation-message">{rec.message}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render cache controls
  const renderCacheControls = () => {
    return (
      <div className="cache-controls">
        <h4>Cache Management</h4>
        <div className="controls-grid">
          <button
            onClick={handleClearCache}
            className="btn btn-danger btn-sm"
            disabled={isOptimizing || isWarming}
          >
            Clear Cache
          </button>
          
          <button
            onClick={handleWarmCache}
            className="btn btn-primary btn-sm"
            disabled={isOptimizing || isWarming}
          >
            {isWarming ? 'Warming...' : 'Warm Cache'}
          </button>
          
          <button
            onClick={handleSmartWarmCache}
            className="btn btn-secondary btn-sm"
            disabled={isOptimizing || isWarming}
          >
            {isWarming ? 'Smart Warming...' : 'Smart Warm'}
          </button>
          
          <button
            onClick={handleOptimizeCache}
            className="btn btn-success btn-sm"
            disabled={isOptimizing || isWarming}
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize'}
          </button>
          
          <button
            onClick={handleResetMetrics}
            className="btn btn-outline btn-sm"
          >
            Reset Metrics
          </button>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn btn-outline btn-sm"
          >
            {showAdvanced ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>
    );
  };

  // Render monitoring controls
  const renderMonitoringControls = () => {
    return (
      <div className="monitoring-controls">
        <h4>Monitoring</h4>
        <div className="monitoring-status">
          <span className={`monitoring-indicator ${isMonitoring ? 'active' : 'inactive'}`}>
            {isMonitoring ? '🟢 Monitoring Active' : '🔴 Monitoring Stopped'}
          </span>
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="btn btn-sm btn-outline"
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
      </div>
    );
  };

  // Render advanced details
  const renderAdvancedDetails = () => {
    if (!showAdvanced) return null;

    const debugInfo = getCacheDebugInfo();

    return (
      <div className="advanced-details">
        <h4>Advanced Details</h4>
        <div className="debug-info">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="project-store-cache-monitor">
      <div className="cache-monitor-header">
        <h3>Project Store Cache Monitor</h3>
        {renderHealthIndicator()}
      </div>

      <div className="cache-monitor-content">
        {renderCacheStats()}
        {renderPerformanceMetrics()}
        {renderRecommendations()}
        {renderCacheControls()}
        {renderMonitoringControls()}
        {renderAdvancedDetails()}
      </div>
    </div>
  );
};

export default ProjectStoreCacheMonitor;
