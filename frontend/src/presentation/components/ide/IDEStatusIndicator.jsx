/**
 * IDEStatusIndicator Component
 * Enhanced status display with real-time updates and animations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import { useRefreshService } from '@/hooks/useRefreshService';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import '@/scss/components/_ide-status-indicator.scss';;

const IDEStatusIndicator = ({ 
  className = '',
  showHistory = true,
  showMetrics = true,
  autoRefresh = true,
  refreshInterval = 5000,
  onStatusChange
}) => {
  const { activePort, availableIDEs, isLoading, error } = useIDEStore();
  const [status, setStatus] = useState('unknown');
  const [statusHistory, setStatusHistory] = useState([]);
  const [metrics, setMetrics] = useState({
    uptime: 0,
    lastResponse: null,
    responseTime: 0,
    errorCount: 0
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const statusRef = useRef(status);

  // Update status reference
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Detect status changes
  const detectStatus = useCallback(() => {
    if (!activePort) {
      updateStatus('disconnected');
      return;
    }

    const activeIDE = availableIDEs.find(ide => ide.port === activePort);
    if (!activeIDE) {
      updateStatus('unknown');
      return;
    }

    updateStatus(activeIDE.status || 'unknown');
  }, [activePort, availableIDEs]);

  // Update status with animation and history
  const updateStatus = useCallback((newStatus) => {
    const previousStatus = statusRef.current;
    
    if (previousStatus !== newStatus) {
      setIsAnimating(true);
      
      // Add to history
      if (showHistory) {
        setStatusHistory(prev => [
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            previousStatus
          },
          ...prev.slice(0, 9) // Keep last 10 entries
        ]);
      }
      
      // Update metrics
      if (showMetrics) {
        setMetrics(prev => ({
          ...prev,
          lastResponse: new Date().toISOString(),
          errorCount: newStatus === 'error' ? prev.errorCount + 1 : prev.errorCount
        }));
      }
      
      // Call status change callback
      if (onStatusChange) {
        onStatusChange(newStatus, previousStatus);
      }
      
      setStatus(newStatus);
      setLastUpdate(new Date().toISOString());
      
      // Reset animation after delay
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [showHistory, showMetrics, onStatusChange]);

  // ✅ NEW: Integrate with RefreshService
  const { forceRefresh, getStats } = useRefreshService('ide-status', {
    fetchData: async () => {
      try {
        detectStatus();
        return { status: statusRef.current };
      } catch (error) {
        logger.error('Failed to detect IDE status:', error);
        throw error;
      }
    },
    updateData: (data) => {
      if (data && data.status) {
        setStatus(data.status);
        setIsLoading(false);
        setError(null);
      }
    }
  });

  // Calculate uptime
  const calculateUptime = useCallback(() => {
    if (!showMetrics || status !== 'running') return 0;
    
    const runningEntry = statusHistory.find(entry => entry.status === 'running');
    if (!runningEntry) return 0;
    
    return Date.now() - new Date(runningEntry.timestamp).getTime();
  }, [statusHistory, status, showMetrics]);

  // Format uptime
  const formatUptime = useCallback((ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Get status indicator
  const getStatusIndicator = useCallback(() => {
    switch (status) {
      case 'running':
        return { 
          icon: '🟢', 
          color: 'green', 
          text: 'Running',
          animation: 'pulse'
        };
      case 'starting':
        return { 
          icon: '🟡', 
          color: 'yellow', 
          text: 'Starting',
          animation: 'spin'
        };
      case 'stopped':
        return { 
          icon: '🔴', 
          color: 'red', 
          text: 'Stopped',
          animation: 'none'
        };
      case 'error':
        return { 
          icon: '🔴', 
          color: 'red', 
          text: 'Error',
          animation: 'shake'
        };
      case 'disconnected':
        return { 
          icon: '⚪', 
          color: 'gray', 
          text: 'Disconnected',
          animation: 'none'
        };
      default:
        return { 
          icon: '⚪', 
          color: 'gray', 
          text: 'Unknown',
          animation: 'none'
        };
    }
  }, [status]);

  // ✅ REMOVED: Old auto-refresh - now handled by RefreshService
  useEffect(() => {
    // Auto-refresh now handled by RefreshService
    logger.info('IDE status refresh now handled by RefreshService');
  }, [autoRefresh, refreshInterval, detectStatus]);

  // Initial status detection
  useEffect(() => {
    detectStatus();
  }, [detectStatus]);

  // Update uptime periodically
  useEffect(() => {
    if (status === 'running' && showMetrics) {
      const uptimeInterval = setInterval(() => {
        setMetrics(prev => ({
          ...prev,
          uptime: calculateUptime()
        }));
      }, 1000);
      
      return () => clearInterval(uptimeInterval);
    }
  }, [status, showMetrics, calculateUptime]);

  const statusInfo = getStatusIndicator();
  const activeIDE = availableIDEs.find(ide => ide.port === activePort);

  return (
    <div className={`ide-status-indicator ${className} ${status} ${isAnimating ? 'animating' : ''}`}>
      {/* Main Status Display */}
      <div className="status-main">
        <span 
          className={`status-icon ${statusInfo.color} ${statusInfo.animation}`}
          title={`Status: ${statusInfo.text}`}
        >
          {statusInfo.icon}
        </span>
        
        <div className="status-info">
          <div className="status-text">{statusInfo.text}</div>
          {activeIDE && (
            <div className="status-details">
              <span className="ide-name">{activeIDE.ideType || 'IDE'}</span>
              <span className="port-info">:{activeIDE.port}</span>
            </div>
          )}
        </div>
        
        {isLoading && (
          <span className="loading-indicator" title="Loading...">
            ⏳
          </span>
        )}
        
        {error && (
          <span className="error-indicator" title={`Error: ${error}`}>
            ⚠️
          </span>
        )}
      </div>

      {/* Metrics Display */}
      {showMetrics && (
        <div className="status-metrics">
          {status === 'running' && (
            <div className="metric-item">
              <span className="metric-label">Uptime:</span>
              <span className="metric-value">{formatUptime(metrics.uptime)}</span>
            </div>
          )}
          
          {metrics.lastResponse && (
            <div className="metric-item">
              <span className="metric-label">Last Response:</span>
              <span className="metric-value">
                {new Date(metrics.lastResponse).toLocaleTimeString()}
              </span>
            </div>
          )}
          
          {metrics.errorCount > 0 && (
            <div className="metric-item error">
              <span className="metric-label">Errors:</span>
              <span className="metric-value">{metrics.errorCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Status History */}
      {showHistory && statusHistory.length > 0 && (
        <div className="status-history">
          <div className="history-header">
            <span className="history-title">Recent Status Changes</span>
          </div>
          <div className="history-list">
            {statusHistory.slice(0, 5).map((entry, index) => (
              <div key={index} className="history-item">
                <span className={`history-status ${entry.status}`}>
                  {entry.status === 'running' && '🟢'}
                  {entry.status === 'starting' && '🟡'}
                  {entry.status === 'stopped' && '🔴'}
                  {entry.status === 'error' && '🔴'}
                  {entry.status === 'disconnected' && '⚪'}
                  {entry.status === 'unknown' && '⚪'}
                </span>
                <span className="history-text">{entry.status}</span>
                <span className="history-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="last-update">
          <span className="update-label">Last updated:</span>
          <span className="update-time">
            {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default IDEStatusIndicator;
