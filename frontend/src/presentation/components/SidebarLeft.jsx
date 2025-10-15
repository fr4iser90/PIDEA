import { logger } from "@/infrastructure/logging/Logger";
/**
 * SidebarLeft - Generic left sidebar container for different application modes
 * 
 * This component provides a generic left sidebar that:
 * - Manages IDE connections (generic, not chat-specific)
 * - Contains different panels based on application mode (chat, code, git, etc.)
 * - Handles sidebar visibility and toggle functionality
 * - Provides event-driven communication with other components
 * 
 * @class SidebarLeft
 */
import React, { useState, useEffect } from 'react';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { useProjectManagement } from '@/infrastructure/stores/hooks/useProjectStore';
import ChatPanelComponent from './chat/sidebar-left/ChatPanelComponent.jsx';
import ProjectListComponent from './project/ProjectListComponent.jsx';
import InterfaceManagerComponent from './interfaces/InterfaceManagerComponent.jsx';
import IDEStartModal from './ide/IDEStartModal.jsx';
import '@/scss/base/_sidebar-left.scss';

function SidebarLeft({ eventBus, activePort, onActivePortChange, mode = 'chat', showProjectAddModal, onShowProjectAddModal }) {
  logger.info('🔍 SidebarLeft RENDERING!');
  
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showIDEStartModal, setShowIDEStartModal] = useState(false);
  const [currentView, setCurrentView] = useState('projects'); // projects, interfaces, chat
  
  // Debug currentView changes
  useEffect(() => {
    logger.info('🔍 currentView changed to:', currentView);
  }, [currentView]);
  const [showInterfaces, setShowInterfaces] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const { isAuthenticated } = useAuthStore();
  
  // Use IDEStore instead of local state
  const { availableIDEs, loadAvailableIDEs } = useIDEStore();
  
  // Use ProjectStore for project management
  const { selectedProject, setSelectedProject } = useProjectManagement();

  // EventBus-Listener for sidebar-level events
  useEffect(() => {
    if (!eventBus) return;
    
    const handleIDEListUpdated = (data) => {
      // IDEContext will handle IDE loading, don't duplicate here
      logger.info('IDE list updated event received, IDEContext will handle loading');
    };
    
    const handleActiveIDEChanged = (data) => {
      if (onActivePortChange) onActivePortChange(data.port);
    };
    
    const handleLeftSidebarToggle = () => {
      const sidebar = document.querySelector('.sidebar-left');
      if (sidebar) {
        const isVisible = sidebar.style.display !== 'none';
        sidebar.style.display = isVisible ? 'none' : 'flex';
        logger.info('Left Sidebar toggled:', isVisible ? 'hidden' : 'visible');
      } else {
        logger.info('Left Sidebar element not found');
      }
    };

    const handleProjectSelected = (data) => {
      logger.info('Project selected:', data.projectId);
      setSelectedProject(data.projectId);
      setSelectedProject(data.projectId);
      setShowInterfaces(true);
      setShowChats(false);
      setCurrentView('interfaces');
    };

    const handleProjectCreated = (data) => {
      logger.info('Project created:', data.project);
      // Refresh project list
    };

    const handleInterfaceSwitched = (data) => {
      logger.info('Interface switched:', data.interfaceId);
      setShowChats(true);
      setCurrentView('chat');
    };

    // IDE Management Events
    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    eventBus.on('sidebar-left-toggle', handleLeftSidebarToggle);
    
    // Project Management Events
    eventBus.on('project-selected', handleProjectSelected);
    eventBus.on('project-created', handleProjectCreated);
    eventBus.on('interface-switched', handleInterfaceSwitched);
    
    return () => {
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
      eventBus.off('sidebar-left-toggle', handleLeftSidebarToggle);
      eventBus.off('project-selected', handleProjectSelected);
      eventBus.off('project-created', handleProjectCreated);
      eventBus.off('interface-switched', handleInterfaceSwitched);
    };
  }, [eventBus, onActivePortChange]);

  // Load IDE list on component mount ONLY if authenticated
  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      // IDEContext will handle IDE loading, don't duplicate here
      logger.info('User authenticated, IDEContext will handle IDE loading');
    }
  }, [isAuthenticated]);

  const handleNewIDE = () => {
    setShowIDEStartModal(true);
    eventBus.emit('sidebar-left:new-ide');
  };
  
  const handleIDEStartSuccess = (ideData) => {
    logger.info('IDE started successfully:', ideData);
    setShowIDEStartModal(false);
    
    // Switch to the new IDE if it has a port
    if (ideData.port && onActivePortChange) {
      onActivePortChange(ideData.port);
    }
    
    // Refresh IDE list
    loadAvailableIDEs();
    
    eventBus.emit('sidebar-left:ide-started', { ideData });
  };
  
  const handleIDEStartModalClose = () => {
    setShowIDEStartModal(false);
  };
  
  const handleSwitchDirectlyToIDE = async (port) => {
    try {
      // Use IDEStore.switchIDE() instead of direct API call to get caching
      const { switchIDE } = useIDEStore.getState();
      await switchIDE(port, 'sidebar');
      if (onActivePortChange) onActivePortChange(port);
      
      // Make IDE list refresh asynchronous to avoid blocking the switch
      setTimeout(() => {
        loadAvailableIDEs(); // IDEStore handles this - now async
      }, 100);
      
      eventBus.emit('sidebar-left:ide-switched', { port });
    } catch (error) {
      logger.error('Fehler beim Umschalten der IDE:', error.message, error.stack);
    }
  };
  
  const handleStopIDE = (port) => {
    if (window.confirm(`IDE auf Port ${port} wirklich stoppen?`)) {
      eventBus.emit('sidebar-left:ide:stop', { port });
    }
  };

  // IDE Icons mapping
  const getIDEIcon = (ideType) => {
    switch (ideType?.toLowerCase()) {
      case 'cursor':
        return '🎯'; // Cursor icon
      case 'vscode':
        return '💻'; // VS Code icon
      case 'windsurf':
        return '🏄'; // Windsurf icon
      case 'jetbrains':
        return '🛠️'; // JetBrains icon
      case 'sublime':
        return '📝'; // Sublime icon
      default:
        return '🖥️'; // Default IDE icon
    }
  };

  const getIDEName = (ideType) => {
    switch (ideType?.toLowerCase()) {
      case 'cursor':
        return 'Cursor';
      case 'vscode':
        return 'VS Code';
      case 'windsurf':
        return 'Windsurf';
      case 'jetbrains':
        return 'JetBrains';
      case 'sublime':
        return 'Sublime';
      default:
        return 'IDE';
    }
  };

  const handleSessionSelect = (sessionId) => {
    setCurrentSessionId(sessionId);
    eventBus.emit('sidebar-left:session-selected', { sessionId });
  };

  // Render the appropriate panel based on current view
  const renderMainContent = () => {
    logger.info('🔍 renderMainContent called with currentView:', currentView);
    switch (currentView) {
      case 'projects':
        return (
          <ProjectListComponent 
            eventBus={eventBus}
            onProjectSelect={setSelectedProject}
            showAddModal={showProjectAddModal}
            onCloseAddModal={() => onShowProjectAddModal(false)}
            onOpenAddModal={onShowProjectAddModal}
          />
        );
      case 'interfaces':
        return (
          <InterfaceManagerComponent 
            eventBus={eventBus}
            selectedProjectId={selectedProject}
          />
        );
      case 'chat':
        return (
          <ChatPanelComponent 
            eventBus={eventBus}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
          />
        );
      default:
        return <div className="default-panel">Select a view</div>;
    }
  };

  return (
    <div className="sidebar-left">
      <div className="sidebar-left-content">
        {/* Multi-Layer Navigation */}
        <div className="sidebar-navigation">
          {/* Meta Layer - Projects */}
          <div className="nav-section">
            <div className="nav-section-header">
              <h3>Meta Layer</h3>
            </div>
            <button 
              className={`nav-btn ${currentView === 'projects' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('projects');
                setShowInterfaces(false);
                setShowChats(false);
                setSelectedProject(null);
              }}
              title="Project Management"
            >
              📁 Projects
            </button>
          </div>

          {/* Project Layer - Interfaces */}
          {showInterfaces && (
            <div className="nav-section">
              <div className="nav-section-header">
                <h3>Project Layer</h3>
                <button 
                  className="nav-back-btn"
                  onClick={() => {
                    setShowInterfaces(false);
                    setShowChats(false);
                    setCurrentView('projects');
                    setSelectedProject(null);
                  }}
                  title="Back to Projects"
                >
                  ← Back
                </button>
              </div>
              <button 
                className={`nav-btn ${currentView === 'interfaces' ? 'active' : ''}`}
                onClick={() => setCurrentView('interfaces')}
                title="Interface Management"
              >
                🖥️ Interfaces
              </button>
            </div>
          )}

          {/* IDE Layer - Chats */}
          {showChats && (
            <div className="nav-section">
              <div className="nav-section-header">
                <h3>IDE Layer</h3>
                <button 
                  className="nav-back-btn"
                  onClick={() => {
                    setShowChats(false);
                    setCurrentView('interfaces');
                  }}
                  title="Back to Interfaces"
                >
                  ← Back
                </button>
              </div>
              <button 
                className={`nav-btn ${currentView === 'chat' ? 'active' : ''}`}
                onClick={() => setCurrentView('chat')}
                title="Chat Sessions"
              >
                💬 Chat
              </button>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div className="sidebar-content">
          {renderMainContent()}
        </div>
      </div>
      
          {/* IDE Start Modal */}
          {showIDEStartModal && (
            <IDEStartModal
              isOpen={showIDEStartModal}
              onClose={handleIDEStartModalClose}
              onSuccess={handleIDEStartSuccess}
            />
          )}
          
        </div>
      );
    }

export default SidebarLeft;