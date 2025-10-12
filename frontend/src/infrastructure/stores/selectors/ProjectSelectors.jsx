/**
 * Project Selectors
 * Clean selectors for accessing project data from ProjectStore
 * Provides computed values and filtered data access
 */

import { useMemo } from 'react';
import useProjectStore from '../ProjectStore.jsx';
import useIDEStore from '../IDEStore.jsx';

// Project data selectors
export const useProjects = () => {
  const { projects } = useProjectStore();
  
  return useMemo(() => {
    return Object.values(projects);
  }, [projects]);
};

export const useSelectedProject = () => {
  const { selectedProject, projects } = useProjectStore();
  
  return useMemo(() => {
    return selectedProject ? projects[selectedProject] : null;
  }, [selectedProject, projects]);
};

export const useProject = (projectId) => {
  const { projects } = useProjectStore();
  
  return useMemo(() => {
    return projectId ? projects[projectId] : null;
  }, [projects, projectId]);
};

export const useProjectByWorkspace = (workspacePath) => {
  const { projects } = useProjectStore();
  
  return useMemo(() => {
  if (!workspacePath) return null;
    return Object.values(projects).find(project => 
      project.workspacePath === workspacePath
    ) || null;
  }, [projects, workspacePath]);
};

// Project metadata selectors
export const useProjectMetadata = (projectId) => {
  const project = useProject(projectId);
  
  return useMemo(() => {
    return project?.metadata || {};
  }, [project]);
};

export const useProjectStats = () => {
  const { getProjectStats } = useProjectStore();
  
  return useMemo(() => {
    return getProjectStats();
  }, [getProjectStats]);
};

// Project search and filtering
export const useProjectSearch = (query) => {
  const { searchProjects } = useProjectStore();
  
  return useMemo(() => {
    return searchProjects(query);
  }, [searchProjects, query]);
};

export const useProjectsByStatus = (status) => {
  const projects = useProjects();
  
  return useMemo(() => {
    return projects.filter(project => project.status === status);
  }, [projects, status]);
};

export const useProjectsByType = (type) => {
  const projects = useProjects();
  
  return useMemo(() => {
    return projects.filter(project => project.type === type);
  }, [projects, type]);
};

export const useProjectsByFramework = (framework) => {
  const projects = useProjects();
  
  return useMemo(() => {
    return projects.filter(project => project.framework === framework);
  }, [projects, framework]);
};

// Project actions selectors
export const useProjectActions = () => {
  const {
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setSelectedProject,
    clearError,
    refresh
  } = useProjectStore();
  
  return useMemo(() => ({
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setSelectedProject,
    clearError,
    refresh
  }), [loadProjects, createProject, updateProject, deleteProject, setSelectedProject, clearError, refresh]);
};

// Loading and error state selectors
export const useProjectLoading = () => {
  const { isLoading } = useProjectStore();
  
  return {
    isLoading,
    loadingText: isLoading ? 'Loading projects...' : ''
  };
};

export const useProjectError = () => {
  const { error } = useProjectStore();
  
  return {
    error,
    hasError: !!error,
    errorMessage: error || ''
  };
};

// Project configuration selectors
export const useProjectConfig = () => {
  const { projectConfig } = useProjectStore();
  
  return useMemo(() => {
    return projectConfig;
  }, [projectConfig]);
};

