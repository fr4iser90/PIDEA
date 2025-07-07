import React, { useState, useEffect } from 'react';

function Footer({ eventBus, activePort, gitStatus, gitBranch, version = 'dev', message = 'Welcome to PIDEA!' }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Update time every second
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

  const formatTime = (date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <footer className="app-footer">
      <div className="footer-status">
        <span className="footer-git" title={gitBranch ? `Branch: ${gitBranch}` : 'No Git repository detected'}>
          <span className="git-icon">Git-Branch:</span>
          {gitBranch ? (
            <span className="git-branch">{gitBranch}</span>
          ) : (
            <span className="git-branch git-unknown">No Repo</span>
          )}
          {gitStatus?.dirty && <span className="git-dirty" title="Uncommitted changes">*</span>}
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
    </footer>
  );
}

export default Footer;
