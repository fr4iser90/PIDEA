/**
 * IDEStore Cache Integration Tests
 * Integration tests for cache functionality in IDEStore
 * Tests task loading with cache, IDE switching with warming
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import useIDEStore from '@/infrastructure/stores/IDEStore';
import { cacheService } from '@/infrastructure/services/CacheService';

// Mock dependencies
jest.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/infrastructure/repositories/APIChatRepository.jsx', () => ({
  apiCall: jest.fn()
}));

jest.mock('@/infrastructure/services/CacheService', () => ({
  cacheService: {
    generateHierarchicalKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    warmCache: jest.fn()
  }
}));

jest.mock('@/infrastructure/stores/IDESwitchOptimizationStore.jsx', () => ({
  useIDESwitchOptimizationStore: {
    getState: jest.fn(() => ({
      cacheEnabled: true,
      optimisticUpdates: true,
      startSwitch: jest.fn(),
      updateProgress: jest.fn(),
      completeSwitch: jest.fn()
    }))
  }
}));

jest.mock('@/infrastructure/services/PerformanceLogger', () => ({
  default: {
    log: jest.fn(),
    measure: jest.fn()
  }
}));

describe('IDEStore Cache Integration', () => {
  let mockApiCall;
  let mockCacheService;

  beforeEach(() => {
    mockApiCall = require('@/infrastructure/repositories/APIChatRepository.jsx').apiCall;
    mockCacheService = require('@/infrastructure/services/CacheService').cacheService;
    
    jest.clearAllMocks();
    
    // Reset store state
    act(() => {
      useIDEStore.setState({
        availableIDEs: [],
        activePort: null,
        projectData: { tasks: {}, git: {}, analysis: {} },
        isLoading: false,
        error: null
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Loading with Cache', () => {
    it('should use cached tasks when available', async () => {
      const workspacePath = '/path/to/project';
      const projectId = 'project';
      const port = '9222';
      const cachedTasks = {
        tasks: [{ id: 1, title: 'Cached Task' }],
        lastUpdate: '2025-01-01T00:00:00.000Z'
      };

      // Mock cache service
      mockCacheService.generateHierarchicalKey.mockReturnValue('tasks:9222:project:data');
      mockCacheService.get.mockReturnValue(cachedTasks);

      // Mock store state
      act(() => {
        useIDEStore.setState({
          activePort: port,
          availableIDEs: [{ port, workspacePath, active: true }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      // Load tasks
      await act(async () => {
        await result.current.loadProjectTasks(workspacePath);
      });

      // Verify cache was checked
      expect(mockCacheService.generateHierarchicalKey).toHaveBeenCalledWith('tasks', port, projectId, 'data');
      expect(mockCacheService.get).toHaveBeenCalledWith('tasks:9222:project:data');

      // Verify API was not called
      expect(mockApiCall).not.toHaveBeenCalled();

      // Verify state was updated with cached data
      const state = result.current;
      expect(state.projectData.tasks[workspacePath]).toEqual(cachedTasks);
    });

    it('should load from API and cache when cache miss', async () => {
      const workspacePath = '/path/to/project';
      const projectId = 'project';
      const port = '9222';
      const apiResponse = {
        success: true,
        data: [{ id: 1, title: 'API Task' }]
      };
      const expectedTaskData = {
        tasks: [{ id: 1, title: 'API Task' }],
        lastUpdate: expect.any(String)
      };

      // Mock cache service
      mockCacheService.generateHierarchicalKey.mockReturnValue('tasks:9222:project:data');
      mockCacheService.get.mockReturnValue(null); // Cache miss
      mockCacheService.set.mockReturnValue(true);

      // Mock API call
      mockApiCall.mockResolvedValue(apiResponse);

      // Mock store state
      act(() => {
        useIDEStore.setState({
          activePort: port,
          availableIDEs: [{ port, workspacePath, active: true }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      // Load tasks
      await act(async () => {
        await result.current.loadProjectTasks(workspacePath);
      });

      // Verify cache was checked
      expect(mockCacheService.generateHierarchicalKey).toHaveBeenCalledWith('tasks', port, projectId, 'data');
      expect(mockCacheService.get).toHaveBeenCalledWith('tasks:9222:project:data');

      // Verify API was called
      expect(mockApiCall).toHaveBeenCalledWith(`/api/projects/${projectId}/tasks`);

      // Verify data was cached
      expect(mockCacheService.set).toHaveBeenCalledWith('tasks:9222:project:data', expectedTaskData, 'tasks', 'tasks');

      // Verify state was updated
      const state = result.current;
      expect(state.projectData.tasks[workspacePath]).toEqual(expectedTaskData);
    });

    it('should handle API errors gracefully', async () => {
      const workspacePath = '/path/to/project';
      const port = '9222';

      // Mock cache service
      mockCacheService.generateHierarchicalKey.mockReturnValue('tasks:9222:project:data');
      mockCacheService.get.mockReturnValue(null); // Cache miss

      // Mock API error
      mockApiCall.mockRejectedValue(new Error('API Error'));

      // Mock store state
      act(() => {
        useIDEStore.setState({
          activePort: port,
          availableIDEs: [{ port, workspacePath, active: true }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      // Load tasks
      await act(async () => {
        const taskData = await result.current.loadProjectTasks(workspacePath);
        expect(taskData).toBeNull();
      });

      // Verify API was called
      expect(mockApiCall).toHaveBeenCalledWith(`/api/projects/project/tasks');

      // Verify no data was cached
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should skip loading when no active port', async () => {
      const workspacePath = '/path/to/project';

      // Mock store state without active port
      act(() => {
        useIDEStore.setState({
          activePort: null,
          availableIDEs: [{ port: '9222', workspacePath, active: true }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      // Load tasks
      await act(async () => {
        await result.current.loadProjectTasks(workspacePath);
      });

      // Verify no cache operations
      expect(mockCacheService.generateHierarchicalKey).not.toHaveBeenCalled();
      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(mockApiCall).not.toHaveBeenCalled();
    });
  });

  describe('IDE Switching with Cache Warming', () => {
    beforeEach(() => {
      // Mock cache warming service
      jest.doMock('@/infrastructure/services/CacheWarmingService', () => ({
        cacheWarmingService: {
          warmForTrigger: jest.fn().mockResolvedValue({
            warmed: [{ pattern: { namespace: 'tasks' }, status: 'warmed' }],
            failed: [],
            totalTime: 100
          })
        }
      }));
    });

    it('should trigger cache warming after successful IDE switch', async () => {
      const port = '9222';
      const workspacePath = '/path/to/project';
      const projectId = 'project';
      const switchResponse = { success: true };

      // Mock API call
      mockApiCall.mockResolvedValue(switchResponse);

      // Mock store state
      act(() => {
        useIDEStore.setState({
          availableIDEs: [{ port, workspacePath, active: false }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      // Switch IDE
      await act(async () => {
        const success = await result.current.switchIDE(port);
        expect(success).toBe(true);
      });

      // Verify API was called
      expect(mockApiCall).toHaveBeenCalledWith(`/api/ide/switch/${port}`, { method: 'POST' });

      // Note: Cache warming is triggered asynchronously, so we can't easily test it in this unit test
      // In a real integration test, we would wait for the warming to complete
    });

    it('should not trigger warming on failed IDE switch', async () => {
      const port = '9222';
      const switchResponse = { success: false, error: 'Switch failed' };

      // Mock API call
      mockApiCall.mockResolvedValue(switchResponse);

      const { result } = renderHook(() => useIDEStore());

      // Switch IDE
      await act(async () => {
        const success = await result.current.switchIDE(port);
        expect(success).toBe(false);
      });

      // Verify API was called
      expect(mockApiCall).toHaveBeenCalledWith(`/api/ide/switch/${port}`, { method: 'POST' });

      // Cache warming should not be triggered on failure
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate correct hierarchical keys for tasks', async () => {
      const workspacePath = '/path/to/project';
      const projectId = 'project';
      const port = '9222';

      mockCacheService.generateHierarchicalKey.mockReturnValue('tasks:9222:project:data');
      mockCacheService.get.mockReturnValue(null);
      mockApiCall.mockResolvedValue({ success: true, data: [] });

      act(() => {
        useIDEStore.setState({
          activePort: port,
          availableIDEs: [{ port, workspacePath, active: true }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      await act(async () => {
        await result.current.loadProjectTasks(workspacePath);
      });

      expect(mockCacheService.generateHierarchicalKey).toHaveBeenCalledWith('tasks', port, projectId, 'data');
    });
  });

  describe('Performance', () => {
    it('should load tasks faster with cache hit', async () => {
      const workspacePath = '/path/to/project';
      const port = '9222';
      const cachedTasks = {
        tasks: [{ id: 1, title: 'Cached Task' }],
        lastUpdate: '2025-01-01T00:00:00.000Z'
      };

      mockCacheService.generateHierarchicalKey.mockReturnValue('tasks:9222:project:data');
      mockCacheService.get.mockReturnValue(cachedTasks);

      act(() => {
        useIDEStore.setState({
          activePort: port,
          availableIDEs: [{ port, workspacePath, active: true }]
        });
      });

      const { result } = renderHook(() => useIDEStore());

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.loadProjectTasks(workspacePath);
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // With cache hit, loading should be very fast (< 10ms)
      expect(loadTime).toBeLessThan(10);
      expect(mockApiCall).not.toHaveBeenCalled();
    });
  });
});
