/**
 * ChatPanelComponent - Manages chat-specific functionality in the left sidebar
 * 
 * This component handles:
 * - Chat session management (create, select, delete)
 * - Session list display with metadata
 * - Quick actions (export, clear)
 * - Chat-specific event handling
 * 
 * @class ChatPanelComponent
 */
import React, { useState, useEffect } from 'react';
import '@/scss/components/_chat-panel.scss';;

function ChatPanelComponent({ eventBus, currentSessionId, onSessionSelect }) {
  const [chatSessions, setChatSessions] = useState([]);

  // EventBus-Listener for chat-specific events
  useEffect(() => {
    if (!eventBus) return;
    
    const handleSessionsUpdated = (data) => setChatSessions(data.sessions);
    const handleSessionSelected = (data) => {
      if (onSessionSelect) onSessionSelect(data.sessionId);
    };
    
    eventBus.on('chat-panel:sessions:updated', handleSessionsUpdated);
    eventBus.on('chat-panel:session:selected', handleSessionSelected);
    
    return () => {
      eventBus.off('chat-panel:sessions:updated', handleSessionsUpdated);
      eventBus.off('chat-panel:session:selected', handleSessionSelected);
    };
  }, [eventBus, onSessionSelect]);

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

  const handleNewChat = () => eventBus.emit('chat-panel:new-chat');
  const handleExportChat = () => eventBus.emit('chat-panel:export-chat');
  const handleClearChat = () => eventBus.emit('chat-panel:clear-chat');
  
  const handleSelectSession = (sessionId) => {
    if (onSessionSelect) onSessionSelect(sessionId);
    eventBus.emit('chat-panel:session:requested', { sessionId });
  };
  
  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Chat wirklich löschen?')) {
      eventBus.emit('chat-panel:session:delete', { sessionId });
    }
  };

  return (
    <div className="chat-panel__chat-panel">
      <div className="chat-panel__panel-header">
        <h3>💬 Chat Sessions</h3>
        <button 
          className="chat-panel__btn-icon" 
          title="Neuer Chat" 
          onClick={handleNewChat}
        >
          ➕
        </button>
      </div>
      
      <div className="chat-panel__chat-sessions-list">
        {chatSessions.length === 0 ? (
          <div className="chat-panel__no-sessions">Keine Chats vorhanden</div>
        ) : (
          chatSessions.map(session => (
            <div
              className={`chat-session-item${session.id === currentSessionId ? ' active' : ''}`}
              key={session.id}
              onClick={e => {
                if (!e.target.classList.contains('session-delete-btn')) {
                  handleSelectSession(session.id);
                }
              }}
            >
              <div className="chat-panel__session-info">
                <div className="chat-panel__session-title">{session.title}</div>
                <div className="chat-panel__session-meta">
                  <span className="chat-panel__message-count">
                    {session.messageCount || 0} Nachrichten
                  </span>
                  <span className="chat-panel__last-activity">
                    {formatDate(session.lastActivity)}
                  </span>
                </div>
              </div>
              <button
                className="chat-panel__session-delete-btn"
                title="Chat löschen"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteSession(session.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="panel-footer">
        <div className="quick-actions">
          <button 
            className="btn-secondary" 
            title="Chat exportieren" 
            onClick={handleExportChat}
          >
            📤 Export
          </button>
          <button 
            className="btn-secondary" 
            title="Chat löschen" 
            onClick={handleClearChat}
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanelComponent;