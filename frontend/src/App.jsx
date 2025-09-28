import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useRef } from 'react';
import EventBus from '@/infrastructure/events/EventBus.jsx';
import ChatComponent from '@/presentation/components/chat/main/ChatComponent.jsx';
import SidebarLeft from '@/presentation/components/SidebarLeft.jsx';
import SidebarRight from '@/presentation/components/SidebarRight.jsx';
import IDEMirrorComponent from '@/presentation/components/mirror/main/IDEMirrorComponent.jsx';
import PreviewComponent from '@/presentation/components/chat/main/PreviewComponent.jsx';
import AnalysisDataViewer from '@/presentation/components/analysis/AnalysisDataViewer.jsx';
import GitManagementComponent from '@/presentation/components/git/main/GitManagementComponent.jsx';
import AuthWrapper from '@/presentation/components/auth/AuthWrapper.jsx';
import Header from '@/presentation/components/Header.jsx';
import Footer from '@/presentation/components/Footer.jsx';
import NotificationSystem from '@/presentation/components/common/NotificationSystem.jsx';
import SessionWarningModal from '@/presentation/components/auth/SessionWarningModal.jsx';
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

  const [attachedPrompts, setAttachedPrompts] = useState([]);
  const containerRef = useRef(null);
  const { isAuthenticated, extendSession, logout } = useAuthStore();
  
  // Session warning modal state
  const [sessionWarning, setSessionWarning] = useState({
    isOpen: false,
    timeUntilExpiry: 0
  });
  
  // Use IDEStore for port management
  const {
    activePort,
    availableIDEs,
    isLoading: ideLoading,
    error: ideError,
    loadActivePort,
    setActivePort,
    refresh: refreshIDE,
    clearError: clearIDEError,
    // ✅ NEW: Global state actions
    setupWebSocketListeners,
    cleanupWebSocketListeners,

  } = useIDEStore();

  // Session warning handlers
  const handleSessionWarning = (timeUntilExpiry) => {
    setSessionWarning({
      isOpen: true,
      timeUntilExpiry
    });
  };

  const handleExtendSession = async () => {
    try {
      await extendSession();
      setSessionWarning({ isOpen: false, timeUntilExpiry: 0 });
    } catch (error) {
      logger.error('Failed to extend session:', error);
    }
  };

  const handleSessionLogout = async () => {
    try {
      await logout();
      setSessionWarning({ isOpen: false, timeUntilExpiry: 0 });
    } catch (error) {
      logger.error('Failed to logout:', error);
    }
  };

  const handleCloseSessionWarning = () => {
    setSessionWarning({ isOpen: false, timeUntilExpiry: 0 });
  };

  useEffect(() => {
    logger.info('🔄 App initializing...');
    setupEventListeners();
    initializeApp();
    
    // Setup session warning listener
    if (eventBus) {
      eventBus.on('session-warning', handleSessionWarning);
    }
    
    return () => {
      // ✅ NEW: Cleanup WebSocket listeners on app unmount
      if (eventBus) {
        cleanupWebSocketListeners(eventBus);
        eventBus.off('session-warning', handleSessionWarning);
      }
    };
  }, []);

  // ✅ NEW: Setup global state WebSocket listeners
  useEffect(() => {
    if (eventBus && isAuthenticated) {
      logger.info('Setting up global state WebSocket listeners');
      setupWebSocketListeners(eventBus);
      
      return () => {
        logger.info('Cleaning up global state WebSocket listeners');
        cleanupWebSocketListeners(eventBus);
      };
    }
  }, [eventBus, isAuthenticated, setupWebSocketListeners, cleanupWebSocketListeners]);

  // ✅ FIXED: No more manual data loading - global state handles it automatically
  useEffect(() => {
    if (isAuthenticated && availableIDEs.length > 0) {
      const activeIDE = availableIDEs.find(ide => ide.active);
      if (activeIDE && activeIDE.workspacePath) {
        logger.info('App: active IDE initialized:', activeIDE.workspacePath);
      }
    }
  }, [isAuthenticated, availableIDEs]);

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
    
    // Immediate initialization - no artificial delay
    setIsLoading(false);
    if (eventBus) {
      eventBus.emit('app-ready');
    }
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
    logger.info('✅ App ready');
  };

  // Load active port ONLY after authentication
  useEffect(() => {
    if (isAuthenticated) {
      // Don't call loadActivePort here - IDEProvider will handle it
      logger.info('User authenticated, IDEProvider will handle IDE loading');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!eventBus) return;
    const handleActiveIDEChanged = (data) => {
      if (data && data.port) {
        // IDEStore will handle the port change automatically
        logger.info('Active IDE changed event received:', data.port);
        
        // ✅ FIXED: No need to load project data - global state handles it
        const activeIDE = availableIDEs.find(ide => ide.port === data.port);
        if (activeIDE && activeIDE.workspacePath) {
          logger.info('App: IDE switched to:', activeIDE.workspacePath);
        }
      }
    };
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    return () => {
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
    };
  }, [eventBus, availableIDEs]);

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
      case 'analyze':
        return <AnalysisDataViewer eventBus={eventBus} />;
      case 'git':
        return <GitManagementComponent 
          activePort={activePort} 
          eventBus={eventBus}
          onGitOperation={(operation, result) => {
            logger.info('Git operation completed:', operation, result);
            if (eventBus) {
              eventBus.emit('git-operation-completed', { operation, result });
            }
          }} 
        />;
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
      
      // ✅ NEW: Auto-refresh git status when git view is opened
      if (view === 'git') {
        logger.info('Git view opened - triggering auto-refresh');
        if (eventBus) {
          eventBus.emit('git-view-opened', { timestamp: Date.now() });
        }
      }
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
            version="1.0.0"
            message="Welcome to PIDEA! Your AI development assistant is ready to help."
          />

          {/* Global Notification System */}
          <NotificationSystem />
          
          {/* Session Warning Modal */}
          <SessionWarningModal
            isOpen={sessionWarning.isOpen}
            timeUntilExpiry={sessionWarning.timeUntilExpiry}
            onExtendSession={handleExtendSession}
            onLogout={handleSessionLogout}
            onClose={handleCloseSessionWarning}
          />
        </div>
      </IDEProvider>
    </AuthWrapper>
  );
}

export default App; 