import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import mermaid from 'mermaid';
import '@/css/components/analysis/analysis-architecture.css';

const AnalysisArchitecture = ({ architecture, loading, error }) => {
  const [diagramSvg, setDiagramSvg] = useState(null);
  const [diagramError, setDiagramError] = useState(null);
  const [activeTab, setActiveTab] = useState('diagram');
  const [zoomLevel, setZoomLevel] = useState(1);
  const diagramRef = useRef(null);

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

  // Process architecture data from backend structure
  const processedArchitecture = useMemo(() => {
    if (!architecture) return null;

    return {
      structure: {
        layers: architecture.structure?.layers || 0,
        modules: architecture.structure?.modules || 0,
        patterns: architecture.structure?.patterns || []
      },
      dependencies: {
        circular: architecture.dependencies?.circular || false,
        count: architecture.dependencies?.count || 0,
        graph: architecture.dependencies?.graph || null
      },
      metrics: {
        coupling: architecture.metrics?.coupling || 'unknown',
        cohesion: architecture.metrics?.cohesion || 'unknown',
        complexity: architecture.metrics?.complexity || 'unknown',
        maintainability: architecture.metrics?.maintainability || 'unknown',
        testability: architecture.metrics?.testability || 'unknown'
      },
      patterns: architecture.patterns || [],
      antiPatterns: architecture.antiPatterns || [],
      recommendations: architecture.recommendations || []
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
    const patternLower = pattern.toLowerCase();
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
              {processedArchitecture.structure.layers} layers, {processedArchitecture.structure.modules} modules
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
            <span className="stat-value">{processedArchitecture.structure.layers}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Modules:</span>
            <span className="stat-value">{processedArchitecture.structure.modules}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Dependencies:</span>
            <span className="stat-value">{processedArchitecture.dependencies.count}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Circular:</span>
            <span className={`stat-value ${processedArchitecture.dependencies.circular ? 'critical' : 'success'}`}>
              {processedArchitecture.dependencies.circular ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="architecture-content">
        {activeTab === 'diagram' && (
          <div className="diagram-view">
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
                      {typeof value === 'number' ? value.toFixed(2) : value}
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
                      <span className="recommendation-text">{rec}</span>
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
                        <span className="pattern-name">{pattern}</span>
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
                      <span className="anti-pattern-text">{antiPattern}</span>
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