import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import { useRefreshService } from '@/hooks/useRefreshService';
import { 
  useActiveIDE, 
  useProjectDataActions,
  useCategoryAnalysisLoading,
  useSecurityAnalysis,
  usePerformanceAnalysis,
  useArchitectureAnalysis,
  useCodeQualityAnalysis,
  useDependenciesAnalysis,
  useManifestAnalysis,
  useTechStackAnalysis
} from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
import CategoryAnalysisSection from './CategoryAnalysisSection';
import IndividualAnalysisButtons from './IndividualAnalysisButtons';
import '@/scss/components/_analysis-data-viewer.scss';;

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // ✅ NEW: Use category-based selectors instead of legacy selectors
  const activeIDE = useActiveIDE();
  const { loadCategoryAnalysisData } = useProjectDataActions();
  const categoryLoading = useCategoryAnalysisLoading();
  
  // ✅ NEW: Integrate with RefreshService
  const { forceRefresh, getStats } = useRefreshService('analysis', {
    fetchData: async () => {
      if (activeIDE.projectId) {
        try {
          await loadCategoryAnalysisData(activeIDE.projectId);
          return { success: true };
        } catch (error) {
          logger.error('Failed to fetch analysis data:', error);
          throw error;
        }
      }
      return null;
    },
    updateData: (data) => {
      if (data && data.success) {
        logger.info('Analysis data refreshed via RefreshService');
      }
    }
  });
  
  // Category data selectors
  const securityAnalysis = useSecurityAnalysis();
  const performanceAnalysis = usePerformanceAnalysis();
  const architectureAnalysis = useArchitectureAnalysis();
  const codeQualityAnalysis = useCodeQualityAnalysis();
  const dependenciesAnalysis = useDependenciesAnalysis();
  const manifestAnalysis = useManifestAnalysis();
  const techStackAnalysis = useTechStackAnalysis();
  
  // Local state for UI interactions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // NEW: Category sections state (7 categories)
  const [expandedCategories, setExpandedCategories] = useState({
    security: false,
    performance: false,
    architecture: false,
    codeQuality: false,
    dependencies: false,
    manifest: false,
    techStack: false
  });

  const apiRepository = new APIChatRepository();
  const { showNotification } = useNotificationStore();

  // ✅ NEW: Load only basic analysis status when component mounts (no detailed data)
  useEffect(() => {
    if (activeIDE?.workspacePath) {
      logger.info('AnalysisDataViewer: Loading basic analysis status for workspace:', activeIDE.workspacePath);
      // Only load basic status, not detailed category data
      loadCategoryAnalysisData(activeIDE.workspacePath, 'status-only');
    }
  }, [activeIDE?.workspacePath, loadCategoryAnalysisData]);

  // ✅ NEW: Handle category section toggle with lazy loading
  const handleCategoryToggle = useCallback((category) => {
    const isExpanding = !expandedCategories[category];
    
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
    
    // Only load data when expanding (not when collapsing)
    if (isExpanding && activeIDE?.workspacePath) {
      // Check if data is already loaded for this category
      const hasData = categoryLoading.loadedCategories.includes(category);
      
      if (!hasData) {
        logger.info(`🔄 Lazy loading ${category} data for workspace:`, activeIDE.workspacePath);
        loadCategoryAnalysisData(activeIDE.workspacePath, category);
      } else {
        logger.info(`✅ ${category} data already loaded, skipping API call`);
      }
    }
  }, [activeIDE?.workspacePath, categoryLoading.loadedCategories, loadCategoryAnalysisData, expandedCategories]);

  // ✅ NEW: Handle analysis execution
  const handleAnalysisExecute = useCallback(async (analysisType, options = {}) => {
    if (!activeIDE?.workspacePath) {
      showNotification('No active workspace found', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.info(`Executing ${analysisType} analysis for workspace:`, activeIDE.workspacePath);
      
      const result = await apiRepository.executeAnalysisStep(null, analysisType, options);
      
      if (result.success) {
        showNotification(`${analysisType} analysis completed successfully`, 'success');
        
        // Reload the specific category data
        await loadCategoryAnalysisData(activeIDE.workspacePath, analysisType);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      logger.error(`Failed to execute ${analysisType} analysis:`, error);
      setError(error.message);
      showNotification(`Failed to execute ${analysisType} analysis: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeIDE?.workspacePath, apiRepository, loadCategoryAnalysisData, showNotification]);

  // ✅ NEW: Handle analysis selection
  const handleAnalysisSelect = useCallback((analysis) => {
    setSelectedAnalysis(analysis);
    setShowModal(true);
  }, []);

  // ✅ NEW: Handle modal close
  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setSelectedAnalysis(null);
  }, []);

  // ✅ NEW: Category configuration
  const categories = [
    {
      key: 'security',
      name: 'Security',
      icon: '🔒',
      description: 'Security vulnerabilities and best practices',
      analysis: securityAnalysis
    },
    {
      key: 'performance',
      name: 'Performance',
      icon: '⚡',
      description: 'Performance optimization and bottlenecks',
      analysis: performanceAnalysis
    },
    {
      key: 'architecture',
      name: 'Architecture',
      icon: '🏗️',
      description: 'Architectural patterns and design quality',
      analysis: architectureAnalysis
    },
    {
      key: 'codeQuality',
      name: 'Code Quality',
      icon: '📝',
      description: 'Code quality metrics and standards',
      analysis: codeQualityAnalysis
    },
    {
      key: 'dependencies',
      name: 'Dependencies',
      icon: '📦',
      description: 'Dependency management and vulnerabilities',
      analysis: dependenciesAnalysis
    },
    {
      key: 'manifest',
      name: 'Manifest',
      icon: '📋',
      description: 'Project configuration and metadata',
      analysis: manifestAnalysis
    },
    {
      key: 'techStack',
      name: 'Tech Stack',
      icon: '🛠️',
      description: 'Technology stack analysis and recommendations',
      analysis: techStackAnalysis
    }
  ];

  if (!activeIDE?.workspacePath) {
    return (
      <div className="analysis-data-viewer">
        <div className="analysis-header">
          <h2>📊 Analysis Dashboard</h2>
        </div>
        <div className="analysis-content">
          <div className="no-workspace-message">
            <p>No active workspace found. Please select an IDE to view analysis data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-data-viewer">
      <div className="analysis-header">
        <h2>📊 Analysis Dashboard</h2>
        <div className="analysis-controls">
          <IndividualAnalysisButtons 
            onAnalysisExecute={handleAnalysisExecute}
            loading={loading}
          />
        </div>
      </div>
      
      <div className="analysis-content">
        {/* Loading indicator */}
        {categoryLoading.isLoading && (
          <div className="analysis-loading">
            <div className="loading-spinner"></div>
            <p>Loading analysis data... {Math.round(categoryLoading.progress)}%</p>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="analysis-error">
            <p>❌ Error: {error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        {/* Category sections */}
        <div className="category-sections">
          {categories.map((category) => (
            <CategoryAnalysisSection
              key={category.key}
              category={category}
              expanded={expandedCategories[category.key]}
              onToggle={() => handleCategoryToggle(category.key)}
              onAnalysisSelect={handleAnalysisSelect}
              loading={loading}
            />
          ))}
        </div>
        
        {/* Analysis modal */}
        {showModal && selectedAnalysis && (
          <div className="analysis-modal-overlay" onClick={handleModalClose}>
            <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Analysis Details</h3>
                <button onClick={handleModalClose}>×</button>
              </div>
              <div className="modal-content">
                <pre>{JSON.stringify(selectedAnalysis, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDataViewer; 