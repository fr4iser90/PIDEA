import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    metrics: null,
    status: null,
    history: [],
    charts: null,
    issues: null,
    techStack: null,
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
    metrics: false,
    status: false,
    history: false,
    charts: false,
    issues: false,
    techStack: false,
    architecture: false,
    recommendations: false
  });

  const apiRepository = new APIChatRepository();
  const { showSuccess, showInfo } = useNotificationStore();

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



  const loadAnalysisData = useCallback(async (forceRefresh = false) => {
    console.log('🚀 [DEBUG] loadAnalysisData called', { forceRefresh, projectId });
    logger.info('🚀 [AnalysisDataViewer] loadAnalysisData called', { forceRefresh, projectId });
    
    try {
      setLoading(true);
      setError(null);

      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      console.log('🔍 [DEBUG] Current project ID:', currentProjectId);
      
      // Step 1: Load only essential data first (status, metrics, history)
      updateLoadingState('status', true);
      updateLoadingState('metrics', true);
      updateLoadingState('history', true);
      
      console.log('📡 [DEBUG] Starting API calls...');
      logger.info('📡 [AnalysisDataViewer] Starting API calls...');
      
      // ✅ OPTIMIZATION: Use direct API calls (bypass StepRegistry) for faster loading
      const [statusResponse, metricsResponse, historyResponse, techStackResponse] = await Promise.all([
        apiRepository.getAnalysisStatusDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
        apiRepository.getAnalysisMetricsDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
        apiRepository.getAnalysisHistoryDirect?.(currentProjectId) || Promise.resolve({ success: false, data: [] }),
        apiRepository.getAnalysisTechStackDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null })
      ]);

      console.log('📊 [DEBUG] API responses received:', {
        statusSuccess: statusResponse.success,
        metricsSuccess: metricsResponse.success,
        historySuccess: historyResponse.success,
        techStackSuccess: techStackResponse.success,
        statusData: statusResponse.data ? 'present' : 'null',
        metricsData: metricsResponse.data ? 'present' : 'null',
        historyData: historyResponse.data ? `${historyResponse.data.length} items` : 'null',
        techStackData: techStackResponse.data ? 'present' : 'null'
      });

      // Update UI with essential data immediately
      setAnalysisData(prev => ({
        ...prev,
        status: statusResponse.success ? statusResponse.data : null,
        metrics: metricsResponse.success ? metricsResponse.data : null,
        history: historyResponse.success ? (historyResponse.data || []) : [],
        techStack: techStackResponse.success ? techStackResponse.data : null
      }));

      updateLoadingState('status', false);
      updateLoadingState('metrics', false);
      updateLoadingState('history', false);

      // Check if we have recent analysis data
      const hasRecentData = await checkForRecentAnalysisData(historyResponse, currentProjectId);
      setAnalysisData(prev => ({ ...prev, hasRecentData }));

      console.log('✅ [DEBUG] Analysis data loaded successfully');

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
  }, [projectId, apiRepository, showSuccess]);

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
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
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
  }, [analysisData.issues, expandedSections.issues, projectId, apiRepository]);

  const loadTechStackData = useCallback(async () => {
    console.log('🔧 [DEBUG] loadTechStackData called', { 
      techStackData: analysisData.techStack, 
      expandedSections: expandedSections,
      isExpanded: expandedSections.techStack 
    });
    
    if (analysisData.techStack !== null) {
      console.log('🔧 [DEBUG] loadTechStackData: Already loaded, returning');
      return; // Already loaded
    }
    
    console.log('🔧 [DEBUG] loadTechStackData: Starting API call');
    
    try {
      updateLoadingState('techStack', true);
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const techStackResponse = await apiRepository.getAnalysisTechStack?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      logger.info('🔧 [AnalysisDataViewer] Tech stack response received');
      
      setAnalysisData(prev => ({
        ...prev,
        techStack: techStackResponse.success ? techStackResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load tech stack data:', err);
    } finally {
      updateLoadingState('techStack', false);
    }
  }, [projectId, apiRepository, analysisData.techStack, expandedSections]);

  const loadArchitectureData = useCallback(async () => {
    console.log('🏗️ [DEBUG] loadArchitectureData called', { 
      architectureData: analysisData.architecture, 
      expandedSections: expandedSections,
      isExpanded: expandedSections.architecture 
    });
    
    if (analysisData.architecture !== null) {
      console.log('🏗️ [DEBUG] loadArchitectureData: Already loaded, returning');
      return; // Already loaded
    }
    
    console.log('🏗️ [DEBUG] loadArchitectureData: Starting API call');
    
    try {
      updateLoadingState('architecture', true);
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const architectureResponse = await apiRepository.getAnalysisArchitecture?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      logger.info('🏗️ [AnalysisDataViewer] Architecture response received');
      
      setAnalysisData(prev => ({
        ...prev,
        architecture: architectureResponse.success ? architectureResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load architecture data:', err);
    } finally {
      updateLoadingState('architecture', false);
    }
  }, [projectId, apiRepository, analysisData.architecture, expandedSections]);

  const loadRecommendationsData = useCallback(async () => {
    console.log('💡 [DEBUG] loadRecommendationsData called', { 
      recommendationsData: analysisData.recommendations, 
      expandedSections: expandedSections,
      isExpanded: expandedSections.recommendations 
    });
    
    if (analysisData.recommendations !== null) {
      console.log('💡 [DEBUG] loadRecommendationsData: Already loaded, returning');
      return; // Already loaded
    }
    
    console.log('💡 [DEBUG] loadRecommendationsData: Starting API call');
    
    try {
      updateLoadingState('recommendations', true);
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const recommendationsResponse = await apiRepository.getAnalysisRecommendations?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      logger.info('💡 [AnalysisDataViewer] Recommendations response received');
      
      setAnalysisData(prev => ({
        ...prev,
        recommendations: recommendationsResponse.success ? recommendationsResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load recommendations data:', err);
    } finally {
      updateLoadingState('recommendations', false);
    }
  }, [projectId, apiRepository, analysisData.recommendations, expandedSections]);

  const loadChartsData = useCallback(async () => {
    console.log('📈 [DEBUG] loadChartsData called', { 
      chartsData: analysisData.charts, 
      expandedSections: expandedSections,
      isExpanded: expandedSections.charts 
    });
    
    if (analysisData.charts !== null) {
      console.log('📈 [DEBUG] loadChartsData: Already loaded, returning');
      return; // Already loaded
    }
    
    console.log('📈 [DEBUG] loadChartsData: Starting API call');
    
    try {
      updateLoadingState('charts', true);
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      const chartsResponse = await apiRepository.getAnalysisCharts?.(currentProjectId, 'trends') || Promise.resolve({ success: false, data: null });
      
      setAnalysisData(prev => ({
        ...prev,
        charts: chartsResponse.success ? chartsResponse.data : null
      }));
    } catch (err) {
      logger.error('Failed to load charts data:', err);
    } finally {
      updateLoadingState('charts', false);
    }
  }, [projectId, apiRepository, analysisData.charts, expandedSections]);

  // Handle section expansion to trigger lazy loading
  const handleSectionToggle = (sectionName) => {
    console.log('🔄 [DEBUG] handleSectionToggle called', { 
      sectionName, 
      currentExpanded: expandedSections[sectionName],
      allExpandedSections: expandedSections 
    });
    
    setExpandedSections(prev => {
      const newExpanded = { ...prev, [sectionName]: !prev[sectionName] };
      
      console.log('🔄 [DEBUG] handleSectionToggle new state', { 
        sectionName, 
        willBeExpanded: newExpanded[sectionName],
        allNewExpandedSections: newExpanded 
      });
      
      // Trigger lazy loading when section is expanded
      if (newExpanded[sectionName]) {
        console.log('🔄 [DEBUG] handleSectionToggle: Section will be expanded, triggering lazy load', { sectionName });
        
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
        }
      } else {
        console.log('🔄 [DEBUG] handleSectionToggle: Section will be collapsed', { sectionName });
      }
      
      return newExpanded;
    });
  };

  /**
   * Check if we have recent analysis data to avoid unnecessary re-analysis
   * @param {Object} historyResponse - Analysis history response
   * @param {string} projectId - Current project ID
   * @returns {Promise<boolean>} Whether recent data exists
   */
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
    // Only update status if it's actually different to avoid unnecessary re-renders
    if (data.projectId === (projectId || analysisData.status?.projectId)) {
      const currentStatus = analysisData.status;
      const newStatus = data.status;
      
      // Only update if status actually changed
      if (!currentStatus || 
          currentStatus.status !== newStatus.status ||
          currentStatus.progress !== newStatus.progress ||
          currentStatus.currentStep !== newStatus.currentStep) {
        
        logger.info('🔄 [AnalysisDataViewer] Status update received:', {
          oldStatus: currentStatus?.status,
          newStatus: newStatus.status,
          oldProgress: currentStatus?.progress,
          newProgress: newStatus.progress
        });
        
        setAnalysisData(prev => ({
          ...prev,
          status: data.status
        }));
      }
    }
  };

  const handleAnalysisCompleted = (data) => {
    logger.info('🔍 [AnalysisDataViewer] Analysis completed event received:', data);
    logger.info('🔍 [AnalysisDataViewer] Current projectId:', projectId);
    logger.info('🔍 [AnalysisDataViewer] Event projectId:', data.projectId);
    logger.info('🔍 [AnalysisDataViewer] Status projectId:', analysisData.status?.projectId);
    
    if (data.projectId === (projectId || analysisData.status?.projectId)) {
      logger.info('🔍 [AnalysisDataViewer] Project ID matches, refreshing data...');
      // Force fresh data when analysis completes (ETag will handle caching)
      showSuccess('Analysis completed! Data refreshed.', 'Analysis Complete');
      
      // Reset lazy loaded data to force reload when sections are expanded
      setAnalysisData(prev => ({
        ...prev,
        issues: null,
        techStack: null,
        architecture: null,
        recommendations: null,
        charts: null
      }));
      
      // Force fresh data with a small delay to ensure backend has processed the data
      setTimeout(() => {
        logger.info('🔍 [AnalysisDataViewer] Starting data refresh...');
        loadAnalysisData(true); // forceRefresh = true
      }, 1000);
    } else {
      logger.info('🔍 [AnalysisDataViewer] Project ID does not match, ignoring event');
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
    // Force fresh data (ETag will handle caching)
    showInfo('Refreshing analysis data...', 'Data Refresh');
    
    // Reset lazy loaded data to force reload when sections are expanded
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
      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
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
        {/* Header content: title, status, actions */}
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
          projectId={projectId}
        />

        {/* Recommendations Section */}
        <div className={`analysis-section ${expandedSections.recommendations ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('recommendations')}>
            <h3>💡 Recommendations</h3>
            <span className="section-toggle">{expandedSections.recommendations ? '▼' : '▶'}</span>
          </div>
          {expandedSections.recommendations && (
            <div className="section-content">
              <AnalysisRecommendations 
                recommendations={analysisData.recommendations}
                loading={loadingStates.recommendations}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Issues Section */}
        <div className={`analysis-section ${expandedSections.issues ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('issues')}>
            <h3>⚠️ Issues</h3>
            <span className="section-toggle">{expandedSections.issues ? '▼' : '▶'}</span>
          </div>
          {expandedSections.issues && (
            <div className="section-content">
              <AnalysisIssues 
                issues={analysisData.issues}
                loading={loadingStates.issues}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Tech Stack Section */}
        <div className={`analysis-section ${expandedSections.techStack ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('techStack')}>
            <h3>🔧 Tech Stack</h3>
            <span className="section-toggle">{expandedSections.techStack ? '▼' : '▶'}</span>
          </div>
          {expandedSections.techStack && (
            <div className="section-content">
              <AnalysisTechStack 
                techStack={analysisData.techStack}
                loading={loadingStates.techStack}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Architecture Section */}
        <div className={`analysis-section ${expandedSections.architecture ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('architecture')}>
            <h3>🏗️ Architecture</h3>
            <span className="section-toggle">{expandedSections.architecture ? '▼' : '▶'}</span>
          </div>
          {expandedSections.architecture && (
            <div className="section-content">
              <AnalysisArchitecture 
                architecture={analysisData.architecture}
                loading={loadingStates.architecture}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Metrics Section */}
        <div className={`analysis-section ${expandedSections.metrics ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('metrics')}>
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

        {/* Charts Section */}
        <div className={`analysis-section ${expandedSections.charts ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('charts')}>
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

        {/* History Section */}
        <div className={`analysis-section ${expandedSections.history ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={() => handleSectionToggle('history')}>
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