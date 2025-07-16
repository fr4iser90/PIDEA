import React, { useState, useEffect, useMemo, useRef } from 'react';
import mermaid from 'mermaid';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Logger } from '@/infrastructure/logging/Logger';

const logger = new Logger('AnalysisArchitecture');

const AnalysisArchitecture = ({ architecture, loading, error }) => {
  const [activeTab, setActiveTab] = useState('diagram');
  const [diagramSvg, setDiagramSvg] = useState(null);
  const [diagramError, setDiagramError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const diagramRef = useRef(null);
  const [network, setNetwork] = useState(null);
  const networkRef = useRef(null);

  // Add debugging
  console.log('🏗️ [AnalysisArchitecture] Received props:', { architecture, loading, error });

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: true,
        diagramMarginX: 50,
        diagramMarginY: 10
      },
      gantt: {
        useMaxWidth: true
      }
    });
  }, []);

  // Detect if graph is nodes/edges or Mermaid string
  const isObjectGraph = useMemo(() => {
    const g = architecture?.dependencies?.graph;
    return g && typeof g === 'object' && Array.isArray(g.nodes) && Array.isArray(g.edges);
  }, [architecture]);

  // Render vis-network if nodes/edges object
  useEffect(() => {
    if (!isObjectGraph || !networkRef.current) return;
    const { nodes, edges } = architecture.dependencies.graph;
    const visNodes = new DataSet(nodes.map(n => ({
      id: n.id,
      label: n.name,
      group: n.layer || n.type || 'unknown',
    })));
    const visEdges = new DataSet(edges.map(e => ({ from: e.from, to: e.to, label: e.type })));
    const data = { nodes: visNodes, edges: visEdges };
    const options = {
      nodes: { shape: 'box', font: { size: 14 } },
      edges: { arrows: 'to', font: { align: 'middle' } },
      groups: {
        controller: { color: '#f39c12' },
        service: { color: '#27ae60' },
        model: { color: '#2980b9' },
        repository: { color: '#8e44ad' },
        utility: { color: '#7f8c8d' },
        component: { color: '#95a5a6' }
      },
      layout: { hierarchical: false },
      physics: { enabled: true }
    };
    if (network) network.destroy();
    const net = new Network(networkRef.current, data, options);
    setNetwork(net);
    return () => net && net.destroy();
  }, [isObjectGraph, architecture]);

  // Render Mermaid diagram
  useEffect(() => {
    if (!architecture?.dependencies?.graph) {
      setDiagramSvg(null);
      setDiagramError(null);
      return;
    }

    const renderDiagram = async () => {
      try {
        setDiagramError(null);
        const { svg } = await mermaid.render('architecture-diagram', architecture.dependencies.graph);
        setDiagramSvg(svg);
      } catch (error) {
        logger.error('Mermaid rendering failed:', error);
        setDiagramError(error.message);
        setDiagramSvg(null);
      }
    };

    renderDiagram();
  }, [architecture?.dependencies?.graph]);

  // Safe render helper - ensures ANY value is safely converted to string
  const safeRender = (value) => {
    if (value == null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) {
      return value.map(item => safeRender(item)).join(', ');
    }
    if (typeof value === 'object') {
      // If object has specific properties, extract them
      if (value.name) return value.name;
      if (value.pattern) return value.pattern;
      if (value.message) return value.message;
      if (value.text) return value.text;
      if (value.description) return value.description;
      if (value.path) return value.path;
      // Fallback to JSON string
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Safe string conversion helper
  const safeString = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (value && typeof value === 'object') {
      return value.name || value.pattern || value.message || value.text || value.description || 'Unknown';
    }
    return 'Unknown';
  };

  // Safe array conversion helper
  const safeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return [value];
    return [];
  };

  // Process architecture data from backend structure
  const processedArchitecture = useMemo(() => {
    if (!architecture) {
      console.log('🏗️ [AnalysisArchitecture] No architecture data provided');
      return null;
    }

    console.log('🏗️ [AnalysisArchitecture] Processing architecture data:', architecture);
    console.log('🏗️ [AnalysisArchitecture] architecture.structure:', architecture.structure);
    console.log('🏗️ [AnalysisArchitecture] architecture.dependencies:', architecture.dependencies);
    console.log('🏗️ [AnalysisArchitecture] architecture.metrics:', architecture.metrics);
    console.log('🏗️ [AnalysisArchitecture] architecture.patterns:', architecture.patterns);
    console.log('🏗️ [AnalysisArchitecture] architecture.recommendations:', architecture.recommendations);

    return {
      structure: {
        layers: architecture.structure?.layers || 0,
        modules: architecture.structure?.modules || 0,
        patterns: safeArray(architecture.structure?.patterns)
      },
      dependencies: {
        circular: architecture.dependencies?.circular || false,
        count: architecture.dependencies?.count || 0,
        graph: architecture.dependencies?.graph || null
      },
      metrics: {
        coupling: safeString(architecture.metrics?.coupling),
        cohesion: safeString(architecture.metrics?.cohesion),
        complexity: safeString(architecture.metrics?.complexity),
        maintainability: safeString(architecture.metrics?.maintainability),
        testability: safeString(architecture.metrics?.testability)
      },
      patterns: safeArray(architecture.patterns),
      antiPatterns: safeArray(architecture.antiPatterns),
      recommendations: safeArray(architecture.recommendations)
    };
  }, [architecture]);

  const getMetricColor = (metric, value) => {
    if (!value || value === 'unknown') return 'neutral';
    
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (metric === 'complexity') {
      if (numericValue <= 3) return 'excellent';
      if (numericValue <= 5) return 'good';
      if (numericValue <= 7) return 'warning';
      return 'critical';
    }
    
    if (metric === 'maintainability' || metric === 'testability') {
      if (numericValue >= 80) return 'excellent';
      if (numericValue >= 60) return 'good';
      if (numericValue >= 40) return 'warning';
      return 'critical';
    }
    
    // For coupling and cohesion (lower is better for coupling, higher for cohesion)
    if (metric === 'coupling') {
      if (numericValue <= 0.3) return 'excellent';
      if (numericValue <= 0.5) return 'good';
      if (numericValue <= 0.7) return 'warning';
      return 'critical';
    }
    
    if (metric === 'cohesion') {
      if (numericValue >= 0.7) return 'excellent';
      if (numericValue >= 0.5) return 'good';
      if (numericValue >= 0.3) return 'warning';
      return 'critical';
    }
    
    return 'neutral';
  };

  const getMetricIcon = (metric) => {
    switch (metric) {
      case 'coupling': return '🔗';
      case 'cohesion': return '🧩';
      case 'complexity': return '📊';
      case 'maintainability': return '🔧';
      case 'testability': return '🧪';
      default: return '📋';
    }
  };

  const getPatternIcon = (pattern) => {
    const patternStr = safeString(pattern);
    const patternLower = patternStr.toLowerCase();
    if (patternLower.includes('mvc')) return '🎭';
    if (patternLower.includes('mvvm')) return '🔄';
    if (patternLower.includes('repository')) return '📚';
    if (patternLower.includes('factory')) return '🏭';
    if (patternLower.includes('singleton')) return '👤';
    if (patternLower.includes('observer')) return '👁️';
    if (patternLower.includes('command')) return '📝';
    if (patternLower.includes('strategy')) return '🎯';
    if (patternLower.includes('adapter')) return '🔌';
    if (patternLower.includes('decorator')) return '🎨';
    return '📋';
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const downloadDiagram = () => {
    if (!diagramSvg) return;
    
    const svgBlob = new Blob([diagramSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture-diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add this helper to group nodes by layer for the diagram
  const groupNodesByLayer = (nodes) => {
    const groups = {};
    nodes.forEach(node => {
      const layer = node.layer || 'unknown';
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(node);
    });
    return groups;
  };

  // Render Layer/Module Table
  const renderLayerModuleTable = () => {
    const layers = architecture?.structure?.layers || [];
    if (!Array.isArray(layers) || layers.length === 0) return <div>No layers detected.</div>;
    return (
      <div className="layer-module-table">
        {layers.map(layer => (
          <div key={layer.name} className="layer-block">
            <div className="layer-title"><b>{layer.name}</b></div>
            <ul className="module-list">
              {Array.isArray(layer.modules) && layer.modules.length > 0 ? (
                layer.modules.map(mod => <li key={mod}>{mod}</li>)
              ) : (
                <li><i>No modules</i></li>
              )}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="analysis-architecture loading">
        <div className="loading-spinner"></div>
        <p>Loading architecture data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-architecture error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!processedArchitecture) {
    return (
      <div className="analysis-architecture no-data">
        <p>No architecture data available.</p>
      </div>
    );
  }

  return (
    <div className="analysis-architecture">
      {/* Header */}
      <div className="architecture-header">
        <div className="architecture-title">
          <h3>🏗️ Architecture</h3>
          <div className="architecture-summary">
            <span className="summary-text">
              {safeRender(processedArchitecture.structure.layers)} layers, {safeRender(processedArchitecture.structure.modules)} modules
            </span>
          </div>
        </div>
        <div className="architecture-actions">
          <div className="tab-controls">
            <button
              onClick={() => setActiveTab('diagram')}
              className={`tab-btn ${activeTab === 'diagram' ? 'active' : ''}`}
            >
              📊 Diagram
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            >
              📈 Metrics
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`tab-btn ${activeTab === 'patterns' ? 'active' : ''}`}
            >
              🎯 Patterns
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="architecture-statistics">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Layers:</span>
            <span className="stat-value">{safeRender(processedArchitecture.structure.layers)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Modules:</span>
            <span className="stat-value">{safeRender(processedArchitecture.structure.modules)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Dependencies:</span>
            <span className="stat-value">{safeRender(processedArchitecture.dependencies.count)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Circular:</span>
            <span className={`stat-value ${processedArchitecture.dependencies.circular ? 'critical' : 'success'}`}>
              {safeRender(processedArchitecture.dependencies.circular ? 'Yes' : 'No')}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="architecture-content">
        {activeTab === 'diagram' && (
          <div className="diagram-view">
            {isObjectGraph ? (
              <div className="network-container" ref={networkRef} style={{ width: '100%', height: 500, border: '1px solid #ccc', borderRadius: 8, background: '#fff' }} />
            ) : (
              <>
                <div className="diagram-controls">
                  <div className="zoom-controls">
                    <button onClick={handleZoomOut} className="zoom-btn" title="Zoom Out">
                      🔍-
                    </button>
                    <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={handleZoomIn} className="zoom-btn" title="Zoom In">
                      🔍+
                    </button>
                    <button onClick={handleResetZoom} className="reset-btn" title="Reset Zoom">
                      🔄
                    </button>
                  </div>
                  <button 
                    onClick={downloadDiagram} 
                    className="download-btn"
                    disabled={!diagramSvg}
                    title="Download Diagram"
                  >
                    💾 Download
                  </button>
                </div>

                <div className="diagram-container" ref={diagramRef}>
                  {diagramError ? (
                    <div className="diagram-error">
                      <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <h4>Diagram Rendering Failed</h4>
                        <p>{diagramError}</p>
                        <div className="fallback-content">
                          <h5>Mermaid Diagram Code:</h5>
                          <pre className="mermaid-code">
                            {processedArchitecture.dependencies.graph}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : diagramSvg ? (
                    <div 
                      className="diagram-wrapper"
                      style={{ transform: `scale(${zoomLevel})` }}
                      dangerouslySetInnerHTML={{ __html: diagramSvg }}
                    />
                  ) : (
                    <div className="no-diagram">
                      <p>No architecture diagram available.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="metrics-view">
            <div className="metrics-grid">
              {Object.entries(processedArchitecture.metrics).map(([metric, value]) => (
                <div key={metric} className={`metric-card ${getMetricColor(metric, value)}`}>
                  <div className="metric-icon">
                    {getMetricIcon(metric)}
                  </div>
                  <div className="metric-content">
                    <div className="metric-label">
                      {metric.charAt(0).toUpperCase() + metric.slice(1)}
                    </div>
                    <div className="metric-value">
                      {safeRender(value)}
                    </div>
                    <div className="metric-status">
                      {getMetricColor(metric, value) === 'excellent' && 'Excellent'}
                      {getMetricColor(metric, value) === 'good' && 'Good'}
                      {getMetricColor(metric, value) === 'warning' && 'Warning'}
                      {getMetricColor(metric, value) === 'critical' && 'Critical'}
                      {getMetricColor(metric, value) === 'neutral' && 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {processedArchitecture.recommendations.length > 0 && (
              <div className="recommendations-section">
                <h4>💡 Architecture Recommendations</h4>
                <div className="recommendations-list">
                  {processedArchitecture.recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="recommendation-text">
                        {safeRender(rec)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="patterns-view">
            <div className="patterns-section">
              <h4>🎯 Architectural Patterns</h4>
              {processedArchitecture.patterns.length > 0 ? (
                <div className="patterns-grid">
                  {processedArchitecture.patterns.map((pattern, index) => (
                    <div key={index} className="pattern-item">
                      <div className="pattern-icon">
                        {getPatternIcon(pattern)}
                      </div>
                      <div className="pattern-info">
                        <span className="pattern-name">
                          {safeRender(pattern)}
                        </span>
                        <span className="pattern-type">Architectural Pattern</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-patterns">
                  <p>No architectural patterns detected.</p>
                </div>
              )}
            </div>

            <div className="anti-patterns-section">
              <h4>⚠️ Anti-Patterns</h4>
              {processedArchitecture.antiPatterns.length > 0 ? (
                <div className="anti-patterns-list">
                  {processedArchitecture.antiPatterns.map((antiPattern, index) => (
                    <div key={index} className="anti-pattern-item">
                      <span className="anti-pattern-icon">⚠️</span>
                      <span className="anti-pattern-text">
                        {safeRender(antiPattern)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-anti-patterns">
                  <p>No anti-patterns detected. Great job!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* No Data Message */}
      {(!processedArchitecture.structure.layers && 
        !processedArchitecture.structure.modules && 
        !processedArchitecture.dependencies.graph) && (
        <div className="no-data-message">
          <p>No architecture information available. Run an analysis to see architecture details.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisArchitecture; 