# Global State Management - Phase 2: Frontend Global State Store

**Phase:** 2 of 4
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 2 Goals
- Create ProjectSessionStore with Zustand
- Implement session data loading
- Add WebSocket event handling
- Create session data selectors

## Implementation Steps

### Step 1: ProjectSessionStore Creation ✅
**Create global state store:**
- [ ] File: `frontend/src/infrastructure/stores/ProjectSessionStore.jsx`
- [ ] Zustand store with session data management
- [ ] Clear naming conventions (no "full-data" nonsense)
- [ ] Persistence with localStorage
- [ ] TypeScript-like structure for better DX

**Store Structure:**
```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

const useProjectSessionStore = create(
  persist(
    (set, get) => ({
      // State
      sessionData: null,
      isLoading: false,
      error: null,
      lastUpdate: null,
      
      // Actions
      loadSession: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiCall(`/api/projects/${projectId}/session`);
          set({ 
            sessionData: response.data, 
            isLoading: false,
            lastUpdate: new Date().toISOString()
          });
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },
      
      updateSession: async (projectId, updates) => {
        try {
          const response = await apiCall(`/api/projects/${projectId}/session/update`, {
            method: 'POST',
            body: JSON.stringify(updates)
          });
          set({ 
            sessionData: { ...get().sessionData, ...response.data },
            lastUpdate: new Date().toISOString()
          });
        } catch (error) {
          set({ error: error.message });
        }
      },
      
      clearSession: () => {
        set({ sessionData: null, error: null, lastUpdate: null });
      }
    }),
    {
      name: 'project-session-storage',
      partialize: (state) => ({
        sessionData: state.sessionData,
        lastUpdate: state.lastUpdate
      })
    }
  )
);
```

### Step 2: Session Data Selectors ✅
**Create clear selectors:**
- [ ] Project information selectors
- [ ] Git status selectors
- [ ] IDE information selectors
- [ ] Analysis status selectors
- [ ] Specific data selectors

**Selector Implementation:**
```javascript
// Add to store
// Selectors (CLEAR naming!)
getProjectInfo: () => get().sessionData?.project,
getGitStatus: () => get().sessionData?.git,
getIdeInfo: () => get().sessionData?.ide,
getAnalysisStatus: () => get().sessionData?.analysis,

// Specific selectors
getCurrentBranch: () => get().sessionData?.git?.currentBranch,
getBranches: () => get().sessionData?.git?.branches,
getWorkspacePath: () => get().sessionData?.project?.workspacePath,
getActivePort: () => get().sessionData?.ide?.activePort,
getAnalysisMetrics: () => get().sessionData?.analysis?.metrics
```

### Step 3: WebSocket Event Integration ✅
**Add real-time updates:**
- [ ] WebSocket event listeners
- [ ] Session data synchronization
- [ ] Automatic reconnection handling
- [ ] Event filtering and processing

**WebSocket Integration:**
```javascript
// Add to store
setupWebSocketHandlers: () => {
  const webSocketService = window.webSocketService;
  if (!webSocketService) return;
  
  webSocketService.on('session-updated', (data) => {
    if (data.projectId === get().currentProjectId) {
      set({ 
        sessionData: { ...get().sessionData, ...data.updates },
        lastUpdate: new Date().toISOString()
      });
    }
  });
  
  webSocketService.on('git-status-changed', (data) => {
    if (data.projectId === get().currentProjectId) {
      set({
        sessionData: {
          ...get().sessionData,
          git: { ...get().sessionData?.git, ...data.gitStatus }
        }
      });
    }
  });
}
```

### Step 4: Store Integration with Existing System ✅
**Integrate with existing stores:**
- [ ] Connect with IDEStore for port management
- [ ] Connect with AuthStore for user authentication
- [ ] Connect with NotificationStore for user feedback
- [ ] Maintain store independence

**Integration Pattern:**
```javascript
// In components, use multiple stores
const { sessionData, loadSession } = useProjectSessionStore();
const { activePort } = useIDEStore();
const { isAuthenticated } = useAuthStore();

// Load session when authenticated and port changes
useEffect(() => {
  if (isAuthenticated && activePort) {
    const projectId = getProjectIdFromPort(activePort);
    loadSession(projectId);
  }
}, [isAuthenticated, activePort]);
```

### Step 5: Error Handling and Loading States ✅
**Robust error handling:**
- [ ] Loading state management
- [ ] Error state handling
- [ ] Retry mechanisms
- [ ] Fallback data handling

**Error Handling:**
```javascript
// Add to store
retryLoadSession: async (projectId) => {
  const { error } = get();
  if (error) {
    set({ error: null });
    await get().loadSession(projectId);
  }
},

clearError: () => {
  set({ error: null });
},

// Loading state helpers
isSessionLoading: () => get().isLoading,
hasSessionData: () => !!get().sessionData,
hasError: () => !!get().error
```

## Dependencies
- Requires: Phase 1 completion (backend session system)
- Blocks: Phase 3 start

## Success Criteria
- [ ] ProjectSessionStore loads and saves session data
- [ ] WebSocket events update store state
- [ ] Selectors return correct data
- [ ] Error handling works properly
- [ ] Store integrates with existing stores
- [ ] All unit tests pass

## Testing Requirements
- [ ] Unit tests for store actions
- [ ] Unit tests for selectors
- [ ] WebSocket integration tests
- [ ] Store persistence tests
- [ ] Error handling tests

## Risk Mitigation
- [ ] Store state validation
- [ ] WebSocket reconnection logic
- [ ] Error boundary implementation
- [ ] Memory leak prevention
- [ ] Performance optimization 