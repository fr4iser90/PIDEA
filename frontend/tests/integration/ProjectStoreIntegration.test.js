/**
 * Project Store Integration Tests
 * Tests for ProjectStore integration with IDEStore and backend services
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useProjectStore from '@/infrastructure/stores/ProjectStore.jsx';
import useIDEStore from '@/infrastructure/stores/IDEStore.jsx';
import projectStoreIntegrationService from '@/infrastructure/services/ProjectStoreIntegrationService.jsx';

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

describe('ProjectStore Integration', () => {
  let mockApiCall;
  let mockLogger;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mocks
    mockApiCall = vi.mocked(await import('@/infrastructure/repositories/ChatRepository.jsx')).apiCall;
    mockLogger = vi.mocked(await import('@/infrastructure/logging/Logger')).logger;
    
    // Reset store states
    act(() => {
      useProjectStore.getState().projects = {};
      useProjectStore.getState().activeProject = null;
      useIDEStore.getState().activePort = null;
      useIDEStore.getState().availableIDEs = [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IDEStore Integration', () => {
    it('should create project when IDE is activated', async () => {
      const mockIDE = {
        port: 3000,
        name: 'Test IDE',
        workspacePath: '/test/workspace',
        active: true
      };

      const mockProject = {
        id: 'test-project-id',
        name: 'Test IDE',
        description: 'Project for Test IDE',
        workspacePath: '/test/workspace',
        type: 'development',
        status: 'active'
      };

      // Mock IDEStore state
      act(() => {
        useIDEStore.setState({
          availableIDEs: [mockIDE],
          activePort: 3000
        });
      });

      // Mock API response for project creation
      mockApiCall.mockResolvedValue({
        data: mockProject
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Initialize integration service
      await act(async () => {
        await projectStoreIntegrationService.initialize();
      });

      // Simulate IDE activation
      await act(async () => {
        await useIDEStore.getState().setActivePort(3000);
      });

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if project was created
      const project = projectStore.current.getProjectByWorkspace('/test/workspace');
      expect(project).toBeDefined();
      expect(project.name).toBe('Test IDE');
      expect(projectStore.current.activeProject).toBe(project.id);
    });

    it('should update active project when IDE changes', async () => {
      const mockIDEs = [
        {
          port: 3000,
          name: 'IDE 1',
          workspacePath: '/workspace1',
          active: true
        },
        {
          port: 3001,
          name: 'IDE 2',
          workspacePath: '/workspace2',
          active: false
        }
      ];

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          workspacePath: '/workspace1',
          status: 'active'
        },
        {
          id: 'project-2',
          name: 'Project 2',
          workspacePath: '/workspace2',
          status: 'active'
        }
      ];

      // Setup initial state
      act(() => {
        useIDEStore.setState({
          availableIDEs: mockIDEs,
          activePort: 3000
        });
        useProjectStore.setState({
          projects: {
            'project-1': mockProjects[0],
            'project-2': mockProjects[1]
          },
          activeProject: 'project-1'
        });
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Initialize integration service
      await act(async () => {
        await projectStoreIntegrationService.initialize();
      });

      // Change active IDE
      await act(async () => {
        await useIDEStore.getState().setActivePort(3001);
      });

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if active project changed
      expect(projectStore.current.activeProject).toBe('project-2');
    });

    it('should handle missing IDE gracefully', async () => {
      // Setup IDEStore with no IDEs
      act(() => {
        useIDEStore.setState({
          availableIDEs: [],
          activePort: null
        });
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Initialize integration service
      await act(async () => {
        await projectStoreIntegrationService.initialize();
      });

      // Try to set active port
      await act(async () => {
        await useIDEStore.getState().setActivePort(9999);
      });

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash and maintain current state
      expect(projectStore.current.projects).toEqual({});
      expect(projectStore.current.activeProject).toBeNull();
    });
  });

  describe('Backend Integration', () => {
    it('should sync project data with backend', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Backend Project 1',
          workspacePath: '/backend/project1',
          status: 'active'
        },
        {
          id: 'project-2',
          name: 'Backend Project 2',
          workspacePath: '/backend/project2',
          status: 'active'
        }
      ];

      // Mock backend response
      mockApiCall.mockResolvedValue({
        data: mockProjects
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Load projects from backend
      await act(async () => {
        await projectStore.current.loadProjects();
      });

      // Verify projects were loaded
      expect(Object.keys(projectStore.current.projects)).toHaveLength(2);
      expect(projectStore.current.projects['project-1'].name).toBe('Backend Project 1');
      expect(projectStore.current.projects['project-2'].name).toBe('Backend Project 2');
    });

    it('should handle backend errors gracefully', async () => {
      // Mock backend error
      mockApiCall.mockResolvedValue({
       
        error: 'Backend connection failed'
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Try to load projects
      await act(async () => {
        await projectStore.current.loadProjects();
      });

      // Verify error handling
      expect(projectStore.current.projects).toEqual({});
      expect(projectStore.current.error).toBe('Backend connection failed');
      expect(projectStore.current.isLoading).toBe(false);
    });

    it('should retry failed requests', async () => {
      let callCount = 0;
      mockApiCall.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
           
            error: 'Temporary failure'
          });
        }
        return Promise.resolve({
          data: [{ id: 'project-1', name: 'Test Project' }]
        });
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Load projects with retry
      await act(async () => {
        await projectStore.current.loadProjects();
      });

      // Verify retry logic
      expect(callCount).toBe(3);
      expect(projectStore.current.projects).toHaveProperty('project-1');
    });
  });

  describe('Data Synchronization', () => {
    it('should synchronize project metadata with IDE data', async () => {
      const mockIDE = {
        port: 3000,
        name: 'Test IDE',
        workspacePath: '/test/workspace',
        active: true
      };

      const mockProject = {
        id: 'test-project',
        name: 'Test Project',
        workspacePath: '/test/workspace',
        status: 'active',
        metadata: {
          lastAccessed: '2024-01-01T00:00:00.000Z',
          accessCount: 0
        }
      };

      // Setup initial state
      act(() => {
        useIDEStore.setState({
          availableIDEs: [mockIDE],
          activePort: 3000
        });
        useProjectStore.setState({
          projects: {
            'test-project': mockProject
          },
          activeProject: 'test-project'
        });
      });

      const { result: projectStore } = renderHook(() => useProjectStore());

      // Initialize integration service
      await act(async () => {
        await projectStoreIntegrationService.initialize();
      });

      // Trigger synchronization
      await act(async () => {
        projectStoreIntegrationService.synchronizeStores();
      });

      // Check if metadata was updated
      const project = projectStore.current.getProject('test-project');
      expect(project.metadata.lastAccessed).toBeDefined();
      expect(project.metadata.accessCount).toBeGreaterThan(0);
    });

    it('should handle concurrent synchronization', async () => {
      const { result: projectStore } = renderHook(() => useProjectStore());

      // Initialize integration service
      await act(async () => {
        await projectStoreIntegrationService.initialize();
      });

      // Trigger multiple synchronizations concurrently
      await act(async () => {
        const promises = [
          projectStoreIntegrationService.synchronizeStores(),
          projectStoreIntegrationService.synchronizeStores(),
          projectStoreIntegrationService.synchronizeStores()
        ];
        await Promise.all(promises);
      });

      // Should not crash or cause issues
      expect(projectStore.current.projects).toBeDefined();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large number of projects efficiently', async () => {
      const { result: projectStore } = renderHook(() => useProjectStore());

      // Create many projects
      const manyProjects = {};
      for (let i = 0; i < 1000; i++) {
        manyProjects[`project-${i}`] = {
          id: `project-${i}`,
          name: `Project ${i}`,
          workspacePath: `/workspace/${i}`,
          status: 'active',
          metadata: {
            lastAccessed: new Date().toISOString(),
            accessCount: i
          }
        };
      }

      act(() => {
        useProjectStore.setState({ projects: manyProjects });
      });

      // Test search performance
      const startTime = performance.now();
      const results = projectStore.current.searchProjects('Project 500');
      const endTime = performance.now();

      expect(results).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should cleanup old projects automatically', async () => {
      const { result: projectStore } = renderHook(() => useProjectStore());

      // Create more projects than maxCacheSize
      const manyProjects = {};
      for (let i = 0; i < 150; i++) {
        manyProjects[`project-${i}`] = {
          id: `project-${i}`,
          name: `Project ${i}`,
          workspacePath: `/workspace/${i}`,
          status: 'active',
          metadata: {
            lastAccessed: new Date(Date.now() - i * 1000).toISOString(),
            accessCount: i
          }
        };
      }

      act(() => {
        useProjectStore.setState({ projects: manyProjects });
      });

      expect(Object.keys(projectStore.current.projects)).toHaveLength(150);

      // Trigger cleanup
      act(() => {
        projectStore.current.cleanup();
      });

      // Should have cleaned up old projects
      expect(Object.keys(projectStore.current.projects)).toHaveLength(100);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from integration errors', async () => {
      const { result: projectStore } = renderHook(() => useProjectStore());

      // Mock a failing API call
      mockApiCall.mockRejectedValue(new Error('Network error'));

      // Initialize integration service
      await act(async () => {
        await projectStoreIntegrationService.initialize();
      });

      // Try to load projects (should fail)
      await act(async () => {
        try {
          await projectStore.current.loadProjects();
        } catch (error) {
          // Expected to fail
        }
      });

      // Service should still be functional
      expect(projectStoreIntegrationService.isInitialized).toBe(true);
      expect(projectStore.current.error).toBe('Network error');
    });

    it('should handle store state corruption', async () => {
      const { result: projectStore } = renderHook(() => useProjectStore());

      // Corrupt store state
      act(() => {
        useProjectStore.setState({
          projects: null,
          activeProject: 'invalid-id'
        });
      });

      // Should handle gracefully
      expect(projectStore.current.getProject('invalid-id')).toBeNull();
      expect(projectStore.current.getProjectByWorkspace('/invalid/path')).toBeNull();
    });
  });
});
