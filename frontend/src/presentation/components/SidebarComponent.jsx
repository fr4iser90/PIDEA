import React, { useState, useEffect, useRef } from 'react';
import { apiCall, API_CONFIG } from '@infrastructure/repositories/APIChatRepository.jsx';

function SidebarComponent({ eventBus }) {
  const [ides, setIDEs] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    setupEventListeners();
    loadIDEs();
    return () => {};
  }, []);

  const setupEventListeners = () => {
    if (eventBus) {
      eventBus.on('sidebar-toggle', handleToggle);
      eventBus.on('ide-detected', handleIDEDetected);
      eventBus.on('ide-started', handleIDEStarted);
      eventBus.on('ide-stopped', handleIDEStopped);
    }
  };

  const loadIDEs = async () => {
    try {
      const data = await apiCall(API_CONFIG.endpoints.ide.list);
      if (data.success) {
        setIDEs(data.data || []);
      }
    } catch (error) {
      setIDEs([]);
      console.error('❌ Failed to load IDEs:', error);
    }
  };

  const handleToggle = () => setIsVisible(!isVisible);
  const handleIDEDetected = (ide) => {
    setIDEs(prevIDEs => {
      const existing = prevIDEs.find(i => i.port === ide.port);
      if (existing) {
        return prevIDEs.map(i => i.port === ide.port ? { ...i, ...ide } : i);
      }
      return [...prevIDEs, ide];
    });
  };
  const handleIDEStarted = (idePort) => {
    setIDEs(prevIDEs => prevIDEs.map(ide => ide.port === idePort ? { ...ide, status: 'running' } : ide));
  };
  const handleIDEStopped = (idePort) => {
    setIDEs(prevIDEs => prevIDEs.map(ide => ide.port === idePort ? { ...ide, status: 'stopped' } : ide));
  };
  const switchIDE = async (idePort) => {
    try {
      await apiCall(`/api/ide/${idePort}/switch`, { method: 'POST' });
    } catch (error) {
      console.error('❌ Failed to switch IDE:', error);
    }
  };
  const stopIDE = async (idePort) => {
    try {
      await apiCall(`/api/ide/${idePort}/stop`, { method: 'POST' });
    } catch (error) {
      console.error('❌ Failed to stop IDE:', error);
    }
  };
  if (!isVisible) return null;
  return (
    <div ref={containerRef} className="chat-sidebar">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h3>IDE Management</h3>
          <button onClick={handleToggle} className="btn-icon" title="Toggle Sidebar">✕</button>
        </div>
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
                    {ide.status === 'running' && (<span className="active-indicator">●</span>)}
                    <button onClick={() => switchIDE(ide.port)} className="ide-switch-btn" title="Switch to this IDE">🔄</button>
                    {ide.status === 'running' && (
                      <button onClick={() => stopIDE(ide.port)} className="ide-stop-btn" title="Stop IDE">⏹️</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SidebarComponent; 