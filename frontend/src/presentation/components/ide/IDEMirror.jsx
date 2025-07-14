import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import '@/css/components/ide/ide-mirror.css';

/**
 * IDE Mirror Component
 * Provides unified DOM display with IDE-agnostic interactions and real-time updates
 */
const IDEMirror = ({ 
  eventBus, 
  activePort, 
  className = '',
  showControls = true,
  autoRefresh = true,
  refreshInterval = 2000,
  highlightElements = true,
  showElementInfo = true
}) => {
  const [domData, setDomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [interactionMode, setInteractionMode] = useState('view'); // view, select, interact
  const [highlightedElements, setHighlightedElements] = useState([]);
  const [mirrorStatus, setMirrorStatus] = useState('disconnected');
  const [refreshTimer, setRefreshTimer] = useState(null);
  const mirrorRef = useRef(null);

  // Load DOM data when activePort changes
  useEffect(() => {
    if (activePort) {
      loadDOMData();
      checkMirrorStatus();
    } else {
      setDomData(null);
      setMirrorStatus('disconnected');
    }
  }, [activePort]);

  // Set up auto-refresh timer
  useEffect(() => {
    if (autoRefresh && activePort && refreshInterval > 0) {
      const timer = setInterval(() => {
        if (mirrorStatus === 'connected') {
          loadDOMData();
        }
      }, refreshInterval);
      setRefreshTimer(timer);

      return () => {
        clearInterval(timer);
        setRefreshTimer(null);
      };
    }
  }, [autoRefresh, activePort, refreshInterval, mirrorStatus]);

  // Listen for mirror events
  useEffect(() => {
    if (!eventBus) return;

    const handleDOMUpdated = (data) => {
      if (data.port === activePort) {
        setDomData(data.dom);
        setLastUpdate(new Date());
        setError(null);
      }
    };

    const handleMirrorStatusChanged = (data) => {
      if (data.port === activePort) {
        setMirrorStatus(data.status);
        if (data.status === 'connected') {
          loadDOMData();
        }
      }
    };

    const handleElementInteraction = (data) => {
      if (data.port === activePort) {
        setSelectedElement(data.element);
        if (data.action === 'highlight') {
          setHighlightedElements(prev => [...prev, data.element]);
        }
      }
    };

    eventBus.on('domUpdated', handleDOMUpdated);
    eventBus.on('mirrorStatusChanged', handleMirrorStatusChanged);
    eventBus.on('elementInteraction', handleElementInteraction);

    return () => {
      eventBus.off('domUpdated', handleDOMUpdated);
      eventBus.off('mirrorStatusChanged', handleMirrorStatusChanged);
      eventBus.off('elementInteraction', handleElementInteraction);
    };
  }, [eventBus, activePort]);

  /**
   * Load DOM data from API
   */
  const loadDOMData = async () => {
    if (!activePort) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await apiCall(`/api/ide/mirror/dom?port=${activePort}`);
      if (result.success) {
        setDomData(result.data);
        setLastUpdate(new Date());
        setMirrorStatus('connected');
      } else {
        throw new Error(result.error || 'Failed to load DOM data');
      }
    } catch (error) {
      logger.error('Error loading DOM data:', error);
      setError(error.message);
      setMirrorStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check mirror status
   */
  const checkMirrorStatus = async () => {
    if (!activePort) return;

    try {
      const result = await apiCall(`/api/ide/mirror/status?port=${activePort}`);
      if (result.success) {
        setMirrorStatus(result.data.status || 'unknown');
      }
    } catch (error) {
      logger.error('Error checking mirror status:', error);
      setMirrorStatus('error');
    }
  };

  /**
   * Interact with IDE element
   */
  const interactWithElement = async (elementId, action, data = {}) => {
    if (!activePort) return;

    try {
      const result = await apiCall('/api/ide/mirror/interact', {
        method: 'POST',
        body: JSON.stringify({
          port: activePort,
          elementId,
          action,
          data
        })
      });

      if (result.success) {
        // Emit interaction event
        if (eventBus) {
          eventBus.emit('elementInteraction', {
            port: activePort,
            elementId,
            action,
            data: result.data
          });
        }

        // Refresh DOM data if needed
        if (action === 'click' || action === 'input') {
          setTimeout(loadDOMData, 500);
        }
      } else {
        throw new Error(result.error || 'Interaction failed');
      }
    } catch (error) {
      logger.error('Error interacting with element:', error);
      setError(error.message);
    }
  };

  /**
   * Handle element click
   */
  const handleElementClick = (element) => {
    setSelectedElement(element);
    
    if (interactionMode === 'interact') {
      interactWithElement(element.id, 'click');
    } else if (interactionMode === 'select') {
      setHighlightedElements(prev => [...prev, element]);
    }
  };

  /**
   * Handle element hover
   */
  const handleElementHover = (element) => {
    if (highlightElements && interactionMode === 'view') {
      setHighlightedElements([element]);
    }
  };

  /**
   * Handle element leave
   */
  const handleElementLeave = () => {
    if (interactionMode === 'view') {
      setHighlightedElements([]);
    }
  };

  /**
   * Get element display name
   */
  const getElementDisplayName = (element) => {
    if (element.tagName === 'INPUT' && element.type) {
      return `${element.tagName.toLowerCase()}[type="${element.type}"]`;
    }
    if (element.id) {
      return `${element.tagName.toLowerCase()}#${element.id}`;
    }
    if (element.className) {
      return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  };

  /**
   * Render DOM element
   */
  const renderElement = (element, depth = 0) => {
    const isSelected = selectedElement && selectedElement.id === element.id;
    const isHighlighted = highlightedElements.some(el => el.id === element.id);
    const displayName = getElementDisplayName(element);

    return (
      <div
        key={element.id || `${element.tagName}-${depth}-${Math.random()}`}
        className={`dom-element depth-${depth} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => handleElementClick(element)}
        onMouseEnter={() => handleElementHover(element)}
        onMouseLeave={handleElementLeave}
      >
        <div className="element-header">
          <span className="element-tag">{displayName}</span>
          {element.textContent && element.textContent.trim() && (
            <span className="element-text">
              "{element.textContent.trim().substring(0, 50)}"
            </span>
          )}
          {showElementInfo && (
            <div className="element-info">
              {element.id && <span className="element-id">#{element.id}</span>}
              {element.className && <span className="element-class">.{element.className}</span>}
            </div>
          )}
        </div>

        {element.children && element.children.length > 0 && (
          <div className="element-children">
            {element.children.map((child, index) => 
              renderElement(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Get mirror status display
   */
  const getMirrorStatus = () => {
    const statusConfig = {
      connected: { icon: '🟢', text: 'Connected', class: 'connected' },
      connecting: { icon: '🟡', text: 'Connecting...', class: 'connecting' },
      disconnected: { icon: '🔴', text: 'Disconnected', class: 'disconnected' },
      error: { icon: '🔴', text: 'Error', class: 'error' },
      unknown: { icon: '⚪', text: 'Unknown', class: 'unknown' }
    };

    const config = statusConfig[mirrorStatus] || statusConfig.unknown;

    return (
      <div className={`mirror-status ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        <span className="status-text">{config.text}</span>
        {lastUpdate && (
          <span className="last-update">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };

  /**
   * Get interaction controls
   */
  const getInteractionControls = () => {
    return (
      <div className="interaction-controls">
        <div className="mode-selector">
          <label>Mode:</label>
          <select 
            value={interactionMode} 
            onChange={(e) => setInteractionMode(e.target.value)}
          >
            <option value="view">View</option>
            <option value="select">Select</option>
            <option value="interact">Interact</option>
          </select>
        </div>

        <div className="action-buttons">
          <button
            onClick={loadDOMData}
            disabled={isLoading}
            className="refresh-button"
          >
            {isLoading ? '🔄' : '🔄'} Refresh
          </button>

          <button
            onClick={() => setHighlightedElements([])}
            className="clear-button"
          >
            🗑️ Clear Highlights
          </button>

          {selectedElement && (
            <button
              onClick={() => setSelectedElement(null)}
              className="deselect-button"
            >
              ❌ Deselect
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`ide-mirror ${className}`} ref={mirrorRef}>
      <div className="mirror-header">
        <h3>IDE Mirror - Port {activePort}</h3>
        {getMirrorStatus()}
      </div>

      {showControls && getInteractionControls()}

      <div className="mirror-content">
        {error && (
          <div className="mirror-error">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
            <button onClick={loadDOMData} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {isLoading && (
          <div className="mirror-loading">
            <span className="loading-icon">🔄</span>
            <span className="loading-text">Loading DOM data...</span>
          </div>
        )}

        {!isLoading && !error && domData && (
          <div className="dom-tree">
            <div className="tree-header">
              <h4>DOM Structure</h4>
              <span className="element-count">
                {domData.elementCount || 0} elements
              </span>
            </div>
            <div className="tree-content">
              {renderElement(domData.root || domData)}
            </div>
          </div>
        )}

        {!isLoading && !error && !domData && activePort && (
          <div className="mirror-empty">
            <span className="empty-icon">📄</span>
            <span className="empty-text">No DOM data available</span>
          </div>
        )}

        {!activePort && (
          <div className="mirror-disconnected">
            <span className="disconnected-icon">🔌</span>
            <span className="disconnected-text">No IDE connected</span>
          </div>
        )}
      </div>

      {selectedElement && (
        <div className="element-details">
          <h4>Selected Element</h4>
          <div className="element-properties">
            <div className="property">
              <span className="property-label">Tag:</span>
              <span className="property-value">{selectedElement.tagName}</span>
            </div>
            {selectedElement.id && (
              <div className="property">
                <span className="property-label">ID:</span>
                <span className="property-value">{selectedElement.id}</span>
              </div>
            )}
            {selectedElement.className && (
              <div className="property">
                <span className="property-label">Class:</span>
                <span className="property-value">{selectedElement.className}</span>
              </div>
            )}
            {selectedElement.textContent && (
              <div className="property">
                <span className="property-label">Text:</span>
                <span className="property-value">{selectedElement.textContent.trim()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IDEMirror; 