# Individual Analysis Loading – Phase 3: Component Refactoring

## Overview
Refactor existing analysis components to use the new lazy loading infrastructure, replacing comprehensive loading with individual on-demand loading.

## Objectives
- [ ] Refactor AnalysisDataViewer to use lazy loading
- [ ] Update AnalysisIssues component for on-demand loading
- [ ] Update AnalysisTechStack component for on-demand loading
- [ ] Update AnalysisArchitecture component for on-demand loading
- [ ] Update AnalysisRecommendations component for on-demand loading
- [ ] Maintain backward compatibility with existing functionality

## Deliverables
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Refactored with lazy loading
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisIssues.jsx` - Updated for on-demand loading
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisTechStack.jsx` - Updated for on-demand loading
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisArchitecture.jsx` - Updated for on-demand loading
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisRecommendations.jsx` - Updated for on-demand loading
- [ ] Test: `tests/unit/components/AnalysisDataViewer.test.js` - Updated tests
- [ ] Test: `tests/integration/IndividualAnalysisLoading.test.js` - Integration tests

## Dependencies
- Requires: Phase 1 completion (backend individual analysis service)
- Requires: Phase 2 completion (frontend lazy loading infrastructure)
- Blocks: Phase 4 start

## Estimated Time
3 hours

## Success Criteria
- [ ] AnalysisDataViewer loads only essential data initially
- [ ] Individual analysis sections load on demand when expanded
- [ ] All existing functionality remains intact
- [ ] Performance improved by 60% compared to comprehensive loading
- [ ] Error handling works for individual component loads
- [ ] All tests pass

## Implementation Details

