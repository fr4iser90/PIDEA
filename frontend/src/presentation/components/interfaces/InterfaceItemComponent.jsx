/**
 * InterfaceItemComponent - Individual interface item for sidebar
 * 
 * This component displays individual interface items with status indicators,
 * actions, and metadata display.
 */

import React, { useState } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';

const InterfaceItemComponent = ({ interface: interfaceItem, isActive, onClick }) => {
  const { switchIDE } = useIDEStore();
  const [showActions, setShowActions] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const handleStart = async (e) => {
    e.stopPropagation();
    setIsStarting(true);
    
    try {
      await switchIDE(interfaceItem.port, 'sidebar');
      logger.info('Interface started:', interfaceItem.port);
    } catch (error) {
      logger.error('Failed to start interface:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async (e) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to stop interface on port ${interfaceItem.port}?`)) {
      return;
    }

    setIsStopping(true);
    
    try {
      // TODO: Implement stop functionality
      logger.info('Interface stop requested:', interfaceItem.port);
    } catch (error) {
      logger.error('Failed to stop interface:', error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleRestart = async (e) => {
    e.stopPropagation();
    
    try {
      // TODO: Implement restart functionality
      logger.info('Interface restart requested:', interfaceItem.port);
    } catch (error) {
      logger.error('Failed to restart interface:', error);
    }
  };

  const handleMouseEnter = () => {
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    setShowActions(false);
  };

  const getInterfaceIcon = (ideType) => {
    switch (ideType?.toLowerCase()) {
      case 'cursor':
        return '🎯';
      case 'vscode':
        return '💻';
      case 'windsurf':
        return '🏄';
      case 'jetbrains':
        return '🛠️';
      case 'sublime':
        return '📝';
      default:
        return '🖥️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'starting':
        return 'status-starting';
      case 'stopping':
        return 'status-stopping';
      case 'error':
        return 'status-error';
      default:
        return 'status-default';
    }
  };

  const getIDEName = (ideType) => {
    switch (ideType?.toLowerCase()) {
      case 'cursor':
        return 'Cursor';
      case 'vscode':
        return 'VS Code';
      case 'windsurf':
        return 'Windsurf';
      case 'jetbrains':
        return 'JetBrains';
      case 'sublime':
        return 'Sublime';
      default:
        return 'IDE';
    }
  };

  return (
    <div
      className={`interface-item ${isActive ? 'active' : ''} ${getStatusColor(interfaceItem.status || 'stopped')}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="interface-info">
        <div className="interface-header">
          <div className="interface-icon">
            {getInterfaceIcon(interfaceItem.ideType)}
          </div>
          <div className="interface-title">
            <h4>{getIDEName(interfaceItem.ideType)}</h4>
            <div className="interface-meta">
              <span className={`interface-status ${getStatusColor(interfaceItem.status || 'stopped')}`}>
                {interfaceItem.status || 'stopped'}
              </span>
              <span className="interface-port">Port: {interfaceItem.port}</span>
            </div>
          </div>
        </div>
        
        <div className="interface-details">
          <p className="interface-path">
            📁 {interfaceItem.workspacePath || 'No workspace'}
          </p>
          {interfaceItem.version && (
            <p className="interface-version">
              Version: {interfaceItem.version}
            </p>
          )}
        </div>
      </div>

      <div className={`interface-actions ${showActions ? 'visible' : ''}`}>
        {interfaceItem.status === 'stopped' && (
          <button
            onClick={handleStart}
            className="btn-action btn-start"
            title="Start interface"
            disabled={isStarting}
          >
            {isStarting ? '⏳' : '▶️'}
          </button>
        )}
        
        {interfaceItem.status === 'running' && (
          <button
            onClick={handleStop}
            className="btn-action btn-stop"
            title="Stop interface"
            disabled={isStopping}
          >
            {isStopping ? '⏳' : '⏹️'}
          </button>
        )}
        
        <button
          onClick={handleRestart}
          className="btn-action btn-restart"
          title="Restart interface"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

export default InterfaceItemComponent;
