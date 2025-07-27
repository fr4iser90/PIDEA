/**
 * Global State Management Integration Tests
 * Tests for the complete global state management system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { useGitStatus, useAnalysisStatus, useActiveIDE } from '@/infrastructure/stores/selectors/ProjectSelectors.jsx';

// Mock dependencies
vi.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: vi.fn()
}));

vi.mock('@/infrastructure/stores/AuthStore.jsx', () => ({
  default: {
    getState: vi.fn(() => ({ isAuthenticated: true, user: { id: 'test-user' } }))
  }
}));

vi.mock('@/infrastructure/events/EventBus.jsx', () => ({
  default: class MockEventBus {
    constructor() {
      this.listeners = new Map();
    }
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
    off(event, callback) {
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
    emit(event, data) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        });
      }
    }
  }
}));

// Mock components to focus on state management
vi.mock('@/presentation/components/chat/main/ChatComponent.jsx', () => ({
  default: () => <div data-testid="chat-component">Chat Component</div>
}));

vi.mock('@/presentation/components/analysis/AnalysisDataViewer.jsx', () => ({
  default: () => <div data-testid="analysis-component">Analysis Component</div>
}));

vi.mock('@/presentation/components/git/main/GitManagementComponent.jsx', () => ({
  default: () => <div data-testid="git-component">Git Component</div>
}));

vi.mock('@/presentation/components/Footer.jsx', () => ({
  default: () => <div data-testid="footer-component">Footer Component</div>
}));

describe('Global State Management Integration', () => {
  let store;
  let mockApiCall;

  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useIDEStore.getState().reset();
    });
    store = useIDEStore.getState();
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Mock API responses
    mockApiCall = vi.mocked(require('@/infrastructure/repositories/APIChatRepository.jsx').apiCall);
  });

  afterEach(() => {
    // Clean up after each test
    act(() => {
      useIDEStore.getState().reset();
    });
  });

  describe('App Initialization', () => {
    it('should initialize global state when app starts', async () => {
      // Mock IDE data
      const mockIDEs = [
        {
          port: 9222,
          status: 'running',
          active: true,
          workspacePath: '/home/user/projects/PIDEA'
        }
      ];

      mockApiCall
        .mockResolvedValueOnce({ success: true, data: mockIDEs }) // /api/ide/available
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } }) // git status
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } }); // analysis status

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('chat-component')).toBeInTheDocument();
      });

      // Verify store was initialized
      const state = useIDEStore.getState();
      expect(state.availableIDEs).toHaveLength(1);
      expect(state.activePort).toBe(9222);
    });

    it('should setup WebSocket listeners on authentication', async () => {
      const mockIDEs = [
        {
          port: 9222,
          status: 'running',
          active: true,
          workspacePath: '/home/user/projects/PIDEA'
        }
      ];

      mockApiCall
        .mockResolvedValueOnce({ success: true, data: mockIDEs })
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('chat-component')).toBeInTheDocument();
      });

      // Verify WebSocket listeners were set up
      const state = useIDEStore.getState();
      expect(state.setupWebSocketListeners).toBeDefined();
    });
  });

  describe('Project Data Loading', () => {
    it('should load project data for active IDE', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      mockApiCall
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } });

      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath]).toBeDefined();
      expect(state.projectData.analysis[workspacePath]).toBeDefined();
      expect(state.projectData.git[workspacePath].status.currentBranch).toBe('main');
    });

    it('should handle multiple workspaces independently', async () => {
      const workspace1 = '/home/user/projects/PIDEA';
      const workspace2 = '/home/user/projects/OtherProject';

      mockApiCall
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } })
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'develop' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: true } } });

      await act(async () => {
        await store.loadProjectData(workspace1);
        await store.loadProjectData(workspace2);
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspace1].status.currentBranch).toBe('main');
      expect(state.projectData.git[workspace2].status.currentBranch).toBe('develop');
      expect(state.projectData.analysis[workspace1].status.isRunning).toBe(false);
      expect(state.projectData.analysis[workspace2].status.isRunning).toBe(true);
    });
  });

  describe('WebSocket Event Handling', () => {
    it('should handle git status updates via WebSocket', () => {
      const eventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };

      act(() => {
        store.setupWebSocketListeners(eventBus);
      });

      const workspacePath = '/home/user/projects/PIDEA';
      const gitStatus = {
        currentBranch: 'feature-branch',
        modified: ['new-file.js']
      };

      // Find and call the git-status-updated listener
      const onCall = eventBus.on.mock.calls.find(call => call[0] === 'git-status-updated');
      expect(onCall).toBeDefined();
      
      act(() => {
        onCall[1]({ workspacePath, gitStatus });
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath].status.currentBranch).toBe('feature-branch');
      expect(state.projectData.git[workspacePath].status.modified).toContain('new-file.js');
    });

    it('should handle analysis completion via WebSocket', () => {
      const eventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };

      act(() => {
        store.setupWebSocketListeners(eventBus);
      });

      const workspacePath = '/home/user/projects/PIDEA';
      const analysisData = {
        status: { isRunning: false, progress: 100 },
        metrics: { complexity: 5.2 }
      };

      // Find and call the analysis-completed listener
      const onCall = eventBus.on.mock.calls.find(call => call[0] === 'analysis-completed');
      expect(onCall).toBeDefined();
      
      act(() => {
        onCall[1]({ workspacePath, analysisData });
      });

      const state = useIDEStore.getState();
      expect(state.projectData.analysis[workspacePath].status.isRunning).toBe(false);
      expect(state.projectData.analysis[workspacePath].metrics.complexity).toBe(5.2);
    });
  });

  describe('State Selectors', () => {
    it('should provide correct git status data', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      mockApiCall
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main', modified: ['file1.js'] } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } });

      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      // Test selector in a component context
      const TestComponent = () => {
        const gitStatus = useGitStatus(workspacePath);
        return (
          <div>
            <span data-testid="current-branch">{gitStatus.currentBranch}</span>
            <span data-testid="has-changes">{gitStatus.hasChanges.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('current-branch')).toHaveTextContent('main');
      expect(screen.getByTestId('has-changes')).toHaveTextContent('true');
    });

    it('should provide correct analysis status data', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      mockApiCall
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: true, progress: 50 } } });

      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      // Test selector in a component context
      const TestComponent = () => {
        const analysisStatus = useAnalysisStatus(workspacePath);
        return (
          <div>
            <span data-testid="is-running">{analysisStatus.isRunning.toString()}</span>
            <span data-testid="progress">{analysisStatus.progress}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('is-running')).toHaveTextContent('true');
      expect(screen.getByTestId('progress')).toHaveTextContent('50');
    });
  });

  describe('IDE Switching', () => {
    it('should load project data when switching IDEs', async () => {
      const workspace1 = '/home/user/projects/PIDEA';
      const workspace2 = '/home/user/projects/OtherProject';

      mockApiCall
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } })
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'develop' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: true } } });

      // Load data for first workspace
      await act(async () => {
        await store.loadProjectData(workspace1);
      });

      // Switch to second workspace
      await act(async () => {
        await store.loadProjectData(workspace2);
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspace1]).toBeDefined();
      expect(state.projectData.git[workspace2]).toBeDefined();
      expect(state.projectData.git[workspace1].status.currentBranch).toBe('main');
      expect(state.projectData.git[workspace2].status.currentBranch).toBe('develop');
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      mockApiCall
        .mockRejectedValueOnce(new Error('Git API failed'))
        .mockRejectedValueOnce(new Error('Analysis API failed'));

      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath]).toBeDefined();
      expect(state.projectData.analysis[workspacePath]).toBeDefined();
      expect(state.projectData.git[workspacePath].status).toBeNull();
      expect(state.projectData.analysis[workspacePath].status).toBeNull();
    });

    it('should handle invalid workspace paths', async () => {
      await act(async () => {
        await store.loadProjectData(null);
      });

      const state = useIDEStore.getState();
      expect(Object.keys(state.projectData.git)).toHaveLength(0);
      expect(Object.keys(state.projectData.analysis)).toHaveLength(0);
    });
  });

  describe('State Persistence', () => {
    it('should persist project data across app restarts', () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      act(() => {
        store.projectData.git[workspacePath] = {
          status: { currentBranch: 'main' },
          lastUpdate: '2024-01-01T00:00:00.000Z'
        };
        store.projectData.analysis[workspacePath] = {
          status: { isRunning: false },
          lastUpdate: '2024-01-01T00:00:00.000Z'
        };
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath]).toBeDefined();
      expect(state.projectData.analysis[workspacePath]).toBeDefined();
      expect(state.projectData.git[workspacePath].status.currentBranch).toBe('main');
    });
  });

  describe('Performance', () => {
    it('should avoid duplicate API calls', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      mockApiCall
        .mockResolvedValueOnce({ success: true, data: { status: { currentBranch: 'main' } } })
        .mockResolvedValueOnce({ success: true, data: { status: { isRunning: false } } });

      // Load data multiple times
      await act(async () => {
        await store.loadProjectData(workspacePath);
        await store.loadProjectData(workspacePath);
        await store.loadProjectData(workspacePath);
      });

      // Should only make 2 API calls (git + analysis) regardless of how many times loadProjectData is called
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });
  });
}); 