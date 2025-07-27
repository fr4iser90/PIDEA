# Global State Management - Phase 4: Integration & Testing

**Phase:** 4 of 4
**Status:** Planning
**Duration:** 2 hours
**Priority:** High

## Phase 4 Goals
- Test session data loading
- Test WebSocket updates
- Test component state updates
- Performance testing

## Implementation Steps

### Step 1: Backend Integration Testing ✅
**Test session data loading and persistence:**
- [ ] Test file: `tests/integration/ProjectSession.test.js`
- [ ] Database session operations
- [ ] API endpoint functionality
- [ ] Session data validation
- [ ] Error handling scenarios

**Integration Test Structure:**
```javascript
describe('Project Session Integration', () => {
  let sessionStateService;
  let projectRepository;
  let webSocketManager;

  beforeEach(async () => {
    // Setup test environment
    sessionStateService = new SessionStateService({
      projectRepository,
      webSocketManager,
      logger
    });
  });

  describe('Session Data Loading', () => {
    it('should load complete session data for project', async () => {
      const sessionData = await sessionStateService.loadSessionData('me', 'pidea');
      
      expect(sessionData).toHaveProperty('project');
      expect(sessionData).toHaveProperty('git');
      expect(sessionData).toHaveProperty('ide');
      expect(sessionData).toHaveProperty('analysis');
    });

    it('should handle missing project gracefully', async () => {
      await expect(
        sessionStateService.loadSessionData('me', 'nonexistent')
      ).rejects.toThrow('Project not found');
    });
  });

  describe('Session Data Updates', () => {
    it('should update git status via WebSocket', async () => {
      // Test WebSocket event handling
    });

    it('should persist session data to database', async () => {
      // Test database persistence
    });
  });
});
```

### Step 2: Frontend Store Testing ✅
**Test ProjectSessionStore functionality:**
- [ ] Test file: `tests/unit/stores/ProjectSessionStore.test.js`
- [ ] Store state management
- [ ] Selector functions
- [ ] WebSocket event handling
- [ ] Error handling

**Store Test Structure:**
```javascript
import { renderHook, act } from '@testing-library/react';
import useProjectSessionStore from '@/infrastructure/stores/ProjectSessionStore.jsx';

describe('ProjectSessionStore', () => {
  beforeEach(() => {
    // Clear store state
    useProjectSessionStore.getState().clearSession();
  });

  describe('Session Loading', () => {
    it('should load session data successfully', async () => {
      const { result } = renderHook(() => useProjectSessionStore());
      
      await act(async () => {
        await result.current.loadSession('pidea');
      });
      
      expect(result.current.sessionData).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading errors', async () => {
      // Mock API failure
      const { result } = renderHook(() => useProjectSessionStore());
      
      await act(async () => {
        await result.current.loadSession('invalid');
      });
      
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('should return correct git status', () => {
      const { result } = renderHook(() => useProjectSessionStore());
      
      // Set mock session data
      act(() => {
        result.current.sessionData = {
          git: { currentBranch: 'main', status: 'clean' }
        };
      });
      
      expect(result.current.getCurrentBranch()).toBe('main');
      expect(result.current.getGitStatus()).toEqual({ currentBranch: 'main', status: 'clean' });
    });
  });
});
```

### Step 3: Component Integration Testing ✅
**Test component behavior with global state:**
- [ ] Test file: `tests/integration/components/GlobalState.test.jsx`
- [ ] GitManagementComponent with global state
- [ ] AnalysisDataViewer with global state
- [ ] Footer with global state
- [ ] Component interactions

**Component Test Structure:**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { useProjectSessionStore } from '@/infrastructure/stores/ProjectSessionStore.jsx';
import GitManagementComponent from '@/presentation/components/git/main/GitManagementComponent.jsx';

// Mock the store
jest.mock('@/infrastructure/stores/ProjectSessionStore.jsx');

describe('GitManagementComponent with Global State', () => {
  beforeEach(() => {
    // Setup mock store state
    useProjectSessionStore.mockImplementation(() => ({
      getGitStatus: () => ({ currentBranch: 'main', status: 'clean' }),
      getCurrentBranch: () => 'main',
      getBranches: () => ['main', 'feature/test'],
      getWorkspacePath: () => '/test/path',
      isLoading: false,
      error: null
    }));
  });

  it('should render git status from global state', () => {
    render(<GitManagementComponent activePort={9222} />);
    
    expect(screen.getByText('branch: main')).toBeInTheDocument();
    expect(screen.getByText('Status: clean')).toBeInTheDocument();
  });

  it('should not make API calls on mount', () => {
    const apiCallSpy = jest.spyOn(require('@/infrastructure/repositories/APIChatRepository.jsx'), 'apiCall');
    
    render(<GitManagementComponent activePort={9222} />);
    
    expect(apiCallSpy).not.toHaveBeenCalled();
  });
});
```

### Step 4: WebSocket Integration Testing ✅
**Test real-time updates:**
- [ ] Test file: `tests/integration/websocket/SessionWebSocket.test.js`
- [ ] WebSocket event handling
- [ ] Store state synchronization
- [ ] Component re-rendering
- [ ] Connection management

**WebSocket Test Structure:**
```javascript
import { WebSocket } from 'ws';
import useProjectSessionStore from '@/infrastructure/stores/ProjectSessionStore.jsx';

