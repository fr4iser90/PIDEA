# Frontend Global State Management - Phase 2: Component Refactoring

**Phase:** 2 of 3
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 2 Goals
- Refactor GitManagementComponent to use global state
- Refactor AnalysisDataViewer to use global state
- Refactor Footer to use global state
- Remove individual API calls from components

## Implementation Steps

### Step 1: Refactor GitManagementComponent ✅
**Remove API calls, use global state:**
- [ ] File: `frontend/src/presentation/components/git/main/GitManagementComponent.jsx` - Refactor component
- [ ] Remove `loadGitStatus()` function
- [ ] Remove `loadBranches()` function
- [ ] Remove `useEffect` with API calls
- [ ] Import and use global state selectors
- [ ] Keep only operation API calls (merge, checkout, etc.)

**Refactored Component:**
```javascript
// GitManagementComponent.jsx - KEINE API CALLS MEHR!
import { useGitStatus, useCurrentBranch, useBranches } from '@/infrastructure/stores/selectors/ProjectSelectors';

const GitManagementComponent = ({ activePort, onGitOperation, onGitStatusChange, eventBus }) => {
  // Use global state instead of local state
  const gitStatus = useGitStatus();
  const currentBranch = useCurrentBranch();
  const branches = useBranches();
  
  // KEINE useEffect mit API calls!
  // KEINE loadGitStatus() Funktion!
  // KEINE loadBranches() Funktion!
  
  // NUR Operationen machen API calls
  const handleMerge = async () => {
    try {
      const projectId = getProjectIdFromWorkspace();
      await apiCall(`/api/projects/${projectId}/git/merge`, {
        method: 'POST',
        body: JSON.stringify({ branch: targetBranch })
      });
      // State wird via WebSocket aktualisiert
    } catch (error) {
      logger.error('Failed to merge branch:', error);
    }
  };
  
  const handleSwitchBranch = async (branchName) => {
    try {
      const projectId = getProjectIdFromWorkspace();
      await apiCall(`/api/projects/${projectId}/git/checkout`, {
        method: 'POST',
        body: JSON.stringify({ branch: branchName })
      });
      // State wird via WebSocket aktualisiert
    } catch (error) {
      logger.error('Failed to switch branch:', error);
    }
  };
  
  return (
    <div>
      <span>Branch: {currentBranch}</span>
      <span>Status: {gitStatus?.status}</span>
      {/* Rest of component */}
    </div>
  );
};
```

### Step 2: Refactor AnalysisDataViewer ✅
**Remove API calls, use global state:**
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx` - Refactor component
- [ ] Remove `loadAnalysisData()` function
- [ ] Remove `useEffect` with API calls
- [ ] Remove individual loading states
- [ ] Import and use global state selectors
- [ ] Keep only analysis execution API calls

**Refactored Component:**
```javascript
// AnalysisDataViewer.jsx - KEINE API CALLS MEHR!
import { 
  useAnalysisStatus, 
  useAnalysisMetrics, 
  useAnalysisResults,
  useIsLoading,
  useError 
} from '@/infrastructure/stores/selectors/ProjectSelectors';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // Use global state instead of local state
  const analysisStatus = useAnalysisStatus();
  const analysisMetrics = useAnalysisMetrics();
  const analysisResults = useAnalysisResults();
  const isLoading = useIsLoading();
  const error = useError();
  
  // KEINE useEffect mit API calls!
  // KEINE loadAnalysisData() Funktion!
  // KEINE loadingStates!
  
  // NUR Analysis starten macht API calls
  const handleStartAnalysis = async () => {
    try {
      await apiCall(`/api/projects/${projectId}/analysis/project`, {
        method: 'POST',
        body: JSON.stringify({ options: { includeMetrics: true } })
      });
      // State wird via WebSocket aktualisiert
    } catch (error) {
      logger.error('Failed to start analysis:', error);
    }
  };
  
  const handleStartAIAnalysis = async () => {
    try {
      await apiCall(`/api/projects/${projectId}/analysis/ai`, {
        method: 'POST',
        body: JSON.stringify({ options: { aiModel: 'gpt-4' } })
      });
      // State wird via WebSocket aktualisiert
    } catch (error) {
      logger.error('Failed to start AI analysis:', error);
    }
  };
  
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <div>Metrics: {JSON.stringify(analysisMetrics)}</div>
      <div>Results: {JSON.stringify(analysisResults)}</div>
      {/* Rest of component */}
    </div>
  );
};
```

### Step 3: Refactor Footer ✅
**Remove API calls, use global state:**
- [ ] File: `frontend/src/presentation/components/Footer.jsx` - Refactor component
- [ ] Remove `fetchGitStatus()` function
- [ ] Remove `useEffect` with API calls
- [ ] Import and use global state selectors
- [ ] Display git status from global state

**Refactored Component:**
```javascript
// Footer.jsx - KEINE API CALLS MEHR!
import { useGitStatus, useCurrentBranch } from '@/infrastructure/stores/selectors/ProjectSelectors';

const Footer = () => {
  // Use global state instead of local state
  const gitStatus = useGitStatus();
  const currentBranch = useCurrentBranch();
  
  // KEINE useEffect mit API calls!
  // KEINE fetchGitStatus() Funktion!
  
  return (
    <footer>
      <span>Branch: {currentBranch}</span>
      <span>Status: {gitStatus?.status}</span>
      {/* Rest of footer */}
    </footer>
  );
};
```

### Step 4: Remove API Repository Dependencies ✅
**Clean up API repository usage:**
- [ ] Remove `APIChatRepository` imports from components
- [ ] Remove `apiRepository` instances
- [ ] Use direct `apiCall` function for operations
- [ ] Update import statements
- [ ] Clean up unused variables

**Cleanup Example:**
```javascript
// BEFORE (REMOVE):
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
const apiRepository = new APIChatRepository();

// AFTER (KEEP ONLY FOR OPERATIONS):
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Use direct apiCall for operations only
const handleOperation = async () => {
  await apiCall(`/api/projects/${projectId}/operation`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
```

## Success Criteria
- [ ] GitManagementComponent uses global state
- [ ] AnalysisDataViewer uses global state
- [ ] Footer uses global state
- [ ] No API calls for data loading in components
- [ ] Only operation API calls remain
- [ ] Components render correctly with global state
- [ ] No console errors or warnings

## Dependencies
- Phase 1 completion (ProjectGlobalStore and selectors)
- Existing API endpoints for operations
- WebSocket system for real-time updates

## Testing Checklist
- [ ] Components render without errors
- [ ] Global state data displays correctly
- [ ] No API calls made for data loading
- [ ] Operation API calls still work
- [ ] WebSocket updates reflect in components
- [ ] Loading states work correctly
- [ ] Error states work correctly

## Next Phase
After completing Phase 2, proceed to [Phase 3: App Integration & Testing](./global-state-management-phase-3.md) to integrate global state initialization and perform comprehensive testing.

## Notes
- This phase removes the root cause of the blocking issue
- Components become much simpler and faster
- No more individual API calls for data loading
- Real-time updates via WebSocket work automatically
- Operation API calls remain for user actions 