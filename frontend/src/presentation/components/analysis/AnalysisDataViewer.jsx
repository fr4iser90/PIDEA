import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import AnalysisCharts from './AnalysisCharts';
import AnalysisMetrics from './AnalysisMetrics';
import AnalysisFilters from './AnalysisFilters';
import AnalysisHistory from './AnalysisHistory';
import AnalysisStatus from './AnalysisStatus';
import AnalysisModal from './AnalysisModal';
import '@/css/components/analysis/analysis-data-viewer.css';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    metrics: null,
    status: null,
    history: [],
    charts: {}
  });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    analysisType: 'all',
    projectId: projectId
  });
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const apiRepository = new APIChatRepository();

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

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentProjectId = projectId || await apiRepository.getCurrentProjectId();
      
      // Load all analysis data in parallel
      const [metricsResponse, statusResponse, historyResponse] = await Promise.all([
        apiRepository.getAnalysisMetrics?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
        apiRepository.getAnalysisStatus?.(currentProjectId) || Promise.resolve({ success: false, data: null }),
        apiRepository.getAnalysisHistory(currentProjectId)
      ]);

      // Debug logging
      logger.log('🔍 [AnalysisDataViewer] API Responses:', {
        metrics: metricsResponse,
        status: statusResponse,
        history: historyResponse,
        currentProjectId
      });

      // Check if we have recent analysis data
      const hasRecentData = await checkForRecentAnalysisData(historyResponse, currentProjectId);

      setAnalysisData({
        metrics: metricsResponse.success ? metricsResponse.data : null,
        status: statusResponse.success ? statusResponse.data : null,
        history: historyResponse.success ? (historyResponse.data || []) : [],
        charts: {},
        hasRecentData
      });

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
      {/* Header */}
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
        </div>
      </div>

      {/* Filters */}
      <AnalysisFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        projectId={projectId}
      />

      {/* Metrics */}
      <AnalysisMetrics 
        metrics={analysisData.metrics}
        loading={loading}
      />

      {/* Charts */}
      <AnalysisCharts 
        data={analysisData.charts}
        history={analysisData.history}
        filters={filters}
        loading={loading}
      />

      {/* History */}
      <AnalysisHistory 
        history={analysisData.history}
        onAnalysisSelect={handleAnalysisSelect}
        loading={loading}
      />

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
  );
};

export default AnalysisDataViewer; 