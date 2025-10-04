# Phase 3: Integration with Git View

## Overview
Integrate the version management components into the existing git view and ensure seamless operation with the current git workflow.

## Estimated Time: 4 hours

## Tasks

### 1. Integrate Version Management Section into GitManagementComponent (1.5 hours)
- [ ] Add VersionManagementSection to GitManagementComponent
- [ ] Connect version management with git status updates
- [ ] Implement real-time version status updates
- [ ] Add version management to git status display
- [ ] Ensure proper state management

### 2. Connect Version Management with Existing Git Workflow (1.5 hours)
- [ ] Integrate version bumping with git commits
- [ ] Connect tag creation with git operations
- [ ] Ensure version management respects git branch state
- [ ] Add version management to git operation callbacks
- [ ] Implement proper error handling

### 3. Implement Real-time Version Status Updates (1 hour)
- [ ] Add WebSocket listeners for version updates
- [ ] Implement version status polling
- [ ] Add version change notifications
- [ ] Ensure UI updates reflect version changes
- [ ] Add proper loading states

## Technical Details

### Integration with GitManagementComponent
```jsx
// Modify GitManagementComponent.jsx
import VersionManagementSection from '../version/VersionManagementSection';

const GitManagementComponent = ({ activePort, onGitOperation, onGitStatusChange, eventBus }) => {
  // ... existing code ...

  const handleVersionOperation = async (operation, data) => {
    try {
      setIsLoading(true);
      
      // Get project ID from workspace path
      const projectId = getProjectIdFromWorkspace(workspacePath);
      
      let result;
      switch (operation) {
        case 'bump':
          result = await apiRepository.bumpVersion(projectId, workspacePath, data.bumpType, data.message);
          break;
        case 'tag':
          result = await apiRepository.createTag(projectId, workspacePath, data.tagName, data.message);
          break;
        case 'changelog':
          result = await apiRepository.generateChangelog(projectId, workspacePath, data.fromVersion, data.toVersion);
          break;
        case 'release':
          result = await apiRepository.publishRelease(projectId, workspacePath, data.version, data.releaseNotes);
          break;
        default:
          throw new Error(`Unknown version operation: ${operation}`);
      }
      
      setOperationResult({ type: 'success', message: result.message, data: result.data });
      
      // Refresh git status to reflect version changes
      await refreshGitStatus();
      
      if (onGitOperation) {
        onGitOperation(`version-${operation}`, result);
      }
    } catch (error) {
      setOperationResult({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="git-management">
      {/* ... existing git status and controls ... */}
      
      {/* Version Management Section */}
      <VersionManagementSection 
        projectPath={workspacePath}
        gitStatus={gitStatus}
        onVersionOperation={handleVersionOperation}
        isLoading={isLoading}
        eventBus={eventBus}
      />
      
      {/* ... existing diff modal and other components ... */}
    </div>
  );
};
```

### WebSocket Integration
```jsx
// Add to VersionManagementSection.jsx
useEffect(() => {
  if (eventBus) {
    // Listen for git status changes
    eventBus.on('git-status-updated', (data) => {
      if (data.versionChanged) {
        setCurrentVersion(data.currentVersion);
        setVersionHistory(data.versionHistory);
      }
    });
    
    // Listen for version operations
    eventBus.on('version-operation-completed', (data) => {
      if (data.operation === 'bump') {
        setCurrentVersion(data.newVersion);
        // Refresh version history
        loadVersionHistory();
      }
    });
    
    return () => {
      eventBus.off('git-status-updated');
      eventBus.off('version-operation-completed');
    };
  }
}, [eventBus]);
```

### State Management Integration
```jsx
// Add to ProjectSelectors.jsx
export const useVersionStatus = () => {
  const state = useProjectState();
  return state.versionStatus || {
    currentVersion: null,
    versionHistory: [],
    isLoading: false
  };
};

export const useVersionActions = () => {
  const dispatch = useProjectDispatch();
  
  return {
    updateVersionStatus: (versionStatus) => {
      dispatch({ type: 'UPDATE_VERSION_STATUS', payload: versionStatus });
    },
    setVersionLoading: (isLoading) => {
      dispatch({ type: 'SET_VERSION_LOADING', payload: isLoading });
    }
  };
};
```

### Error Handling Integration
```jsx
// Add to VersionManagementSection.jsx
const handleVersionOperation = async (operation, data) => {
  try {
    setIsLoading(true);
    setError(null);
    
    const result = await onVersionOperation(operation, data);
    
    if (result.success) {
      // Show success message
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

## Success Criteria
- [ ] Version management section is integrated into git view
- [ ] Version operations work with existing git workflow
- [ ] Real-time updates work correctly
- [ ] Error handling is comprehensive
- [ ] UI is responsive and user-friendly
- [ ] No conflicts with existing git operations

## Dependencies
- GitManagementComponent from Phase 2
- Backend API endpoints from Phase 1
- Existing git workflow system

## Next Phase
Phase 4: Testing & Documentation
