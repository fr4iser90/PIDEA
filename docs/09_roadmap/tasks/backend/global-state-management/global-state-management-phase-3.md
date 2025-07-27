# Global State Management - Phase 3: Component Refactoring

**Phase:** 3 of 4
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 3 Goals
- Remove API calls from GitManagementComponent
- Remove API calls from AnalysisDataViewer
- Remove API calls from Footer
- Update components to use global state

## Implementation Steps

### Step 1: GitManagementComponent Refactoring ✅
**Remove API calls and use global state:**
- [ ] File: `frontend/src/presentation/components/git/main/GitManagementComponent.jsx`
- [ ] Remove `loadGitStatus()` function
- [ ] Remove `loadBranches()` function
- [ ] Remove `useEffect` with API calls
- [ ] Use ProjectSessionStore selectors

**Refactored Component:**
```javascript
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useCallback } from 'react';
import '@/css/main/git.css';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useProjectSessionStore from '@/infrastructure/stores/ProjectSessionStore.jsx';
import PideaAgentBranchComponent from '../pidea-agent/PideaAgentBranchComponent.jsx';

const GitManagementComponent = ({ activePort, onGitOperation, onGitStatusChange, eventBus }) => {
  // Use global state instead of local state
  const { 
    getGitStatus, 
    getCurrentBranch, 
    getBranches, 
    getWorkspacePath,
    loadSession,
    isLoading,
    error 
  } = useProjectSessionStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffContent, setDiffContent] = useState('');
  const [showPideaAgent, setShowPideaAgent] = useState(false);

  // Get data from global state (NO API calls!)
  const gitStatus = getGitStatus();
  const currentBranch = getCurrentBranch();
  const branches = getBranches();
  const workspacePath = getWorkspacePath();

  // Only keep operation functions that modify state
  const handleValidate = useCallback(async () => {
    // Git operations still need API calls
  }, []);

  const handleCompare = useCallback(async () => {
    // Git operations still need API calls
  }, []);

  // Remove all data loading functions - data comes from global state
  // NO loadGitStatus() function!
  // NO loadBranches() function!
  // NO loadWorkspacePath() function!

  return (
    <div className="git-management">
      {/* Component JSX remains the same, but uses global state data */}
    </div>
  );
};
```

### Step 2: AnalysisDataViewer Refactoring ✅
**Remove API calls and use global state:**
- [ ] File: `frontend/src/presentation/components/analysis/AnalysisDataViewer.jsx`
- [ ] Remove `loadAnalysisData()` function
- [ ] Remove `useEffect` with API calls
- [ ] Use ProjectSessionStore selectors
- [ ] Keep individual analysis loading for lazy loading

**Refactored Component:**
```javascript
import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useCallback } from 'react';
import APIChatRepository from '@/infrastructure/repositories/APIChatRepository';
import useProjectSessionStore from '@/infrastructure/stores/ProjectSessionStore.jsx';
import useNotificationStore from '@/infrastructure/stores/NotificationStore.jsx';

const AnalysisDataViewer = ({ projectId = null, eventBus = null }) => {
  // Use global state for core data
  const { 
    getAnalysisStatus, 
    getAnalysisMetrics, 
    getAnalysisHistory,
    loadSession,
    isLoading: sessionLoading,
    error: sessionError 
  } = useProjectSessionStore();
  
  // Keep local state for lazy-loaded data
  const [loadingStates, setLoadingStates] = useState({
    issues: false,
    techStack: false,
    architecture: false,
    recommendations: false,
    charts: false
  });

  const [analysisData, setAnalysisData] = useState({
    issues: null,
    techStack: null,
    architecture: null,
    recommendations: null,
    charts: null
  });

  // Get core data from global state (NO API calls!)
  const analysisStatus = getAnalysisStatus();
  const analysisMetrics = getAnalysisMetrics();
  const analysisHistory = getAnalysisHistory();

  // Remove loadAnalysisData() function - core data comes from global state
  // Keep individual loading for lazy-loaded sections

  const loadAnalysisIssues = useCallback(async () => {
    // Keep this for lazy loading
  }, [projectId]);

  // Component JSX uses global state data
  return (
    <div className="analysis-data-viewer">
      {/* Use analysisStatus, analysisMetrics, analysisHistory from global state */}
    </div>
  );
};
```

