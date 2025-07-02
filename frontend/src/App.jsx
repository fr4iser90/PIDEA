import React, { useEffect, useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import ChatContainer from './components/Chat/ChatContainer';
import Sidebar from './components/Sidebar/Sidebar';
import CodeExplorerComponent from './components/CodeExplorer/CodeExplorerComponent';
import useChatStore from './stores/chatStore';
import AppController from './presentation/controllers/AppController';
import API_CONFIG from './config/api.js';
import '../assets/css/main.css';
import '../assets/css/chat.css';
import '../assets/css/header.css';
import '../assets/css/rightpanel.css';
import '../assets/css/sidebar.css';
import '../assets/css/framework-panel.css';
import '../assets/css/code.css';
import '../assets/css/preview.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState('chat');
  const [appController, setAppController] = useState(null);
  const [eventBus, setEventBus] = useState(null);
  
  const { 
    sessions, 
    activeSessionId, 
    createSession, 
    switchSession,
    availablePorts,
    setAvailablePorts 
  } = useChatStore();

  // Initialize AppController
  useEffect(() => {
    const controller = new AppController();
    setAppController(controller);
    setEventBus(controller.getEventBus());
  }, []);

  // Listen for mode changes
  useEffect(() => {
    if (!eventBus) return;

    const handleModeChange = (data) => {
      setCurrentMode(data.mode);
    };

    eventBus.on('mode:changed', handleModeChange);

    return () => {
      eventBus.off('mode:changed', handleModeChange);
    };
  }, [eventBus]);

  // Load available IDE ports on mount
  useEffect(() => {
    const loadPorts = async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseURL}/api/ide/available`);
        if (response.ok) {
          const data = await response.json();
          const ports = data.ides?.map(ide => ide.port) || [];
          setAvailablePorts(ports);
          
          // Create session for first available port if no active session
          if (ports.length > 0 && !activeSessionId) {
            createSession(ports[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load IDE ports:', error);
      }
    };

    loadPorts();
  }, []);

  const handleModeSwitch = (mode) => {
    if (eventBus) {
      eventBus.emit('app:mode:switch', { mode });
    }
  };

  const renderMainContent = () => {
    switch (currentMode) {
      case 'code':
        return (
          <div id="codeExplorerView" className="code-explorer-container">
            <CodeExplorerComponent eventBus={eventBus} />
          </div>
        );
      case 'chat':
      default:
        return (
          <div id="chatView" className="chat-container">
            <ChatContainer eventBus={eventBus} />
          </div>
        );
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <span className="app-title">Cursor IDE Chat</span>
        <div className="header-switch">
          <button 
            id="chatModeBtn" 
            className={`mode-btn ${currentMode === 'chat' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('chat')}
          >
            Chat
          </button>
          <button 
            id="codeModeBtn" 
            className={`mode-btn ${currentMode === 'code' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('code')}
          >
            Code Explorer
          </button>
        </div>
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span id="status">Verbunden</span>
        </div>
        <div className="chat-header-actions">
          <button id="themeSwitcher" title="Theme wechseln">🌗</button>
          <button id="settingsBtn" title="Einstellungen">⚙️</button>
        </div>
      </header>
      <div className="main-layout">
        <aside className="sidebar" id="sidebar">
          <Sidebar 
            eventBus={eventBus}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionSwitch={switchSession}
            onNewSession={createSession}
            availablePorts={availablePorts}
          />
        </aside>
        <main className="main-content" id="mainContent">
          {renderMainContent()}
        </main>
        <aside className="right-panel" id="rightPanel">
          {/* RightPanel-Komponente folgt */}
        </aside>
      </div>
      <footer className="app-footer">(Statusbar/Terminal – optional)</footer>
    </div>
  );
}

export default App;
