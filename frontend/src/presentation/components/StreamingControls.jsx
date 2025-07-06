import React, { useState, useEffect } from 'react';

/**
 * StreamingControls Component
 * 
 * Provides UI controls for managing IDE screenshot streaming
 * including start/stop, configuration, and performance monitoring.
 */
const StreamingControls = ({
  sessionId,
  port,
  onStartStreaming,
  onStopStreaming,
  onUpdateConfig,
  onPause,
  onResume,
  isStreaming = false,
  isPaused = false,
  className = '',
  style = {}
}) => {
  const [config, setConfig] = useState({
    fps: 10,
    quality: 0.8,
    format: 'webp',
    maxFrameSize: 50 * 1024,
    enableRegionDetection: false
  });

  const [stats, setStats] = useState({
    frameCount: 0,
    fps: 0,
    bandwidth: 0,
    latency: 0,
    errorCount: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update stats periodically
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ide-mirror/${port}/stream/session/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.session) {
            setStats({
              frameCount: data.session.frameCount || 0,
              fps: data.session.frameRate || 0,
              bandwidth: data.session.bandwidthUsage || 0,
              latency: data.session.averageLatency || 0,
              errorCount: data.session.errorCount || 0
            });
          }
        }
      } catch (error) {
        console.error('[StreamingControls] Error fetching stats:', error.message);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, sessionId, port]);

  /**
   * Handle start streaming
   */
  const handleStartStreaming = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (onStartStreaming) {
        await onStartStreaming(sessionId, port, config);
      } else {
        // Default API call
        const response = await fetch(`/api/ide-mirror/${port}/stream/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            ...config
          })
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to start streaming');
        }
      }
    } catch (error) {
      console.error('[StreamingControls] Error starting streaming:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle stop streaming
   */
  const handleStopStreaming = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (onStopStreaming) {
        await onStopStreaming(sessionId);
      } else {
        // Default API call
        const response = await fetch(`/api/ide-mirror/${port}/stream/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sessionId })
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to stop streaming');
        }
      }
    } catch (error) {
      console.error('[StreamingControls] Error stopping streaming:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle pause streaming
   */
  const handlePause = async () => {
    try {
      if (onPause) {
        await onPause(sessionId);
      } else {
        const response = await fetch(`/api/ide-mirror/${port}/stream/session/${sessionId}/pause`, {
          method: 'POST'
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to pause streaming');
        }
      }
    } catch (error) {
      console.error('[StreamingControls] Error pausing streaming:', error.message);
      setError(error.message);
    }
  };

  /**
   * Handle resume streaming
   */
  const handleResume = async () => {
    try {
      if (onResume) {
        await onResume(sessionId);
      } else {
        const response = await fetch(`/api/ide-mirror/${port}/stream/session/${sessionId}/resume`, {
          method: 'POST'
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to resume streaming');
        }
      }
    } catch (error) {
      console.error('[StreamingControls] Error resuming streaming:', error.message);
      setError(error.message);
    }
  };

  /**
   * Handle configuration update
   */
  const handleConfigUpdate = async (newConfig) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);

      if (onUpdateConfig) {
        await onUpdateConfig(sessionId, updatedConfig);
      } else if (isStreaming) {
        // Update via API if streaming
        const response = await fetch(`/api/ide-mirror/${port}/stream/session/${sessionId}/config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedConfig)
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update configuration');
        }
      }
    } catch (error) {
      console.error('[StreamingControls] Error updating config:', error.message);
      setError(error.message);
    }
  };

  /**
   * Format bandwidth for display
   */
  const formatBandwidth = (bytesPerSecond) => {
    if (bytesPerSecond < 1024) {
      return `${Math.round(bytesPerSecond)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    } else {
      return `${Math.round(bytesPerSecond / (1024 * 1024) * 100) / 100} MB/s`;
    }
  };

  return (
    <div className={`streaming-controls ${className}`} style={style}>
      {/* Error display */}
      {error && (
        <div className="error-message" style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px',
          border: '1px solid #ffcdd2'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="config-panel" style={{
        background: '#f5f5f5',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Streaming Configuration</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* FPS Control */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              FPS: {config.fps}
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={config.fps}
              onChange={(e) => handleConfigUpdate({ fps: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Quality Control */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Quality: {Math.round(config.quality * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={config.quality}
              onChange={(e) => handleConfigUpdate({ quality: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Format Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Format:
            </label>
            <select
              value={config.format}
              onChange={(e) => handleConfigUpdate({ format: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="webp">WebP (Better compression)</option>
              <option value="jpeg">JPEG (Better compatibility)</option>
            </select>
          </div>

          {/* Region Detection */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Region Detection:
            </label>
            <input
              type="checkbox"
              checked={config.enableRegionDetection}
              onChange={(e) => handleConfigUpdate({ enableRegionDetection: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '14px' }}>Enable (experimental)</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="control-buttons" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {!isStreaming ? (
          <button
            onClick={handleStartStreaming}
            disabled={isLoading}
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Starting...' : 'Start Streaming'}
          </button>
        ) : (
          <>
            <button
              onClick={handleStopStreaming}
              disabled={isLoading}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Stopping...' : 'Stop Streaming'}
            </button>

            {!isPaused ? (
              <button
                onClick={handlePause}
                style={{
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                style={{
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Resume
              </button>
            )}
          </>
        )}
      </div>

      {/* Statistics Panel */}
      {isStreaming && (
        <div className="stats-panel" style={{
          background: '#e3f2fd',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1976d2' }}>
            Streaming Statistics
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <strong>Frames:</strong> {stats.frameCount.toLocaleString()}
            </div>
            <div>
              <strong>FPS:</strong> {stats.fps.toFixed(1)}
            </div>
            <div>
              <strong>Bandwidth:</strong> {formatBandwidth(stats.bandwidth)}
            </div>
            <div>
              <strong>Latency:</strong> {Math.round(stats.latency)}ms
            </div>
            <div>
              <strong>Errors:</strong> {stats.errorCount}
            </div>
            <div>
              <strong>Status:</strong> {isPaused ? 'Paused' : 'Active'}
            </div>
          </div>
        </div>
      )}

      {/* Session Info */}
      <div className="session-info" style={{
        background: '#f9f9f9',
        padding: '12px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        <div><strong>Session ID:</strong> {sessionId}</div>
        <div><strong>Port:</strong> {port}</div>
        <div><strong>Status:</strong> {isStreaming ? (isPaused ? 'Paused' : 'Active') : 'Inactive'}</div>
      </div>
    </div>
  );
};

export default StreamingControls; 