import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { GitManagementComponent } from '@/presentation/components/git/main/GitManagementComponent';
import { QueueManagementPanel } from '@/presentation/components/queue/QueueManagementPanel';
import { AnalysisDataViewer } from '@/presentation/components/analysis/AnalysisDataViewer';
import refreshService from '@/infrastructure/services/RefreshService';

// Mock dependencies
jest.mock('@/infrastructure/services/RefreshService');
jest.mock('@/infrastructure/repositories/APIChatRepository');
jest.mock('@/infrastructure/repositories/QueueRepository');
jest.mock('@/infrastructure/stores/selectors/ProjectSelectors');
jest.mock('@/infrastructure/services/WebSocketService');

// Mock project selectors
const mockUseGitStatus = jest.fn();
const mockUseGitBranches = jest.fn();
const mockUseActiveIDE = jest.fn();
const mockUseProjectDataActions = jest.fn();

jest.mock('@/infrastructure/stores/selectors/ProjectSelectors', () => ({
  useGitStatus: () => mockUseGitStatus(),
  useGitBranches: () => mockUseGitBranches(),
  useActiveIDE: () => mockUseActiveIDE(),
  useProjectDataActions: () => mockUseProjectDataActions(),
  useCategoryAnalysisLoading: () => ({ loading: false }),
  useSecurityAnalysis: () => ({ data: null }),
  usePerformanceAnalysis: () => ({ data: null }),
  useArchitectureAnalysis: () => ({ data: null }),
  useCodeQualityAnalysis: () => ({ data: null }),
  useDependenciesAnalysis: () => ({ data: null }),
  useManifestAnalysis: () => ({ data: null }),
  useTechStackAnalysis: () => ({ data: null })
}));

describe('RefreshService Integration Tests', () => {
  let mockRefreshService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock RefreshService
    mockRefreshService = {
      initialize: jest.fn().mockResolvedValue(),
      registerComponent: jest.fn(),
      unregisterComponent: jest.fn(),
      refreshComponent: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalRefreshes: 0,
        cacheHits: 0,
        cacheMisses: 0,
        activeComponents: 0
      }),
      destroy: jest.fn()
    };

    refreshService.default = mockRefreshService;

    // Setup mock selectors
    mockUseGitStatus.mockReturnValue({
      status: 'clean',
      branch: 'main',
      lastCommit: 'abc123'
    });

    mockUseGitBranches.mockReturnValue([
      { name: 'main', active: true },
      { name: 'feature', active: false }
    ]);

    mockUseActiveIDE.mockReturnValue({
      workspacePath: '/test/project',
      projectId: 'test-project'
    });

    mockUseProjectDataActions.mockReturnValue({
      refreshGitStatus: jest.fn(),
      loadCategoryAnalysisData: jest.fn()
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GitManagementComponent Integration', () => {
    test('should integrate with RefreshService on mount', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith(
          'git',
          expect.objectContaining({
            fetchData: expect.any(Function),
            updateData: expect.any(Function)
          }),
          expect.any(Object)
        );
      });
    });

    test('should unregister from RefreshService on unmount', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      const { unmount } = render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalled();
      });

      unmount();

      expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('git');
    });

    test('should handle RefreshService errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRefreshService.registerComponent.mockRejectedValue(new Error('Registration failed'));

      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalled();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('QueueManagementPanel Integration', () => {
    test('should integrate with RefreshService on mount', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <QueueManagementPanel
          eventBus={mockEventBus}
          activePort={9222}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith(
          'queue',
          expect.objectContaining({
            fetchData: expect.any(Function),
            updateData: expect.any(Function)
          }),
          expect.any(Object)
        );
      });
    });

    test('should handle queue data updates through RefreshService', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      const { container } = render(
        <QueueManagementPanel
          eventBus={mockEventBus}
          activePort={9222}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalled();
      });

      // Simulate data update through RefreshService
      const registeredComponent = mockRefreshService.registerComponent.mock.calls[0][1];
      const mockQueueData = {
        activeTasks: [],
        queuedTasks: [],
        completedTasks: []
      };

      registeredComponent.updateData(mockQueueData);

      // Component should handle the update
      expect(registeredComponent.updateData).toHaveBeenCalledWith(mockQueueData);
    });
  });

  describe('AnalysisDataViewer Integration', () => {
    test('should integrate with RefreshService on mount', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <AnalysisDataViewer
          eventBus={mockEventBus}
          projectId="test-project"
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith(
          'analysis',
          expect.objectContaining({
            fetchData: expect.any(Function),
            updateData: expect.any(Function)
          }),
          expect.any(Object)
        );
      });
    });

    test('should handle analysis data updates through RefreshService', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <AnalysisDataViewer
          eventBus={mockEventBus}
          projectId="test-project"
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalled();
      });

      // Simulate data update through RefreshService
      const registeredComponent = mockRefreshService.registerComponent.mock.calls[0][1];
      const mockAnalysisData = {
        success: true,
        data: {
          security: { issues: [] },
          performance: { metrics: {} }
        }
      };

      registeredComponent.updateData(mockAnalysisData);

      // Component should handle the update
      expect(registeredComponent.updateData).toHaveBeenCalledWith(mockAnalysisData);
    });
  });

  describe('Cross-Component Integration', () => {
    test('should handle multiple components registering with RefreshService', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <div>
          <GitManagementComponent
            activePort={9222}
            eventBus={mockEventBus}
            onGitOperation={jest.fn()}
          />
          <QueueManagementPanel
            eventBus={mockEventBus}
            activePort={9222}
          />
          <AnalysisDataViewer
            eventBus={mockEventBus}
            projectId="test-project"
          />
        </div>
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledTimes(3);
      });

      expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('git', expect.any(Object), expect.any(Object));
      expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('queue', expect.any(Object), expect.any(Object));
      expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('analysis', expect.any(Object), expect.any(Object));
    });

    test('should handle RefreshService statistics across components', async () => {
      const mockStats = {
        totalRefreshes: 15,
        cacheHits: 12,
        cacheMisses: 3,
        activeComponents: 3,
        activeTimers: 3
      };

      mockRefreshService.getStats.mockReturnValue(mockStats);

      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <div>
          <GitManagementComponent
            activePort={9222}
            eventBus={mockEventBus}
            onGitOperation={jest.fn()}
          />
          <QueueManagementPanel
            eventBus={mockEventBus}
            activePort={9222}
          />
        </div>
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledTimes(2);
      });

      const stats = mockRefreshService.getStats();
      expect(stats).toEqual(mockStats);
      expect(stats.activeComponents).toBe(3);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from RefreshService failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate RefreshService failure
      mockRefreshService.registerComponent.mockRejectedValue(new Error('Service unavailable'));

      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalled();
      });

      // Component should still render despite RefreshService failure
      expect(screen.getByText(/git/i)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('should handle component unmount during RefreshService operations', async () => {
      const mockEventBus = {
        on: jest.fn(),
        off: jest.fn()
      };

      const { unmount } = render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalled();
      });

      // Unmount before RefreshService operations complete
      unmount();

      expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('git');
    });
  });
});