describe('Session WebSocket Integration', () => {
  let ws;
  let store;

  beforeEach(() => {
    // Setup WebSocket connection
    ws = new WebSocket('ws://localhost:3000/ws');
    store = useProjectSessionStore.getState();
  });

  afterEach(() => {
    ws.close();
  });

  it('should update store on git status change', async () => {
    // Send git status change event
    ws.send(JSON.stringify({
      type: 'git-status-changed',
      data: {
        projectId: 'pidea',
        gitStatus: { currentBranch: 'feature/new', status: 'dirty' }
      }
    }));

    await waitFor(() => {
      const gitStatus = store.getGitStatus();
      expect(gitStatus.currentBranch).toBe('feature/new');
      expect(gitStatus.status).toBe('dirty');
    });
  });

  it('should update store on session update', async () => {
    // Send session update event
    ws.send(JSON.stringify({
      type: 'session-updated',
      data: {
        projectId: 'pidea',
        updates: {
          analysis: { lastRun: '2024-12-21T10:00:00Z' }
        }
      }
    }));

    await waitFor(() => {
      const analysisStatus = store.getAnalysisStatus();
      expect(analysisStatus.lastRun).toBe('2024-12-21T10:00:00Z');
    });
  });
});
```

### Step 5: Performance Testing ✅
**Test performance improvements:**
- [ ] Test file: `tests/performance/GlobalStatePerformance.test.js`
- [ ] Page navigation speed
- [ ] Component render performance
- [ ] Memory usage
- [ ] API call reduction

**Performance Test Structure:**
```javascript
describe('Global State Performance', () => {
  it('should reduce API calls on page navigation', async () => {
    const apiCallSpy = jest.spyOn(require('@/infrastructure/repositories/APIChatRepository.jsx'), 'apiCall');
    
    // Navigate between views multiple times
    for (let i = 0; i < 5; i++) {
      await navigateToView('git');
      await navigateToView('analysis');
      await navigateToView('chat');
    }
    
    // Should have minimal API calls (only for operations, not data loading)
    expect(apiCallSpy).toHaveBeenCalledTimes(0);
  });

  it('should render components faster with global state', async () => {
    const startTime = performance.now();
    
    render(<GitManagementComponent activePort={9222} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should maintain consistent memory usage', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      await loadSession('pidea');
      await updateSession('pidea', { git: { currentBranch: `branch-${i}` } });
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (< 1MB)
    expect(memoryIncrease).toBeLessThan(1024 * 1024);
  });
});
```

### Step 6: End-to-End Testing ✅
**Test complete user flows:**
- [ ] Test file: `tests/e2e/GlobalState.test.js`
- [ ] Login and session loading
- [ ] Page navigation without blocking
- [ ] Real-time updates
- [ ] Error scenarios

**E2E Test Structure:**
```javascript
describe('Global State E2E', () => {
  beforeEach(async () => {
    await page.goto('http://localhost:4000');
    await login('test@example.com', 'password');
  });

  it('should load session data on login', async () => {
    // Wait for session to load
    await page.waitForSelector('[data-testid="git-branch"]');
    
    const branchText = await page.textContent('[data-testid="git-branch"]');
    expect(branchText).toContain('main');
  });

  it('should navigate instantly between views', async () => {
    const startTime = Date.now();
    
    await page.click('[data-testid="nav-git"]');
    await page.waitForSelector('[data-testid="git-management"]');
    
    await page.click('[data-testid="nav-analysis"]');
    await page.waitForSelector('[data-testid="analysis-viewer"]');
    
    const endTime = Date.now();
    const navigationTime = endTime - startTime;
    
    // Navigation should be instant (< 500ms)
    expect(navigationTime).toBeLessThan(500);
  });

  it('should update git status in real-time', async () => {
    // Trigger git status change via WebSocket
    await page.evaluate(() => {
      window.webSocketService.send({
        type: 'git-status-changed',
        data: {
          projectId: 'pidea',
          gitStatus: { currentBranch: 'feature/test', status: 'dirty' }
        }
      });
    });
    
    await page.waitForFunction(() => {
      const branchElement = document.querySelector('[data-testid="git-branch"]');
      return branchElement && branchElement.textContent.includes('feature/test');
    });
    
    const branchText = await page.textContent('[data-testid="git-branch"]');
    expect(branchText).toContain('feature/test');
  });
});
```

## Dependencies
- Requires: Phase 3 completion (component refactoring)
- Blocks: Task completion

## Success Criteria
- [ ] All integration tests pass
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Performance requirements met
- [ ] WebSocket updates work correctly
- [ ] Components render without API calls
- [ ] Error handling works properly

## Testing Requirements
- [ ] Backend integration tests
- [ ] Frontend store tests
- [ ] Component integration tests
- [ ] WebSocket integration tests
- [ ] Performance tests
- [ ] End-to-end tests

## Risk Mitigation
- [ ] Comprehensive test coverage
- [ ] Performance monitoring
- [ ] Error scenario testing
- [ ] User experience validation 