// Project validation selectors
export const useProjectValidation = (projectData) => {
  return useMemo(() => {
    const errors = [];
    
    if (!projectData.name || projectData.name.trim().length === 0) {
      errors.push('Project name is required');
    }
    
    if (!projectData.workspacePath || projectData.workspacePath.trim().length === 0) {
      errors.push('Workspace path is required');
    }
    
    if (projectData.name && projectData.name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }
    
    if (projectData.description && projectData.description.length > 500) {
      errors.push('Project description must be less than 500 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [projectData]);
};

// Project comparison selectors
export const useProjectComparison = (projectId1, projectId2) => {
  const project1 = useProject(projectId1);
  const project2 = useProject(projectId2);
  
  return useMemo(() => {
    if (!project1 || !project2) return null;
    
    const differences = [];
    
    // Compare basic properties
    const propertiesToCompare = ['name', 'description', 'type', 'framework', 'status'];
    propertiesToCompare.forEach(prop => {
      if (project1[prop] !== project2[prop]) {
        differences.push({
          property: prop,
          value1: project1[prop],
          value2: project2[prop]
        });
      }
    });
    
    return {
      hasDifferences: differences.length > 0,
      differences,
      project1,
      project2
    };
  }, [project1, project2]);
};

// Project history selectors
export const useProjectHistory = (projectId) => {
  const project = useProject(projectId);
  
  return useMemo(() => {
    if (!project) return [];
    
    const history = [];
    
    if (project.createdAt) {
      history.push({
        type: 'created',
        timestamp: project.createdAt,
        description: 'Project created'
      });
    }
    
    if (project.updatedAt && project.updatedAt !== project.createdAt) {
      history.push({
        type: 'updated',
        timestamp: project.updatedAt,
        description: 'Project updated'
      });
    }
    
    if (project.metadata?.lastAccessed) {
      history.push({
        type: 'accessed',
        timestamp: project.metadata.lastAccessed,
        description: 'Last accessed'
      });
    }
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [project]);
};

// Project dependencies selectors
export const useProjectDependencies = (projectId) => {
  const project = useProject(projectId);
  
  return useMemo(() => {
    if (!project) return null;
    
    return {
      framework: project.framework,
      language: project.language,
      packageManager: project.packageManager,
      dependencies: project.metadata?.dependencies || [],
      devDependencies: project.metadata?.devDependencies || []
    };
  }, [project]);
};

// Project performance selectors
export const useProjectPerformance = (projectId) => {
  const project = useProject(projectId);
  
  return useMemo(() => {
    if (!project) return null;
    
    return {
      accessCount: project.metadata?.accessCount || 0,
      lastAccessed: project.metadata?.lastAccessed,
      averageAccessTime: project.metadata?.averageAccessTime || 0,
      performanceScore: project.metadata?.performanceScore || 0
    };
  }, [project]);
};

// Git selectors (migrated from IDEStore)
export const useGitStatus = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
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
  }, [projectData?.git, selectedProject, workspacePath]);
};

export const useGitBranches = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
    const gitData = projectData?.git?.[targetWorkspacePath];
    const branches = gitData?.status?.branches || [];
    
    return {
      branches: Array.isArray(branches) ? branches : [],
      currentBranch: gitData?.status?.currentBranch || '',
      localBranches: Array.isArray(branches) ? branches.filter(b => !b.startsWith('remotes/')) : [],
      remoteBranches: Array.isArray(branches) ? branches.filter(b => b.startsWith('remotes/')) : [],
      lastUpdate: gitData?.lastUpdate
    };
  }, [projectData?.git, selectedProject, workspacePath]);
};

export const useSelectedIDE = () => {
  const { selectedPort, availableIDEs } = useIDEStore();
  
  return useMemo(() => {
    return availableIDEs.find(ide => ide.port === selectedPort) || null;
  }, [availableIDEs, selectedPort]);
};

export const useChatMessages = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
    const chatData = projectData?.chat?.[targetWorkspacePath];
    
    return {
      messages: chatData?.messages || [],
      lastUpdate: chatData?.lastUpdate
    };
  }, [projectData?.chat, selectedProject, workspacePath]);
};

export const useProjectTasks = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
    const tasksData = projectData?.tasks?.[targetWorkspacePath];
    
    return {
      tasks: tasksData?.tasks || [],
      lastUpdate: tasksData?.lastUpdate
    };
  }, [projectData?.tasks, selectedProject, workspacePath]);
};

