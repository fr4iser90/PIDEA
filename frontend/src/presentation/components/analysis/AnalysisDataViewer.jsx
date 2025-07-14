import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useAnalysisCache from '@/hooks/useAnalysisCache';
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
    issues: null,
    techStack: null,
    architecture: null,
    recommendations: null
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
    metrics: true,
    charts: true,
    history: true,
    issues: false,
    techStack: false,
    architecture: false,
    recommendations: false
  });
  
  // Individual loading states for progressive loading
  const [loadingStates, setLoadingStates] = useState({
    metrics: false,
    status: false,
    history: false,
    issues: false,
    techStack: false,
    architecture: false,
    recommendations: false
  });

  const apiRepository = new APIChatRepository();
  const { getCachedData, setCachedData, hasCachedData } = useAnalysisCache();

  useEffect(() => {
    loadAnalysisData();
    setupEventListeners();
  }, [projectId, filters]);

  const setupEventListeners = () => {
    if (!eventBus) return;

    // Listen for real-time analysis updates
    eventBus.on('analysis-status-update', handleAnalysisStatusUpdate);
    eventBus.on('analysis-completed', handleAnalysisCompleted);
    eventBus.on('analysis-progress', handleAnalysisProgress);

    return () => {
      eventBus.off('analysis-status-update', handleAnalysisStatusUpdate);
      eventBus.off('analysis-completed', handleAnalysisCompleted);
      eventBus.off('analysis-progress', handleAnalysisProgress);
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

  const loadAnalysisData = async () => {
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
      
      if (cachedStatus && cachedMetrics) {
        // Use cached data
        statusResponse = { success: true, data: cachedStatus };
        metricsResponse = { success: true, data: cachedMetrics };
        logger.log('🔍 [AnalysisDataViewer] Using cached status and metrics');
      } else {
        // Load from API
        [statusResponse, metricsResponse] = await Promise.all([
          apiRepository.getAnalysisStatus?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
          apiRepository.getAnalysisMetrics?.(currentProjectId) || Promise.resolve({ success: false, data: null })
        ]);
        
        // Cache the results
        if (statusResponse.success) {
          setCachedData(currentProjectId, 'status', statusResponse.data);
        }
        if (metricsResponse.success) {
          setCachedData(currentProjectId, 'metrics', metricsResponse.data);
        }
      }

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
      
      const cachedHistory = getCachedData(currentProjectId, 'history');
      let historyResponse;
      
      if (cachedHistory) {
        historyResponse = { success: true, data: cachedHistory };
        logger.log('🔍 [AnalysisDataViewer] Using cached history');
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

      // Step 3: Load new component data (Phase 2 components)
      // Load issues data
      updateLoadingState('issues', true);
      try {
        const cachedIssues = getCachedData(currentProjectId, 'issues');
        let issuesResponse;
        
        if (cachedIssues) {
          issuesResponse = { success: true, data: cachedIssues };
          logger.log('🔍 [AnalysisDataViewer] Using cached issues');
        } else {
          issuesResponse = await apiRepository.getAnalysisIssues?.(currentProjectId) || Promise.resolve({ success: false, data: null });
          if (issuesResponse.success) {
            setCachedData(currentProjectId, 'issues', issuesResponse.data);
          }
        }
        
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
        const cachedTechStack = getCachedData(currentProjectId, 'techStack');
        let techStackResponse;
        
        if (cachedTechStack) {
          techStackResponse = { success: true, data: cachedTechStack };
          logger.log('🔍 [AnalysisDataViewer] Using cached tech stack');
        } else {
          techStackResponse = await apiRepository.getAnalysisTechStack?.(currentProjectId) || Promise.resolve({ success: false, data: null });
          if (techStackResponse.success) {
            setCachedData(currentProjectId, 'techStack', techStackResponse.data);
          }
        }
        
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
        const cachedArchitecture = getCachedData(currentProjectId, 'architecture');
        let architectureResponse;
        
        if (cachedArchitecture) {
          architectureResponse = { success: true, data: cachedArchitecture };
          logger.log('🔍 [AnalysisDataViewer] Using cached architecture');
        } else {
          architectureResponse = await apiRepository.getAnalysisArchitecture?.(currentProjectId) || Promise.resolve({ success: false, data: null });
          if (architectureResponse.success) {
            setCachedData(currentProjectId, 'architecture', architectureResponse.data);
          }
        }
        
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
        const cachedRecommendations = getCachedData(currentProjectId, 'recommendations');
        let recommendationsResponse;
        
        if (cachedRecommendations) {
          recommendationsResponse = { success: true, data: cachedRecommendations };
          logger.log('🔍 [AnalysisDataViewer] Using cached recommendations');
        } else {
          recommendationsResponse = await apiRepository.getAnalysisRecommendations?.(currentProjectId) || Promise.resolve({ success: false, data: null });
          if (recommendationsResponse.success) {
            setCachedData(currentProjectId, 'recommendations', recommendationsResponse.data);
          }
        }
        
        setAnalysisData(prev => ({
          ...prev,
          recommendations: recommendationsResponse.success ? recommendationsResponse.data : null
        }));
      } catch (err) {
        logger.error('Failed to load recommendations data:', err);
      }
      updateLoadingState('recommendations', false);

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
      
      logger.log('🔍 [AnalysisDataViewer] Analysis data freshness check:', {
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
      // Refresh data when analysis completes
      loadAnalysisData();
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
    loadAnalysisData();
  };

  const handleStartAnalysis = async () => {
    try {
      setLoading(true);
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

      const response = await apiRepository.startAutoMode(currentProjectId, {
        mode: 'analysis'
      });
      
      if (response.success) {
        logger.log('Analysis started successfully');
        // Data will be updated via real-time events
      } else {
        setError('Failed to start analysis: ' + response.error);
      }
    } catch (err) {
      setError('Error starting analysis: ' + err.message);
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
      <div className="analysis-content">
        {/* Filters */}
        <AnalysisFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
          projectId={projectId}
        />

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