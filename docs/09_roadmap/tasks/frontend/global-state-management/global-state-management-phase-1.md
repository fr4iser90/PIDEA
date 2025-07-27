# Frontend Global State Management - Phase 1: Global State Store Foundation

**Phase:** 1 of 3
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 1 Goals
- Create ProjectGlobalStore with Zustand
- Implement data loading from existing API endpoints
- Add state selectors for components
- Add WebSocket event handling for real-time updates

## Implementation Steps

### Step 1: Create ProjectGlobalStore ✅
**Create global state store:**
- [ ] File: `frontend/src/infrastructure/stores/ProjectGlobalStore.jsx` - Create global state store
- [ ] Implement Zustand store with proper state structure
- [ ] Add data loading actions from existing API endpoints
- [ ] Add state update actions for WebSocket events
- [ ] Add error handling and loading states

**Store Structure:**
```javascript
// ProjectGlobalStore.jsx - RICHTIGE STRUKTUR!
const useProjectGlobalStore = create((set, get) => ({
  // State
  initialized: false,
  loading: false,
  error: null,
  
  // IDE data - DAS IST ALLES WAS WIR BRAUCHEN!
  ideData: {
    available: [],
    activeIDE: null, // { port, workspacePath, active: true }
    lastUpdate: null
  },
  
  // Git data - KEYED BY WORKSPACE PATH!
  gitData: {}, // { workspacePath: { status, branches, lastUpdate } }
  
  // Analysis data - KEYED BY WORKSPACE PATH!
  analysisData: {}, // { workspacePath: { status, metrics, history, lastUpdate } }
  
  // Actions
  initialize: async () => {
    set({ loading: true, error: null });
    
    try {
      // NUR IDE API laden - das ist alles!
      const ideResult = await apiCall('/api/ide/available');
      
      if (ideResult.success) {
        const ideData = ideResult.data;
        const activeIDE = ideData.find(ide => ide.active);
        
        set({ 
          ideData: {
            available: ideData,
            activeIDE: activeIDE || null,
            lastUpdate: new Date().toISOString()
          }
        });
        
        // Wenn aktive IDE gefunden, lade deren Daten
        if (activeIDE?.workspacePath) {
          await get().loadProjectData(activeIDE.workspacePath);
        }
      }
      
      set({ initialized: true, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  // Load project data for specific workspace
  loadProjectData: async (workspacePath) => {
    if (!workspacePath) return;
    
    try {
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      if (!projectId) return;
      
      // Load git and analysis data in parallel
      const [gitResult, analysisResult] = await Promise.allSettled([
        get().loadGitData(workspacePath, projectId),
        get().loadAnalysisData(workspacePath, projectId)
      ]);
      
      logger.info('Project data loaded for workspace:', workspacePath);
    } catch (error) {
      logger.error('Failed to load project data:', error);
    }
  },
  
  // Load git data for specific workspace
  loadGitData: async (workspacePath, projectId) => {
    if (!workspacePath || !projectId) return;
    
    try {
      const [statusResult, branchesResult] = await Promise.allSettled([
        apiCall(`/api/projects/${projectId}/git/status`, { method: 'POST' }),
        apiCall(`/api/projects/${projectId}/git/branches`, { method: 'POST' })
      ]);
      
      const gitData = {
        status: statusResult.status === 'fulfilled' && statusResult.value.success ? statusResult.value.data : null,
        branches: branchesResult.status === 'fulfilled' && branchesResult.value.success ? branchesResult.value.data : null,
        lastUpdate: new Date().toISOString()
      };
      
      set(state => ({
        gitData: {
          ...state.gitData,
          [workspacePath]: gitData
        }
      }));
    } catch (error) {
      logger.error('Failed to load git data:', error);
    }
  },
  
  // Load analysis data for specific workspace
  loadAnalysisData: async (workspacePath, projectId) => {
    if (!workspacePath || !projectId) return;
    
    try {
      const [statusResult, metricsResult, historyResult] = await Promise.allSettled([
        apiCall(`/api/projects/${projectId}/analysis/status`),
        apiCall(`/api/projects/${projectId}/analysis/metrics`),
        apiCall(`/api/projects/${projectId}/analysis/history`)
      ]);
      
      const analysisData = {
        status: statusResult.status === 'fulfilled' && statusResult.value.success ? statusResult.value.data : null,
        metrics: metricsResult.status === 'fulfilled' && metricsResult.value.success ? metricsResult.value.data : null,
        history: historyResult.status === 'fulfilled' && historyResult.value.success ? historyResult.value.data : null,
        lastUpdate: new Date().toISOString()
      };
      
      set(state => ({
        analysisData: {
          ...state.analysisData,
          [workspacePath]: analysisData
        }
      }));
    } catch (error) {
      logger.error('Failed to load analysis data:', error);
    }
  },
  
  // WebSocket event handlers
  setupWebSocketListeners: (eventBus) => {
    if (!eventBus) return;
    
    eventBus.on('git-status-updated', (data) => {
      const { workspacePath, gitStatus } = data;
      set(state => ({
        gitData: {
          ...state.gitData,
          [workspacePath]: {
            ...state.gitData[workspacePath],
            status: gitStatus,
            lastUpdate: new Date().toISOString()
          }
        }
      }));
    });
    
    eventBus.on('analysis-completed', (data) => {
      const { workspacePath, analysisData } = data;
      set(state => ({
        analysisData: {
          ...state.analysisData,
          [workspacePath]: {
            ...state.analysisData[workspacePath],
            ...analysisData,
            lastUpdate: new Date().toISOString()
          }
        }
      }));
    });
  },
  
  cleanupWebSocketListeners: (eventBus) => {
    if (!eventBus) return;
    eventBus.off('git-status-updated');
    eventBus.off('analysis-completed');
  },
  
  reset: () => {
    set({
      initialized: false,
      loading: false,
      error: null,
      ideData: { available: [], activeIDE: null, lastUpdate: null },
      gitData: {},
      analysisData: {}
    });
  }
}));

// Helper function to get project ID from workspace path
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  // Extract project name from path (e.g., /home/user/projects/myproject -> myproject)
  const parts = workspacePath.split('/');
  return parts[parts.length - 1];
};
```

