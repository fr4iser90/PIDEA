import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useRef } from 'react';
import './TerminalLogDisplay.css';

/**
 * Terminal Log Display Component
 * 
 * Displays terminal logs with real-time updates, search functionality,
 * and export capabilities. Integrates with the terminal log capture API.
 */
const TerminalLogDisplay = ({ port, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [captureStatus, setCaptureStatus] = useState(null);
  const [lines, setLines] = useState(50);
  const [exportFormat, setExportFormat] = useState('json');
  const [exporting, setExporting] = useState(false);
  
  const logContainerRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // API base URL
  const API_BASE = process.env.VITE_BACKEND_URL + '/api';

  /**
   * Fetch terminal logs from API
   */
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/terminal-logs/${port}?lines=${lines}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      logger.error('Error fetching logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search logs
   */
  const searchLogs = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      const params = new URLSearchParams({
        q: searchText,
        maxResults: 100
      });
      
      const response = await fetch(`${API_BASE}/terminal-logs/${port}/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err) {
      logger.error('Error searching logs:', err);
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Get capture status
   */
  const fetchCaptureStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/terminal-logs/${port}/capture-status`);
      const data = await response.json();
      
      if (data.success) {
        setCaptureStatus(data.captureStatus);
      }
    } catch (err) {
      logger.error('Error fetching capture status:', err);
    }
  };

  /**
   * Initialize terminal log capture
   */
  const initializeCapture = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/terminal-logs/${port}/initialize`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchCaptureStatus();
        await fetchLogs();
      } else {
        throw new Error(data.error || 'Failed to initialize capture');
      }
    } catch (err) {
      logger.error('Error initializing capture:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute command with capture
   */
  const executeCommand = async (command) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/terminal-logs/${port}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh logs after command execution
        setTimeout(() => fetchLogs(), 2000);
      } else {
        throw new Error(data.error || 'Failed to execute command');
      }
    } catch (err) {
      logger.error('Error executing command:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export logs
   */
  const exportLogs = async () => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams({
        format: exportFormat,
        lines: lines
      });
      
      const response = await fetch(`${API_BASE}/terminal-logs/${port}/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-logs-port-${port}-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      logger.error('Error exporting logs:', err);
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Clear logs
   */
  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to delete all logs for this port?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/terminal-logs/${port}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setLogs([]);
        setSearchResults([]);
        setCaptureStatus(null);
      } else {
        throw new Error(data.error || 'Failed to clear logs');
      }
    } catch (err) {
      logger.error('Error clearing logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Scroll to bottom of log container
   */
  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  /**
   * Get log level color
   */
  const getLogLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return '#ff6b6b';
      case 'warn':
        return '#ffd93d';
      case 'info':
        return '#6bcf7f';
      case 'debug':
        return '#4dabf7';
      default:
        return '#868e96';
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchLogs();
        fetchCaptureStatus();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, port, lines]);

  // Initial load
  useEffect(() => {
    fetchCaptureStatus();
    fetchLogs();
  }, [port, lines]);

  // Search debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLogs();
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const displayLogs = searchResults.length > 0 ? searchResults : logs;

  return (
    <div className="terminal-log-display">
      {/* Header */}
      <div className="terminal-log-header">
        <div className="terminal-log-title">
          <h3>Terminal Logs - Port {port}</h3>
          {captureStatus && (
            <span className={`capture-status ${captureStatus.active ? 'active' : 'inactive'}`}>
              {captureStatus.active ? '● Active' : '○ Inactive'}
            </span>
          )}
        </div>
        
        <div className="terminal-log-controls">
          <button 
            className="btn btn-primary"
            onClick={initializeCapture}
            disabled={loading}
          >
            {loading ? 'Initializing...' : 'Initialize Capture'}
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          
          <button 
            className="btn btn-danger"
            onClick={clearLogs}
            disabled={loading}
          >
            Clear Logs
          </button>
          
          <button 
            className="btn btn-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="terminal-log-settings">
        <div className="settings-group">
          <label>
            Lines to show:
            <select 
              value={lines} 
              onChange={(e) => setLines(parseInt(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
        </div>

        <div className="settings-group">
          <label>
            <input 
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          
          {autoRefresh && (
            <select 
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          )}
        </div>

        <div className="settings-group">
          <label>
            Export format:
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">Text</option>
            </select>
          </label>
          
          <button 
            className="btn btn-export"
            onClick={exportLogs}
            disabled={exporting || logs.length === 0}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <div className="terminal-log-search">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input"
        />
        
        {searching && <span className="searching-indicator">Searching...</span>}
        
        {searchResults.length > 0 && (
          <span className="search-results-count">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Command Input */}
      <div className="terminal-log-command">
        <input
          type="text"
          placeholder="Enter command to execute..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              executeCommand(e.target.value.trim());
              e.target.value = '';
            }
          }}
          className="command-input"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="terminal-log-error">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Logs Container */}
      <div className="terminal-log-container" ref={logContainerRef}>
        {displayLogs.length === 0 ? (
          <div className="no-logs">
            {loading ? 'Loading logs...' : 'No logs available'}
          </div>
        ) : (
          displayLogs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className="log-entry">
              <span className="log-timestamp">
                {formatTimestamp(log.timestamp)}
              </span>
              <span 
                className="log-level"
                style={{ color: getLogLevelColor(log.level) }}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span className="log-text">{log.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="terminal-log-footer">
        <span className="log-count">
          {displayLogs.length} log entr{displayLogs.length !== 1 ? 'ies' : 'y'}
        </span>
        
        {captureStatus && (
          <span className="capture-info">
            File: {captureStatus.logFileExists ? '✓' : '✗'} | 
            Encrypted: {captureStatus.encryptedLogExists ? '✓' : '✗'}
          </span>
        )}
      </div>
    </div>
  );
};

export default TerminalLogDisplay; 