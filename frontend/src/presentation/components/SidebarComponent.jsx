import React, { useState, useEffect, useRef } from 'react';
import { apiCall, API_CONFIG } from '@infrastructure/repositories/APIChatRepository.jsx';

function SidebarComponent({ eventBus }) {
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [ides, setIDEs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('🔄 SidebarComponent initializing...');
    setupEventListeners();
    loadChatSessions();
    loadIDEs();
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  const setupEventListeners = () => {
    if (eventBus) {
      eventBus.on('sidebar-toggle', handleToggle);
      eventBus.on('chat-session-created', handleSessionCreated);
      eventBus.on('chat-session-deleted', handleSessionDeleted);
      eventBus.on('chat-session-selected', handleSessionSelected);
      eventBus.on('ide-detected', handleIDEDetected);
      eventBus.on('ide-started', handleIDEStarted);
      eventBus.on('ide-stopped', handleIDEStopped);
    }
  };

  const loadChatSessions = async () => {
    try {
      const data = await apiCall(API_CONFIG.endpoints.chat.sessions);
      if (data.success) {
        setChatSessions(data.sessions || []);
        if (data.sessions && data.sessions.length > 0) {
          setActiveSession(data.sessions[0].id);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load chat sessions:', error);
    }
  };

  const loadIDEs = async () => {
    try {
      const data = await apiCall(API_CONFIG.endpoints.ide.list);
      if (data.success) {
        setIDEs(data.data || []);
      }
    } catch (error) {
      console.error('❌ Failed to load IDEs:', error);
    }
  };

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  const handleSessionCreated = (session) => {
    setChatSessions(prevSessions => [...prevSessions, session]);
    setActiveSession(session.id);
  };

  const handleSessionDeleted = (sessionId) => {
    setChatSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    if (activeSession === sessionId) {
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
      setActiveSession(remainingSessions.length > 0 ? remainingSessions[0].id : null);
    }
  };

  const handleSessionSelected = (sessionId) => {
    setActiveSession(sessionId);
  };

  const handleIDEDetected = (ide) => {
    setIDEs(prevIDEs => {
      const existing = prevIDEs.find(i => i.id === ide.id);
      if (existing) {
        return prevIDEs.map(i => i.id === ide.id ? { ...i, ...ide } : i);
      }
      return [...prevIDEs, ide];
    });
  };

  const handleIDEStarted = (ideId) => {
    setIDEs(prevIDEs => prevIDEs.map(ide => 
      ide.id === ideId ? { ...ide, status: 'running' } : ide
    ));
  };

  const handleIDEStopped = (ideId) => {
    setIDEs(prevIDEs => prevIDEs.map(ide => 
      ide.id === ideId ? { ...ide, status: 'stopped' } : ide
    ));
  };

  const createNewSession = async () => {
    try {
      const data = await apiCall(API_CONFIG.endpoints.chat.sessions, {
        method: 'POST',
        body: JSON.stringify({
          title: `Chat ${chatSessions.length + 1}`,
          timestamp: new Date().toISOString()
        })
      });
      
      if (data.success) {
        handleSessionCreated(data.session);
      }
    } catch (error) {
      console.error('❌ Failed to create new session:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const data = await apiCall(`${API_CONFIG.endpoints.chat.sessions}/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (data.success) {
        handleSessionDeleted(sessionId);
      }
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
    }
  };

  const selectSession = (sessionId) => {
    setActiveSession(sessionId);
    if (eventBus) {
      eventBus.emit('session-selected', { sessionId });
    }
  };

  const switchIDE = async (ideId) => {
    try {
      const data = await apiCall(`/api/ide/${ideId}/switch`, {
        method: 'POST'
      });
      
      if (data.success) {
        console.log('✅ IDE switched successfully');
      }
    } catch (error) {
      console.error('❌ Failed to switch IDE:', error);
    }
  };

  const stopIDE = async (ideId) => {
    try {
      const data = await apiCall(`/api/ide/${ideId}/stop`, {
        method: 'POST'
      });
      
      if (data.success) {
        console.log('✅ IDE stopped successfully');
      }
    } catch (error) {
      console.error('❌ Failed to stop IDE:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div ref={containerRef} className="chat-sidebar">
      <div className="sidebar-content">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <h3>Chat Sessions</h3>
          <button onClick={handleToggle} className="btn-icon" title="Toggle Sidebar">
            ✕
          </button>
        </div>

        {/* IDE Management Section */}
        <div className="ide-management-section">
          <div className="ide-header">
            <h4>IDE Management</h4>
          </div>
          
          <div className="ide-list">
            {ides.length === 0 ? (
              <div className="no-ides">No IDEs detected</div>
            ) : (
              ides.map(ide => (
                <div key={ide.port} className={`ide-item ${ide.status === 'running' ? 'active' : ''}`}>
                  <div className="ide-info">
                    <div className="ide-title">IDE on Port {ide.port}</div>
                    <div className="ide-meta">
                      <span className={`ide-status ${ide.status}`}>{ide.status}</span>
                      <span className="ide-source">{ide.source}</span>
                    </div>
                  </div>
                  <div className="ide-actions">
                    {ide.status === 'running' && (
                      <span className="active-indicator">●</span>
                    )}
                    <button
                      onClick={() => switchIDE(ide.port)}
                      className="ide-switch-btn"
                      title="Switch to this IDE"
                    >
                      🔄
                    </button>
                    {ide.status === 'running' && (
                      <button
                        onClick={() => stopIDE(ide.port)}
                        className="ide-stop-btn"
                        title="Stop IDE"
                      >
                        ⏹️
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="chat-sessions-list">
          {chatSessions.length === 0 ? (
            <div className="no-sessions">
              <p>No chat sessions yet</p>
              <p>Create your first session to get started</p>
            </div>
          ) : (
            chatSessions.map(session => (
              <div
                key={session.id}
                className={`chat-session-item ${activeSession === session.id ? 'active' : ''}`}
                onClick={() => selectSession(session.id)}
              >
                <div className="session-info">
                  <div className="session-title">{session.title}</div>
                  <div className="session-meta">
                    <span>{formatTimestamp(session.timestamp)}</span>
                    {session.idePort && (
                      <span className="ide-port">Port: {session.idePort}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="session-delete-btn"
                  title="Delete session"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="quick-actions">
            <button onClick={createNewSession} className="btn-secondary">
              ➕ New Session
            </button>
            <button onClick={() => eventBus?.emit('refresh-sessions')} className="btn-secondary">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SidebarComponent; 