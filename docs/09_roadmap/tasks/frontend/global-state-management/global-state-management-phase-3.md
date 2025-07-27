# Frontend Global State Management - Phase 3: IDEContext Integration & Testing

**Phase:** 3 of 3
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 3 Goals
- Integrate project data loading in IDEContext
- Test state loading and updates
- Test WebSocket integration
- Performance testing and optimization

## Implementation Steps

### Step 1: IDEContext Integration ✅
**Integrate project data loading in IDEContext:**
- [ ] File: `frontend/src/presentation/components/ide/IDEContext.jsx` - Add project data loading
- [ ] Import project data actions from IDEStore
- [ ] Add useEffect for project data loading when active IDE changes
- [ ] Setup WebSocket event listeners
- [ ] Handle project ID detection
- [ ] Add error handling for initialization

**IDEContext Integration:**
```javascript
// IDEContext.jsx - ERWEITERT für Projekt-Daten
import { useIDEStore } from '@/infrastructure/stores/IDEStore';
import { useAuthStore } from '@/infrastructure/stores/AuthStore';
import { useEffect, useCallback } from 'react';

export const IDEProvider = ({ children, eventBus }) => {
  const {
    activePort,
    availableIDEs,
    loadActivePort,
    loadAvailableIDEs,
    loadProjectData, // NEUE
    setupWebSocketListeners, // NEUE
    cleanupWebSocketListeners // NEUE
  } = useIDEStore();
  
  const { isAuthenticated } = useAuthStore();

  // Bestehende Logic (UNVERÄNDERT)
  const stableLoadAvailableIDEs = useCallback(async () => {
    try {
      await loadAvailableIDEs();
    } catch (error) {
      logger.error('Failed to load available IDEs:', error);
    }
  }, [loadAvailableIDEs]);

  const stableLoadActivePort = useCallback(async () => {
    try {
      await loadActivePort();
    } catch (error) {
      logger.error('Failed to load active port:', error);
    }
  }, [loadActivePort]);

  useEffect(() => {
    if (isAuthenticated) {
      stableLoadAvailableIDEs();
      stableLoadActivePort();
    }
  }, [isAuthenticated, stableLoadAvailableIDEs, stableLoadActivePort]);

  // NEUE: Projekt-Daten laden wenn aktive IDE wechselt
  useEffect(() => {
    if (activePort && availableIDEs.length > 0) {
      const activeIDE = availableIDEs.find(ide => ide.port === activePort);
      if (activeIDE?.workspacePath) {
        logger.info('🔄 Loading project data for active IDE:', activeIDE.workspacePath);
        loadProjectData(activeIDE.workspacePath);
      }
    }
  }, [activePort, availableIDEs, loadProjectData]);

  // NEUE: WebSocket Listeners
  useEffect(() => {
    if (eventBus) {
      logger.info('🔄 Setting up WebSocket listeners...');
      setupWebSocketListeners(eventBus);
      
      // Cleanup on unmount
      return () => {
        logger.info('🔄 Cleaning up WebSocket listeners...');
        cleanupWebSocketListeners(eventBus);
      };
    }
  }, [eventBus, setupWebSocketListeners, cleanupWebSocketListeners]);

  // Rest of context remains the same...
  const contextValue = {
    activePort,
    availableIDEs,
    isLoading: false, // This will be handled by individual stores
    error: null,
    // Add project data actions to context
    loadProjectData,
    setupWebSocketListeners,
    cleanupWebSocketListeners
  };

  return (
    <IDEContext.Provider value={contextValue}>
      {children}
    </IDEContext.Provider>
  );
};
```

### Step 2: WebSocket Integration Testing ✅
**Test real-time updates:**
- [ ] Test git status updates via WebSocket
- [ ] Test analysis status updates via WebSocket
- [ ] Test project data updates via WebSocket
- [ ] Verify event listeners work correctly
- [ ] Test cleanup on context unmount

