import React, { useState, useEffect, useRef } from 'react';
import EventBus from '@infrastructure/events/EventBus.jsx';
import ChatComponent from '@presentation/components/chat/main/ChatComponent.jsx';
import SidebarLeft from '@presentation/components/SidebarLeft.jsx';
import SidebarRight from '@presentation/components/SidebarRight.jsx';
import IDEMirrorComponent from '@presentation/components/mirror/main/IDEMirrorComponent.jsx';
import PreviewComponent from '@presentation/components/chat/main/PreviewComponent.jsx';
import GitManagementComponent from '@presentation/components/git/main/GitManagementComponent.jsx';
import AuthWrapper from '@presentation/components/auth/AuthWrapper.jsx';
import Header from '@presentation/components/Header.jsx';
import Footer from '@presentation/components/Footer.jsx';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';

function App() {
  const [eventBus] = useState(() => new EventBus());
  const [currentView, setCurrentView] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePort, setActivePort] = useState(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
  const [gitStatus, setGitStatus] = useState(null);
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
    const handleLeftSidebarToggle = () => setIsLeftSidebarVisible(v => !v);
    const handleRightSidebarToggle = () => setIsRightSidebarVisible(v => !v);
    eventBus.on('sidebar-left-toggle', handleLeftSidebarToggle);
    eventBus.on('sidebar-right-toggle', handleRightSidebarToggle);
    return () => {
      eventBus.off('sidebar-left-toggle', handleLeftSidebarToggle);
      eventBus.off('sidebar-right-toggle', handleRightSidebarToggle);
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

  const handleLeftSidebarToggle = () => {
    setIsLeftSidebarVisible(v => !v);
  };

  const handleRightSidebarToggle = () => {
    setIsRightSidebarVisible(v => !v);
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
        <Header 
          eventBus={eventBus}
          currentView={currentView}
          onNavigationClick={handleNavigationClick}
          onLeftSidebarToggle={handleLeftSidebarToggle}
          onRightSidebarToggle={handleRightSidebarToggle}
        />

        {/* Main Content */}
        <main className={`main-layout${isSplitView ? ' split-view' : ''}${!isLeftSidebarVisible ? ' sidebar-hidden' : ''}${!isRightSidebarVisible ? ' rightpanel-hidden' : ''}`}>
          {/* Left Sidebar */}
          {isLeftSidebarVisible && (
            <SidebarLeft eventBus={eventBus} activePort={activePort} onActivePortChange={setActivePort} />
          )}
          
          {/* Main View */}
          <div className="main-content">
            {renderView()}
            {isSplitView && <PreviewComponent eventBus={eventBus} activePort={activePort} />}
          </div>
          
          {/* Right Sidebar */}
          {isRightSidebarVisible && <SidebarRight eventBus={eventBus} />}
        </main>

        <Footer 
          eventBus={eventBus}
          activePort={activePort}
          gitStatus={gitStatus}
          version="1.0.0"
          message="Welcome to PIDEA! Your AI development assistant is ready to help."
        />
      </div>
    </AuthWrapper>
  );
}

export default App; 