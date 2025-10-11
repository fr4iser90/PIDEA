import { logger } from "@/infrastructure/logging/Logger";
/**
 * SidebarLeft - Generic left sidebar container for different application modes
 * 
 * This component provides a generic left sidebar that:
 * - Manages IDE connections (generic, not chat-specific)
 * - Contains different panels based on application mode (chat, code, git, etc.)
 * - Handles sidebar visibility and toggle functionality
 * - Provides event-driven communication with other components
 * 
 * @class SidebarLeft
 */
import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import ChatPanelComponent from './chat/sidebar-left/ChatPanelComponent.jsx';
import IDEStartModal from './ide/IDEStartModal.jsx';
import '@/scss/base/_sidebar-left.scss';

function SidebarLeft({ eventBus, activePort, onActivePortChange, mode = 'chat' }) {
  logger.info('🔍 SidebarLeft RENDERING!');
  
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showIDEStartModal, setShowIDEStartModal] = useState(false);
  const { isAuthenticated } = useAuthStore();
  
  // Use IDEStore instead of local state
  const { availableIDEs, loadAvailableIDEs } = useIDEStore();

  // EventBus-Listener for sidebar-level events
  useEffect(() => {
    if (!eventBus) return;
    
    const handleIDEListUpdated = (data) => {
      // IDEContext will handle IDE loading, don't duplicate here
      logger.info('IDE list updated event received, IDEContext will handle loading');
    };
    
    const handleActiveIDEChanged = (data) => {
      if (onActivePortChange) onActivePortChange(data.port);
    };
    
    const handleLeftSidebarToggle = () => {
      const sidebar = document.querySelector('.sidebar-left');
      if (sidebar) {
        const isVisible = sidebar.style.display !== 'none';
        sidebar.style.display = isVisible ? 'none' : 'flex';
        logger.info('Left Sidebar toggled:', isVisible ? 'hidden' : 'visible');
      } else {
        logger.info('Left Sidebar element not found');
      }
    };

    // IDE Management Events
    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    eventBus.on('sidebar-left-toggle', handleLeftSidebarToggle);
    
    return () => {
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
      eventBus.off('sidebar-left-toggle', handleLeftSidebarToggle);
    };
  }, [eventBus, onActivePortChange]);

  // Load IDE list on component mount ONLY if authenticated
  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      // IDEContext will handle IDE loading, don't duplicate here
      logger.info('User authenticated, IDEContext will handle IDE loading');
    }
  }, [isAuthenticated]);

  const handleNewIDE = () => {
    setShowIDEStartModal(true);
    eventBus.emit('sidebar-left:new-ide');
  };
  
  const handleIDEStartSuccess = (ideData) => {
    logger.info('IDE started successfully:', ideData);
    setShowIDEStartModal(false);
    
    // Switch to the new IDE if it has a port
    if (ideData.port && onActivePortChange) {
      onActivePortChange(ideData.port);
    }
    
    // Refresh IDE list
    loadAvailableIDEs();
    
    eventBus.emit('sidebar-left:ide-started', { ideData });
  };
  
  const handleIDEStartModalClose = () => {
    setShowIDEStartModal(false);
  };
  
  const handleSwitchDirectlyToIDE = async (port) => {
    try {
      // Use IDEStore.switchIDE() instead of direct API call to get caching
      const { switchIDE } = useIDEStore.getState();
      await switchIDE(port, 'sidebar');
      if (onActivePortChange) onActivePortChange(port);
      
      // Make IDE list refresh asynchronous to avoid blocking the switch
      setTimeout(() => {
        loadAvailableIDEs(); // IDEStore handles this - now async
      }, 100);
      
      eventBus.emit('sidebar-left:ide-switched', { port });
    } catch (error) {
      logger.error('Fehler beim Umschalten der IDE:', error.message, error.stack);
    }
  };
  
  const handleStopIDE = (port) => {
    if (window.confirm(`IDE auf Port ${port} wirklich stoppen?`)) {
      eventBus.emit('sidebar-left:ide:stop', { port });
    }
  };

  // IDE Icons mapping
  const getIDEIcon = (ideType) => {
    switch (ideType?.toLowerCase()) {
      case 'cursor':
        return '🎯'; // Cursor icon
      case 'vscode':
        return '💻'; // VS Code icon
      case 'windsurf':
        return '🏄'; // Windsurf icon
      case 'jetbrains':
        return '🛠️'; // JetBrains icon
      case 'sublime':
        return '📝'; // Sublime icon
      default:
        return '🖥️'; // Default IDE icon
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

  const handleSessionSelect = (sessionId) => {
    setCurrentSessionId(sessionId);
    eventBus.emit('sidebar-left:session-selected', { sessionId });
  };

  // Render the appropriate panel based on mode
  const renderPanel = () => {
    switch (mode) {
      case 'chat':
        return (
          <ChatPanelComponent 
            eventBus={eventBus}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
          />
        );
      case 'code':
        return <div className="code-panel">Code Panel (TODO)</div>;
      case 'git':
        return <div className="git-panel">Git Panel (TODO)</div>;
      default:
        return <div className="default-panel">Default Panel</div>;
    }
  };

  return (
    <div className="sidebar-left">
      <div className="sidebar-left-content">
      {/* IDE Management Section - Always visible */}
      <div className="ide-management-section">
        <div className="ide-header">
          <h4>🖥️ IDE Management</h4>
          <button 
            className="btn-icon" 
            title="Neue IDE starten" 
            onClick={handleNewIDE}
          >
            🚀
          </button>
        </div>
        <div className="ide-list">
          {availableIDEs.length === 0 ? (
            <div className="no-ides">Keine IDEs verfügbar</div>
          ) : (
            availableIDEs.map(ide => (
              <div
                className={`ide-item${ide.active === true ? ' active' : ''}`}
                key={ide.port}
                onClick={e => {
                  if (!e.target.classList.contains('ide-stop-btn')) {
                    handleSwitchDirectlyToIDE(ide.port);
                  }
                }}
              >
                <div className="ide-info">
                  <div className="ide-title">
                    <span className="ide-icon">{getIDEIcon(ide.ideType)}</span>
                    <span className="ide-name">{getIDEName(ide.ideType)}</span>
                    <span className="ide-port">Port {ide.port}</span>
                    <span className="ide-project-name">
                      {ide.projectName || (ide.workspacePath ? ide.workspacePath.split('/').pop() : 'Unbekanntes Projekt')}
                    </span>
                  </div>
                  <div className="ide-meta">
                    <span className={`ide-status ${ide.status}`}>{ide.status}</span>
                    {ide.workspacePath && (
                      <span className="ide-root-folder">
                        {ide.workspacePath}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ide-actions">
                  {ide.active && <span className="active-indicator">✓</span>}
                  <button
                    className="ide-refresh-btn"
                    title="Workspace neu erkennen"
                    onClick={async e => {
                      e.stopPropagation();
                      try {
                        const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
                        await apiCall(`/api/ide/workspace-detection/${ide.port}`, { method: 'POST' });
                        loadAvailableIDEs(); // IDEStore handles this
                      } catch (err) {
                        alert('Fehler beim Workspace-Update: ' + (err?.message || err));
                      }
                    }}
                  >
                    🔄
                  </button>
                  <button
                    className="ide-stop-btn"
                    title="IDE stoppen"
                    onClick={e => {
                      e.stopPropagation();
                      handleStopIDE(ide.port);
                    }}
                  >
                    ⏹️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mode-specific Panel */}
      <div className="sidebar-panel-container">
        {renderPanel()}
      </div>
      </div>
      
      {/* IDE Start Modal */}
      <IDEStartModal
        isOpen={showIDEStartModal}
        onClose={handleIDEStartModalClose}
        onSuccess={handleIDEStartSuccess}
      />
    </div>
  );
}

export default SidebarLeft;