// Project data actions (project-specific from ProjectStore, global from IDEStore)
export const useProjectDataActions = () => {
  const projectStore = useProjectStore();
  const ideStore = useIDEStore();
  
  return useMemo(() => ({
    // Project-specific actions
    loadProjectData: projectStore.loadProjectData,
    loadProjectTasks: projectStore.loadProjectTasks,
    loadChatData: projectStore.loadChatData,
    loadAnalysisData: projectStore.loadAnalysisData,
    loadCategoryAnalysisData: projectStore.loadCategoryAnalysisData,
    refreshGitStatus: projectStore.refreshGitStatus,
    invalidateProjectCache: projectStore.invalidateProjectCache,
    
    // Global IDE actions
    setupWebSocketListeners: ideStore.setupWebSocketListeners,
    cleanupWebSocketListeners: ideStore.cleanupWebSocketListeners
  }), [projectStore, ideStore]);
};

// Combined project data selector (migrated from IDEStore)
export const useProjectData = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
    const gitData = projectData?.git?.[targetWorkspacePath];
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
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
      lastUpdate: projectData?.lastUpdate
    };
  }, [projectData, selectedProject, workspacePath]);
};

// Loading and error state selectors (from both stores)
export const useProjectDataLoading = () => {
  const { isLoading: projectLoading } = useProjectStore();
  const { isLoading: ideLoading } = useIDEStore();
  
  return {
    isLoading: projectLoading || ideLoading,
    loadingText: (projectLoading || ideLoading) ? 'Loading project data...' : ''
  };
};

export const useProjectDataError = () => {
  const { error: projectError } = useProjectStore();
  const { error: ideError } = useIDEStore();
  
  return {
    error: projectError || ideError,
    hasError: !!(projectError || ideError),
    errorMessage: projectError || ideError || ''
  };
};

// Analysis selectors (project-specific)
export const useAnalysisStatus = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
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
  }, [projectData?.analysis, selectedProject, workspacePath]);
};

export const useAnalysisMetrics = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      metrics: analysisData?.metrics,
      hasMetrics: !!analysisData?.metrics,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, selectedProject, workspacePath]);
};

export const useAnalysisHistory = (workspacePath = null) => {
  const { projectData, selectedProject } = useProjectStore();
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      history: analysisData?.history || [],
      hasHistory: !!(analysisData?.history?.length),
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, selectedProject, workspacePath]);
};

export const useAnalysisRecommendations = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const analysisData = projectData?.analysis?.[targetWorkspacePath];
    
    return {
      recommendations: analysisData?.recommendations || [],
      hasRecommendations: !!(analysisData?.recommendations?.length),
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData?.analysis, activeIDE, workspacePath]);
};

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

// Category analysis selectors
export const useCategoryAnalysisData = (workspacePath = null, category = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    if (!categoryData) return null;
    
    if (category) {
      return categoryData[category] || null;
    }
    
    return categoryData;
  }, [categoryAnalysisData, activeIDE, workspacePath, category]);
};

// Security analysis selectors
export const useSecurityAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.security || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const useSecurityRecommendations = (workspacePath = null) => {
  const securityData = useSecurityAnalysis(workspacePath);
  
  return useMemo(() => {
    return securityData?.recommendations || null;
  }, [securityData]);
};

export const useSecurityIssues = (workspacePath = null) => {
  const securityData = useSecurityAnalysis(workspacePath);
  
  return useMemo(() => {
    return securityData?.issues || null;
  }, [securityData]);
};

export const useSecurityMetrics = (workspacePath = null) => {
  const securityData = useSecurityAnalysis(workspacePath);
  
  return useMemo(() => {
    return securityData?.metrics || null;
  }, [securityData]);
};

export const useSecuritySummary = (workspacePath = null) => {
  const securityData = useSecurityAnalysis(workspacePath);
  
  return useMemo(() => {
    return securityData?.summary || null;
  }, [securityData]);
};

export const useSecurityResults = (workspacePath = null) => {
  const securityData = useSecurityAnalysis(workspacePath);
  
  return useMemo(() => {
    return securityData?.results || null;
  }, [securityData]);
};

