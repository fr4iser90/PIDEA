import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useRef } from 'react';
import EventBus from '@/infrastructure/events/EventBus.jsx';
import ChatComponent from '@/presentation/components/chat/main/ChatComponent.jsx';
import SidebarLeft from '@/presentation/components/SidebarLeft.jsx';
import SidebarRight from '@/presentation/components/SidebarRight.jsx';
import IDEMirrorComponent from '@/presentation/components/mirror/main/IDEMirrorComponent.jsx';
import PreviewComponent from '@/presentation/components/chat/main/PreviewComponent.jsx';
import GitManagementComponent from '@/presentation/components/git/main/GitManagementComponent.jsx';
import AuthWrapper from '@/presentation/components/auth/AuthWrapper.jsx';
import Header from '@/presentation/components/Header.jsx';
import Footer from '@/presentation/components/Footer.jsx';
import NotificationSystem from '@/presentation/components/common/NotificationSystem.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import { IDEProvider } from '@/presentation/components/ide/IDEContext.jsx';

function App() {
  const [eventBus] = useState(() => new EventBus());
  const [currentView, setCurrentView] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
  const [gitStatus, setGitStatus] = useState(null);
  const [gitBranch, setGitBranch] = useState('');
  const [attachedPrompts, setAttachedPrompts] = useState([]);
  const containerRef = useRef(null);
  const { isAuthenticated } = useAuthStore();
  
  // Use IDEStore for port management
  const {
    activePort,
    availableIDEs,
    isLoading: ideLoading,
    error: ideError,
    loadActivePort,
    loadAvailableIDEs,
    setActivePort,
    refresh: refreshIDE,
    clearError: clearIDEError
  } = useIDEStore();

  useEffect(() => {
    logger.log('🔄 App initializing...');
    setupEventListeners();
    initializeApp();
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
    logger.log('✅ App ready');
  };

  // Load active port on mount
  useEffect(() => {
    loadActivePort();
  }, []);

  // Retry loading active port when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      loadActivePort();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!eventBus) return;
    const handleActiveIDEChanged = (data) => {
      if (data && data.port) {
        // IDEStore will handle the port change automatically
        logger.log('[App] Active IDE changed event received:', data.port);
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

  useEffect(() => {
    const fetchGitStatusForPort = async (port) => {
      if (!port) {
        setGitStatus(null);
        setGitBranch('');
        return;
      }
      try {
        const ideRes = await apiCall('/api/ide/available');
        if (ideRes.success && ideRes.data) {
                  const activeIDE = ideRes.data.find(ide => ide.port === port);
        if (activeIDE && activeIDE.workspacePath) {
          // Get project ID from workspace path
          const projectId = getProjectIdFromWorkspace(activeIDE.workspacePath);
          
          const gitRes = await apiCall(`/api/projects/${projectId}/git/status`, {
            method: 'POST',
            body: JSON.stringify({ projectPath: activeIDE.workspacePath })
          });
          setGitStatus(gitRes.data?.status || null);
          setGitBranch(gitRes.data?.currentBranch || '');
        } else {
          setGitStatus(null);
          setGitBranch('');
        }
        }
      } catch (e) {
        setGitStatus(null);
        setGitBranch('');
      }
    };
    if (activePort) {
      fetchGitStatusForPort(activePort);
    } else {
      setGitStatus(null);
      setGitBranch('');
    }
  }, [activePort]);

  const renderView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatComponent eventBus={eventBus} activePort={activePort} attachedPrompts={attachedPrompts} />;
      case 'ide-mirror':
        return <IDEMirrorComponent eventBus={eventBus} />;
      case 'ide-selector':
        return <div className="ide-selector-view">
          <h2>IDE Selection</h2>
          <p>Use the sidebar to select and manage IDEs</p>
        </div>;
      case 'ide-features':
        return <div className="ide-features-view">
          <h2>IDE Features</h2>
          <p>Manage IDE features and capabilities</p>
        </div>;
      case 'preview':
        return <PreviewComponent eventBus={eventBus} activePort={activePort} />;
      case 'git':
        return <GitManagementComponent activePort={activePort} onGitOperation={(operation, result) => {
          logger.log('Git operation completed:', operation, result);
          if (eventBus) {
            eventBus.emit('git-operation-completed', { operation, result });
          }
        }} />;
      case 'code':
        return <div className="code-explorer-container">Code Editor View</div>;
      default:
        return <ChatComponent eventBus={eventBus} activePort={activePort} attachedPrompts={attachedPrompts} />;
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
      <IDEProvider eventBus={eventBus}>
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
            {isRightSidebarVisible && <SidebarRight eventBus={eventBus} attachedPrompts={attachedPrompts} setAttachedPrompts={setAttachedPrompts} activePort={activePort} />}
          </main>

          <Footer 
            eventBus={eventBus}
            activePort={activePort}
            gitStatus={gitStatus}
            gitBranch={gitBranch}
            version="1.0.0"
            message="Welcome to PIDEA! Your AI development assistant is ready to help."
          />

          {/* Global Notification System */}
          <NotificationSystem />
        </div>
      </IDEProvider>
    </AuthWrapper>
  );
}

export default App; 