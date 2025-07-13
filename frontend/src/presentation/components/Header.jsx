import { logger } from "@/infrastructure/logging/Logger";
import React from 'react';
import UserMenu from './auth/UserMenu.jsx';

function Header({ eventBus, currentView, onNavigationClick, onLeftSidebarToggle, onRightSidebarToggle }) {
  const handleNavigationClick = (view) => {
    if (onNavigationClick) {
      onNavigationClick(view);
    }
  };

  const handleLeftSidebarToggle = () => {
    if (onLeftSidebarToggle) {
      onLeftSidebarToggle();
    }
    if (eventBus) {
      eventBus.emit('sidebar-left-toggle');
    }
  };

  const handleRightSidebarToggle = () => {
    logger.log('Header right sidebar button clicked');
    if (onRightSidebarToggle) {
      onRightSidebarToggle();
    }
    if (eventBus) {
      eventBus.emit('sidebar-right-toggle');
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">PIDEA - Your personal AI agent</h1>
        
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
          onClick={handleLeftSidebarToggle}
          className="btn-icon"
          title="Toggle Left Sidebar"
        >
          📁
        </button>
        <button
          onClick={handleRightSidebarToggle}
          className="btn-icon"
          title="Toggle Right Sidebar"
        >
          📋
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

export default Header;
