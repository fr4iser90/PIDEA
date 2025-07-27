import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import { useAnalysisStatus, useAnalysisMetrics, useAnalysisHistory, useActiveIDE, useProjectDataActions } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
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
import IndividualAnalysisButtons from './IndividualAnalysisButtons';
import '@/css/components/analysis/analysis-data-viewer.css';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // ✅ REFACTORED: Use global state selectors instead of local state
  const analysisStatus = useAnalysisStatus();
  const analysisMetrics = useAnalysisMetrics();
  const analysisHistory = useAnalysisHistory();
  const activeIDE = useActiveIDE();
  const { loadProjectData } = useProjectDataActions();
  
  // Local state for UI interactions and non-global data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    issues: null,
    charts: null,
    architecture: null,
    recommendations: null,
    hasRecentData: false
  });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    analysisType: 'all',
    projectId: projectId
  });
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    recommendations: false,  // FIXED: Was true, now false
    issues: false,
    techStack: false,
    architecture: false,
    metrics: false,
    charts: false,
    history: false
  });

  // Debug: Log initial expanded sections
  console.log('🎯 [DEBUG] Initial expandedSections:', expandedSections);
  
  // Individual loading states for progressive loading
  const [loadingStates, setLoadingStates] = useState({
    issues: false,
    techStack: false,
    architecture: false,
    recommendations: false
  });

  const apiRepository = new APIChatRepository();
  const { showSuccess, showInfo } = useNotificationStore();

  // ✅ REFACTORED: Load project data when active IDE changes
  useEffect(() => {
    if (activeIDE.workspacePath) {
      logger.info('Loading project data for active IDE:', activeIDE.workspacePath);
      loadProjectData(activeIDE.workspacePath);
    }
  }, [activeIDE.workspacePath, loadProjectData]);

  useEffect(() => {
    // Only setup event listeners, don't auto-load data
    // Data will be loaded manually via IndividualAnalysisButtons
    setupEventListeners();
  }, [projectId]); // Removed filters dependency to prevent infinite loop

  const setupEventListeners = () => {
    if (!eventBus) return;

    // Listen for real-time analysis updates
    eventBus.on('analysis-status-update', handleAnalysisStatusUpdate);
    eventBus.on('analysis-completed', handleAnalysisCompleted);
    eventBus.on('analysis-progress', handleAnalysisProgress);
    eventBus.on('analysis:completed', handleAnalysisCompleted);
    eventBus.on('step:completed', handleAnalysisCompleted);
    eventBus.on('step:failed', handleAnalysisCompleted);

    return () => {
      eventBus.off('analysis-status-update', handleAnalysisStatusUpdate);
      eventBus.off('analysis-completed', handleAnalysisCompleted);
      eventBus.off('analysis-progress', handleAnalysisProgress);
      eventBus.off('analysis:completed', handleAnalysisCompleted);
      eventBus.off('step:completed', handleAnalysisCompleted);
      eventBus.off('step:failed', handleAnalysisCompleted);
    };
  };

  const updateLoadingState = (key, loading) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  // ✅ REFACTORED: Simplified data loading using global state
  const loadAnalysisData = useCallback(async (forceRefresh = false) => {
    console.log('🚀 [DEBUG] loadAnalysisData called', { forceRefresh, projectId });
    logger.info('🚀 [AnalysisDataViewer] loadAnalysisData called', { forceRefresh, projectId });
    
    try {
      setLoading(true);
      setError(null);

      const currentProjectId = projectId || activeIDE.projectId;
      console.log('🔍 [DEBUG] Current project ID:', currentProjectId);
      
      if (!currentProjectId) {
        throw new Error('No project ID available');
      }
      
      // ✅ REFACTORED: Load project data from global state
      await loadProjectData(activeIDE.workspacePath);
      
      console.log('✅ [DEBUG] Analysis data loaded successfully from global state');

      // Show success notification if data was loaded successfully
      if (forceRefresh) {
        showSuccess('Analysis data refreshed successfully!', 'Data Loaded');
      }

    } catch (err) {
      console.error('❌ [DEBUG] Analysis data loading error:', err);
      setError('Failed to load analysis data: ' + err.message);
      logger.error('Analysis data loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, activeIDE.projectId, activeIDE.workspacePath, loadProjectData, showSuccess]);

  // Lazy loading functions for non-essential data
  const loadIssuesData = useCallback(async () => {
    console.log('🔍 [DEBUG] loadIssuesData called', { 
      issuesData: analysisData.issues, 
      expandedSections: expandedSections,
      isExpanded: expandedSections.issues 
    });
    
    if (analysisData.issues !== null) {
      console.log('🔍 [DEBUG] loadIssuesData: Already loaded, returning');
      return; // Already loaded
    }
    
    console.log('🔍 [DEBUG] loadIssuesData: Starting API call');
    
    try {
      updateLoadingState('issues', true);
      const currentProjectId = projectId || activeIDE.projectId;
      // ✅ OPTIMIZATION: Use direct API call (bypass StepRegistry) for faster loading
      const issuesResponse = await apiRepository.getAnalysisIssuesDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      setAnalysisData(prev => ({
        ...prev,
        issues: issuesResponse.success ? issuesResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load issues data:', err);
    } finally {
      updateLoadingState('issues', false);
    }
  }, [analysisData.issues, expandedSections.issues, projectId, activeIDE.projectId, apiRepository]);

  const loadTechStackData = useCallback(async () => {
    if (analysisData.techStack !== null) return; // Already loaded
    
    try {
      updateLoadingState('techStack', true);
      const currentProjectId = projectId || activeIDE.projectId;
      const techStackResponse = await apiRepository.getAnalysisTechStackDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      setAnalysisData(prev => ({
        ...prev,
        techStack: techStackResponse.success ? techStackResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load tech stack data:', err);
    } finally {
      updateLoadingState('techStack', false);
    }
  }, [analysisData.techStack, projectId, activeIDE.projectId, apiRepository]);

  const loadArchitectureData = useCallback(async () => {
    if (analysisData.architecture !== null) return; // Already loaded
    
    try {
      updateLoadingState('architecture', true);
      const currentProjectId = projectId || activeIDE.projectId;
      const architectureResponse = await apiRepository.getAnalysisArchitectureDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      setAnalysisData(prev => ({
        ...prev,
        architecture: architectureResponse.success ? architectureResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load architecture data:', err);
    } finally {
      updateLoadingState('architecture', false);
    }
  }, [analysisData.architecture, projectId, activeIDE.projectId, apiRepository]);

  const loadRecommendationsData = useCallback(async () => {
    if (analysisData.recommendations !== null) return; // Already loaded
    
    try {
      updateLoadingState('recommendations', true);
      const currentProjectId = projectId || activeIDE.projectId;
      const recommendationsResponse = await apiRepository.getAnalysisRecommendationsDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      setAnalysisData(prev => ({
        ...prev,
        recommendations: recommendationsResponse.success ? recommendationsResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load recommendations data:', err);
    } finally {
      updateLoadingState('recommendations', false);
    }
  }, [analysisData.recommendations, projectId, activeIDE.projectId, apiRepository]);

  const loadChartsData = useCallback(async () => {
    if (analysisData.charts !== null) return; // Already loaded
    
    try {
      updateLoadingState('charts', true);
      const currentProjectId = projectId || activeIDE.projectId;
      const chartsResponse = await apiRepository.getAnalysisChartsDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      setAnalysisData(prev => ({
        ...prev,
        charts: chartsResponse.success ? chartsResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load charts data:', err);
    } finally {
      updateLoadingState('charts', false);
    }
  }, [analysisData.charts, projectId, activeIDE.projectId, apiRepository]);

  // ✅ REFACTORED: Use global state for section toggle logic
  const handleSectionToggle = (sectionName) => {
    console.log('🎯 [DEBUG] handleSectionToggle called:', sectionName);
    
    setExpandedSections(prev => {
      const newExpandedSections = { ...prev, [sectionName]: !prev[sectionName] };
      console.log('🎯 [DEBUG] New expandedSections:', newExpandedSections);
      return newExpandedSections;
    });

    // Load data when section is expanded
    if (!expandedSections[sectionName]) {
      switch (sectionName) {
        case 'issues':
          loadIssuesData();
          break;
        case 'techStack':
          loadTechStackData();
          break;
        case 'architecture':
          loadArchitectureData();
          break;
        case 'recommendations':
          loadRecommendationsData();
          break;
        case 'charts':
          loadChartsData();
          break;
        default:
          break;
      }
    }
  };

  // ✅ REFACTORED: Simplified recent data check using global state
  const checkForRecentAnalysisData = async (historyResponse, projectId) => {
    try {
      // Use global state history data
      const history = analysisHistory.history;
      if (!history || history.length === 0) {
        return false;
      }

      // Check if we have recent analysis (within last 24 hours)
      const recentAnalysis = history.find(analysis => {
        const analysisDate = new Date(analysis.timestamp || analysis.createdAt);
        const now = new Date();
        const diffHours = (now - analysisDate) / (1000 * 60 * 60);
        return diffHours < 24;
      });

      return !!recentAnalysis;
    } catch (error) {
      logger.error('Error checking for recent analysis data:', error);
      return false;
    }
  };

  // ✅ REFACTORED: Simplified event handlers using global state
  const handleAnalysisStatusUpdate = (data) => {
    console.log('📊 [DEBUG] Analysis status update received:', data);
    logger.info('Analysis status update received:', data);
    
    // Global state will be updated automatically via WebSocket
    // No need to manually update local state
  };

  const handleAnalysisCompleted = (data) => {
    console.log('✅ [DEBUG] Analysis completed:', data);
    logger.info('Analysis completed:', data);
    
    // Reload project data from global state
    if (activeIDE.workspacePath) {
      loadProjectData(activeIDE.workspacePath);
    }
    
    showSuccess('Analysis completed successfully!', 'Analysis Complete');
  };

  const handleAnalysisProgress = (data) => {
    console.log('📈 [DEBUG] Analysis progress:', data);
    logger.info('Analysis progress:', data);
    
    // Global state will be updated automatically via WebSocket
    // No need to manually update local state
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleAnalysisSelect = (analysis) => {
    setSelectedAnalysis(analysis);
    setShowModal(true);
  };

  const handleRefresh = () => {
    setError(null);
    setAnalysisData(prev => ({
      ...prev,
      issues: null,
      techStack: null,
      architecture: null,
      recommendations: null,
      charts: null
    }));
    
    loadAnalysisData(true); // forceRefresh = true
  };

  /**
   * @deprecated This function is deprecated. Use IndividualAnalysisButtons component instead.
   * Kept for backward compatibility but should not be used in new code.
   */
  const handleStartAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentProjectId = projectId || activeIDE.projectId;
      
      // Check if we already have recent data
      if (analysisData.hasRecentData) {
        const shouldProceed = window.confirm(
          'Recent analysis data already exists. Do you want to run a new analysis anyway?'
        );
        if (!shouldProceed) {
          setLoading(false);
          return;
        }
      }

      // Start new analysis
      const response = await apiRepository.startAutoMode(currentProjectId, { mode: 'analysis' });
      if (response.success) {
        // Nach Abschluss neue Daten laden
        await loadAnalysisData();
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

  // ✅ REFACTORED: Use global state for loading and error states
  if (loading && !analysisMetrics.hasMetrics) {
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
        {/* Header content: title, status, actions */}
        <div className="analysis-title">
          <h2>📊 Analysis Dashboard</h2>
          <AnalysisStatus 
            status={analysisStatus.status} 
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
        </div>
      </div>
      
      {/* Individual Analysis Buttons Section */}
      <div className="analysis-controls">
        <IndividualAnalysisButtons 
          projectId={projectId}
          eventBus={eventBus}
          onAnalysisComplete={handleRefresh}
        />
      </div>
      <div className="analysis-content">
        {/* Filters */}
        <AnalysisFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        
        {/* Analysis Sections */}
        <div className="analysis-sections">
          {/* Metrics Section */}
          <div className={`analysis-section ${expandedSections.metrics ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('metrics')}>
              <h3>📊 Metrics</h3>
              <span className="toggle-icon">{expandedSections.metrics ? '▼' : '▶'}</span>
            </div>
            {expandedSections.metrics && (
              <AnalysisMetrics 
                metrics={analysisMetrics.metrics}
                loading={loadingStates.metrics}
              />
            )}
          </div>

          {/* Charts Section */}
          <div className={`analysis-section ${expandedSections.charts ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('charts')}>
              <h3>📈 Charts</h3>
              <span className="toggle-icon">{expandedSections.charts ? '▼' : '▶'}</span>
            </div>
            {expandedSections.charts && (
              <AnalysisCharts 
                charts={analysisData.charts}
                loading={loadingStates.charts}
                onLoad={loadChartsData}
              />
            )}
          </div>

          {/* History Section */}
          <div className={`analysis-section ${expandedSections.history ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('history')}>
              <h3>📜 History</h3>
              <span className="toggle-icon">{expandedSections.history ? '▼' : '▶'}</span>
            </div>
            {expandedSections.history && (
              <AnalysisHistory 
                history={analysisHistory.history}
                onAnalysisSelect={handleAnalysisSelect}
                filters={filters}
              />
            )}
          </div>

          {/* Issues Section */}
          <div className={`analysis-section ${expandedSections.issues ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('issues')}>
              <h3>⚠️ Issues</h3>
              <span className="toggle-icon">{expandedSections.issues ? '▼' : '▶'}</span>
            </div>
            {expandedSections.issues && (
              <AnalysisIssues 
                issues={analysisData.issues}
                loading={loadingStates.issues}
                onLoad={loadIssuesData}
              />
            )}
          </div>

          {/* Tech Stack Section */}
          <div className={`analysis-section ${expandedSections.techStack ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('techStack')}>
              <h3>🛠️ Tech Stack</h3>
              <span className="toggle-icon">{expandedSections.techStack ? '▼' : '▶'}</span>
            </div>
            {expandedSections.techStack && (
              <AnalysisTechStack 
                techStack={analysisData.techStack}
                loading={loadingStates.techStack}
                onLoad={loadTechStackData}
              />
            )}
          </div>

          {/* Architecture Section */}
          <div className={`analysis-section ${expandedSections.architecture ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('architecture')}>
              <h3>🏗️ Architecture</h3>
              <span className="toggle-icon">{expandedSections.architecture ? '▼' : '▶'}</span>
            </div>
            {expandedSections.architecture && (
              <AnalysisArchitecture 
                architecture={analysisData.architecture}
                loading={loadingStates.architecture}
                onLoad={loadArchitectureData}
              />
            )}
          </div>

          {/* Recommendations Section */}
          <div className={`analysis-section ${expandedSections.recommendations ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('recommendations')}>
              <h3>💡 Recommendations</h3>
              <span className="toggle-icon">{expandedSections.recommendations ? '▼' : '▶'}</span>
            </div>
            {expandedSections.recommendations && (
              <AnalysisRecommendations 
                recommendations={analysisData.recommendations}
                loading={loadingStates.recommendations}
                onLoad={loadRecommendationsData}
              />
            )}
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      {showModal && selectedAnalysis && (
        <AnalysisModal
          analysis={selectedAnalysis}
          onClose={() => {
            setShowModal(false);
            setSelectedAnalysis(null);
          }}
        />
      )}
    </div>
  );
};

export default AnalysisDataViewer; 