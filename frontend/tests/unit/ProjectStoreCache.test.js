/**
 * Project Store Cache Tests
 * Tests for ProjectStore caching functionality including cache hits, misses, and invalidation
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';

// Mock dependencies
vi.mock('@/infrastructure/logging/Logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/infrastructure/repositories/ChatRepository.jsx', () => ({
  apiCall: vi.fn()
}));

vi.mock('@/infrastructure/stores/AuthStore.jsx', () => ({
  default: {
    getState: vi.fn(() => ({
      user: { id: 'test-user', name: 'Test User' }
    }))
  }
}));

vi.mock('@/infrastructure/services/CacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    invalidateNamespace: vi.fn(),
    getStats: vi.fn(() => ({
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memorySize: 0,
      memoryEntries: 0
    }))
  }
}));

describe('ProjectStore Cache Integration', () => {
  let mockApiCall;
  let mockCacheService;
  let mockLogger;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mocks
    mockApiCall = vi.mocked(await import('@/infrastructure/repositories/ChatRepository.jsx')).apiCall;
    mockCacheService = vi.mocked(await import('@/infrastructure/services/CacheService')).cacheService;
    mockLogger = vi.mocked(await import('@/infrastructure/logging/Logger')).logger;
    
    // Reset store state
    act(() => {
      useProjectStore.getState().projects = {};
      useProjectStore.getState().activeProject = null;
      useProjectStore.getState().error = null;
      useProjectStore.getState().isLoading = false;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cache Integration', () => {
    it('should use cached data when available', async () => {
      const mockProjects = {
        'project-1': {
          id: 'project-1',
          name: 'Test Project 1',
          workspacePath: '/test/path1',
          status: 'active'
        }
      };

      // Mock cache hit
      mockCacheService.get.mockReturnValue(mockProjects);

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.loadProjects();
      });

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith('projectStore:projects:list:test-user');
      
      // Verify API was not called
      expect(mockApiCall).not.toHaveBeenCalled();
      
      // Verify state was updated with cached data
      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fallback to API when cache miss', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          workspacePath: '/test/path1',
          status: 'active'
        }
      ];

      // Mock cache miss
      mockCacheService.get.mockReturnValue(null);
      
      // Mock API response
      mockApiCall.mockResolvedValue({
        data: mockProjects
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.loadProjects();
      });

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith('projectStore:projects:list:test-user');
      
      // Verify API was called
      expect(mockApiCall).toHaveBeenCalledWith('/api/projects', expect.any(Object));
      
      // Verify result was cached
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'projectStore:projects:list:test-user',
        expect.any(Object),
        'projectList',
        'projectStore'
      );
      
      // Verify state was updated
      expect(result.current.projects).toHaveProperty('project-1');
      expect(result.current.isLoading).toBe(false);
    });

    it('should cache individual project data', () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        workspacePath: '/test/path',
        status: 'active'
      };

      // Setup store with project
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': mockProject
          }
        });
      });

      const { result } = renderHook(() => useProjectStore());

      // Mock cache miss for individual project
      mockCacheService.get.mockReturnValue(null);

      act(() => {
        result.current.getProject('project-1');
      });

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith('projectStore:project:project-1');
      
      // Verify project was cached
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'projectStore:project:project-1',
        mockProject,
        'projectStore',
        'projectStore'
      );
    });

    it('should return cached project data when available', () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        workspacePath: '/test/path',
        status: 'active'
      };

      // Mock cache hit
      mockCacheService.get.mockReturnValue(mockProject);

      const { result } = renderHook(() => useProjectStore());

      const project = result.current.getProject('project-1');

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith('projectStore:project:project-1');
      
      // Verify cached data was returned
      expect(project).toEqual(mockProject);
      
      // Verify no new cache entry was created
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when creating project', async () => {
      const projectData = {
        name: 'New Project',
        workspacePath: '/new/path',
        type: 'development'
      };

      const mockCreatedProject = {
        id: 'new-project-id',
        ...projectData,
        status: 'active'
      };

      mockApiCall.mockResolvedValue({
        data: mockCreatedProject
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.createProject(projectData);
      });

      // Verify cache invalidation
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:projects:list:test-user');
      expect(mockCacheService.invalidateNamespace).toHaveBeenCalledWith('projectStore');
    });

    it('should invalidate cache when updating project', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated Description'
      };

      const mockUpdatedProject = {
        id: 'project-1',
        name: 'Updated Name',
        description: 'Updated Description',
        workspacePath: '/test/path',
        status: 'active'
      };

      mockApiCall.mockResolvedValue({
        data: mockUpdatedProject
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject('project-1', updates);
      });

      // Verify cache invalidation
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:projects:list:test-user');
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:project:project-1');
      expect(mockCacheService.invalidateNamespace).toHaveBeenCalledWith('projectStore');
    });

    it('should invalidate cache when deleting project', async () => {
      mockApiCall.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.deleteProject('project-1');
      });

      // Verify cache invalidation
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:projects:list:test-user');
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:project:project-1');
      expect(mockCacheService.invalidateNamespace).toHaveBeenCalledWith('projectStore');
    });

    it('should invalidate cache when refreshing projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project',
          workspacePath: '/test/path',
          status: 'active'
        }
      ];

      // Mock cache miss after invalidation
      mockCacheService.get.mockReturnValue(null);
      
      mockApiCall.mockResolvedValue({
        data: mockProjects
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.refresh();
      });

      // Verify cache invalidation
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:projects:list:test-user');
      expect(mockCacheService.invalidateNamespace).toHaveBeenCalledWith('projectStore');
      
      // Verify API was called
      expect(mockApiCall).toHaveBeenCalledWith('/api/projects', expect.any(Object));
    });
  });

  describe('Project Statistics Caching', () => {
    it('should cache project statistics', () => {
      // Setup store with projects
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': { id: 'project-1', status: 'active' },
            'project-2': { id: 'project-2', status: 'active' },
            'project-3': { id: 'project-3', status: 'inactive' }
          },
          lastUpdate: '2024-01-01T00:00:00.000Z'
        });
      });

      const { result } = renderHook(() => useProjectStore());

      // Mock cache miss
      mockCacheService.get.mockReturnValue(null);

      act(() => {
        result.current.getProjectStats();
      });

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith('projectStore:stats');
      
      // Verify stats were cached
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'projectStore:stats',
        expect.objectContaining({
          total: 3,
          active: 2,
          inactive: 1,
          lastUpdate: '2024-01-01T00:00:00.000Z'
        }),
        'projectStats',
        'projectStore'
      );
    });

    it('should return cached statistics when available', () => {
      const mockStats = {
        total: 5,
        active: 3,
        inactive: 2,
        lastUpdate: '2024-01-01T00:00:00.000Z'
      };

      // Mock cache hit
      mockCacheService.get.mockReturnValue(mockStats);

      const { result } = renderHook(() => useProjectStore());

      const stats = result.current.getProjectStats();

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith('projectStore:stats');
      
      // Verify cached data was returned
      expect(stats).toEqual(mockStats);
      
      // Verify no new cache entry was created
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const mockStats = {
        hits: 10,
        misses: 5,
        sets: 8,
        deletes: 2,
        hitRate: 0.67,
        memorySize: 1024,
        memoryEntries: 15
      };

      mockCacheService.getStats.mockReturnValue(mockStats);

      const { result } = renderHook(() => useProjectStore());

      const stats = result.current.getCacheStats();

      expect(stats).toEqual(mockStats);
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });

    it('should clear ProjectStore cache', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.clearCache();
      });

      expect(mockCacheService.invalidateNamespace).toHaveBeenCalledWith('projectStore');
    });

    it('should clean up cache when removing old projects', () => {
      // Setup store with many projects
      const manyProjects = {};
      for (let i = 0; i < 150; i++) {
        manyProjects[`project-${i}`] = {
          id: `project-${i}`,
          name: `Project ${i}`,
          metadata: {
            lastAccessed: new Date(Date.now() - i * 1000).toISOString()
          }
        };
      }

      act(() => {
        useProjectStore.setState({ projects: manyProjects });
      });

      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.cleanup();
      });

      // Verify cache cleanup for removed projects
      expect(mockCacheService.delete).toHaveBeenCalledTimes(50); // 50 projects removed
      
      // Verify specific cache keys were deleted
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:project:project-0');
      expect(mockCacheService.delete).toHaveBeenCalledWith('projectStore:project:project-49');
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Mock cache error
      mockCacheService.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project',
          workspacePath: '/test/path',
          status: 'active'
        }
      ];

      mockApiCall.mockResolvedValue({
        data: mockProjects
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.loadProjects();
      });

      // Should fallback to API call
      expect(mockApiCall).toHaveBeenCalledWith('/api/projects', expect.any(Object));
      
      // Should still cache the result
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        workspacePath: '/test/path',
        status: 'active'
      };

      // Setup store with project
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': mockProject
          }
        });
      });

      // Mock cache set error
      mockCacheService.set.mockImplementation(() => {
        throw new Error('Cache set error');
      });

      const { result } = renderHook(() => useProjectStore());

      // Should not throw error
      expect(() => {
        result.current.getProject('project-1');
      }).not.toThrow();

      // Should still return the project
      const project = result.current.getProject('project-1');
      expect(project).toEqual(mockProject);
    });
  });

  describe('Performance', () => {
    it('should improve performance with cache hits', async () => {
      const mockProjects = {
        'project-1': {
          id: 'project-1',
          name: 'Test Project',
          workspacePath: '/test/path',
          status: 'active'
        }
      };

      // Mock cache hit
      mockCacheService.get.mockReturnValue(mockProjects);

      const { result } = renderHook(() => useProjectStore());

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.loadProjects();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be very fast with cache hit
      expect(duration).toBeLessThan(100); // Less than 100ms
      
      // Should not call API
      expect(mockApiCall).not.toHaveBeenCalled();
    });

    it('should handle concurrent cache operations', async () => {
      const mockProjects = {
        'project-1': {
          id: 'project-1',
          name: 'Test Project',
          workspacePath: '/test/path',
          status: 'active'
        }
      };

      // Mock cache hit
      mockCacheService.get.mockReturnValue(mockProjects);

      const { result } = renderHook(() => useProjectStore());

      // Concurrent operations
      await act(async () => {
        const promises = [
          result.current.loadProjects(),
          result.current.getProject('project-1'),
          result.current.getProjectStats()
        ];
        await Promise.all(promises);
      });

      // Should handle concurrent operations without issues
      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