### Refactored AnalysisDataViewer.jsx
```javascript
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useAnalysisCache from '@/hooks/useAnalysisCache';
import LazyAnalysisComponent from './LazyAnalysisComponent';
import AnalysisCharts from './AnalysisCharts';
import AnalysisMetrics from './AnalysisMetrics';
import AnalysisFilters from './AnalysisFilters';
import AnalysisHistory from './AnalysisHistory';
import AnalysisStatus from './AnalysisStatus';
import AnalysisModal from './AnalysisModal';
import AnalysisIssues from './AnalysisIssues';
import AnalysisTechStack from './AnalysisTechStack';
import AnalysisArchitecture from './AnalysisArchitecture';
import AnalysisRecommendations from './AnalysisRecommendations';
import '@/css/components/analysis/analysis-data-viewer.css';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    metrics: null,
    status: null,
    history: [],
    charts: {},
    hasRecentData: false
  });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    analysisType: 'all',
    projectId: projectId
  });
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Collapsible sections state - only essential sections expanded by default
  const [expandedSections, setExpandedSections] = useState({
    metrics: true,
    charts: true,
    history: true,
    issues: false,        // Now lazy loaded
    techStack: false,     // Now lazy loaded
    architecture: false,  // Now lazy loaded
    recommendations: false // Now lazy loaded
  });
  
  // Individual loading states for essential data only
  const [loadingStates, setLoadingStates] = useState({
    metrics: false,
    status: false,
    history: false,
    charts: false
  });

  const apiRepository = new APIChatRepository();
  const { getCachedData, setCachedData, hasCachedData } = useAnalysisCache();

  useEffect(() => {
    loadEssentialData();
    setupEventListeners();
  }, [projectId]);

  const setupEventListeners = () => {
    if (!eventBus) return;

    eventBus.on('analysis-status-update', handleAnalysisStatusUpdate);
    eventBus.on('analysis-completed', handleAnalysisCompleted);
    eventBus.on('analysis-progress', handleAnalysisProgress);
    eventBus.on('analysis:completed', handleAnalysisCompleted);

    return () => {
      eventBus.off('analysis-status-update', handleAnalysisStatusUpdate);
      eventBus.off('analysis-completed', handleAnalysisCompleted);
      eventBus.off('analysis-progress', handleAnalysisProgress);
      eventBus.off('analysis:completed', handleAnalysisCompleted);
    };
  };

  const updateLoadingState = (key, loading) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Load only essential data initially
  const loadEssentialData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Step 1: Load lightweight data first (status, metrics) with caching
      updateLoadingState('status', true);
      updateLoadingState('metrics', true);
      
      // Check cache first
      const cachedStatus = getCachedData(currentProjectId, 'status');
      const cachedMetrics = getCachedData(currentProjectId, 'metrics');
      
      let statusResponse, metricsResponse;
      
      if (cachedStatus && cachedMetrics && !forceRefresh) {
        statusResponse = { success: true, data: cachedStatus };
        metricsResponse = { success: true, data: cachedMetrics };
        logger.info('🔍 [AnalysisDataViewer] Using cached status and metrics');
      } else {
        [statusResponse, metricsResponse] = await Promise.all([
          apiRepository.getAnalysisStatus?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
          apiRepository.getAnalysisMetrics?.(currentProjectId) || Promise.resolve({ success: false, data: null })
        ]);
        
        if (statusResponse.success) {
          setCachedData(currentProjectId, 'status', statusResponse.data);
        }
        if (metricsResponse.success) {
          setCachedData(currentProjectId, 'metrics', metricsResponse.data);
        }
      }

      setAnalysisData(prev => ({
        ...prev,
        status: statusResponse.success ? statusResponse.data : null,
        metrics: metricsResponse.success ? metricsResponse.data : null
      }));

      updateLoadingState('status', false);
      updateLoadingState('metrics', false);

      // Step 2: Load history data
      updateLoadingState('history', true);
      
      const cachedHistory = getCachedData(currentProjectId, 'history');
      let historyResponse;
      
      if (cachedHistory && !forceRefresh) {
        historyResponse = { success: true, data: cachedHistory };
        logger.info('🔍 [AnalysisDataViewer] Using cached history');
      } else {
        historyResponse = await apiRepository.getAnalysisHistory(currentProjectId);
        if (historyResponse.success) {
          setCachedData(currentProjectId, 'history', historyResponse.data || []);
        }
      }
      
      setAnalysisData(prev => ({
        ...prev,
        history: historyResponse.success ? (historyResponse.data || []) : []
      }));

      updateLoadingState('history', false);

      // Step 3: Load charts data
      updateLoadingState('charts', true);
      try {
        const chartsResponse = await apiRepository.getAnalysisCharts?.(currentProjectId, 'trends') || Promise.resolve({ success: false, data: null });
        setAnalysisData(prev => ({
          ...prev,
          charts: chartsResponse.success ? chartsResponse.data : null
        }));
      } catch (err) {
        logger.error('Failed to load charts data:', err);
      }
      updateLoadingState('charts', false);

      // Check if we have recent analysis data
      const hasRecentData = await checkForRecentAnalysisData(historyResponse, currentProjectId);
      setAnalysisData(prev => ({ ...prev, hasRecentData }));

    } catch (err) {
      setError('Failed to load analysis data: ' + err.message);
      logger.error('Analysis data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkForRecentAnalysisData = async (historyResponse, projectId) => {
    try {
      if (!historyResponse.success || !historyResponse.data || historyResponse.data.length === 0) {
        return false;
      }

      const latestAnalysis = historyResponse.data[0];
      const analysisDate = new Date(latestAnalysis.timestamp || latestAnalysis.created_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const isRecent = analysisDate > oneHourAgo;
      
      logger.info('🔍 [AnalysisDataViewer] Analysis data freshness check:', {
        latestAnalysisDate: analysisDate.toISOString(),
        oneHourAgo: oneHourAgo.toISOString(),
        isRecent,
        projectId
      });

      return isRecent;
    } catch (error) {
      logger.warn('Analysis data freshness check failed:', error);
      return false;
    }
  };

  const handleAnalysisStatusUpdate = (data) => {
    if (data.projectId === (projectId || analysisData.status?.projectId)) {
      setAnalysisData(prev => ({
        ...prev,
        status: data.status
      }));
    }
  };

  const handleAnalysisCompleted = (data) => {
    if (data.projectId === (projectId || analysisData.status?.projectId)) {
      loadEssentialData(true); // forceRefresh = true
    }
  };

  const handleAnalysisProgress = (data) => {
    if (data.projectId === (projectId || analysisData.status?.projectId)) {
      setAnalysisData(prev => ({
        ...prev,
        status: {
          ...prev.status,
          progress: data.progress,
          currentStep: data.step
        }
      }));
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleAnalysisSelect = (analysis) => {
    setSelectedAnalysis(analysis);
    setShowModal(true);
  };

  const handleRefresh = () => {
    loadEssentialData(true); // forceRefresh = true
  };

  const handleStartAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      if (analysisData.hasRecentData) {
        const shouldProceed = window.confirm(
          'Recent analysis data already exists. Do you want to run a new analysis anyway?'
        );
        if (!shouldProceed) {
          setLoading(false);
          return;
        }
      }

      const response = await apiRepository.startAutoMode(currentProjectId, { mode: 'analysis' });
      if (response.success) {
        await loadEssentialData();
      } else {
        setError('Analyse konnte nicht gestartet werden: ' + response.error);
      }
    } catch (err) {
      setError('Fehler beim Starten der Analyse: ' + err.message);
      logger.error('Analysis start error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analysisData.metrics) {
    return (
      <div className="analysis-data-viewer loading">
        <div className="loading-spinner"></div>
        <p>Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-data-viewer error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
        <button onClick={handleRefresh} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analysis-data-viewer">
      <div className="analysis-header">
        <div className="analysis-title">
          <h2>📊 Analysis Dashboard</h2>
          <AnalysisStatus 
            status={analysisData.status} 
            onStartAnalysis={handleStartAnalysis}
            loading={loading}
          />
        </div>
        <div className="analysis-actions">
          <button 
            onClick={handleRefresh} 
            className="btn-refresh"
            disabled={loading}
            title="Refresh analysis data"
          >
            🔄 Refresh
          </button>
          <button onClick={handleStartAnalysis} className="analyze-btn">Jetzt analysieren</button>
        </div>
      </div>
      
      <div className="analysis-content">
        <AnalysisFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
          projectId={projectId}
        />

        {/* Essential Sections - Always Loaded */}
        <div className={`analysis-section ${expandedSections.metrics ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => toggleSection('metrics')}>
            <h3>📊 Metrics</h3>
            <span className="section-toggle">{expandedSections.metrics ? '▼' : '▶'}</span>
          </div>
          {expandedSections.metrics && (
            <div className="section-content">
              <AnalysisMetrics 
                metrics={analysisData.metrics}
                loading={loadingStates.metrics}
              />
            </div>
          )}
        </div>

        <div className={`analysis-section ${expandedSections.charts ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => toggleSection('charts')}>
            <h3>📈 Charts</h3>
            <span className="section-toggle">{expandedSections.charts ? '▼' : '▶'}</span>
          </div>
          {expandedSections.charts && (
            <div className="section-content">
              <AnalysisCharts 
                data={analysisData.charts}
                history={analysisData.history}
                filters={filters}
                loading={loadingStates.history}
              />
            </div>
          )}
        </div>

        <div className={`analysis-section ${expandedSections.history ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => toggleSection('history')}>
            <h3>📋 History</h3>
            <span className="section-toggle">{expandedSections.history ? '▼' : '▶'}</span>
          </div>
          {expandedSections.history && (
            <div className="section-content">
              <AnalysisHistory 
                history={analysisData.history}
                onAnalysisSelect={handleAnalysisSelect}
                loading={loadingStates.history}
              />
            </div>
          )}
        </div>

        {/* Lazy Loaded Sections - Individual Loading */}
        <LazyAnalysisComponent 
          analysisType="issues"
          projectId={projectId}
          autoLoad={false}
          onLoad={(data) => logger.info('Issues analysis loaded:', data)}
          onError={(error) => logger.error('Issues analysis error:', error)}
        >
          {(data) => (
            <AnalysisIssues 
              issues={data}
              loading={false}
              error={null}
            />
          )}
        </LazyAnalysisComponent>

        <LazyAnalysisComponent 
          analysisType="techstack"
          projectId={projectId}
          autoLoad={false}
          onLoad={(data) => logger.info('Tech stack analysis loaded:', data)}
          onError={(error) => logger.error('Tech stack analysis error:', error)}
        >
          {(data) => (
            <AnalysisTechStack 
              techStack={data}
              loading={false}
              error={null}
            />
          )}
        </LazyAnalysisComponent>

        <LazyAnalysisComponent 
          analysisType="architecture"
          projectId={projectId}
          autoLoad={false}
          onLoad={(data) => logger.info('Architecture analysis loaded:', data)}
          onError={(error) => logger.error('Architecture analysis error:', error)}
        >
          {(data) => (
            <AnalysisArchitecture 
              architecture={data}
              loading={false}
              error={null}
            />
          )}
        </LazyAnalysisComponent>

        <LazyAnalysisComponent 
          analysisType="recommendations"
          projectId={projectId}
          autoLoad={false}
          onLoad={(data) => logger.info('Recommendations analysis loaded:', data)}
          onError={(error) => logger.error('Recommendations analysis error:', error)}
        >
          {(data) => (
            <AnalysisRecommendations 
              recommendations={data}
              loading={false}
              error={null}
            />
          )}
        </LazyAnalysisComponent>

        {/* Modal */}
        {showModal && selectedAnalysis && (
          <AnalysisModal
            analysis={selectedAnalysis}
            onClose={() => {
              setShowModal(false);
              setSelectedAnalysis(null);
            }}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
};

export default AnalysisDataViewer;
```

### Updated AnalysisIssues.jsx
```javascript
import React from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import '@/css/components/analysis/analysis-issues.css';

const AnalysisIssues = ({ issues, loading, error }) => {
  if (loading) {
    return (
      <div className="analysis-issues loading">
        <div className="loading-spinner"></div>
        <p>Loading issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-issues error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>Failed to load issues: {error}</span>
        </div>
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="analysis-issues empty">
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h4>No Issues Found</h4>
          <p>Great! No code quality issues detected in this analysis.</p>
        </div>
      </div>
    );
  }

  const groupedIssues = issues.reduce((acc, issue) => {
    const severity = issue.severity || 'medium';
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(issue);
    return acc;
  }, {});

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getSeverityClass = (severity) => {
    return `severity-${severity.toLowerCase()}`;
  };

  return (
    <div className="analysis-issues">
      <div className="issues-summary">
        <h4>Issues Summary</h4>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">{issues.length}</span>
            <span className="stat-label">Total Issues</span>
          </div>
          {Object.entries(groupedIssues).map(([severity, count]) => (
            <div key={severity} className={`stat ${getSeverityClass(severity)}`}>
              <span className="stat-number">{count.length}</span>
              <span className="stat-label">{severity}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="issues-list">
        {Object.entries(groupedIssues).map(([severity, severityIssues]) => (
          <div key={severity} className={`issues-group ${getSeverityClass(severity)}`}>
            <div className="group-header">
              <span className="severity-icon">{getSeverityIcon(severity)}</span>
              <h5>{severity} Issues ({severityIssues.length})</h5>
            </div>
            <div className="group-issues">
              {severityIssues.map((issue, index) => (
                <div key={index} className="issue-item">
                  <div className="issue-header">
                    <span className="issue-title">{issue.title || issue.message}</span>
                    {issue.file && (
                      <span className="issue-file">{issue.file}</span>
                    )}
                  </div>
                  {issue.message && (
                    <div className="issue-message">{issue.message}</div>
                  )}
                  {issue.suggestion && (
                    <div className="issue-suggestion">
                      <strong>Suggestion:</strong> {issue.suggestion}
                    </div>
                  )}
                  {issue.line && (
                    <div className="issue-location">
                      Line {issue.line}
                      {issue.column && `, Column ${issue.column}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisIssues;
```

### Updated AnalysisTechStack.jsx
```javascript
import React from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import '@/css/components/analysis/analysis-techstack.css';

const AnalysisTechStack = ({ techStack, loading, error }) => {
  if (loading) {
    return (
      <div className="analysis-techstack loading">
        <div className="loading-spinner"></div>
        <p>Loading tech stack...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-techstack error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>Failed to load tech stack: {error}</span>
        </div>
      </div>
    );
  }

  if (!techStack || !techStack.technologies || techStack.technologies.length === 0) {
    return (
      <div className="analysis-techstack empty">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h4>No Tech Stack Data</h4>
          <p>No technology information found in this analysis.</p>
        </div>
      </div>
    );
  }

  const { technologies, frameworks, languages, databases, tools } = techStack;

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'frontend': return '🎨';
      case 'backend': return '⚙️';
      case 'database': return '🗄️';
      case 'devops': return '🚀';
      case 'testing': return '🧪';
      case 'build': return '🔨';
      default: return '📦';
    }
  };

  const renderTechnologyList = (items, title, category) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="tech-category">
        <div className="category-header">
          <span className="category-icon">{getCategoryIcon(category)}</span>
          <h5>{title}</h5>
          <span className="category-count">{items.length}</span>
        </div>
        <div className="category-items">
          {items.map((item, index) => (
            <div key={index} className="tech-item">
              <div className="tech-info">
                <span className="tech-name">{item.name}</span>
                {item.version && (
                  <span className="tech-version">{item.version}</span>
                )}
              </div>
              {item.description && (
                <div className="tech-description">{item.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-techstack">
      <div className="techstack-summary">
        <h4>Technology Stack Overview</h4>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">{technologies?.length || 0}</span>
            <span className="stat-label">Technologies</span>
          </div>
          <div className="stat">
            <span className="stat-number">{frameworks?.length || 0}</span>
            <span className="stat-label">Frameworks</span>
          </div>
          <div className="stat">
            <span className="stat-number">{languages?.length || 0}</span>
            <span className="stat-label">Languages</span>
          </div>
          <div className="stat">
            <span className="stat-number">{databases?.length || 0}</span>
            <span className="stat-label">Databases</span>
          </div>
        </div>
      </div>

      <div className="techstack-details">
        {renderTechnologyList(languages, 'Programming Languages', 'backend')}
        {renderTechnologyList(frameworks, 'Frameworks & Libraries', 'frontend')}
        {renderTechnologyList(databases, 'Databases & Storage', 'database')}
        {renderTechnologyList(tools, 'Development Tools', 'devops')}
        {renderTechnologyList(technologies, 'Other Technologies', 'general')}
      </div>
    </div>
  );
};

export default AnalysisTechStack;
```

### Updated AnalysisArchitecture.jsx
```javascript
import React, { useEffect, useRef } from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import '@/css/components/analysis/analysis-architecture.css';

const AnalysisArchitecture = ({ architecture, loading, error }) => {
  const mermaidRef = useRef(null);

  useEffect(() => {
    if (architecture?.diagram && mermaidRef.current) {
      try {
        // Initialize Mermaid if available
        if (window.mermaid) {
          window.mermaid.initialize({ startOnLoad: false });
          window.mermaid.render('architecture-diagram', architecture.diagram).then(({ svg }) => {
            mermaidRef.current.innerHTML = svg;
          }).catch(err => {
            logger.error('Failed to render Mermaid diagram:', err);
            mermaidRef.current.innerHTML = '<p>Failed to render architecture diagram</p>';
          });
        } else {
          mermaidRef.current.innerHTML = '<p>Mermaid not available for diagram rendering</p>';
        }
      } catch (err) {
        logger.error('Error rendering architecture diagram:', err);
      }
    }
  }, [architecture]);

  if (loading) {
    return (
      <div className="analysis-architecture loading">
        <div className="loading-spinner"></div>
        <p>Loading architecture...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-architecture error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>Failed to load architecture: {error}</span>
        </div>
      </div>
    );
  }

  if (!architecture) {
    return (
      <div className="analysis-architecture empty">
        <div className="empty-state">
          <div className="empty-icon">🏗️</div>
          <h4>No Architecture Data</h4>
          <p>No architecture information found in this analysis.</p>
        </div>
      </div>
    );
  }

  const { components, layers, patterns, diagram, score, level } = architecture;

  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  const getLevelIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'excellent': return '🏆';
      case 'good': return '✅';
      case 'fair': return '⚠️';
      case 'poor': return '❌';
      default: return '📊';
    }
  };

  return (
    <div className="analysis-architecture">
      <div className="architecture-summary">
        <h4>Architecture Overview</h4>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">{score || 0}</span>
            <span className="stat-label">Architecture Score</span>
          </div>
          <div className={`stat ${getScoreColor(score)}`}>
            <span className="stat-icon">{getLevelIcon(level)}</span>
            <span className="stat-label">{level || 'Unknown'}</span>
          </div>
          <div className="stat">
            <span className="stat-number">{components?.length || 0}</span>
            <span className="stat-label">Components</span>
          </div>
          <div className="stat">
            <span className="stat-number">{layers?.length || 0}</span>
            <span className="stat-label">Layers</span>
          </div>
        </div>
      </div>

      {diagram && (
        <div className="architecture-diagram">
          <h5>Architecture Diagram</h5>
          <div className="diagram-container" ref={mermaidRef}>
            <div className="loading-spinner"></div>
            <p>Rendering diagram...</p>
          </div>
        </div>
      )}

      {components && components.length > 0 && (
        <div className="architecture-components">
          <h5>Components</h5>
          <div className="components-list">
            {components.map((component, index) => (
              <div key={index} className="component-item">
                <div className="component-header">
                  <span className="component-name">{component.name}</span>
                  {component.type && (
                    <span className="component-type">{component.type}</span>
                  )}
                </div>
                {component.description && (
                  <div className="component-description">{component.description}</div>
                )}
                {component.dependencies && component.dependencies.length > 0 && (
                  <div className="component-dependencies">
                    <strong>Dependencies:</strong> {component.dependencies.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {patterns && patterns.length > 0 && (
        <div className="architecture-patterns">
          <h5>Design Patterns</h5>
          <div className="patterns-list">
            {patterns.map((pattern, index) => (
              <div key={index} className="pattern-item">
                <div className="pattern-header">
                  <span className="pattern-name">{pattern.name}</span>
                  {pattern.category && (
                    <span className="pattern-category">{pattern.category}</span>
                  )}
                </div>
                {pattern.description && (
                  <div className="pattern-description">{pattern.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisArchitecture;
```

### Updated AnalysisRecommendations.jsx
```javascript
import React from 'react';
import { logger } from '@/infrastructure/logging/Logger';
import '@/css/components/analysis/analysis-recommendations.css';

const AnalysisRecommendations = ({ recommendations, loading, error }) => {
  if (loading) {
    return (
      <div className="analysis-recommendations loading">
        <div className="loading-spinner"></div>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-recommendations error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>Failed to load recommendations: {error}</span>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="analysis-recommendations empty">
        <div className="empty-state">
          <div className="empty-icon">💡</div>
          <h4>No Recommendations</h4>
          <p>No specific recommendations available for this analysis.</p>
        </div>
      </div>
    );
  }

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const priority = rec.priority || 'medium';
    if (!acc[priority]) {
      acc[priority] = [];
    }
    acc[priority].push(rec);
    return acc;
  }, {});

  const getPriorityIcon = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority.toLowerCase()}`;
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'performance': return '⚡';
      case 'security': return '🔒';
      case 'maintainability': return '🔧';
      case 'scalability': return '📈';
      case 'code quality': return '📊';
      default: return '💡';
    }
  };

  return (
    <div className="analysis-recommendations">
      <div className="recommendations-summary">
        <h4>Recommendations Overview</h4>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">{recommendations.length}</span>
            <span className="stat-label">Total Recommendations</span>
          </div>
          {Object.entries(groupedRecommendations).map(([priority, count]) => (
            <div key={priority} className={`stat ${getPriorityClass(priority)}`}>
              <span className="stat-number">{count.length}</span>
              <span className="stat-label">{priority}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="recommendations-list">
        {Object.entries(groupedRecommendations).map(([priority, priorityRecs]) => (
          <div key={priority} className={`recommendations-group ${getPriorityClass(priority)}`}>
            <div className="group-header">
              <span className="priority-icon">{getPriorityIcon(priority)}</span>
              <h5>{priority} Priority ({priorityRecs.length})</h5>
            </div>
            <div className="group-recommendations">
              {priorityRecs.map((rec, index) => (
                <div key={index} className="recommendation-item">
                  <div className="recommendation-header">
                    <div className="recommendation-title">
                      <span className="category-icon">{getCategoryIcon(rec.category)}</span>
                      <span className="title-text">{rec.title || rec.description}</span>
                    </div>
                    {rec.category && (
                      <span className="recommendation-category">{rec.category}</span>
                    )}
                  </div>
                  {rec.description && (
                    <div className="recommendation-description">{rec.description}</div>
                  )}
                  {rec.suggestion && (
                    <div className="recommendation-suggestion">
                      <strong>Suggestion:</strong> {rec.suggestion}
                    </div>
                  )}
                  {rec.impact && (
                    <div className="recommendation-impact">
                      <strong>Impact:</strong> {rec.impact}
                    </div>
                  )}
                  {rec.effort && (
                    <div className="recommendation-effort">
                      <strong>Effort:</strong> {rec.effort}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisRecommendations;
```

## Testing Strategy

### Integration Tests
```javascript
// tests/integration/IndividualAnalysisLoading.test.js
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalysisDataViewer from '@/presentation/components/analysis/AnalysisDataViewer';

// Mock dependencies
jest.mock('@/infrastructure/repositories/APIChatRepository');
jest.mock('@/hooks/useAnalysisCache');
jest.mock('@/hooks/useIndividualAnalysis');

describe('Individual Analysis Loading Integration', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should load essential data on mount', async () => {
    render(<AnalysisDataViewer />);
    
    await waitFor(() => {
      expect(screen.getByText('📊 Metrics')).toBeInTheDocument();
      expect(screen.getByText('📈 Charts')).toBeInTheDocument();
      expect(screen.getByText('📋 History')).toBeInTheDocument();
    });
  });

  it('should show lazy loading triggers for individual analyses', async () => {
    render(<AnalysisDataViewer />);
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ Issues')).toBeInTheDocument();
      expect(screen.getByText('🔧 Tech Stack')).toBeInTheDocument();
      expect(screen.getByText('🏗️ Architecture')).toBeInTheDocument();
      expect(screen.getByText('💡 Recommendations')).toBeInTheDocument();
    });
  });

  it('should load individual analysis when expanded', async () => {
    render(<AnalysisDataViewer />);
    
    const issuesTrigger = screen.getByText('⚠️ Issues');
    fireEvent.click(issuesTrigger);
    
    await waitFor(() => {
      expect(screen.getByText('Loading issues...')).toBeInTheDocument();
    });
  });
});
```

## Performance Improvements

### Before (Comprehensive Loading)
- Loads all analysis data on mount
- 4+ API calls simultaneously
- Large data transfer (4MB+)
- Slow initial load time

### After (Individual Loading)
- Loads only essential data on mount
- 2-3 API calls initially
- Individual analysis loads on demand
- 60% faster initial load time

## Backward Compatibility
- All existing functionality preserved
- Comprehensive loading still available via API
- Existing components work unchanged
- Gradual migration path available

## Error Handling
- Individual component errors don't break the entire dashboard
- Retry mechanisms for failed individual loads
- Graceful fallbacks for missing data
- User-friendly error messages

## Next Phase Dependencies
This phase completes the core refactoring. Phase 4 (Testing & Optimization) will focus on performance testing, caching optimization, and final polish. 