### Step 2: Create State Selectors ✅
**Create selectors for components:**
- [ ] File: `frontend/src/infrastructure/stores/ProjectSelectors.jsx` - Create state selectors
- [ ] Project information selectors
- [ ] Git status selectors
- [ ] Analysis status selectors
- [ ] Specific data selectors

**Selector Implementation:**
```javascript
// ProjectSelectors.jsx - RICHTIGE SELECTORS!
import { useMemo } from 'react';
import useProjectGlobalStore from './ProjectGlobalStore.jsx';

// Git selectors - RICHTIGE PROPERTIES!
export const useGitStatus = (workspacePath = null) => {
  const gitData = useProjectGlobalStore(state => state.gitData);
  const ideData = useProjectGlobalStore(state => state.ideData);
  const activeIDE = ideData.activeIDE;
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const gitStatus = gitData[targetWorkspacePath];
    
    return {
      status: gitStatus?.status,
      currentBranch: gitStatus?.status?.currentBranch || '',
      modifiedFiles: gitStatus?.status?.modified || [],
      addedFiles: gitStatus?.status?.added || [],
      deletedFiles: gitStatus?.status?.deleted || [],
      untrackedFiles: gitStatus?.status?.untracked || [],
      hasChanges: (gitStatus?.status?.modified?.length || 0) + 
                  (gitStatus?.status?.added?.length || 0) + 
                  (gitStatus?.status?.deleted?.length || 0) > 0,
      lastUpdate: gitStatus?.lastUpdate
    };
  }, [gitData, activeIDE, workspacePath]);
};

export const useGitBranches = (workspacePath = null) => {
  const gitData = useProjectGlobalStore(state => state.gitData);
  const ideData = useProjectGlobalStore(state => state.ideData);
  const activeIDE = ideData.activeIDE;
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const gitStatus = gitData[targetWorkspacePath];
    const branches = gitStatus?.branches || [];
    
    return {
      branches: Array.isArray(branches) ? branches : [],
      currentBranch: gitStatus?.status?.currentBranch || '',
      localBranches: Array.isArray(branches) ? branches.filter(b => !b.startsWith('remotes/')) : [],
      remoteBranches: Array.isArray(branches) ? branches.filter(b => b.startsWith('remotes/')) : [],
      lastUpdate: gitStatus?.lastUpdate
    };
  }, [gitData, activeIDE, workspacePath]);
};

// Analysis selectors
export const useAnalysisStatus = (workspacePath = null) => {
  const analysisData = useProjectGlobalStore(state => state.analysisData);
  const ideData = useProjectGlobalStore(state => state.ideData);
  const activeIDE = ideData.activeIDE;
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const projectAnalysis = analysisData[targetWorkspacePath];
    const status = projectAnalysis?.status;
    
    return {
      status,
      isRunning: status?.isRunning || false,
      progress: status?.progress || 0,
      hasRecentData: !!projectAnalysis?.lastUpdate,
      lastUpdate: projectAnalysis?.lastUpdate
    };
  }, [analysisData, activeIDE, workspacePath]);
};

export const useAnalysisMetrics = (workspacePath = null) => {
  const analysisData = useProjectGlobalStore(state => state.analysisData);
  const ideData = useProjectGlobalStore(state => state.ideData);
  const activeIDE = ideData.activeIDE;
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const projectAnalysis = analysisData[targetWorkspacePath];
    
    return {
      metrics: projectAnalysis?.metrics,
      hasMetrics: !!projectAnalysis?.metrics,
      lastUpdate: projectAnalysis?.lastUpdate
    };
  }, [analysisData, activeIDE, workspacePath]);
};

export const useAnalysisHistory = (workspacePath = null) => {
  const analysisData = useProjectGlobalStore(state => state.analysisData);
  const ideData = useProjectGlobalStore(state => state.ideData);
  const activeIDE = ideData.activeIDE;
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const projectAnalysis = analysisData[targetWorkspacePath];
    const history = projectAnalysis?.history;
    
    return {
      history: Array.isArray(history) ? history : [],
      hasHistory: Array.isArray(history) && history.length > 0,
      recentAnalyses: Array.isArray(history) ? history.slice(0, 5) : [],
      lastUpdate: projectAnalysis?.lastUpdate
    };
  }, [analysisData, activeIDE, workspacePath]);
};

// IDE selectors
export const useActiveIDE = () => {
  const ideData = useProjectGlobalStore(state => state.ideData);
  
  return useMemo(() => ({
    activeIDE: ideData.activeIDE,
    workspacePath: ideData.activeIDE?.workspacePath,
    port: ideData.activeIDE?.port,
    projectId: ideData.activeIDE?.projectId,
    projectName: ideData.activeIDE?.projectName
  }), [ideData.activeIDE]);
};

export const useAvailableIDEs = () => {
  const ideData = useProjectGlobalStore(state => state.ideData);
  
  return useMemo(() => ideData.available.map(ide => ({
    port: ide.port,
    workspacePath: ide.workspacePath,
    projectName: ide.projectName,
    active: ide.active
  })), [ideData.available]);
};

// Global state selectors
export const useGlobalStateStatus = () => {
  return useProjectGlobalStore(state => ({
    initialized: state.initialized,
    loading: state.loading,
    error: state.error
  }));
};

// Action selectors
export const useProjectDataActions = () => {
  const store = useProjectGlobalStore();
  
  return {
    initialize: store.initialize,
    loadProjectData: store.loadProjectData,
    setupWebSocketListeners: store.setupWebSocketListeners,
    cleanupWebSocketListeners: store.cleanupWebSocketListeners,
    reset: store.reset
  };
};
```

