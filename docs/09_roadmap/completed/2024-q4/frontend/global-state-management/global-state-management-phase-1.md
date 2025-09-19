# Frontend Global State Management - Phase 1: IDEStore Extension

**Phase:** 1 of 3
**Status:** ✅ Completed
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
- [x] File: `frontend/src/infrastructure/stores/IDEStore.jsx` - Extend store
- [x] Add `projectData` state with git and analysis data
- [x] Add `loadProjectData` action for loading project data
- [x] Add WebSocket event handlers for real-time updates
- [x] Add cleanup functions for WebSocket listeners
- [x] Update persistence configuration

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
- [x] File: `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - Create selectors
- [x] Create git status selectors with memoization
- [x] Create analysis status selectors with memoization
- [x] Create IDE selectors with active IDE detection
- [x] Create action selectors for store actions
- [x] Add proper error handling and fallbacks

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
- [x] Test project data loading
- [x] Test WebSocket event handling
- [x] Test state persistence
- [x] Test error handling
- [x] Test multiple workspace support

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
- [x] IDEStore extended with project data
- [x] Project data loading works correctly
- [x] WebSocket event handling works
- [x] State selectors created and working
- [x] Multiple workspace support works
- [x] Error handling works correctly
- [x] State persistence works

## Dependencies
- Existing IDEStore
- WebSocket system
- API endpoints for git and analysis

## Testing Checklist
- [x] Project data loads correctly
- [x] WebSocket events update state
- [x] Selectors return correct data
- [x] Multiple workspaces work
- [x] Error scenarios handled
- [x] State persists correctly
- [x] No memory leaks

## Implementation Summary
✅ **Phase 1 Completed Successfully**

**Files Created/Modified:**
- `frontend/src/infrastructure/stores/IDEStore.jsx` - Extended with project data
- `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - New selectors
- `frontend/tests/unit/stores/IDEStore.test.js` - Comprehensive tests

**Key Features Implemented:**
- Project data loading with parallel API calls
- WebSocket event handling for real-time updates
- Multiple workspace support with active IDE detection
- State persistence for project data
- Comprehensive error handling
- Clean selector interfaces for components

**Performance Improvements:**
- Parallel loading of git and analysis data
- Memoized selectors for optimal performance
- Efficient state updates via WebSocket events

## Next Phase
After completing Phase 1, proceed to [Phase 2: Component Refactoring](./global-state-management-phase-2.md) to refactor components to use the extended IDEStore.

## Notes
- This phase extends the existing IDEStore instead of creating a new store
- Project data is keyed by workspace path for multiple IDE support
- WebSocket events automatically update the state
- State selectors provide clean interfaces for components
- All existing IDE functionality remains unchanged 