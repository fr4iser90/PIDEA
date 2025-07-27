# Frontend Global State Management - Phase 1: IDEStore Extension

**Phase:** 1 of 3
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 1 Goals
- Extend existing IDEStore with project data (git, analysis)
- Add project data loading actions
- Add WebSocket event handling for real-time updates
- Create state selectors for components

## Implementation Steps

### Step 1: Extend IDEStore ✅
**Add project data to existing IDEStore:**
- [ ] File: `frontend/src/infrastructure/stores/IDEStore.jsx` - Extend store
- [ ] Add `projectData` state with git and analysis data
- [ ] Add `loadProjectData` action for loading project data
- [ ] Add WebSocket event handlers for real-time updates
- [ ] Add cleanup functions for WebSocket listeners
- [ ] Update persistence configuration

**Extended IDEStore Structure:**
```javascript
// IDEStore.jsx - ERWEITERT mit Projekt-Daten (KEIN neues ProjectGlobalStore!)
const useIDEStore = create(
  persist(
    (set, get) => ({
      // Bestehende IDE-Verwaltung (UNVERÄNDERT)
      activePort: null,
      portPreferences: [],
      availableIDEs: [],
      isLoading: false,
      error: null,
      lastUpdate: null,
      retryCount: 0,
      maxRetries: 3,

      // NEUE: Projekt-Daten
      projectData: {
        git: {}, // { '/path1': { status, branches, lastUpdate }, '/path2': { status, branches, lastUpdate } }
        analysis: {}, // { '/path1': { status, metrics, history, lastUpdate }, '/path2': { status, metrics, history, lastUpdate } }
        lastUpdate: null
      },

      // Bestehende Actions (UNVERÄNDERT)
      setActivePort: async (port) => { /* ... existing logic ... */ },
      loadActivePort: async () => { /* ... existing logic ... */ },
      loadAvailableIDEs: async () => { /* ... existing logic ... */ },

      // NEUE: Projekt-Daten Actions
      loadProjectData: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          // Load git and analysis data in parallel
          const [gitResult, analysisResult] = await Promise.allSettled([
            apiCall(`/api/projects/${projectId}/git/status`, { method: 'POST' }),
            apiCall(`/api/projects/${projectId}/analysis/status`)
          ]);
          
          const gitData = {
            status: gitResult.status === 'fulfilled' && gitResult.value.success ? gitResult.value.data : null,
            lastUpdate: new Date().toISOString()
          };
          
          const analysisData = {
            status: analysisResult.status === 'fulfilled' && analysisResult.value.success ? analysisResult.value.data : null,
            lastUpdate: new Date().toISOString()
          };
          
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: gitData
              },
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: analysisData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('Project data loaded for workspace:', workspacePath);
        } catch (error) {
          logger.error('Failed to load project data:', error);
        }
      },

      // NEUE: WebSocket Event Handler
      setupWebSocketListeners: (eventBus) => {
        if (!eventBus) return;
        
        // Git Events
        eventBus.on('git-status-updated', (data) => {
          const { workspacePath, gitStatus } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: {
                  ...state.projectData.git[workspacePath],
                  status: gitStatus,
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
        });
        
        eventBus.on('git-branch-changed', (data) => {
          const { workspacePath, newBranch } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: {
                  ...state.projectData.git[workspacePath],
                  status: {
                    ...state.projectData.git[workspacePath]?.status,
                    currentBranch: newBranch
                  },
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
        });
        
        // Analysis Events
        eventBus.on('analysis-completed', (data) => {
          const { workspacePath, analysisData } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: {
                  ...state.projectData.analysis[workspacePath],
                  ...analysisData,
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
        });
        
        eventBus.on('analysis-progress', (data) => {
          const { workspacePath, progress, currentStep } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: {
                  ...state.projectData.analysis[workspacePath],
                  status: {
                    ...state.projectData.analysis[workspacePath]?.status,
                    progress,
                    currentStep
                  },
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
        });
      },

      cleanupWebSocketListeners: (eventBus) => {
        if (!eventBus) return;
        eventBus.off('git-status-updated');
        eventBus.off('git-branch-changed');
        eventBus.off('analysis-completed');
        eventBus.off('analysis-progress');
      },

      // Bestehende Helper Functions (UNVERÄNDERT)
      validatePort: async (port) => { /* ... existing logic ... */ },
      getPortInfo: (port) => { /* ... existing logic ... */ }
    }),
    {
      name: 'ide-store',
      partialize: (state) => ({
        activePort: state.activePort,
        portPreferences: state.portPreferences,
        // NEUE: Persistiere auch Projekt-Daten
        projectData: state.projectData
      })
    }
  )
);

// Helper function to get project ID from workspace path
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  const parts = workspacePath.split('/');
  return parts[parts.length - 1];
};
```

