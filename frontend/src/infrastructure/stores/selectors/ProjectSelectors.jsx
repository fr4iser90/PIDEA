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