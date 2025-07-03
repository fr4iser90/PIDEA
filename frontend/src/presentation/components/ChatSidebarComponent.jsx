/**
 * ChatSidebarComponent - Manages the chat session sidebar for the chat mode
 * 
 * This component provides a dedicated sidebar for chat functionality including:
 * - Chat session management (create, select, delete)
 * - Session list display with metadata
 * - Quick actions (export, clear)
 * - Event-driven communication with other components
 * 
 * @class ChatSidebarComponent
 * @example
 * const chatSidebar = new ChatSidebarComponent('chatSidebarContent', eventBus);
 */
import React, { useState, useEffect } from 'react';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';

function ChatSidebarComponent({ eventBus, activePort, onActivePortChange }) {
  console.log('🔍 ChatSidebarComponent RENDERING!');
  
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [availableIDEs, setAvailableIDEs] = useState([]);
  const { isAuthenticated } = useAuthStore();

  // EventBus-Listener
  useEffect(() => {
    if (!eventBus) return;
    const handleSessionsUpdated = (data) => setChatSessions(data.sessions);
    const handleSessionSelected = (data) => setCurrentSessionId(data.sessionId);
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
    const handleSidebarToggle = () => {
      const sidebar = document.querySelector('.chat-sidebar');
      if (sidebar) {
        const isVisible = sidebar.style.display !== 'none';
        sidebar.style.display = isVisible ? 'none' : 'flex';
        console.log('Sidebar toggled:', isVisible ? 'hidden' : 'visible');
      } else {
        console.log('Sidebar element not found');
      }
    };
    eventBus.on('chat-sidebar:sessions:updated', handleSessionsUpdated);
    eventBus.on('chat-sidebar:session:selected', handleSessionSelected);
    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    eventBus.on('sidebar-toggle', handleSidebarToggle);
    return () => {
      eventBus.off('chat-sidebar:sessions:updated', handleSessionsUpdated);
      eventBus.off('chat-sidebar:session:selected', handleSessionSelected);
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
      eventBus.off('sidebar-toggle', handleSidebarToggle);
    };
  }, [eventBus, onActivePortChange]);

  // Load IDE list on component mount
  useEffect(() => {
    refreshIDEList();
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Gerade eben';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  const handleNewChat = () => eventBus.emit('chat-sidebar:new-chat');
  const handleNewIDE = () => eventBus.emit('chat-sidebar:new-ide');
  const handleExportChat = () => eventBus.emit('chat-sidebar:export-chat');
  const handleClearChat = () => eventBus.emit('chat-sidebar:clear-chat');
  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
    eventBus.emit('chat-sidebar:session:requested', { sessionId });
  };
  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Chat wirklich löschen?')) {
      eventBus.emit('chat-sidebar:session:delete', { sessionId });
    }
  };
  const handleSwitchToIDE = (port) => eventBus.emit('chat-sidebar:ide:switch', { port });
  const handleSwitchDirectlyToIDE = async (port) => {
    try {
      const { apiCall } = await import('@infrastructure/repositories/APIChatRepository.jsx');
      await apiCall(`/api/ide/switch/${port}`, { method: 'POST' });
      if (onActivePortChange) onActivePortChange(port);
      refreshIDEList();
      eventBus.emit('chat-sidebar:load-chat-for-port', { port });
    } catch (error) {
      console.error('Fehler beim Umschalten der IDE:', error);
    }
  };
  const handleStopIDE = (port) => {
    if (window.confirm(`IDE auf Port ${port} wirklich stoppen?`)) {
      eventBus.emit('chat-sidebar:ide:stop', { port });
    }
  };

  const refreshIDEList = async () => {
    if (!isAuthenticated) return;
    try {
      const { apiCall } = await import('@infrastructure/repositories/APIChatRepository.jsx');
      const result = await apiCall('/api/ide/available');
      if (result.success) {
        setAvailableIDEs(result.data);
      }
    } catch (error) {
      console.error('Error refreshing IDE list:', error);
    }
  };

  // Debug: Log availableIDEs vor dem Rendern
  console.log('DEBUG IDE-LIST:', availableIDEs);
  console.log('DEBUG ACTIVE VALUES:', availableIDEs.map(ide => ({ port: ide.port, active: ide.active, activeType: typeof ide.active })));
  console.log('DEBUG FULL IDE DATA:', JSON.stringify(availableIDEs, null, 2));

  return (
    <div className="chat-sidebar-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-header">
        <h3>💬 Chat Sessions</h3>
        <button id="newChatBtn" className="btn-icon" title="Neuer Chat" onClick={handleNewChat}>➕</button>
      </div>
      <div className="ide-management-section">
        <div className="ide-header">
          <h4>🖥️ IDE Management</h4>
          <button id="newIDEBtn" className="btn-icon" title="Neue IDE starten" onClick={handleNewIDE}>🚀</button>
        </div>
        <div className="ide-list" id="ideList">
          {availableIDEs.length === 0 ? (
            <div className="no-ides">Keine IDEs verfügbar</div>
          ) : (
            availableIDEs.map(ide => (
              <div
                className={`ide-item${ide.active === true ? ' active' : ''}`}
                data-port={ide.port}
                key={ide.port}
                onClick={e => {
                  if (!e.target.classList.contains('ide-stop-btn')) {
                    handleSwitchDirectlyToIDE(ide.port);
                  }
                }}
              >
                <div className="ide-info">
                  <div className="ide-title">Port {ide.port}</div>
                  <div className="ide-meta">
                    <span className={`ide-status ${ide.status}`}>{ide.status}</span>
                    <span className="ide-source">{ide.source || 'unknown'}</span>
                  </div>
                </div>
                <div className="ide-actions">
                  {ide.active && <span className="active-indicator">✓</span>}
                  <button
                    className="ide-stop-btn"
                    data-port={ide.port}
                    title="IDE stoppen"
                    onClick={e => {
                      e.stopPropagation();
                      handleStopIDE(ide.port);
                    }}
                  >⏹️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="chat-sessions-list" id="chatSessionsList">
        {chatSessions.length === 0 ? (
          <div className="no-sessions">Keine Chats vorhanden</div>
        ) : (
          chatSessions.map(session => (
            <div
              className={`chat-session-item${session.id === currentSessionId ? ' active' : ''}`}
              data-session-id={session.id}
              key={session.id}
              onClick={e => {
                if (!e.target.classList.contains('session-delete-btn')) {
                  handleSelectSession(session.id);
                }
              }}
            >
              <div className="session-info">
                <div className="session-title">{session.title}</div>
                <div className="session-meta">
                  <span className="message-count">{session.messageCount || 0} Nachrichten</span>
                  <span className="last-activity">{formatDate(session.lastActivity)}</span>
                </div>
              </div>
              <button
                className="session-delete-btn"
                data-session-id={session.id}
                title="Chat löschen"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteSession(session.id);
                }}
              >×</button>
            </div>
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <div className="quick-actions">
          <button id="exportChatBtn" className="btn-secondary" title="Chat exportieren" onClick={handleExportChat}>📤 Export</button>
          <button id="clearChatBtn" className="btn-secondary" title="Chat löschen" onClick={handleClearChat}>🗑️ Clear</button>
        </div>
      </div>
    </div>
  );
}

export default ChatSidebarComponent; 