// Performance analysis selectors
export const usePerformanceAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.performance || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const usePerformanceRecommendations = (workspacePath = null) => {
  const performanceData = usePerformanceAnalysis(workspacePath);
  
  return useMemo(() => {
    return performanceData?.recommendations || null;
  }, [performanceData]);
};

export const usePerformanceIssues = (workspacePath = null) => {
  const performanceData = usePerformanceAnalysis(workspacePath);
  
  return useMemo(() => {
    return performanceData?.issues || null;
  }, [performanceData]);
};

export const usePerformanceMetrics = (workspacePath = null) => {
  const performanceData = usePerformanceAnalysis(workspacePath);
  
  return useMemo(() => {
    return performanceData?.metrics || null;
  }, [performanceData]);
};

export const usePerformanceSummary = (workspacePath = null) => {
  const performanceData = usePerformanceAnalysis(workspacePath);
  
  return useMemo(() => {
    return performanceData?.summary || null;
  }, [performanceData]);
};

export const usePerformanceResults = (workspacePath = null) => {
  const performanceData = usePerformanceAnalysis(workspacePath);
  
  return useMemo(() => {
    return performanceData?.results || null;
  }, [performanceData]);
};

// Architecture analysis selectors
export const useArchitectureAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.architecture || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const useArchitectureRecommendations = (workspacePath = null) => {
  const architectureData = useArchitectureAnalysis(workspacePath);
  
  return useMemo(() => {
    return architectureData?.recommendations || null;
  }, [architectureData]);
};

export const useArchitectureIssues = (workspacePath = null) => {
  const architectureData = useArchitectureAnalysis(workspacePath);
  
  return useMemo(() => {
    return architectureData?.issues || null;
  }, [architectureData]);
};

export const useArchitectureMetrics = (workspacePath = null) => {
  const architectureData = useArchitectureAnalysis(workspacePath);
  
  return useMemo(() => {
    return architectureData?.metrics || null;
  }, [architectureData]);
};

export const useArchitectureSummary = (workspacePath = null) => {
  const architectureData = useArchitectureAnalysis(workspacePath);
  
  return useMemo(() => {
    return architectureData?.summary || null;
  }, [architectureData]);
};

export const useArchitectureResults = (workspacePath = null) => {
  const architectureData = useArchitectureAnalysis(workspacePath);
  
  return useMemo(() => {
    return architectureData?.results || null;
  }, [architectureData]);
};

// Code quality analysis selectors
export const useCodeQualityAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.codeQuality || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const useCodeQualityRecommendations = (workspacePath = null) => {
  const codeQualityData = useCodeQualityAnalysis(workspacePath);
  
  return useMemo(() => {
    return codeQualityData?.recommendations || null;
  }, [codeQualityData]);
};

export const useCodeQualityIssues = (workspacePath = null) => {
  const codeQualityData = useCodeQualityAnalysis(workspacePath);
  
  return useMemo(() => {
    return codeQualityData?.issues || null;
  }, [codeQualityData]);
};

export const useCodeQualityMetrics = (workspacePath = null) => {
  const codeQualityData = useCodeQualityAnalysis(workspacePath);
  
  return useMemo(() => {
    return codeQualityData?.metrics || null;
  }, [codeQualityData]);
};

export const useCodeQualitySummary = (workspacePath = null) => {
  const codeQualityData = useCodeQualityAnalysis(workspacePath);
  
  return useMemo(() => {
    return codeQualityData?.summary || null;
  }, [codeQualityData]);
};

export const useCodeQualityResults = (workspacePath = null) => {
  const codeQualityData = useCodeQualityAnalysis(workspacePath);
  
  return useMemo(() => {
    return codeQualityData?.results || null;
  }, [codeQualityData]);
};

// Dependencies analysis selectors
export const useDependenciesAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.dependencies || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const useDependenciesRecommendations = (workspacePath = null) => {
  const dependenciesData = useDependenciesAnalysis(workspacePath);
  
  return useMemo(() => {
    return dependenciesData?.recommendations || null;
  }, [dependenciesData]);
};

