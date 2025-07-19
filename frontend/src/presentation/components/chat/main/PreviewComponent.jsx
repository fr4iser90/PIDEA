import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useRef } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository.jsx';
import PortConfigInput from './PortConfigInput.jsx';
import ProjectCommandButtons from './ProjectCommandButtons.jsx';
import { usePortConfiguration } from '@/hooks/usePortConfiguration.js';
import '@/css/main/preview.css';

function PreviewComponent({ eventBus, activePort, projectId = null }) {
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [showPortInput, setShowPortInput] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const apiRepository = new APIChatRepository();
  
  // Port configuration hook
  const { customPort, setCustomPort, validatePort } = usePortConfiguration();

  useEffect(() => {
    logger.info('🔄 PreviewComponent initializing...');
    setupEventListeners();
    initializePreview();
    
    return () => {
      cleanupPreview();
    };
  }, []);

  // Lade Preview immer, wenn activePort sich ändert (React-Way)
  useEffect(() => {
    logger.info('activePort changed:', activePort);
    if (activePort) {
      logger.info('Loading preview for port:', activePort);
      handleRefresh();
    }
  }, [activePort]);

  useEffect(() => {
    if (!eventBus) return;
    eventBus.on('activeIDEChanged', handleIDEChanged);
    eventBus.on('open-port-config', handleOpenPortConfig);
    return () => {
      eventBus.off('activeIDEChanged', handleIDEChanged);
      eventBus.off('open-port-config', handleOpenPortConfig);
    };
  }, [eventBus]);

  const setupEventListeners = () => {
    if (eventBus) {
      eventBus.on('preview-update', handlePreviewUpdate);
      eventBus.on('preview-refresh', handleRefresh);
      eventBus.on('preview-toggle-fullscreen', handleToggleFullscreen);
      eventBus.on('preview-toggle-compact', handleToggleCompact);
      
      // Listen for IDE changes and user app URL updates
      eventBus.on('activeIDEChanged', handleIDEChanged);
      eventBus.on('userAppUrl', handleUserAppUrl);
      eventBus.on('userAppDetected', handleUserAppUrl);
    }
  };

  const handleIDEChanged = async (data) => {
    logger.info('🔄 [PreviewComponent] Active IDE changed:', data);
    // Refresh preview data when IDE changes
    await handleRefresh();
  };

  const handleOpenPortConfig = () => {
    logger.info('PreviewComponent: Opening port config...');
    setShowPortInput(true);
  };

  const handleUserAppUrl = (data) => {
    logger.info('🔄 [PreviewComponent] User app URL received:', data);
    if (data.url) {
      const previewData = {
        url: data.url,
        title: `Preview - User App${data.port ? ` (IDE: ${data.port})` : ''}`,
        timestamp: new Date().toISOString(),
        port: data.port,
        workspacePath: data.workspacePath
      };
      setPreviewData(previewData);
      setError(null);
    }
  };

  const initializePreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use existing IDE endpoints to get user app URL
        await loadPreviewData();
    } catch (error) {
      logger.error('❌ Failed to initialize preview:', error);
      setError('Failed to initialize preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewUpdate = (data) => {
    setPreviewData(data);
  };

  const handleRefresh = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await loadPreviewData();
      
      // Add refresh animation
      if (containerRef.current) {
        containerRef.current.classList.add('preview-refreshing');
        setTimeout(() => {
          containerRef.current?.classList.remove('preview-refreshing');
        }, 500);
      }
    } catch (error) {
      logger.error('❌ Failed to refresh preview:', error);
      setError('Failed to refresh preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleToggleCompact = () => {
    setIsCompact(!isCompact);
  };

  const loadPreviewData = async () => {
    try {
      let previewUrl = null;
      let port = null;
      let workspacePath = null;
      
      // Priority: custom port > active port > fallback
      const effectivePort = customPort || activePort;
      
      // If we have an effective port, try to get user app URL for that specific port
      if (effectivePort) {
        logger.info('Getting user app URL for port:', effectivePort);
        const result = await apiRepository.getUserAppUrlForPort(effectivePort);
        
        if (result.success && result.data && result.data.url) {
          logger.info('Found user app URL for port:', result.data.url);
          previewUrl = result.data.url;
          port = result.data.port;
          workspacePath = result.data.workspacePath;
        } else {
          logger.info('No user app URL found for port, trying fallback...');
        }
      }
      
      // Fallback to general user app URL if port-specific failed
      if (!previewUrl) {
        logger.info('Trying general user app URL...');
        const result = await apiRepository.getUserAppUrl();
        
        if (result.success && result.data && result.data.url) {
          logger.info('Found user app URL:', result.data.url);
          previewUrl = result.data.url;
          port = result.data.port;
          workspacePath = result.data.workspacePath;
        } else {
          logger.info('No user app URL found in any IDE workspace');
          throw new Error('No frontend URL found in any available IDE workspace');
        }
      }

      const previewData = {
        url: previewUrl,
        title: `Preview - User App${port ? ` (IDE: ${port})` : ''}`,
        timestamp: new Date().toISOString(),
        port: port,
        workspacePath: workspacePath
      };

      setPreviewData(previewData);
    } catch (error) {
      logger.error('❌ Failed to load preview data:', error);
      throw error;
    }
  };

  const cleanupPreview = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    // Remove event listeners
    if (eventBus) {
      eventBus.off('preview-update', handlePreviewUpdate);
      eventBus.off('preview-refresh', handleRefresh);
      eventBus.off('preview-toggle-fullscreen', handleToggleFullscreen);
      eventBus.off('preview-toggle-compact', handleToggleCompact);
      eventBus.off('activeIDEChanged', handleIDEChanged);
      eventBus.off('userAppUrl', handleUserAppUrl);
      eventBus.off('userAppDetected', handleUserAppUrl);
    }
  };

  const startAutoRefresh = (interval = 5000) => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    const newInterval = setInterval(() => {
      handleRefresh();
    }, interval);
    
    setRefreshInterval(newInterval);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Port configuration handlers
  const handlePortChange = async (newPort) => {
    try {
      logger.info('Port input changed:', newPort);
      // DON'T set custom port here - only store the input value
      // The port will be set only after validation in handlePortValidate
    } catch (error) {
      logger.error('Failed to handle port change:', error);
    }
  };

  const handlePortValidate = async (validationResult) => {
    try {
      logger.info('Port validation result:', validationResult);
      if (validationResult.isValid && validationResult.port) {
        logger.info('Setting custom port:', validationResult.port);
        setCustomPort(validationResult.port);
        
        // Save port to database for current project
        if (activePort) {
          try {
            // Get current project from IDE port
            const projectResult = await apiRepository.getProjectByIDEPort(activePort);
            if (projectResult.success && projectResult.data) {
              const project = projectResult.data;
              
              // Save frontend port to database
              const saveResult = await apiRepository.saveProjectPort(project.id, validationResult.port, 'frontend');
              if (saveResult.success) {
                logger.info('Port saved to database for project:', project.id);
              } else {
                logger.warn('Failed to save port to database:', saveResult.error);
              }
            }
          } catch (error) {
            logger.error('Failed to save port to database:', error);
          }
        }
        
        // Immediately create preview data with the validated port
        // Don't wait for state update - use the port directly
        const newPreviewData = {
          url: `http://localhost:${validationResult.port}`,
          title: `Preview - User App (Port: ${validationResult.port})`,
          timestamp: new Date().toISOString(),
          port: validationResult.port,
          workspacePath: null
        };
        setPreviewData(newPreviewData);
        setError(null);
        logger.info('Preview data updated with port:', validationResult.port);
      }
    } catch (error) {
      logger.error('Failed to handle port validation:', error);
    }
  };

  // Load project ports from database
  const loadProjectPorts = async () => {
    try {
      if (activePort) {
        const projectResult = await apiRepository.getProjectByIDEPort(activePort);
        if (projectResult.success && projectResult.data) {
          const project = projectResult.data;
          
          // Set custom port from database
          if (project.frontendPort) {
            setCustomPort(project.frontendPort);
            logger.info('Loaded frontend port from database:', project.frontendPort);
            
            // Create preview data with loaded port
            const newPreviewData = {
              url: `http://localhost:${project.frontendPort}`,
              title: `Preview - User App (Port: ${project.frontendPort})`,
              timestamp: new Date().toISOString(),
              port: project.frontendPort,
              workspacePath: project.workspacePath
            };
            setPreviewData(newPreviewData);
            setError(null);
            logger.info('Preview data updated with loaded port:', project.frontendPort);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load project ports from database:', error);
    }
  };

  // Load project ports when activePort changes
  useEffect(() => {
    if (activePort) {
      loadProjectPorts();
    }
  }, [activePort]);

  // Command execution handlers
  const handleCommandExecute = async (commandType, result) => {
    try {
      logger.info('Command executed:', commandType, result);
      
      // Refresh preview after command execution
      if (commandType === 'start' || commandType === 'dev') {
        // Wait a bit for the server to start
        setTimeout(async () => {
          await handleRefresh();
        }, 2000);
      }
    } catch (error) {
      logger.error('Failed to handle command execution:', error);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load preview content');
    setIsLoading(false);
  };

  const openInNewTab = () => {
    if (previewData && previewData.url) {
      window.open(previewData.url, '_blank');
    }
  };

  const downloadPreview = () => {
    if (previewData && previewData.html) {
      const blob = new Blob([previewData.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'preview.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getPreviewClasses = () => {
    const classes = ['preview-container'];
    if (previewData) classes.push('preview-visible');
    if (isCompact) classes.push('preview-compact');
    if (isFullscreen) classes.push('preview-fullscreen');
    return classes.join(' ');
  };

  const getIframeUrl = () => {
    if (!previewData || !previewData.url) return 'about:blank';
    const baseUrl = previewData.url;
    const sep = baseUrl.includes('?') ? '&' : '?';
    return baseUrl + sep + 't=' + Date.now();
  };

  if (isFullscreen) {
    return (
      <div className="preview-modal-overlay modal-visible">
        <div className="preview-modal">
          <div className="preview-modal-header">
            <h3>Preview - Fullscreen</h3>
            <button onClick={handleToggleFullscreen} className="modal-close-btn">
              ✕
            </button>
          </div>
          <div className="preview-modal-content">
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="loading-spinner"></div>
                <p>Loading preview...</p>
              </div>
            )}
            {error && (
              <div className="error-message">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {previewData && !isLoading && !error && (
              <iframe
                key={previewData.url}
                ref={iframeRef}
                src={getIframeUrl()}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={getPreviewClasses()}>
      {/* Preview Header */}
      <div className="preview-header">
        <div className="preview-title">
          <span className="preview-icon">👁️</span>
          <span className="preview-text">Preview</span>
        </div>
        
        {/* Port configuration when no project URL is available or when manually opened */}
        {(!previewData?.url && !isLoading) || showPortInput ? (
          <div className="port-config-section">
            <PortConfigInput
              onPortChange={handlePortChange}
              onPortValidate={handlePortValidate}
              initialPort={customPort}
              disabled={isLoading}
              onClose={() => setShowPortInput(false)}
            />
          </div>
        ) : null}
        
        {/* Command execution buttons */}
        {projectId && (
          <ProjectCommandButtons
            projectId={projectId}
            activePort={activePort || customPort}
            onCommandExecute={handleCommandExecute}
            className="header-command-buttons"
          />
        )}
        
        <div className="preview-actions">
          <button
            onClick={handleRefresh}
            className="preview-btn"
            title="Refresh preview"
            disabled={isLoading}
          >
            <span className="btn-icon">🔄</span>
          </button>
          
          <button
            onClick={handleOpenPortConfig}
            className="preview-btn"
            title="Port Configuration"
          >
            <span className="btn-icon">🔌</span>
          </button>
          
          <button
            onClick={handleToggleCompact}
            className="preview-btn"
            title={isCompact ? 'Expand preview' : 'Compact preview'}
          >
            <span className="btn-icon">{isCompact ? '⤢' : '⤡'}</span>
          </button>
          
          <button
            onClick={openInNewTab}
            className="preview-btn"
            title="Open in new tab"
            disabled={!previewData}
          >
            <span className="btn-icon">🔗</span>
          </button>
          
          <button
            onClick={handleToggleFullscreen}
            className="preview-btn"
            title="Toggle fullscreen"
          >
            <span className="btn-icon">⛶</span>
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="preview-content">
        {!previewData && !isLoading && !error && (
          <div className="preview-placeholder">
            <div className="preview-placeholder-icon">👁️</div>
            <h3>No Preview Available</h3>
            <p>Select a file or generate content to see a preview here.</p>
          </div>
        )}
        
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div className="loading-spinner"></div>
            <p>Loading preview...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={handleRefresh} className="btn-secondary">
              Retry
            </button>
          </div>
        )}
        
        {previewData && !isLoading && !error && (
          <iframe
            key={previewData.url}
            ref={iframeRef}
            src={getIframeUrl()}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>

      {/* Floating Actions */}
      <div className="preview-floating-actions">
        <button
          onClick={downloadPreview}
          className="floating-action-btn"
          title="Download preview"
          disabled={!previewData}
        >
          <span className="btn-icon">💾</span>
        </button>
        
        <button
          onClick={() => startAutoRefresh(5000)}
          className="floating-action-btn"
          title="Start auto-refresh"
        >
          <span className="btn-icon">⏱️</span>
        </button>
        
        <button
          onClick={stopAutoRefresh}
          className="floating-action-btn"
          title="Stop auto-refresh"
          disabled={!refreshInterval}
        >
          <span className="btn-icon">⏹️</span>
        </button>
      </div>
    </div>
  );
}

export default PreviewComponent; 