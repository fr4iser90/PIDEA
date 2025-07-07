import React, { useState, useEffect } from 'react';

function Footer({ eventBus, activePort, gitStatus, version = 'dev', message = 'Welcome to PIDEA!' }) {
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
        <div className="status-item">
          <span className="status-label">Git:</span>
          <span className="status-value">
            {gitStatus?.branch ? `${gitStatus.repo}/${gitStatus.branch}` : 'N/A'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Port:</span>
          <span className="status-value">
            {activePort ? `:${activePort}` : 'N/A'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Status:</span>
          <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Time:</span>
          <span className="status-value">{formatTime(currentTime)}</span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Version:</span>
          <span className="status-value">v{version}</span>
        </div>
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
