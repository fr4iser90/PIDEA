import React, { useState, useEffect } from 'react';
import { useGitStatus, useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';

function Footer({ eventBus, activePort, version = 'dev', message = 'Welcome to PIDEA!' }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // ✅ REFACTORED: Use global state selectors instead of local state
  const gitStatus = useGitStatus();
  const activeIDE = useActiveIDE();

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check online status
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);

  // ✅ REFACTORED: No need for individual API calls - data comes from global state
  // Git status and branch information are now automatically available from the store

  const formatTime = (date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // ✅ REFACTORED: Use global state for git information
  const currentBranch = gitStatus.currentBranch;
  const hasChanges = gitStatus.hasChanges;

  return (
    <footer className="app-footer">
      <div className="footer-status">
        <span className="footer-git" title={currentBranch ? `Branch: ${currentBranch}` : 'No Git repository detected'}>
          <span className="git-icon">Git-Branch:</span>
          {currentBranch ? (
            <span className="git-branch">{currentBranch}</span>
          ) : (
            <span className="git-branch git-unknown">No Repo</span>
          )}
          {hasChanges && <span className="git-dirty" title="Uncommitted changes">*</span>}
        </span>
        <span className="status-item">Port: <span className="status-value">{activePort ? `:${activePort}` : 'N/A'}</span></span>
        <span className="status-item">Status: <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>{isOnline ? '🟢 Online' : '🔴 Offline'}</span></span>
        <span className="status-item">Time: <span className="status-value">{formatTime(currentTime)}</span></span>
        <span className="status-item">Version: <span className="status-value">v{version}</span></span>
      </div>
      
      <div className="footer-marquee">
        <div className="marquee-container">
          <div className="marquee-content">
            {message}
          </div>
        </div>
      </div>
      <div className="footer-images" style={{ display: 'flex', gap: '10px', marginLeft: '10px' }}>
        <img src="/big.png" alt="Big Icon" style={{ height: '24px' }} />
      </div>
    </footer>
  );
}

export default Footer;
