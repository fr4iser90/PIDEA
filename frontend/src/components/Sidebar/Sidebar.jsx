import React, { useEffect, useState } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ComputerDesktopIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import useChatStore from '../../stores/chatStore';

const ChatSidebarComponent = ({ eventBus, sessions, activeSessionId, onSessionSwitch, onNewSession, availablePorts }) => {
  const [availableIDEs, setAvailableIDEs] = useState([]);
  const [activePort, setActivePort] = useState(null);

  useEffect(() => {
    if (!eventBus) return;

    const handleSessionsUpdated = (data) => {
      // Sessions are managed by the store, so this is handled there
    };

    const handleSessionSelected = (data) => {
      onSessionSwitch(data.sessionId);
    };

    const handleIDEListUpdated = (data) => {
      if (data.ides) setAvailableIDEs(data.ides);
    };

    const handleActiveIDEChanged = (data) => {
      setActivePort(data.port);
    };

    eventBus.on('chat-sidebar:sessions:updated', handleSessionsUpdated);
    eventBus.on('chat-sidebar:session:selected', handleSessionSelected);
    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);

    return () => {
      eventBus.off('chat-sidebar:sessions:updated', handleSessionsUpdated);
      eventBus.off('chat-sidebar:session:selected', handleSessionSelected);
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
    };
  }, [eventBus, onSessionSwitch]);

  const selectSession = (sessionId) => {
    onSessionSwitch(sessionId);
    if (eventBus) {
      eventBus.emit('chat-sidebar:session:requested', { sessionId });
    }
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Chat wirklich löschen?')) {
      if (eventBus) {
        eventBus.emit('chat-sidebar:session:delete', { sessionId });
      }
    }
  };

  const switchDirectlyToIDE = (port) => {
    if (eventBus) {
      eventBus.emit('chat-sidebar:ide:switch', { port });
      eventBus.emit('chat-sidebar:load-chat-for-port', { port });
    }
  };

  const stopIDE = (port) => {
    if (window.confirm(`IDE auf Port ${port} wirklich stoppen?`)) {
      if (eventBus) {
        eventBus.emit('chat-sidebar:ide:stop', { port });
      }
    }
  };

  const renderIDEs = () => {
    if (availableIDEs.length === 0) return <div className="no-ides">Keine IDEs verfügbar</div>;
    return availableIDEs.map(ide => (
      <div className={`ide-item${ide.port === activePort ? ' active' : ''}`} data-port={ide.port} key={ide.port}>
        <div className="ide-info">
          <div className="ide-title">Port {ide.port}</div>
          <div className="ide-meta">
            <span className={`ide-status ${ide.status}`}>{ide.status}</span>
            <span className="ide-source">{ide.source || 'unknown'}</span>
          </div>
        </div>
        <div className="ide-actions">
          {ide.port === activePort ? <span className="active-indicator">✓</span> : ''}
          <button className="ide-stop-btn" data-port={ide.port} title="IDE stoppen" onClick={() => stopIDE(ide.port)}>⏹️</button>
        </div>
      </div>
    ));
  };

  const renderChatSessions = () => {
    if (!sessions || sessions.length === 0) return <div className="no-sessions">Keine Chats vorhanden</div>;
    return sessions.map(session => (
      <div className={`chat-session-item${session.id === activeSessionId ? ' active' : ''}`} data-session-id={session.id} key={session.id} onClick={() => selectSession(session.id)}>
        <div className="session-info">
          <div className="session-title">{session.title}</div>
          <div className="session-meta">
            <span className="message-count">{session.messageCount || 0} Nachrichten</span>
            <span className="last-activity">{new Date(session.lastActivity).toLocaleDateString()}</span>
          </div>
        </div>
        <button className="session-delete-btn" data-session-id={session.id} title="Chat löschen" onClick={e => { e.stopPropagation(); deleteSession(session.id); }}>×</button>
      </div>
    ));
  };

  return (
    <div className="chat-sidebar-content">
      <div className="sidebar-header">
        <h3>💬 Chat Sessions</h3>
        <button id="newChatBtn" className="btn-icon" title="Neuer Chat" onClick={() => {
          if (eventBus) eventBus.emit('chat-sidebar:new-chat');
          if (onNewSession && availablePorts.length > 0) {
            onNewSession(availablePorts[0]);
          }
        }}>➕</button>
      </div>
      <div className="ide-management-section">
        <div className="ide-header">
          <h4>🖥️ IDE Management</h4>
          <button id="newIDEBtn" className="btn-icon" title="Neue IDE starten" onClick={() => eventBus?.emit('chat-sidebar:new-ide')}>🚀</button>
        </div>
        <div className="ide-list" id="ideList">{renderIDEs()}</div>
      </div>
      <div className="chat-sessions-list" id="chatSessionsList">{renderChatSessions()}</div>
      <div className="sidebar-footer">
        <div className="quick-actions">
          <button id="exportChatBtn" className="btn-secondary" title="Chat exportieren" onClick={() => eventBus?.emit('chat-sidebar:export-chat')}>📤 Export</button>
          <button id="clearChatBtn" className="btn-secondary" title="Chat löschen" onClick={() => eventBus?.emit('chat-sidebar:clear-chat')}>🗑️ Clear</button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebarComponent;
export { ChatSidebarComponent }; 