### Step 3: WebSocket Event Integration ✅
**Add WebSocket event handling:**
- [ ] Integrate with existing WebSocketService
- [ ] Handle git status updates
- [ ] Handle analysis status updates
- [ ] Handle project data updates
- [ ] Add event listeners for real-time updates

**WebSocket Integration:**
```javascript
// Add to ProjectGlobalStore.jsx
const useProjectGlobalStore = create((set, get) => ({
  // ... existing state and actions
  
  // WebSocket event handlers
  setupWebSocketListeners: (eventBus) => {
    if (!eventBus) return;
    
    // Listen for git updates
    eventBus.on('git-status-updated', (data) => {
      const { workspacePath, gitStatus } = data;
      set(state => ({
        gitData: {
          ...state.gitData,
          [workspacePath]: {
            ...state.gitData[workspacePath],
            status: gitStatus,
            lastUpdate: new Date().toISOString()
          }
        }
      }));
    });
    
    // Listen for analysis updates
    eventBus.on('analysis-completed', (data) => {
      const { workspacePath, analysisData } = data;
      set(state => ({
        analysisData: {
          ...state.analysisData,
          [workspacePath]: {
            ...state.analysisData[workspacePath],
            ...analysisData,
            lastUpdate: new Date().toISOString()
          }
        }
      }));
    });
    
    // Listen for project updates
    eventBus.on('project-updated', (data) => {
      // This event is not directly related to workspacePath, so we'll ignore it for now
      // or if it needs to be handled, it would require a different state structure.
      // For now, we'll just log it.
      logger.info('Project updated event received:', data);
    });
  },
  
  cleanupWebSocketListeners: (eventBus) => {
    if (!eventBus) return;
    
    eventBus.off('git-status-updated');
    eventBus.off('analysis-completed');
    eventBus.off('project-updated');
  }
}));
```

