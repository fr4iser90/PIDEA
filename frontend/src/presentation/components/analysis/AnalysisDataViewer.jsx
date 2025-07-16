import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
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
    charts: {},
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
    recommendations: true,
    issues: false,
    techStack: false,
    architecture: false,
    metrics: false,
    charts: false,
    history: false
  });
  
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
    loadAnalysisData();
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

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const loadAnalysisData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Step 1: Load lightweight data first (status, metrics) with caching
      updateLoadingState('status', true);
      updateLoadingState('metrics', true);
      
      // For large analysis data, skip client-side caching and rely on ETag system
      // Load from API directly (ETag will handle caching)
      const [statusResponse, metricsResponse] = await Promise.all([
        apiRepository.getAnalysisStatus?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
        apiRepository.getAnalysisMetrics?.(currentProjectId) || Promise.resolve({ success: false, data: null })
      ]);

      // Update UI with immediate data
      setAnalysisData(prev => ({
        ...prev,
        status: statusResponse.success ? statusResponse.data : null,
        metrics: metricsResponse.success ? metricsResponse.data : null
      }));

      updateLoadingState('status', false);
      updateLoadingState('metrics', false);

      // Step 2: Load heavy data with progress indicators
      updateLoadingState('history', true);
      
      // For large analysis data, skip client-side caching and rely on ETag system
      const historyResponse = await apiRepository.getAnalysisHistory(currentProjectId);
      
      setAnalysisData(prev => ({
        ...prev,
        history: historyResponse.success ? (historyResponse.data || []) : []
      }));

      updateLoadingState('history', false);

      // Step 3: Load new component data (Phase 2 components)
      // Load issues data
      updateLoadingState('issues', true);
      try {
        // For large analysis data, skip client-side caching and rely on ETag system
        const issuesResponse = await apiRepository.getAnalysisIssues?.(currentProjectId) || Promise.resolve({ success: false, data: null });
        
        setAnalysisData(prev => ({
          ...prev,
          issues: issuesResponse.success ? issuesResponse.data : null
        }));
      } catch (err) {
        logger.error('Failed to load issues data:', err);
      }
      updateLoadingState('issues', false);

      // Load tech stack data
      updateLoadingState('techStack', true);
      try {
        // For large analysis data, skip client-side caching and rely on ETag system
        const techStackResponse = await apiRepository.getAnalysisTechStack?.(currentProjectId) || Promise.resolve({ success: false, data: null });
        
        logger.info('🔧 [AnalysisDataViewer] Tech stack response received');
        
        setAnalysisData(prev => ({
          ...prev,
          techStack: techStackResponse.success ? techStackResponse.data : null
        }));
      } catch (err) {
        logger.error('Failed to load tech stack data:', err);
      }
      updateLoadingState('techStack', false);

      // Load architecture data
      updateLoadingState('architecture', true);
      try {
        // For large analysis data, skip client-side caching and rely on ETag system
        const architectureResponse = await apiRepository.getAnalysisArchitecture?.(currentProjectId) || Promise.resolve({ success: false, data: null });
        
        logger.info('🏗️ [AnalysisDataViewer] Architecture response received');
        
        setAnalysisData(prev => ({
          ...prev,
          architecture: architectureResponse.success ? architectureResponse.data : null
        }));
      } catch (err) {
        logger.error('Failed to load architecture data:', err);
      }
      updateLoadingState('architecture', false);

      // Load recommendations data
      updateLoadingState('recommendations', true);
      try {
        // For large analysis data, skip client-side caching and rely on ETag system
        const recommendationsResponse = await apiRepository.getAnalysisRecommendations?.(currentProjectId) || Promise.resolve({ success: false, data: null });
        
        logger.info('💡 [AnalysisDataViewer] Recommendations response received');
        
        setAnalysisData(prev => ({
          ...prev,
          recommendations: recommendationsResponse.success ? recommendationsResponse.data : null
        }));
      } catch (err) {
        logger.error('Failed to load recommendations data:', err);
      }
      updateLoadingState('recommendations', false);

      // Load charts data
      updateLoadingState('charts', true);
      try {
        // For large analysis data, skip client-side caching and rely on ETag system
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

      // Show success notification if data was loaded successfully
      if (forceRefresh) {
        showSuccess('Analysis data refreshed successfully!', 'Data Loaded');
      }

    } catch (err) {
      setError('Failed to load analysis data: ' + err.message);
      logger.error('Analysis data loading error:', err);
    } finally {
      setLoading(false);
    }
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
    if (data.projectId === (projectId || analysisData.status?.projectId)) {
      setAnalysisData(prev => ({
        ...prev,
        status: data.status
      }));
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
          <div className="section-header" onClick={() => toggleSection('recommendations')}>
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
          <div className="section-header" onClick={() => toggleSection('issues')}>
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
          <div className="section-header" onClick={() => toggleSection('techStack')}>
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
          <div className="section-header" onClick={() => toggleSection('architecture')}>
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

        {/* Charts Section */}
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

        {/* History Section */}
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