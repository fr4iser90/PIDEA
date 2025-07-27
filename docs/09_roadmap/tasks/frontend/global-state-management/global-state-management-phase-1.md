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
// ProjectGlobalStore.jsx - RICHTIGER NAME!
const useProjectGlobalStore = create((set, get) => ({
  // State
  projectData: null,
  gitData: null,
  analysisData: null,
  isLoading: false,
  error: null,
  lastUpdate: null,
  
  // Actions
  loadAllData: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      // Load all data from existing API endpoints
      const [projectResponse, gitResponse, analysisResponse] = await Promise.all([
        apiCall(`/api/projects/${projectId}`),
        apiCall(`/api/projects/${projectId}/git/status`),
        apiCall(`/api/projects/${projectId}/analysis/status`)
      ]);
      
      set({
        projectData: projectResponse.data,
        gitData: gitResponse.data,
        analysisData: analysisResponse.data,
        isLoading: false,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  updateGitData: (gitData) => {
    set({ gitData, lastUpdate: new Date().toISOString() });
  },
  
  updateAnalysisData: (analysisData) => {
    set({ analysisData, lastUpdate: new Date().toISOString() });
  },
  
  clearData: () => {
    set({ projectData: null, gitData: null, analysisData: null, error: null });
  }
}));
```

### Step 2: Create State Selectors ✅
**Create selectors for components:**
- [ ] File: `frontend/src/infrastructure/stores/selectors/ProjectSelectors.jsx` - Create state selectors
- [ ] Project information selectors
- [ ] Git status selectors
- [ ] Analysis status selectors
- [ ] Specific data selectors

**Selector Implementation:**
```javascript
// ProjectSelectors.jsx - CLEAR SELECTORS!
import { useProjectGlobalStore } from '../ProjectGlobalStore.jsx';

export const useProjectInfo = () => useProjectGlobalStore(state => state.projectData);
export const useGitStatus = () => useProjectGlobalStore(state => state.gitData);
export const useAnalysisStatus = () => useProjectGlobalStore(state => state.analysisData);
export const useCurrentBranch = () => useProjectGlobalStore(state => state.gitData?.currentBranch);
export const useBranches = () => useProjectGlobalStore(state => state.gitData?.branches);
export const useAnalysisMetrics = () => useProjectGlobalStore(state => state.analysisData?.metrics);
export const useAnalysisResults = () => useProjectGlobalStore(state => state.analysisData?.results);
export const useIsLoading = () => useProjectGlobalStore(state => state.isLoading);
export const useError = () => useProjectGlobalStore(state => state.error);
export const useLastUpdate = () => useProjectGlobalStore(state => state.lastUpdate);
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
    eventBus.on('git-status-update', (data) => {
      set({ gitData: data, lastUpdate: new Date().toISOString() });
    });
    
    // Listen for analysis updates
    eventBus.on('analysis-status-update', (data) => {
      set({ analysisData: data, lastUpdate: new Date().toISOString() });
    });
    
    // Listen for project updates
    eventBus.on('project-update', (data) => {
      set({ projectData: data, lastUpdate: new Date().toISOString() });
    });
  },
  
  cleanupWebSocketListeners: (eventBus) => {
    if (!eventBus) return;
    
    eventBus.off('git-status-update');
    eventBus.off('analysis-status-update');
    eventBus.off('project-update');
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
  loadAllData: async (projectId) => {
    if (!projectId) {
      set({ error: 'Project ID is required', isLoading: false });
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const [projectResponse, gitResponse, analysisResponse] = await Promise.all([
        apiCall(`/api/projects/${projectId}`),
        apiCall(`/api/projects/${projectId}/git/status`),
        apiCall(`/api/projects/${projectId}/analysis/status`)
      ]);
      
      // Validate responses
      if (!projectResponse.success || !gitResponse.success || !analysisResponse.success) {
        throw new Error('Failed to load project data');
      }
      
      set({
        projectData: projectResponse.data,
        gitData: gitResponse.data,
        analysisData: analysisResponse.data,
        isLoading: false,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      set({ 
        error: error.message || 'Failed to load project data', 
        isLoading: false 
      });
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