### Step 4: Error Handling & Validation ✅
**Add comprehensive error handling:**
- [ ] API call error handling
- [ ] WebSocket connection error handling
- [ ] State validation
- [ ] Loading state management
- [ ] Error state management

**Error Handling Implementation:**
```javascript
// Add to ProjectGlobalStore.jsx
const useProjectGlobalStore = create((set, get) => ({
  // ... existing state and actions
  
  // Enhanced error handling
  initialize: async () => {
    set({ loading: true, error: null });
    
    try {
      // RICHTIGE API ENDPUNKTE mit proper error handling
      const ideResult = await apiCall('/api/ide/available');
      
      if (ideResult.success) {
        const ideData = ideResult.data;
        const activeIDE = ideData.find(ide => ide.active);
        
        set({ 
          ideData: {
            available: ideData,
            activeIDE: activeIDE || null,
            lastUpdate: new Date().toISOString()
          }
        });
        
        // Wenn aktive IDE gefunden, lade deren Daten
        if (activeIDE?.workspacePath) {
          try {
            await get().loadProjectData(activeIDE.workspacePath);
          } catch (error) {
            logger.warn('Failed to load project data for active IDE:', error);
          }
        }
      } else {
        logger.warn('Failed to load IDE data:', ideResult.reason);
      }
      
      set({ initialized: true, loading: false });
    } catch (error) {
      set({ 
        error: error.message || 'Failed to initialize global state', 
        loading: false 
      });
      logger.error('Global state initialization failed:', error);
    }
  }
}));
```

## Success Criteria
- [ ] ProjectGlobalStore created and functional
- [ ] State selectors working correctly
- [ ] WebSocket event handling integrated
- [ ] Error handling comprehensive
- [ ] Loading states managed properly
- [ ] Store follows Zustand best practices

## Dependencies
- Zustand library (already installed)
- Existing API endpoints (already available)
- WebSocketService (already available)
- EventBus system (already available)

## Testing Checklist
- [ ] Store initialization works
- [ ] Data loading from API works
- [ ] State selectors return correct data
- [ ] WebSocket events update state
- [ ] Error handling works correctly
- [ ] Loading states work correctly

## Next Phase
After completing Phase 1, proceed to [Phase 2: Component Refactoring](./global-state-management-phase-2.md) to refactor components to use the global state.

## Notes
- This phase creates the foundation for global state management
- No backend changes required - uses existing API endpoints
- WebSocket integration enables real-time updates
- Error handling ensures robust operation
- Selectors provide clean component interface 