export const useDependenciesIssues = (workspacePath = null) => {
  const dependenciesData = useDependenciesAnalysis(workspacePath);
  
  return useMemo(() => {
    return dependenciesData?.issues || null;
  }, [dependenciesData]);
};

export const useDependenciesMetrics = (workspacePath = null) => {
  const dependenciesData = useDependenciesAnalysis(workspacePath);
  
  return useMemo(() => {
    return dependenciesData?.metrics || null;
  }, [dependenciesData]);
};

export const useDependenciesSummary = (workspacePath = null) => {
  const dependenciesData = useDependenciesAnalysis(workspacePath);
  
  return useMemo(() => {
    return dependenciesData?.summary || null;
  }, [dependenciesData]);
};

export const useDependenciesResults = (workspacePath = null) => {
  const dependenciesData = useDependenciesAnalysis(workspacePath);
  
  return useMemo(() => {
    return dependenciesData?.results || null;
  }, [dependenciesData]);
};

// Manifest analysis selectors
export const useManifestAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.manifest || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const useManifestRecommendations = (workspacePath = null) => {
  const manifestData = useManifestAnalysis(workspacePath);
  
  return useMemo(() => {
    return manifestData?.recommendations || null;
  }, [manifestData]);
};

export const useManifestIssues = (workspacePath = null) => {
  const manifestData = useManifestAnalysis(workspacePath);
  
  return useMemo(() => {
    return manifestData?.issues || null;
  }, [manifestData]);
};

export const useManifestMetrics = (workspacePath = null) => {
  const manifestData = useManifestAnalysis(workspacePath);
  
  return useMemo(() => {
    return manifestData?.metrics || null;
  }, [manifestData]);
};

export const useManifestSummary = (workspacePath = null) => {
  const manifestData = useManifestAnalysis(workspacePath);
  
  return useMemo(() => {
    return manifestData?.summary || null;
  }, [manifestData]);
};

export const useManifestResults = (workspacePath = null) => {
  const manifestData = useManifestAnalysis(workspacePath);
  
  return useMemo(() => {
    return manifestData?.results || null;
  }, [manifestData]);
};

// Tech stack analysis selectors
export const useTechStackAnalysis = (workspacePath = null, endpoint = null) => {
  const { categoryAnalysisData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const categoryData = categoryAnalysisData?.[targetWorkspacePath];
    
    return categoryData?.techStack || null;
  }, [categoryAnalysisData, activeIDE, workspacePath]);
};

export const useTechStackRecommendations = (workspacePath = null) => {
  const techStackData = useTechStackAnalysis(workspacePath);
  
  return useMemo(() => {
    return techStackData?.recommendations || null;
  }, [techStackData]);
};

export const useTechStackIssues = (workspacePath = null) => {
  const techStackData = useTechStackAnalysis(workspacePath);
  
  return useMemo(() => {
    return techStackData?.issues || null;
  }, [techStackData]);
};

export const useTechStackMetrics = (workspacePath = null) => {
  const techStackData = useTechStackAnalysis(workspacePath);
  
  return useMemo(() => {
    return techStackData?.metrics || null;
  }, [techStackData]);
};

export const useTechStackSummary = (workspacePath = null) => {
  const techStackData = useTechStackAnalysis(workspacePath);
  
  return useMemo(() => {
    return techStackData?.summary || null;
  }, [techStackData]);
};

export const useTechStackResults = (workspacePath = null) => {
  const techStackData = useTechStackAnalysis(workspacePath);
  
  return useMemo(() => {
    return techStackData?.results || null;
  }, [techStackData]);
};

// Category analysis loading selector
export const useCategoryAnalysisLoading = (workspacePath = null) => {
  const { isLoading } = useIDEStore();
  
  return {
    isLoading,
    loadingText: isLoading ? 'Loading analysis data...' : ''
  };
};

// Helper function for backward compatibility
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  const parts = workspacePath.split('/');
  const projectName = parts[parts.length - 1];
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
}; 