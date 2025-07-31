import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';
import { useAnalysisStatus, useAnalysisMetrics, useAnalysisHistory, useAnalysisRecommendations, useAnalysisTechStack, useAnalysisArchitecture, useActiveIDE, useProjectDataActions } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';
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
import SecurityDashboard from './SecurityDashboard';
import IndividualAnalysisButtons from './IndividualAnalysisButtons';
import '@/css/components/analysis/analysis-data-viewer.css';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // ✅ REFACTORED: Use global state selectors instead of local state
  const analysisStatus = useAnalysisStatus();
  const analysisMetrics = useAnalysisMetrics();
  const analysisHistory = useAnalysisHistory();
  const analysisRecommendations = useAnalysisRecommendations();
  const analysisTechStack = useAnalysisTechStack();
  const analysisArchitecture = useAnalysisArchitecture();
  const activeIDE = useActiveIDE();
  const { loadAnalysisData: loadAnalysisDataFromStore } = useProjectDataActions();

  
  // Local state for UI interactions and non-global data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState({
    issues: null,
    charts: null,
    architecture: null,
    recommendations: null,
    security: null,
    hasRecentData: false
  });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    analysisType: 'all',
    projectId: projectId
  });
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [localAnalysisStatus, setLocalAnalysisStatus] = useState({
    isRunning: false,
    progress: 0,
    currentStep: null
  });
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    recommendations: false,  // FIXED: Was true, now false
    issues: false,
    techStack: false,
    architecture: false,
    security: false,
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
    recommendations: false,
    security: false
  });

  const apiRepository = new APIChatRepository();
  const { showSuccess, showInfo } = useNotificationStore();

  // ✅ LAZY LOADING: Load analysis data when AnalysisView is opened
  useEffect(() => {
    if (activeIDE.workspacePath) {
      console.log('🎯 [DEBUG] AnalysisView opened, loading analysis data for:', activeIDE.workspacePath);
      loadAnalysisDataFromStore(activeIDE.workspacePath);
    }
  }, [activeIDE.workspacePath, loadAnalysisDataFromStore]);

  // Load analysis history from API
  const loadAnalysisHistory = async () => {
    try {
      console.log('🎯 [DEBUG] Loading analysis history for project:', currentProjectId);
      const response = await apiRepository.getAnalysisHistory?.(currentProjectId);
      console.log('🎯 [DEBUG] Analysis history response:', response);
      
      if (response && response.success && response.data) {
        // Update global state with history data
        // This should trigger a re-render with the new data
        console.log('🎯 [DEBUG] Analysis history loaded successfully');
      }
    } catch (error) {
      console.error('🎯 [DEBUG] Failed to load analysis history:', error);
    }
  };

  // Update global state when data is loaded via API
  const updateGlobalStateWithData = (type, data) => {
    const currentProjectId = projectId || activeIDE.projectId;
    
    if (!data || !currentProjectId) {
      console.log('🎯 [DEBUG] updateGlobalStateWithData: Missing data or projectId', { hasData: !!data, hasProjectId: !!currentProjectId });
      return;
    }
    
    console.log('🎯 [DEBUG] Updating global state with data for type:', type, 'data type:', typeof data);
    
    // Import IDEStore to update global state
    import('@/infrastructure/stores/IDEStore.jsx').then(module => {
      const useIDEStore = module.default;
      const store = useIDEStore.getState();
      
      const workspacePath = activeIDE.workspacePath;
      if (!workspacePath) {
        console.log('🎯 [DEBUG] updateGlobalStateWithData: No workspace path available');
        return;
      }
      
      console.log('🎯 [DEBUG] updateGlobalStateWithData: Using workspace path:', workspacePath);
      
      const currentAnalysis = store.projectData.analysis[workspacePath] || {};
      const currentHistory = currentAnalysis.history || [];
      
      console.log('🎯 [DEBUG] updateGlobalStateWithData: Current history count:', currentHistory.length);
      
      // Create new history entry
      const newHistoryEntry = {
        id: `api_${type}_${Date.now()}`,
        type: type,
        analysisType: type,
        data: data,
        result: data,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        projectId: currentProjectId
      };
      
      // Add to history (avoid duplicates)
      const updatedHistory = [
        ...currentHistory.filter(h => h.id !== newHistoryEntry.id && h.type !== type),
        newHistoryEntry
      ];
      
      console.log('🎯 [DEBUG] updateGlobalStateWithData: Updated history count:', updatedHistory.length);
      
      // Update global state using Zustand's setState method
      try {
        useIDEStore.setState(state => ({
          projectData: {
            ...state.projectData,
            analysis: {
              ...state.projectData.analysis,
              [workspacePath]: {
                ...currentAnalysis,
                history: updatedHistory,
                lastUpdate: new Date().toISOString()
              }
            }
          }
        }));
        
        console.log('🎯 [DEBUG] Global state updated with', type, 'data, history count:', updatedHistory.length);
      } catch (error) {
        console.error('🎯 [DEBUG] Failed to update global state with setState:', error);
      }
    }).catch(error => {
      console.error('🎯 [DEBUG] Failed to update global state:', error);
    });
  };

  // Helper function to get data from global state
  const getGlobalData = (type) => {
    console.log('🎯 [DEBUG] getGlobalData called for type:', type);
    console.log('🎯 [DEBUG] analysisHistory:', analysisHistory);
    
    // Check if we have history data
    if (!analysisHistory.history || analysisHistory.history.length === 0) {
      console.log('🎯 [DEBUG] No history data available');
      return null;
    }
    
    // Map frontend types to backend types
    const typeMapping = {
      'issues': ['issues', 'code-quality', 'security'],
      'tech-stack': ['tech-stack', 'TechStackAnalysisStep'],
      'architecture': ['architecture', 'ArchitectureAnalysisOrchestrator'],
      'security': ['security', 'SecurityAnalysisOrchestrator'],
      'recommendations': ['recommendations', 'CodeQualityAnalysisStep']
    };
    
    const targetTypes = typeMapping[type] || [type];
    console.log('🎯 [DEBUG] Looking for types:', targetTypes);
    
    // Find matching history entry
    const matchingEntry = analysisHistory.history.find(h => 
      targetTypes.includes(h.type) || targetTypes.includes(h.analysisType)
    );
    
    if (matchingEntry) {
      console.log('🎯 [DEBUG] Found matching entry:', matchingEntry.type, matchingEntry.analysisType);
      return matchingEntry.data || matchingEntry.result || null;
    }
    
    console.log('🎯 [DEBUG] No matching entry found');
    return null;
  };

  // ✅ FIXED: No more manual data loading - global state handles it automatically
  useEffect(() => {
    if (activeIDE.workspacePath) {
      logger.info('AnalysisDataViewer: active IDE changed to:', activeIDE.workspacePath);
      
      // Debug: Check if we have analysis data in global state
      console.log('🎯 [DEBUG] Active IDE changed, checking global state...');
      console.log('🎯 [DEBUG] analysisHistory:', analysisHistory);
      console.log('🎯 [DEBUG] analysisStatus:', analysisStatus);
      
      // If no history data, try to load it
      if (!analysisHistory.history || analysisHistory.history.length === 0) {
        console.log('🎯 [DEBUG] No history data, attempting to load...');
        // This will trigger the API call to get analysis history
        loadAnalysisHistory();
      }
    }
  }, [activeIDE.workspacePath, analysisHistory.history]);

  // Force load data when sections are expanded but no data is available
  useEffect(() => {
    console.log('🎯 [DEBUG] Expanded sections changed:', expandedSections);
    console.log('🎯 [DEBUG] Current analysisData:', analysisData);
    
    // Check if sections are expanded but have no data
    Object.entries(expandedSections).forEach(([section, isExpanded]) => {
      if (isExpanded) {
        const hasLocalData = analysisData[section] !== null;
        const hasGlobalData = getGlobalData(section) !== null;
        
        console.log(`🎯 [DEBUG] Section ${section}: expanded=${isExpanded}, hasLocalData=${hasLocalData}, hasGlobalData=${hasGlobalData}`);
        
        if (!hasLocalData && !hasGlobalData) {
          console.log(`🎯 [DEBUG] Section ${section} expanded but no data available, triggering load...`);
          // Trigger data loading for this section
          switch (section) {
            case 'issues':
              loadIssuesData();
              break;
            case 'techStack':
              loadTechStackData();
              break;
            case 'architecture':
              loadArchitectureData();
              break;
            case 'security':
              loadSecurityData();
              break;
            case 'recommendations':
              loadRecommendationsData();
              break;
            default:
              break;
          }
        }
      }
    });
  }, [expandedSections, analysisData]);

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

    // ALSO listen to WebSocket events directly LIKE THE QUEUE DOES!
    import('@/infrastructure/services/WebSocketService.jsx').then(module => {
      const WebSocketService = module.default;
      if (WebSocketService) {
        WebSocketService.on('workflow:step:progress', handleAnalysisProgress);
        WebSocketService.on('workflow:step:completed', handleAnalysisCompleted);
        WebSocketService.on('workflow:step:failed', handleAnalysisCompleted);
        logger.debug('WebSocket events connected for AnalysisDataViewer LIKE QUEUE');
      }
    }).catch(error => {
      logger.warn('Could not import WebSocketService for AnalysisDataViewer', error);
    });

    return () => {
      eventBus.off('analysis-status-update', handleAnalysisStatusUpdate);
      eventBus.off('analysis-completed', handleAnalysisCompleted);
      eventBus.off('analysis-progress', handleAnalysisProgress);
      eventBus.off('analysis:completed', handleAnalysisCompleted);
      eventBus.off('step:completed', handleAnalysisCompleted);
      eventBus.off('step:failed', handleAnalysisCompleted);
      
      // Cleanup WebSocket events LIKE QUEUE
      import('@/infrastructure/services/WebSocketService.jsx').then(module => {
        const WebSocketService = module.default;
        if (WebSocketService) {
          WebSocketService.off('workflow:step:progress', handleAnalysisProgress);
          WebSocketService.off('workflow:step:completed', handleAnalysisCompleted);
          WebSocketService.off('workflow:step:failed', handleAnalysisCompleted);
        }
      }).catch(error => {
        logger.warn('Could not import WebSocketService for cleanup', error);
      });
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
      
      // ✅ FIXED: No need to reload - global state handles updates
      logger.info('Analysis data loading - global state handles updates');
      
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
  }, [projectId, activeIDE.projectId, activeIDE.workspacePath, showSuccess]);

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
      console.log('🔍 [DEBUG] loadIssuesData: Using projectId:', currentProjectId);
      
      // ✅ OPTIMIZATION: Use direct API call (bypass StepRegistry) for faster loading
      const issuesResponse = await apiRepository.getAnalysisIssuesDirect?.(currentProjectId) || Promise.resolve({ success: false, data: null });
      
      console.log('🔍 [DEBUG] loadIssuesData: API response:', {
        success: issuesResponse?.success,
        hasData: !!issuesResponse?.data,
        dataType: typeof issuesResponse?.data,
        dataKeys: issuesResponse?.data ? Object.keys(issuesResponse.data) : null
      });
      
      if (issuesResponse?.success && issuesResponse?.data) {
        setAnalysisData(prev => ({
          ...prev,
          issues: issuesResponse.data
        }));
        // Update global state with the loaded data
        updateGlobalStateWithData('issues', issuesResponse.data);
        console.log('✅ Issues data loaded and stored in global state');
      } else {
        console.log('🔍 [DEBUG] loadIssuesData: No valid data in response');
        setAnalysisData(prev => ({
          ...prev,
          issues: null
        }));
      }
    } catch (err) {
      console.error('❌ [DEBUG] loadIssuesData error:', err);
      logger.error('Failed to load issues data:', err);
      setAnalysisData(prev => ({
        ...prev,
        issues: null
      }));
    } finally {
      updateLoadingState('issues', false);
    }
  }, [analysisData.issues, expandedSections.issues, projectId, activeIDE.projectId, apiRepository]);

  const loadTechStackData = useCallback(async () => {
    // ✅ USE STATE DATA: Check if tech stack is already in global state
    if (analysisTechStack.hasTechStack) {
      console.log('✅ Tech stack already in global state, using existing data');
      return;
    }
    
    // ✅ LAZY LOAD: Load from store if not available
    if (activeIDE.workspacePath) {
      console.log('🎯 Loading tech stack from store for:', activeIDE.workspacePath);
      await loadAnalysisDataFromStore(activeIDE.workspacePath);
    }
  }, [analysisTechStack.hasTechStack, activeIDE.workspacePath, loadAnalysisDataFromStore]);

  const loadArchitectureData = useCallback(async () => {
    // ✅ USE STATE DATA: Check if architecture is already in global state
    if (analysisArchitecture.hasArchitecture) {
      console.log('✅ Architecture already in global state, using existing data');
      return;
    }
    
    // ✅ LAZY LOAD: Load from store if not available
    if (activeIDE.workspacePath) {
      console.log('🎯 Loading architecture from store for:', activeIDE.workspacePath);
      await loadAnalysisDataFromStore(activeIDE.workspacePath);
    }
  }, [analysisArchitecture.hasArchitecture, activeIDE.workspacePath, loadAnalysisDataFromStore]);

  const loadSecurityData = useCallback(async () => {
    if (analysisData.security !== null) return; // Already loaded
    
    try {
      updateLoadingState('security', true);
      const currentProjectId = projectId || activeIDE.projectId;
      console.log('🔍 [DEBUG] loadSecurityData: Starting with projectId:', currentProjectId);
      
      // Try multiple approaches to get security data
      let securityResponse = null;
      
      // First, try to get security data from the issues endpoint with security type
      try {
        console.log('🔍 [DEBUG] loadSecurityData: Trying issues endpoint with security type');
        securityResponse = await apiRepository.getAnalysisIssuesDirect?.(currentProjectId, 'security');
        console.log('🔍 [DEBUG] loadSecurityData: Issues endpoint response:', {
          success: securityResponse?.success,
          hasData: !!securityResponse?.data,
          dataType: typeof securityResponse?.data,
          dataKeys: securityResponse?.data ? Object.keys(securityResponse.data) : null
        });
        
        if (securityResponse?.success && securityResponse?.data) {
          securityResponse = {
            success: true,
            data: {
              summary: securityResponse.data.summary || {},
              details: securityResponse.data.scanners || {},
              vulnerabilities: securityResponse.data.vulnerabilities || [],
              bestPractices: securityResponse.data.bestPractices || []
            }
          };
          console.log('🔍 [DEBUG] loadSecurityData: Using actual security response:', securityResponse);
        }
      } catch (err) {
        console.error('❌ [DEBUG] loadSecurityData: Issues endpoint error:', err);
        logger.warn('Failed to get security data via issues endpoint:', err);
      }
      
      // If that fails, try to get it from the architecture endpoint as fallback
      if (!securityResponse?.success || !securityResponse?.data) {
        console.log('🔍 [DEBUG] loadSecurityData: Trying architecture endpoint as fallback');
        try {
          const architectureResponse = await apiRepository.getAnalysisArchitectureDirect?.(currentProjectId);
          console.log('🔍 [DEBUG] loadSecurityData: Architecture endpoint response:', {
            success: architectureResponse?.success,
            hasData: !!architectureResponse?.data,
            dataType: typeof architectureResponse?.data
          });
          
          if (architectureResponse?.success && architectureResponse?.data) {
            // Don't transform architecture data to fake security data
            // If no real security data is available, show "no data available"
            console.log('🔍 [DEBUG] loadSecurityData: Architecture data available but not using as fake security data');
            securityResponse = null;
          }
        } catch (err) {
          console.error('❌ [DEBUG] loadSecurityData: Architecture endpoint error:', err);
          logger.warn('Failed to get security data via architecture endpoint:', err);
        }
      }
      
      // If still no data, set null to show "no data available" message
      console.log('🔍 [DEBUG] loadSecurityData: Final check - securityResponse:', {
        success: securityResponse?.success,
        hasData: !!securityResponse?.data,
        dataType: typeof securityResponse?.data
      });
      
      if (securityResponse?.success && securityResponse?.data) {
        setAnalysisData(prev => ({
          ...prev,
          security: securityResponse.data
        }));
        // Update global state with the loaded data
        updateGlobalStateWithData('security', securityResponse.data);
        console.log('✅ Security data loaded and stored in global state');
      } else {
        console.log('🔍 [DEBUG] loadSecurityData: No valid security data, setting to null');
        setAnalysisData(prev => ({
          ...prev,
          security: null
        }));
      }
    } catch (err) {
      console.error('❌ [DEBUG] loadSecurityData: Outer catch error:', err);
      logger.error('Failed to load security data:', err);
      setAnalysisData(prev => ({
        ...prev,
        security: null
      }));
    } finally {
      updateLoadingState('security', false);
    }
  }, [analysisData.security, projectId, activeIDE.projectId, apiRepository]);

  const loadRecommendationsData = useCallback(async () => {
    // ✅ USE STATE DATA: Check if recommendations are already in global state
    if (analysisRecommendations.hasRecommendations) {
      console.log('✅ Recommendations already in global state, using existing data');
      return;
    }
    
    // ✅ LAZY LOAD: Load from store if not available
    if (activeIDE.workspacePath) {
      console.log('🎯 Loading recommendations from store for:', activeIDE.workspacePath);
      await loadAnalysisDataFromStore(activeIDE.workspacePath);
    }
  }, [analysisRecommendations.hasRecommendations, activeIDE.workspacePath, loadAnalysisDataFromStore]);

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
    console.log('🎯 [DEBUG] Current analysisHistory:', analysisHistory);
    console.log('🎯 [DEBUG] Current analysisStatus:', analysisStatus);
    console.log('🎯 [DEBUG] Current analysisMetrics:', analysisMetrics);
    
    setExpandedSections(prev => {
      const newExpandedSections = { ...prev, [sectionName]: !prev[sectionName] };
      console.log('🎯 [DEBUG] New expandedSections:', newExpandedSections);
      return newExpandedSections;
    });

    // Only load data if section is expanded AND no data is available in global state
    if (!expandedSections[sectionName]) {
      const hasGlobalData = analysisHistory.history?.some(h => {
        switch (sectionName) {
          case 'issues': return h.type === 'issues';
          case 'techStack': return h.type === 'tech-stack';
          case 'architecture': return h.type === 'architecture';
          case 'security': return h.type === 'security';
          case 'recommendations': return h.type === 'recommendations';
          default: return false;
        }
      });

      // Only make API call if no global data is available
      if (!hasGlobalData) {
        console.log('🎯 [DEBUG] No global data found, loading via API for:', sectionName);
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
          case 'security':
            loadSecurityData();
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
      } else {
        console.log('🎯 [DEBUG] Global data found, skipping API call for:', sectionName);
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
    
    // ✅ FIXED: No need to reload - global state handles updates
    logger.info('Analysis completed - global state will update automatically');
    
    showSuccess('Analysis completed successfully!', 'Analysis Complete');
  };

  const handleAnalysisProgress = (data) => {
    logger.info('Analysis progress:', data);
    
    // UPDATE LOCAL STATE LIKE THE QUEUE DOES!
    if (data.overallProgress !== undefined) {
      setLocalAnalysisStatus({
        isRunning: true,
        progress: data.overallProgress,
        currentStep: data.progress?.name || data.currentStep || 'Running...'
      });
      logger.debug('Updated local analysis status LIKE QUEUE', { 
        progress: data.overallProgress, 
        currentStep: data.progress?.name 
      });
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
            status={localAnalysisStatus} 
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
                issues={analysisData.issues || getGlobalData('issues')}
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
                techStack={analysisTechStack.techStack}
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
                architecture={analysisArchitecture.architecture}
                loading={loadingStates.architecture}
                onLoad={loadArchitectureData}
              />
            )}
          </div>

          {/* Security Dashboard Section */}
          <div className={`analysis-section ${expandedSections.security ? 'expanded' : 'collapsed'}`}>
            <div className="section-header" onClick={() => handleSectionToggle('security')}>
              <h3>🔒 Security Dashboard</h3>
              <span className="toggle-icon">{expandedSections.security ? '▼' : '▶'}</span>
            </div>
            {expandedSections.security && (
              <SecurityDashboard 
                securityData={analysisData.security || getGlobalData('security')}
                loading={loadingStates.security}
                onLoad={loadSecurityData}
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
                recommendations={analysisRecommendations.recommendations}
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