### Step 2: Create State Selectors ✅
**Create selectors for components:**
- [ ] File: `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - Create selectors
- [ ] Create git status selectors with memoization
- [ ] Create analysis status selectors with memoization
- [ ] Create IDE selectors with active IDE detection
- [ ] Create action selectors for store actions
- [ ] Add proper error handling and fallbacks

**State Selectors:**
```javascript
// ProjectSelectors.jsx - CLEAR SELECTORS für ERWEITERTEN IDEStore!
import { useMemo } from 'react';
import useIDEStore from '../IDEStore.jsx';

// Git selectors
export const useGitStatus = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const gitData = projectData.git[targetWorkspacePath];
    
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
  }, [projectData.git, activeIDE, workspacePath]);
};

export const useGitBranches = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const gitData = projectData.git[targetWorkspacePath];
    const branches = gitData?.status?.branches || [];
    
    return {
      branches: Array.isArray(branches) ? branches : [],
      currentBranch: gitData?.status?.currentBranch || '',
      localBranches: Array.isArray(branches) ? branches.filter(b => !b.startsWith('remotes/')) : [],
      remoteBranches: Array.isArray(branches) ? branches.filter(b => b.startsWith('remotes/')) : [],
      lastUpdate: gitData?.lastUpdate
    };
  }, [projectData.git, activeIDE, workspacePath]);
};

// Analysis selectors
export const useAnalysisStatus = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const analysisData = projectData.analysis[targetWorkspacePath];
    const status = analysisData?.status;
    
    return {
      status,
      isRunning: status?.isRunning || false,
      progress: status?.progress || 0,
      hasRecentData: !!analysisData?.lastUpdate,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData.analysis, activeIDE, workspacePath]);
};

export const useAnalysisMetrics = (workspacePath = null) => {
  const { projectData, availableIDEs } = useIDEStore();
  const activeIDE = availableIDEs.find(ide => ide.active);
  
  return useMemo(() => {
    const targetWorkspacePath = workspacePath || activeIDE?.workspacePath;
    const analysisData = projectData.analysis[targetWorkspacePath];
    
    return {
      metrics: analysisData?.metrics,
      hasMetrics: !!analysisData?.metrics,
      lastUpdate: analysisData?.lastUpdate
    };
  }, [projectData.analysis, activeIDE, workspacePath]);
};

// IDE selectors (bereits vorhanden, aber erweitert)
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
    setupWebSocketListeners: store.setupWebSocketListeners,
    cleanupWebSocketListeners: store.cleanupWebSocketListeners
  };
};

// Helper function (same as in store)
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  const parts = workspacePath.split('/');
  return parts[parts.length - 1];
};
```

### Step 3: Test IDEStore Extension ✅
**Test extended store functionality:**
- [ ] Test project data loading
- [ ] Test WebSocket event handling
- [ ] Test state persistence
- [ ] Test error handling
- [ ] Test multiple workspace support

**Test Scenarios:**
```javascript
// Test IDEStore extension
const testIDEStoreExtension = () => {
  // Test project data loading
  const store = useIDEStore.getState();
  await store.loadProjectData('/home/user/projects/PIDEA');
  
  // Verify data is loaded
  const projectData = store.projectData;
  console.log('Project data loaded:', projectData);
  
  // Test WebSocket events
  window.eventBus.emit('git-status-updated', {
    workspacePath: '/home/user/projects/PIDEA',
    gitStatus: { currentBranch: 'main', status: 'clean' }
  });
  
  // Verify state is updated
  const updatedData = useIDEStore.getState().projectData;
  console.log('Updated project data:', updatedData);
};
```

## Success Criteria
- [ ] IDEStore extended with project data
- [ ] Project data loading works correctly
- [ ] WebSocket event handling works
- [ ] State selectors created and working
- [ ] Multiple workspace support works
- [ ] Error handling works correctly
- [ ] State persistence works

## Dependencies
- Existing IDEStore
- WebSocket system
- API endpoints for git and analysis

## Testing Checklist
- [ ] Project data loads correctly
- [ ] WebSocket events update state
- [ ] Selectors return correct data
- [ ] Multiple workspaces work
- [ ] Error scenarios handled
- [ ] State persists correctly
- [ ] No memory leaks

## Next Phase
After completing Phase 1, proceed to [Phase 2: Component Refactoring](./global-state-management-phase-2.md) to refactor components to use the extended IDEStore.

## Notes
- This phase extends the existing IDEStore instead of creating a new store
- Project data is keyed by workspace path for multiple IDE support
- WebSocket events automatically update the state
- State selectors provide clean interfaces for components
- All existing IDE functionality remains unchanged 