### Step 3: Footer Refactoring ✅
**Remove API calls and use global state:**
- [ ] File: `frontend/src/presentation/components/Footer.jsx`
- [ ] Remove `fetchGitStatus()` function
- [ ] Remove `useEffect` with API calls
- [ ] Use ProjectSessionStore selectors
- [ ] Keep online status and time functionality

**Refactored Component:**
```javascript
import React, { useState, useEffect } from 'react';
import useProjectSessionStore from '@/infrastructure/stores/ProjectSessionStore.jsx';

function Footer({ eventBus, activePort, version = 'dev', message = 'Welcome to PIDEA!' }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Use global state for git data (NO API calls!)
  const { getGitStatus, getCurrentBranch } = useProjectSessionStore();
  
  const gitStatus = getGitStatus();
  const gitBranch = getCurrentBranch();

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check online status
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);

  // Remove fetchGitStatus() function - data comes from global state
  // NO useEffect with API calls!

  const formatTime = (date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <footer className="app-footer">
      <div className="footer-status">
        <span className="footer-git" title={gitBranch ? `Branch: ${gitBranch}` : 'No Git repository detected'}>
          <span className="git-icon">Git-Branch:</span>
          {gitBranch ? (
            <span className="git-branch">{gitBranch}</span>
          ) : (
            <span className="git-branch git-unknown">No Repo</span>
          )}
          {gitStatus?.dirty && <span className="git-dirty" title="Uncommitted changes">*</span>}
        </span>
        {/* Rest of footer remains the same */}
      </div>
    </footer>
  );
}
```

### Step 4: App.jsx Integration ✅
**Update main app to load session data:**
- [ ] File: `frontend/src/App.jsx`
- [ ] Add ProjectSessionStore integration
- [ ] Load session data on app initialization
- [ ] Handle session loading in view changes

**App Integration:**
```javascript
import useProjectSessionStore from '@/infrastructure/stores/ProjectSessionStore.jsx';

function App() {
  // Add session store
  const { loadSession, isLoading: sessionLoading } = useProjectSessionStore();
  
  // Load session when authenticated and port changes
  useEffect(() => {
    if (isAuthenticated && activePort) {
      const projectId = getProjectIdFromPort(activePort);
      loadSession(projectId);
    }
  }, [isAuthenticated, activePort]);

  // Rest of App component remains the same
}
```

### Step 5: Error Handling ✅
**Add error handling for global state:**
- [ ] Error boundaries for components
- [ ] Loading states and retry mechanisms
- [ ] User feedback for errors

**Error Handling Pattern:**
```javascript
// In components, add error handling
const { error, retryLoadSession } = useProjectSessionStore();

// Show error state
if (error) {
  return (
    <div className="error-state">
      <span>Failed to load data: {error}</span>
      <button onClick={() => retryLoadSession(projectId)}>
        Retry
      </button>
    </div>
  );
}

// Show loading state
if (isLoading) {
  return <div className="loading-state">Loading...</div>;
}
```

## Dependencies
- Requires: Phase 2 completion (ProjectSessionStore)
- Blocks: Phase 4 start

## Success Criteria
- [ ] GitManagementComponent uses global state
- [ ] AnalysisDataViewer uses global state
- [ ] Footer uses global state
- [ ] No API calls for data loading in components
- [ ] Components render correctly with global state
- [ ] Error handling works properly
- [ ] All unit tests pass

## Testing Requirements
- [ ] Component unit tests with global state
- [ ] Integration tests for component interactions
- [ ] Error handling tests
- [ ] Performance tests for rendering
- [ ] User interaction tests

## Risk Mitigation
- [ ] Error boundaries for component failures
- [ ] Performance monitoring for rendering
- [ ] User feedback for loading states 