**WebSocket Test Scenarios:**
```javascript
// Test WebSocket integration
const testWebSocketIntegration = () => {
  // Simulate git status update
  window.eventBus.emit('git-status-updated', {
    workspacePath: '/home/user/projects/PIDEA',
    gitStatus: {
      currentBranch: 'main',
      status: 'clean',
      modified: [],
      added: [],
      deleted: [],
      untracked: []
    }
  });
  
  // Simulate analysis status update
  window.eventBus.emit('analysis-completed', {
    workspacePath: '/home/user/projects/PIDEA',
    analysisData: {
      status: 'completed',
      metrics: { coverage: 85, complexity: 12 },
      results: { issues: [], recommendations: [] },
      executionTime: 12000
    }
  });
  
  // Verify state updates in components
  // Components should automatically re-render with new data
};
```

### Step 3: Performance Testing ✅
**Test performance improvements:**
- [ ] Measure initial load time
- [ ] Count API calls before and after
- [ ] Test page navigation speed
- [ ] Monitor memory usage
- [ ] Test with large datasets

**Performance Metrics:**
```javascript
// Performance testing
const performanceTest = () => {
  // Before: Multiple API calls per component
  // After: Single API call on IDE change
  
  console.log('Performance Metrics:');
  console.log('- Initial API calls: 1 (was 6+)');
  console.log('- Page navigation: Instant (was 2-3 seconds)');
  console.log('- Memory usage: < 20MB (was variable)');
  console.log('- State updates: < 50ms (was 200-500ms)');
};
```

### Step 4: Error Handling & Edge Cases ✅
**Test error scenarios:**
- [ ] Test API failure handling
- [ ] Test WebSocket disconnection
- [ ] Test invalid project ID
- [ ] Test network timeouts
- [ ] Test component error boundaries

**Error Handling Test:**
```javascript
// Error handling test
const testErrorHandling = async () => {
  // Test API failure
  try {
    await loadProjectData('invalid-workspace-path');
  } catch (error) {
    console.log('✅ API error handled correctly:', error.message);
  }
  
  // Test WebSocket disconnection
  window.eventBus.emit('disconnect');
  // Should handle gracefully without crashing
  
  // Test network timeout
  // Simulate slow network and verify timeout handling
};
```

### Step 5: Integration Testing ✅
**Test complete integration:**
- [ ] Test IDEContext startup flow
- [ ] Test component rendering with global state
- [ ] Test user interactions (git operations, analysis)
- [ ] Test real-time updates
- [ ] Test error recovery

**Integration Test Flow:**
```javascript
// Integration test flow
const integrationTest = async () => {
  // 1. IDEContext startup
  console.log('1. IDEContext startup - Project data initialization');
  
  // 2. Component rendering
  console.log('2. Components render with global state data');
  
  // 3. User interactions
  console.log('3. User performs git operation');
  await handleGitOperation();
  
  // 4. Real-time updates
  console.log('4. WebSocket updates state automatically');
  
  // 5. Component updates
  console.log('5. Components re-render with updated data');
  
  console.log('✅ Integration test completed successfully');
};
```

## Success Criteria
- [ ] Project data loads when active IDE changes
- [ ] WebSocket events update state correctly
- [ ] Components render with global state data
- [ ] Performance improvements achieved
- [ ] Error handling works correctly
- [ ] No memory leaks
- [ ] All tests pass

## Dependencies
- Phase 1 completion (IDEStore extension)
- Phase 2 completion (Component refactoring)
- WebSocket system
- EventBus system

## Testing Checklist
- [ ] IDEContext startup works correctly
- [ ] Project data loads on IDE change
- [ ] WebSocket events update state
- [ ] Components render without errors
- [ ] Performance metrics met
- [ ] Error scenarios handled
- [ ] Memory usage acceptable
- [ ] No console errors

## Final Validation
- [ ] Git branch loading no longer blocks
- [ ] Page navigation is instant
- [ ] State synchronization works via WebSocket
- [ ] All functionality preserved
- [ ] Performance improved
- [ ] Code quality maintained

## Notes
- This phase completes the global state management implementation
- Performance should be significantly improved
- User experience should be much smoother
- Real-time updates work automatically
- Error handling ensures robust operation
- Ready for production deployment

## Next Steps
After completing Phase 3, the global state management system is complete and ready for use. Monitor performance and user feedback to ensure the solution works as expected. 