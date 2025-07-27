/**
 * IDEStore Tests
 * Tests for the extended IDEStore with project data functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';

// Mock dependencies
vi.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: vi.fn()
}));

vi.mock('@/infrastructure/stores/AuthStore.jsx', () => ({
  default: {
    getState: vi.fn(() => ({ isAuthenticated: true }))
  }
}));

describe('IDEStore Extension', () => {
  let store;

  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useIDEStore.getState().reset();
    });
    store = useIDEStore.getState();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    act(() => {
      useIDEStore.getState().reset();
    });
  });

  describe('Project Data Loading', () => {
    it('should load project data for a workspace', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      const mockGitData = {
        success: true,
        data: {
          status: {
            currentBranch: 'main',
            modified: ['file1.js'],
            added: ['file2.js'],
            deleted: []
          }
        }
      };
      const mockAnalysisData = {
        success: true,
        data: {
          status: {
            isRunning: false,
            progress: 100
          }
        }
      };

      apiCall
        .mockResolvedValueOnce(mockGitData)
        .mockResolvedValueOnce(mockAnalysisData);

      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath]).toBeDefined();
      expect(state.projectData.analysis[workspacePath]).toBeDefined();
      expect(state.projectData.git[workspacePath].status.currentBranch).toBe('main');
      expect(state.projectData.analysis[workspacePath].status.isRunning).toBe(false);
    });

    it('should handle API failures gracefully', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      apiCall
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

    it('should not load data for invalid workspace path', async () => {
      await act(async () => {
        await store.loadProjectData(null);
      });

      const state = useIDEStore.getState();
      expect(Object.keys(state.projectData.git)).toHaveLength(0);
      expect(Object.keys(state.projectData.analysis)).toHaveLength(0);
    });
  });

  describe('WebSocket Event Handling', () => {
    it('should handle git status updates', () => {
      const eventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };

      act(() => {
        store.setupWebSocketListeners(eventBus);
      });

      // Simulate git status update event
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

    it('should handle git branch changes', () => {
      const eventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };

      act(() => {
        store.setupWebSocketListeners(eventBus);
      });

      const workspacePath = '/home/user/projects/PIDEA';
      const newBranch = 'develop';

      // Find and call the git-branch-changed listener
      const onCall = eventBus.on.mock.calls.find(call => call[0] === 'git-branch-changed');
      expect(onCall).toBeDefined();
      
      act(() => {
        onCall[1]({ workspacePath, newBranch });
      });

      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath].status.currentBranch).toBe('develop');
    });

    it('should handle analysis completion', () => {
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

    it('should handle analysis progress updates', () => {
      const eventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };

      act(() => {
        store.setupWebSocketListeners(eventBus);
      });

      const workspacePath = '/home/user/projects/PIDEA';
      const progress = 75;
      const currentStep = 'Analyzing dependencies';

      // Find and call the analysis-progress listener
      const onCall = eventBus.on.mock.calls.find(call => call[0] === 'analysis-progress');
      expect(onCall).toBeDefined();
      
      act(() => {
        onCall[1]({ workspacePath, progress, currentStep });
      });

      const state = useIDEStore.getState();
      expect(state.projectData.analysis[workspacePath].status.progress).toBe(75);
      expect(state.projectData.analysis[workspacePath].status.currentStep).toBe('Analyzing dependencies');
    });

    it('should cleanup WebSocket listeners', () => {
      const eventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };

      act(() => {
        store.setupWebSocketListeners(eventBus);
        store.cleanupWebSocketListeners(eventBus);
      });

      expect(eventBus.off).toHaveBeenCalledWith('git-status-updated');
      expect(eventBus.off).toHaveBeenCalledWith('git-branch-changed');
      expect(eventBus.off).toHaveBeenCalledWith('analysis-completed');
      expect(eventBus.off).toHaveBeenCalledWith('analysis-progress');
    });
  });

  describe('State Persistence', () => {
    it('should persist project data', () => {
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
    });

    it('should reset project data on reset', () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      act(() => {
        store.projectData.git[workspacePath] = { status: { currentBranch: 'main' } };
        store.projectData.analysis[workspacePath] = { status: { isRunning: false } };
      });

      act(() => {
        store.reset();
      });

      const state = useIDEStore.getState();
      expect(Object.keys(state.projectData.git)).toHaveLength(0);
      expect(Object.keys(state.projectData.analysis)).toHaveLength(0);
    });
  });

  describe('Multiple Workspace Support', () => {
    it('should handle multiple workspaces independently', async () => {
      const workspace1 = '/home/user/projects/PIDEA';
      const workspace2 = '/home/user/projects/OtherProject';

      const mockGitData1 = {
        success: true,
        data: { status: { currentBranch: 'main' } }
      };
      const mockAnalysisData1 = {
        success: true,
        data: { status: { isRunning: false } }
      };
      const mockGitData2 = {
        success: true,
        data: { status: { currentBranch: 'develop' } }
      };
      const mockAnalysisData2 = {
        success: true,
        data: { status: { isRunning: true } }
      };

      apiCall
        .mockResolvedValueOnce(mockGitData1)
        .mockResolvedValueOnce(mockAnalysisData1)
        .mockResolvedValueOnce(mockGitData2)
        .mockResolvedValueOnce(mockAnalysisData2);

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

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const workspacePath = '/home/user/projects/PIDEA';
      
      apiCall.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      // Should not throw error, just log it
      const state = useIDEStore.getState();
      expect(state.projectData.git[workspacePath]).toBeDefined();
      expect(state.projectData.analysis[workspacePath]).toBeDefined();
    });

    it('should handle invalid project ID gracefully', async () => {
      const workspacePath = '/'; // Invalid path that results in null projectId
      
      await act(async () => {
        await store.loadProjectData(workspacePath);
      });

      // Should not make API calls for invalid project ID
      expect(apiCall).not.toHaveBeenCalled();
    });
  });
}); 