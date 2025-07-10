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
import ChatPanelComponent from './chat/sidebar-left/ChatPanelComponent.jsx';
import '@/css/global/sidebar-left.css';

function SidebarLeft({ eventBus, activePort, onActivePortChange, mode = 'chat' }) {
  console.log('🔍 SidebarLeft RENDERING!');
  
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [availableIDEs, setAvailableIDEs] = useState([]);
  const { isAuthenticated } = useAuthStore();

  // EventBus-Listener for sidebar-level events
  useEffect(() => {
    if (!eventBus) return;
    
    const handleIDEListUpdated = (data) => {
      if (data.ides) {
        setAvailableIDEs(data.ides);
      } else {
        refreshIDEList();
      }
    };
    
    const handleActiveIDEChanged = (data) => {
      if (onActivePortChange) onActivePortChange(data.port);
    };
    
    const handleLeftSidebarToggle = () => {
      const sidebar = document.querySelector('.sidebar-left');
      if (sidebar) {
        const isVisible = sidebar.style.display !== 'none';
        sidebar.style.display = isVisible ? 'none' : 'flex';
        console.log('Left Sidebar toggled:', isVisible ? 'hidden' : 'visible');
      } else {
        console.log('Left Sidebar element not found');
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

  // Load IDE list on component mount
  useEffect(() => {
    refreshIDEList();
  }, []);

  const handleNewIDE = () => eventBus.emit('sidebar-left:new-ide');
  
  const handleSwitchDirectlyToIDE = async (port) => {
    try {
      const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
      await apiCall(`/api/ide/switch/${port}`, { method: 'POST' });
      if (onActivePortChange) onActivePortChange(port);
      refreshIDEList();
      eventBus.emit('sidebar-left:ide-switched', { port });
    } catch (error) {
      console.error('Fehler beim Umschalten der IDE:', error);
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

  const refreshIDEList = async () => {
    if (!isAuthenticated) return;
    try {
      const { apiCall } = await import('@/infrastructure/repositories/APIChatRepository.jsx');
      const result = await apiCall('/api/ide/available');
      if (result.success) {
        setAvailableIDEs(result.data);
      }
    } catch (error) {
      console.error('Error refreshing IDE list:', error);
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
                        refreshIDEList();
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
    </div>
  );
}

export default SidebarLeft;