/**
 * StatusBadge Component
 * Real-time IDE status display with visual indicators and tooltips
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import '@/css/components/ide/status-badge.css';

const StatusBadge = ({ 
  className = '', 
  showTooltip = true, 
  onClick,
  compact = false,
  showPort = true,
  showWorkspace = false
}) => {
  const { activePort, availableIDEs, isLoading, error, refresh } = useIDEStore();
  const [status, setStatus] = useState('unknown');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Status detection logic
  const detectStatus = useCallback(() => {
    if (!activePort) {
      setStatus('disconnected');
      return;
    }

    const activeIDE = availableIDEs.find(ide => ide.port === activePort);
    if (!activeIDE) {
      setStatus('unknown');
      return;
    }

    setStatus(activeIDE.status || 'unknown');
    setLastUpdate(new Date().toISOString());
  }, [activePort, availableIDEs]);

  // Refresh status manually
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refresh();
      detectStatus();
    } catch (error) {
      logger.error('Error refreshing status:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, detectStatus, refresh]);

  // Handle click events
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      onClick(e);
    } else {
      handleRefresh();
    }
  }, [onClick, handleRefresh]);

  // Auto-detect status changes
  useEffect(() => {
    detectStatus();
  }, [detectStatus]);

  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'running':
        return { icon: '🟢', color: 'green', text: 'Running' };
      case 'starting':
        return { icon: '🟡', color: 'yellow', text: 'Starting' };
      case 'stopped':
        return { icon: '🔴', color: 'red', text: 'Stopped' };
      case 'error':
        return { icon: '🔴', color: 'red', text: 'Error' };
      case 'disconnected':
        return { icon: '⚪', color: 'gray', text: 'Disconnected' };
      default:
        return { icon: '⚪', color: 'gray', text: 'Unknown' };
    }
  };

  const statusInfo = getStatusIndicator();
  const activeIDE = availableIDEs.find(ide => ide.port === activePort);

  // Get workspace display name
  const getWorkspaceDisplayName = (ide) => {
    if (!ide?.workspacePath) return 'No workspace';
    const pathParts = ide.workspacePath.split('/');
    return pathParts[pathParts.length - 1] || 'Unknown workspace';
  };

  // Get IDE display name
  const getIDEDisplayName = (ide) => {
    if (ide?.metadata?.displayName) {
      return ide.metadata.displayName;
    }
    if (ide?.ideType) {
      return ide.ideType.charAt(0).toUpperCase() + ide.ideType.slice(1);
    }
    return `IDE ${ide?.port || 'Unknown'}`;
  };

  // Build tooltip content
  const getTooltipContent = () => {
    if (!showTooltip) return '';
    
    const details = [];
    details.push(`Status: ${statusInfo.text}`);
    
    if (activeIDE) {
      details.push(`IDE: ${getIDEDisplayName(activeIDE)}`);
      if (showPort) {
        details.push(`Port: ${activeIDE.port}`);
      }
      if (showWorkspace && activeIDE.workspacePath) {
        details.push(`Workspace: ${getWorkspaceDisplayName(activeIDE)}`);
      }
    }
    
    if (lastUpdate) {
      details.push(`Last updated: ${new Date(lastUpdate).toLocaleTimeString()}`);
    }
    
    if (error) {
      details.push(`Error: ${error}`);
    }
    
    return details.join('\n');
  };

  return (
    <div 
      className={`status-badge ${className} ${status} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      title={getTooltipContent()}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <span className={`status-indicator ${statusInfo.color}`}>
        {statusInfo.icon}
      </span>
      
      {!compact && (
        <span className="status-text">
          {statusInfo.text}
        </span>
      )}
      
      {showPort && activePort && !compact && (
        <span className="port-info">
          :{activePort}
        </span>
      )}
      
      {isRefreshing && (
        <span className="refresh-spinner" title="Refreshing...">
          ⟳
        </span>
      )}
      
      {error && (
        <span className="error-indicator" title={`Error: ${error}`}>
          ⚠️
        </span>
      )}
      
      {isLoading && (
        <span className="loading-indicator" title="Loading...">
          ⏳
        </span>
      )}

      {/* Detailed status popup */}
      {showDetails && !compact && (
        <div className="status-details-popup">
          <div className="popup-header">
            <span className="popup-title">IDE Status</span>
            <span className="popup-status">{statusInfo.text}</span>
          </div>
          
          {activeIDE && (
            <div className="popup-content">
              <div className="popup-item">
                <span className="popup-label">IDE:</span>
                <span className="popup-value">{getIDEDisplayName(activeIDE)}</span>
              </div>
              
              <div className="popup-item">
                <span className="popup-label">Port:</span>
                <span className="popup-value">{activeIDE.port}</span>
              </div>
              
              {activeIDE.workspacePath && (
                <div className="popup-item">
                  <span className="popup-label">Workspace:</span>
                  <span className="popup-value">{getWorkspaceDisplayName(activeIDE)}</span>
                </div>
              )}
              
              {lastUpdate && (
                <div className="popup-item">
                  <span className="popup-label">Last Update:</span>
                  <span className="popup-value">{new Date(lastUpdate).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="popup-footer">
            <button 
              className="popup-refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBadge;
