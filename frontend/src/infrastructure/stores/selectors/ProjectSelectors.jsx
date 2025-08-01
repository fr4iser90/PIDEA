/**
 * Project Selectors
 * Clean selectors for accessing project data from the extended IDEStore
 */

import { useMemo } from 'react';
import useIDEStore from '../IDEStore.jsx';

// Helper function to get project ID from workspace path
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  const parts = workspacePath.split('/');
  const projectName = parts[parts.length - 1];
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

// Git selectors
export const useGitStatus = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    // ✅ FIX: Defensive programming - handle missing git data
    const gitData = projectData?.git?.[targetWorkspacePath];
    
    return {
      status: gitData?.status,
      currentBranch: gitData?.status?.currentBranch || '',
      modifiedFiles: gitData?.status?.modified || [],
      addedFiles: gitData?.status?.added || [],
      deletedFiles: gitData?.status?.deleted || [],
      untrackedFiles: gitData?.status?.untracked || [],
      hasChanges: (gitData?.status?.modified?.length || 0) + 
                  (gitData?.status?.added?.length || 0) + 
                  (gitData?.status?.deleted?.length || 0) > 0,
      lastUpdate: gitData?.lastUpdate
    };
  }, [projectData?.git, activeIDE, workspacePath]);
};

export const useGitBranches = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    // ✅ FIX: Defensive programming - handle missing git data
    const gitData = projectData?.git?.[targetWorkspacePath];
    const branches = gitData?.status?.branches || [];
    
    return {
      branches: Array.isArray(branches) ? branches : [],
      currentBranch: gitData?.status?.currentBranch || '',
      localBranches: Array.isArray(branches) ? branches.filter(b => !b.startsWith('remotes/')) : [],
      remoteBranches: Array.isArray(branches) ? branches.filter(b => b.startsWith('remotes/')) : [],
      lastUpdate: gitData?.lastUpdate
    };
  }, [projectData?.git, activeIDE, workspacePath]);
};

// Analysis selectors
export const useAnalysisStatus = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    // ✅ FIX: Defensive programming - handle missing analysis data
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    const status = analysisData?.status;
    
    return {
      status,
      isRunning: status?.isRunning || false,
      progress: status?.progress || 0,
      currentStep: status?.currentStep || '',
      hasRecentData: !!analysisData?.lastUpdate,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

export const useAnalysisMetrics = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    // ✅ FIX: Defensive programming - handle missing analysis data
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      metrics: analysisData?.metrics,
      hasMetrics: !!analysisData?.metrics,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

export const useAnalysisHistory = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    // ✅ FIX: Defensive programming - handle missing analysis data
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      history: analysisData?.history || [],
      hasHistory: (analysisData?.history || []).length > 0,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

// ✅ NEW: Analysis Recommendations Selector
export const useAnalysisRecommendations = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      recommendations: analysisData?.recommendations || [],
      hasRecommendations: (analysisData?.recommendations || []).length > 0,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

// ✅ NEW: Analysis Tech Stack Selector
export const useAnalysisTechStack = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      techStack: analysisData?.techStack,
      hasTechStack: !!analysisData?.techStack,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

// ✅ NEW: Analysis Architecture Selector
export const useAnalysisArchitecture = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      architecture: analysisData?.architecture,
      hasArchitecture: !!analysisData?.architecture,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

// NEW: Category-based Analysis Selectors (7 categories)

export const useCategoryAnalysisData = (workspacePath = null, category = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const data = categoryAnalysisData?.[targetWorkspacePath];
    
    if (!data) {
      return {
        data: null,
        hasData: false,
        isLoading: false,
        lastUpdate: null
      };
    }
    
    if (category && endpoint) {
      const categoryData = data[category];
      return {
        data: categoryData?.[endpoint] || null,
        hasData: !!categoryData?.[endpoint],
        isLoading: false,
        lastUpdate: categoryData?.lastUpdate
      };
    }
    
    if (category && !endpoint) {
      const categoryData = data[category];
      return {
        data: categoryData || null,
        hasData: !!categoryData,
        isLoading: false,
        lastUpdate: categoryData?.lastUpdate
      };
    }
    
    return {
      data: data,
      hasData: Object.keys(data).length > 0,
      isLoading: false,
      lastUpdate: null
    };
  }, [categoryAnalysisData, activeIDE, workspacePath, category, endpoint]);
};

// Individual category selectors for convenience
export const useSecurityAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'security', endpoint);
};

export const usePerformanceAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'performance', endpoint);
};

export const useArchitectureAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'architecture', endpoint);
};

export const useCodeQualityAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'code-quality', endpoint);
};

export const useDependenciesAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'dependencies', endpoint);
};

export const useManifestAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'manifest', endpoint);
};

export const useTechStackAnalysis = (workspacePath = null, endpoint = null) => {
  return useCategoryAnalysisData(workspacePath, 'tech-stack', endpoint);
};

// Category-specific endpoint selectors
export const useSecurityRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'security', 'recommendations');
};

export const useSecurityIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'security', 'issues');
};

export const useSecurityMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'security', 'metrics');
};

export const useSecuritySummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'security', 'summary');
};

export const useSecurityResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'security', 'results');
};

export const usePerformanceRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'performance', 'recommendations');
};

export const usePerformanceIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'performance', 'issues');
};

export const usePerformanceMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'performance', 'metrics');
};

export const usePerformanceSummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'performance', 'summary');
};

export const usePerformanceResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'performance', 'results');
};

