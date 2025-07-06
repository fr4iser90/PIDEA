import React, { useState, useEffect, useRef } from 'react';
import EventBus from '@infrastructure/events/EventBus.jsx';
import ChatComponent from '@presentation/components/ChatComponent.jsx';
import ChatSidebarComponent from '@presentation/components/ChatSidebarComponent.jsx';
import ChatRightPanelComponent from '@presentation/components/ChatRightPanelComponent.jsx';
import IDEMirrorComponent from '@presentation/components/IDEMirrorComponent.jsx';
import PreviewComponent from '@presentation/components/PreviewComponent.jsx';
import GitManagementComponent from '@presentation/components/GitManagementComponent.jsx';
import AuthWrapper from '@presentation/components/auth/AuthWrapper.jsx';
import UserMenu from '@presentation/components/auth/UserMenu.jsx';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';

function App() {
  const [eventBus] = useState(() => new EventBus());
  const [currentView, setCurrentView] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePort, setActivePort] = useState(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
  const containerRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    console.log('🔄 App initializing...');
    setupEventListeners();
    initializeApp();
    fetchActivePort();
    return () => {
      // Cleanup if needed
    };
  }, []);

  const setupEventListeners = () => {
    if (eventBus) {
      eventBus.on('view-change', handleViewChange);
      eventBus.on('app-loading', handleLoading);
      eventBus.on('app-error', handleError);
      eventBus.on('app-ready', handleReady);
    }
  };

  const initializeApp = () => {
    setIsLoading(true);
    
    // Simulate app initialization
    setTimeout(() => {
      setIsLoading(false);
      if (eventBus) {
        eventBus.emit('app-ready');
      }
    }, 1000);
  };

  const handleViewChange = (data) => {
    setCurrentView(data.view);
  };

  const handleLoading = (data) => {
    setIsLoading(data.isLoading);
  };

  const handleError = (data) => {
    setError(data.error);
  };

  const handleReady = () => {
    console.log('✅ App ready');
  };

  const fetchActivePort = async () => {
    if (!isAuthenticated) return;
    try {
      const { apiCall } = await import('@infrastructure/repositories/APIChatRepository.jsx');
      const result = await apiCall('/api/ide/available');
      if (result.success && result.data) {
        const activeIDE = result.data.find(ide => ide.active);
        if (activeIDE) setActivePort(activeIDE.port);
      }
    } catch (e) {
      setError('❌ Failed to load IDE list: ' + e.message);
    }
  };

  useEffect(() => {
    if (!eventBus) return;
    const handleActiveIDEChanged = (data) => {
      if (data && data.port) {
        setActivePort(data.port);
      }
    };
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    return () => {
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
    };
  }, [eventBus]);

  useEffect(() => {
    if (!eventBus) return;
    const handleSidebarToggle = () => setIsSidebarVisible(v => !v);
    const handleRightPanelToggle = () => setIsRightPanelVisible(v => !v);
    eventBus.on('sidebar-toggle', handleSidebarToggle);
    eventBus.on('right-panel-toggle', handleRightPanelToggle);
    return () => {
      eventBus.off('sidebar-toggle', handleSidebarToggle);
      eventBus.off('right-panel-toggle', handleRightPanelToggle);
    };
  }, [eventBus]);

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatComponent eventBus={eventBus} activePort={activePort} />;
      case 'ide-mirror':
        return <IDEMirrorComponent eventBus={eventBus} />;
      case 'preview':
        return <PreviewComponent eventBus={eventBus} activePort={activePort} />;
      case 'git':
        return <GitManagementComponent activePort={activePort} onGitOperation={(operation, result) => {
          console.log('Git operation completed:', operation, result);
          if (eventBus) {
            eventBus.emit('git-operation-completed', { operation, result });
          }
        }} />;
      case 'code':
        return <div className="code-explorer-container">Code Editor View</div>;
      default:
        return <ChatComponent eventBus={eventBus} activePort={activePort} />;
    }
  };

  const handleNavigationClick = (view) => {
    if (view === 'preview') {
      // Toggle split view for preview
      setIsSplitView(!isSplitView);
      setCurrentView('chat'); // Always stay in chat view, just add preview
    } else {
      setIsSplitView(false); // Exit split view for other views
    setCurrentView(view);
    }
    if (eventBus) {
      eventBus.emit('view-changed', { view });
    }
  };

  if (isLoading) {
    return (
      <div className="app-root">
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-root">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <div ref={containerRef} className="app-root">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">CursorWeb</h1>
            
            {/* Navigation */}
            <nav className="header-navigation">
              <button
                onClick={() => handleNavigationClick('chat')}
                className={`mode-btn ${currentView === 'chat' ? 'active' : ''}`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => handleNavigationClick('ide-mirror')}
                className={`mode-btn ${currentView === 'ide-mirror' ? 'active' : ''}`}
              >
                🖥️ IDE Mirror
              </button>
              <button
                onClick={() => handleNavigationClick('preview')}
                className={`mode-btn ${currentView === 'preview' ? 'active' : ''}`}
              >
                👁️ Preview
              </button>
              <button
                onClick={() => handleNavigationClick('git')}
                className={`mode-btn ${currentView === 'git' ? 'active' : ''}`}
              >
                🔧 Git
              </button>
              <button
                onClick={() => handleNavigationClick('code')}
                className={`mode-btn ${currentView === 'code' ? 'active' : ''}`}
              >
                📝 Code
              </button>
            </nav>
          </div>
          
          <div className="header-actions">
            <button
              onClick={() => eventBus?.emit('sidebar-toggle')}
              className="btn-icon"
              title="Toggle Sidebar"
            >
              📁
            </button>
            <button
              onClick={() => {
                console.log('Header right panel button clicked');
                eventBus?.emit('right-panel-toggle');
              }}
              className="btn-icon"
              title="Toggle Right Panel"
            >
              📋
            </button>
            <UserMenu />
          </div>
        </header>

        {/* Main Content */}
        <main className={`main-layout${isSplitView ? ' split-view' : ''}${!isSidebarVisible ? ' sidebar-hidden' : ''}${!isRightPanelVisible ? ' rightpanel-hidden' : ''}`}>
          {/* Sidebar */}
          {isSidebarVisible && (
            <div className="chat-sidebar">
              <ChatSidebarComponent eventBus={eventBus} activePort={activePort} onActivePortChange={setActivePort} />
            </div>
          )}
          
          {/* Main View */}
          <div className="main-content">
            {renderView()}
            {isSplitView && <PreviewComponent eventBus={eventBus} activePort={activePort} />}
          </div>
          
          {/* Right Panel */}
          {isRightPanelVisible && <ChatRightPanelComponent eventBus={eventBus} />}
        </main>
      </div>
    </AuthWrapper>
  );
}

export default App; 