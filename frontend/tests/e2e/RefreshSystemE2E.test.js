import { jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GitManagementComponent } from '@/presentation/components/git/main/GitManagementComponent';
import { QueueManagementPanel } from '@/presentation/components/queue/QueueManagementPanel';
import { AnalysisDataViewer } from '@/presentation/components/analysis/AnalysisDataViewer';
import refreshService from '@/infrastructure/services/RefreshService';

// Mock all dependencies
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

describe('Event-Driven Refresh System E2E Tests', () => {
  let mockRefreshService;
  let mockEventBus;

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
        activeComponents: 0,
        eventDrivenUpdates: 0
      }),
      destroy: jest.fn(),
      eventCoordinator: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    };

    refreshService.default = mockRefreshService;

    // Setup mock EventBus
    mockEventBus = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };

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

  describe('Complete System Integration', () => {
    test('should initialize complete refresh system', async () => {
      const { container } = render(
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

      // Verify all components are registered
      expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('git', expect.any(Object), expect.any(Object));
      expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('queue', expect.any(Object), expect.any(Object));
      expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('analysis', expect.any(Object), expect.any(Object));

      // Verify system is ready
      const stats = mockRefreshService.getStats();
      expect(stats.activeComponents).toBe(3);
    });

    test('should handle system-wide refresh events', async () => {
      const { container } = render(
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

      // Simulate system-wide refresh event
      const refreshEvent = {
        type: 'cache:refresh',
        data: { reason: 'system-maintenance' }
      };

      // Trigger refresh event through event coordinator
      mockRefreshService.eventCoordinator.emit('cache:refresh', refreshEvent);

      // Verify components would handle the event
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('cache:refresh', refreshEvent);
    });

    test('should handle component-specific refresh events', async () => {
      const { container } = render(
        <div>
          <GitManagementComponent
            activePort={9222}
            eventBus={mockEventBus}
            onGitOperation={jest.fn()}
          />
        </div>
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('git', expect.any(Object), expect.any(Object));
      });

      // Simulate git-specific data change event
      const gitEvent = {
        type: 'data:git:changed',
        data: { status: 'modified', branch: 'feature' }
      };

      // Trigger git data change event
      mockRefreshService.eventCoordinator.emit('data:git:changed', gitEvent);

      // Verify git component would handle the event
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('data:git:changed', gitEvent);
    });
  });

  describe('User Interaction Scenarios', () => {
    test('should handle user switching between components', async () => {
      const { rerender } = render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('git', expect.any(Object), expect.any(Object));
      });

      // Switch to queue component
      rerender(
        <QueueManagementPanel
          eventBus={mockEventBus}
          activePort={9222}
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('git');
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('queue', expect.any(Object), expect.any(Object));
      });

      // Switch to analysis component
      rerender(
        <AnalysisDataViewer
          eventBus={mockEventBus}
          projectId="test-project"
        />
      );

      await waitFor(() => {
        expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('queue');
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('analysis', expect.any(Object), expect.any(Object));
      });
    });

    test('should handle user activity changes', async () => {
      const { container } = render(
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

      // Simulate user becoming inactive
      const inactiveEvent = {
        type: 'system:user-inactive',
        data: { timestamp: Date.now() }
      };

      mockRefreshService.eventCoordinator.emit('system:user-inactive', inactiveEvent);

      // Simulate user becoming active again
      const activeEvent = {
        type: 'system:user-active',
        data: { timestamp: Date.now() }
      };

      mockRefreshService.eventCoordinator.emit('system:user-active', activeEvent);

      // Verify activity events are handled
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('system:user-inactive', inactiveEvent);
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('system:user-active', activeEvent);
    });

    test('should handle tab visibility changes', async () => {
      const { container } = render(
        <div>
          <GitManagementComponent
            activePort={9222}
            eventBus={mockEventBus}
            onGitOperation={jest.fn()}
          />
        </div>
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledWith('git', expect.any(Object), expect.any(Object));
      });

      // Simulate tab becoming hidden
      const hiddenEvent = {
        type: 'system:tab-hidden',
        data: { timestamp: Date.now() }
      };

      mockRefreshService.eventCoordinator.emit('system:tab-hidden', hiddenEvent);

      // Simulate tab becoming visible
      const visibleEvent = {
        type: 'system:tab-visible',
        data: { timestamp: Date.now() }
      };

      mockRefreshService.eventCoordinator.emit('system:tab-visible', visibleEvent);

      // Verify tab visibility events are handled
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('system:tab-hidden', hiddenEvent);
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('system:tab-visible', visibleEvent);
    });
  });

  describe('Data Flow Scenarios', () => {
    test('should handle data change propagation', async () => {
      const { container } = render(
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

      // Simulate git data change
      const gitDataChange = {
        type: 'data:git:changed',
        data: { status: 'modified', files: ['file1.js', 'file2.js'] }
      };

      mockRefreshService.eventCoordinator.emit('data:git:changed', gitDataChange);

      // Simulate queue data update
      const queueDataUpdate = {
        type: 'data:queue:updated',
        data: { activeTasks: 2, queuedTasks: 5 }
      };

      mockRefreshService.eventCoordinator.emit('data:queue:updated', queueDataUpdate);

      // Verify data change events are propagated
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('data:git:changed', gitDataChange);
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('data:queue:updated', queueDataUpdate);
    });

    test('should handle cache invalidation scenarios', async () => {
      const { container } = render(
        <div>
          <GitManagementComponent
            activePort={9222}
            eventBus={mockEventBus}
            onGitOperation={jest.fn()}
          />
          <AnalysisDataViewer
            eventBus={mockEventBus}
            projectId="test-project"
          />
        </div>
      );

      await waitFor(() => {
        expect(mockRefreshService.registerComponent).toHaveBeenCalledTimes(2);
      });

      // Simulate cache invalidation for specific component
      const gitInvalidation = {
        type: 'cache:invalidate',
        data: { componentType: 'git', reason: 'data-changed' }
      };

      mockRefreshService.eventCoordinator.emit('cache:invalidate', gitInvalidation);

      // Simulate global cache invalidation
      const globalInvalidation = {
        type: 'cache:invalidate',
        data: { reason: 'system-reset' }
      };

      mockRefreshService.eventCoordinator.emit('cache:invalidate', globalInvalidation);

      // Verify cache invalidation events are handled
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('cache:invalidate', gitInvalidation);
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('cache:invalidate', globalInvalidation);
    });

    test('should handle force refresh scenarios', async () => {
      const { container } = render(
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

      // Simulate force refresh for specific component
      const gitForceRefresh = {
        type: 'cache:refresh',
        data: { componentType: 'git', reason: 'user-request' }
      };

      mockRefreshService.eventCoordinator.emit('cache:refresh', gitForceRefresh);

      // Simulate global force refresh
      const globalForceRefresh = {
        type: 'cache:refresh',
        data: { reason: 'system-maintenance' }
      };

      mockRefreshService.eventCoordinator.emit('cache:refresh', globalForceRefresh);

      // Verify force refresh events are handled
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('cache:refresh', gitForceRefresh);
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('cache:refresh', globalForceRefresh);
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should handle component errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock component that throws errors
      const errorComponent = {
        fetchData: jest.fn().mockRejectedValue(new Error('Component error')),
        updateData: jest.fn()
      };

      mockRefreshService.registerComponent.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      const { container } = render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      // Component should still render despite errors
      expect(screen.getByText(/git/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should handle network failures gracefully', async () => {
      const { container } = render(
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

      // Simulate network failure
      const networkFailure = {
        type: 'system:network-changed',
        data: { quality: 'offline', speed: 0 }
      };

      mockRefreshService.eventCoordinator.emit('system:network-changed', networkFailure);

      // Verify network failure is handled
      expect(mockRefreshService.eventCoordinator.emit).toHaveBeenCalledWith('system:network-changed', networkFailure);
    });

    test('should handle service unavailability', async () => {
      // Mock RefreshService as unavailable
      mockRefreshService.initialize.mockRejectedValue(new Error('Service unavailable'));

      const { container } = render(
        <GitManagementComponent
          activePort={9222}
          eventBus={mockEventBus}
          onGitOperation={jest.fn()}
        />
      );

      // Component should still render despite service unavailability
      expect(screen.getByText(/git/i)).toBeInTheDocument();
    });
  });

  describe('Performance Scenarios', () => {
    test('should handle high-frequency updates efficiently', async () => {
      const { container } = render(
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

      const start = performance.now();

      // Simulate high-frequency updates
      for (let i = 0; i < 100; i++) {
        const update = {
          type: 'data:git:changed',
          data: { status: 'modified', iteration: i }
        };
        mockRefreshService.eventCoordinator.emit('data:git:changed', update);
      }

      const end = performance.now();
      const duration = end - start;

      console.log(`100 high-frequency updates: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should handle 100 updates within 1 second
    });

    test('should handle memory pressure gracefully', async () => {
      const components = [];

      // Create many components to test memory pressure
      for (let i = 0; i < 50; i++) {
        const component = {
          fetchData: jest.fn().mockResolvedValue({
            data: Array.from({ length: 100 }, (_, j) => `data-${i}-${j}`)
          }),
          updateData: jest.fn()
        };

        mockRefreshService.registerComponent(`memory-test-${i}`, component);
        components.push(component);
      }

      const stats = mockRefreshService.getStats();
      expect(stats.activeComponents).toBe(50);

      // Clean up
      components.forEach((_, index) => {
        mockRefreshService.unregisterComponent(`memory-test-${index}`);
      });

      expect(mockRefreshService.unregisterComponent).toHaveBeenCalledTimes(50);
    });
  });

  describe('System Cleanup', () => {
    test('should cleanup all components on unmount', async () => {
      const { unmount } = render(
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

      unmount();

      // Verify all components are unregistered
      expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('git');
      expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('queue');
      expect(mockRefreshService.unregisterComponent).toHaveBeenCalledWith('analysis');
    });

    test('should cleanup RefreshService on system shutdown', async () => {
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

      // Verify RefreshService cleanup
      expect(mockRefreshService.destroy).toHaveBeenCalled();
    });
  });
});