export const useArchitectureRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'architecture', 'recommendations');
};

export const useArchitectureIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'architecture', 'issues');
};

export const useArchitectureMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'architecture', 'metrics');
};

export const useArchitectureSummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'architecture', 'summary');
};

export const useArchitectureResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'architecture', 'results');
};

export const useCodeQualityRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'code-quality', 'recommendations');
};

export const useCodeQualityIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'code-quality', 'issues');
};

export const useCodeQualityMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'code-quality', 'metrics');
};

export const useCodeQualitySummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'code-quality', 'summary');
};

export const useCodeQualityResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'code-quality', 'results');
};

export const useDependenciesRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'dependencies', 'recommendations');
};

export const useDependenciesIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'dependencies', 'issues');
};

export const useDependenciesMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'dependencies', 'metrics');
};

export const useDependenciesSummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'dependencies', 'summary');
};

export const useDependenciesResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'dependencies', 'results');
};

export const useManifestRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'manifest', 'recommendations');
};

export const useManifestIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'manifest', 'issues');
};

export const useManifestMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'manifest', 'metrics');
};

export const useManifestSummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'manifest', 'summary');
};

export const useManifestResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'manifest', 'results');
};

export const useTechStackRecommendations = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'tech-stack', 'recommendations');
};

export const useTechStackIssues = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'tech-stack', 'issues');
};

export const useTechStackMetrics = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'tech-stack', 'metrics');
};

export const useTechStackSummary = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'tech-stack', 'summary');
};

export const useTechStackResults = (workspacePath = null) => {
  return useCategoryAnalysisData(workspacePath, 'tech-stack', 'results');
};

// Category loading state selectors
export const useCategoryAnalysisLoading = (workspacePath = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const data = categoryAnalysisData?.[targetWorkspacePath];
    
    if (!data) {
      return {
        isLoading: false,
        loadedCategories: [],
        totalCategories: 7,
        progress: 0
      };
    }
    
    const loadedCategories = Object.keys(data).filter(category => 
      data[category] && Object.values(data[category]).some(value => value !== null)
    );
    
    return {
      isLoading: false,
      loadedCategories,
      totalCategories: 7,
      progress: (loadedCategories.length / 7) * 100
    };
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

// Chat selectors
export const useChatMessages = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    // ✅ FIX: Defensive programming - handle missing chat data
    const chatData = projectData?.chat?.[targetWorkspacePath];
    
    return {
      messages: chatData?.messages || [],
      hasMessages: (chatData?.messages || []).length > 0,
      messageCount: (chatData?.messages || []).length,
      lastUpdate: chatData?.lastUpdate
    };
  }, [projectData?.chat, activeIDE, workspacePath]);
};

// Task selectors
export const useProjectTasks = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const taskData = projectData?.tasks?.[targetWorkspacePath];
    
    return {
      tasks: taskData?.tasks || [],
      hasTasks: (taskData?.tasks || []).length > 0,
      taskCount: (taskData?.tasks || []).length,
      lastUpdate: taskData?.lastUpdate,
      projectId: targetWorkspacePath ? getProjectIdFromWorkspace(targetWorkspacePath) : null
    };
  }, [projectData?.tasks, activeIDE, workspacePath]);
};

// IDE selectors (enhanced with project data)
export const useActiveIDE = () => {
  const { availableIDEs } = useIDEStore();
  
  return useMemo(() => {
    const activeIDE = availableIDEs.find(ide => ide.active);
    return {
      activeIDE,
      workspacePath: activeIDE?.workspacePath,
      port: activeIDE?.port,
      projectId: activeIDE?.workspacePath ? getProjectIdFromWorkspace(activeIDE.workspacePath) : null,
      projectName: activeIDE?.workspacePath ? activeIDE.workspacePath.split('/').pop() : null
    };
  }, [availableIDEs]);
};

// Action selectors
export const useProjectDataActions = () => {
  const store = useIDEStore();
  
  return {
    loadProjectData: store.loadProjectData,
    loadProjectTasks: store.loadProjectTasks,
    loadAnalysisData: store.loadAnalysisData,
    loadCategoryAnalysisData: store.loadCategoryAnalysisData,
    refreshGitStatus: store.refreshGitStatus,
    setupWebSocketListeners: store.setupWebSocketListeners,
    cleanupWebSocketListeners: store.cleanupWebSocketListeners
  };
};

// Combined project data selector
export const useProjectData = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const gitData = projectData.git[targetWorkspacePath];
    const analysisData = projectData.analysis[targetWorkspacePath];
    
    return {
      workspacePath: targetWorkspacePath,
      projectId: targetWorkspacePath ? getProjectIdFromWorkspace(targetWorkspacePath) : null,
      git: {
        status: gitData?.status,
        lastUpdate: gitData?.lastUpdate
      },
      analysis: {
        status: analysisData?.status,
        metrics: analysisData?.metrics,
        history: analysisData?.history,
        lastUpdate: analysisData?.lastUpdate
      },
      hasData: !!(gitData || analysisData),
      lastUpdate: projectData.lastUpdate
    };
  }, [projectData, activeIDE, workspacePath]);
};

// Loading state selector
export const useProjectDataLoading = () => {
  const { isLoading } = useIDEStore();
  
  return {
    isLoading,
    loadingText: isLoading ? 'Loading project data...' : ''
  };
};



// Error state selector
export const useProjectDataError = () => {
  const { error } = useIDEStore();
  
  return {
    error,
    hasError: !!error,
    errorMessage: error || ''
  };
}; 