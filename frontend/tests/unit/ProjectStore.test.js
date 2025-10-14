/**
 * Project Store Unit Tests
 * Tests for ProjectStore functionality including CRUD operations, state management, and persistence
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

describe('ProjectStore', () => {
  let mockApiCall;
  let mockLogger;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mocks
    mockApiCall = vi.mocked(await import('@/infrastructure/repositories/ChatRepository.jsx')).apiCall;
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

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useProjectStore());
      
      expect(result.current.projects).toEqual({});
      expect(result.current.activeProject).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.projectConfig).toEqual({
        autoSave: true,
        cacheEnabled: true,
        syncInterval: 30000,
        maxCacheSize: 100,
        persistenceEnabled: true
      });
    });
  });

  describe('Project Loading', () => {
    it('should load projects successfully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          description: 'Test Description 1',
          workspacePath: '/test/path1',
          type: 'development',
          framework: 'React',
          status: 'active'
        },
        {
          id: 'project-2',
          name: 'Test Project 2',
          description: 'Test Description 2',
          workspacePath: '/test/path2',
          type: 'production',
          framework: 'Vue',
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

      expect(result.current.projects).toHaveProperty('project-1');
      expect(result.current.projects).toHaveProperty('project-2');
      expect(result.current.projects['project-1'].name).toBe('Test Project 1');
      expect(result.current.projects['project-2'].name).toBe('Test Project 2');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading errors', async () => {
      mockApiCall.mockResolvedValue({
       
        error: 'Failed to load projects'
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.loadProjects();
      });

      expect(result.current.projects).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to load projects');
    });

    it('should prevent concurrent loading', async () => {
      mockApiCall.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { result } = renderHook(() => useProjectStore());

      // Start first load
      act(() => {
        result.current.loadProjects();
      });

      // Try to start second load
      act(() => {
        result.current.loadProjects();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingLock).toBe(true);
    });
  });

  describe('Project Creation', () => {
    it('should create project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'New Description',
        workspacePath: '/new/path',
        type: 'development',
        framework: 'React'
      };

      const mockCreatedProject = {
        id: 'new-project-id',
        ...projectData,
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockApiCall.mockResolvedValue({
        data: mockCreatedProject
      });

      const { result } = renderHook(() => useProjectStore());

      let createdProject;
      await act(async () => {
        createdProject = await result.current.createProject(projectData);
      });

      expect(createdProject).toEqual(expect.objectContaining({
        id: 'new-project-id',
        name: 'New Project',
        description: 'New Description'
      }));
      expect(result.current.projects).toHaveProperty('new-project-id');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle creation errors', async () => {
      const projectData = {
        name: 'New Project',
        workspacePath: '/new/path'
      };

      mockApiCall.mockResolvedValue({
       
        error: 'Failed to create project'
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        try {
          await result.current.createProject(projectData);
        } catch (error) {
          expect(error.message).toBe('Failed to create project');
        }
      });

      expect(result.current.projects).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to create project');
    });
  });

  describe('Project Updates', () => {
    beforeEach(() => {
      // Setup initial project
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': {
              id: 'project-1',
              name: 'Original Name',
              description: 'Original Description',
              workspacePath: '/original/path',
              type: 'development',
              status: 'active'
            }
          }
        });
      });
    });

    it('should update project successfully', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated Description'
      };

      const mockUpdatedProject = {
        id: 'project-1',
        name: 'Updated Name',
        description: 'Updated Description',
        workspacePath: '/original/path',
        type: 'development',
        status: 'active',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockApiCall.mockResolvedValue({
        data: mockUpdatedProject
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject('project-1', updates);
      });

      expect(result.current.projects['project-1'].name).toBe('Updated Name');
      expect(result.current.projects['project-1'].description).toBe('Updated Description');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle update errors', async () => {
      const updates = {
        name: 'Updated Name'
      };

      mockApiCall.mockResolvedValue({
       
        error: 'Failed to update project'
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        try {
          await result.current.updateProject('project-1', updates);
        } catch (error) {
          expect(error.message).toBe('Failed to update project');
        }
      });

      expect(result.current.projects['project-1'].name).toBe('Original Name');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to update project');
    });
  });

  describe('Project Deletion', () => {
    beforeEach(() => {
      // Setup initial project
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': {
              id: 'project-1',
              name: 'Test Project',
              workspacePath: '/test/path',
              status: 'active'
            }
          },
          activeProject: 'project-1'
        });
      });
    });

    it('should delete project successfully', async () => {
      mockApiCall.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.deleteProject('project-1');
      });

      expect(result.current.projects).not.toHaveProperty('project-1');
      expect(result.current.activeProject).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle deletion errors', async () => {
      mockApiCall.mockResolvedValue({
       
        error: 'Failed to delete project'
      });

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        try {
          await result.current.deleteProject('project-1');
        } catch (error) {
          expect(error.message).toBe('Failed to delete project');
        }
      });

      expect(result.current.projects).toHaveProperty('project-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to delete project');
    });
  });

  describe('Project Selection', () => {
    beforeEach(() => {
      // Setup initial projects
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': {
              id: 'project-1',
              name: 'Project 1',
              workspacePath: '/path1',
              status: 'active'
            },
            'project-2': {
              id: 'project-2',
              name: 'Project 2',
              workspacePath: '/path2',
              status: 'active'
            }
          }
        });
      });
    });

    it('should set active project', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setActiveProject('project-1');
      });

      expect(result.current.activeProject).toBe('project-1');
    });

    it('should update project metadata when setting active project', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setActiveProject('project-1');
      });

      const project = result.current.getProject('project-1');
      expect(project.metadata.lastAccessed).toBeDefined();
      expect(project.metadata.accessCount).toBe(1);
    });

    it('should get project by ID', () => {
      const { result } = renderHook(() => useProjectStore());

      const project = result.current.getProject('project-1');
      expect(project).toEqual(expect.objectContaining({
        id: 'project-1',
        name: 'Project 1',
        workspacePath: '/path1'
      }));
    });

    it('should get project by workspace path', () => {
      const { result } = renderHook(() => useProjectStore());

      const project = result.current.getProjectByWorkspace('/path1');
      expect(project).toEqual(expect.objectContaining({
        id: 'project-1',
        name: 'Project 1',
        workspacePath: '/path1'
      }));
    });
  });

  describe('Project Search', () => {
    beforeEach(() => {
      // Setup initial projects
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': {
              id: 'project-1',
              name: 'React Application',
              description: 'A React application',
              workspacePath: '/react/app',
              framework: 'React'
            },
            'project-2': {
              id: 'project-2',
              name: 'Vue Component',
              description: 'A Vue component',
              workspacePath: '/vue/component',
              framework: 'Vue'
            },
            'project-3': {
              id: 'project-3',
              name: 'Backend API',
              description: 'A backend API service',
              workspacePath: '/backend/api',
              framework: 'Node.js'
            }
          }
        });
      });
    });

    it('should search projects by name', () => {
      const { result } = renderHook(() => useProjectStore());

      const results = result.current.searchProjects('React');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Application');
    });

    it('should search projects by description', () => {
      const { result } = renderHook(() => useProjectStore());

      const results = result.current.searchProjects('component');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Vue Component');
    });

    it('should search projects by workspace path', () => {
      const { result } = renderHook(() => useProjectStore());

      const results = result.current.searchProjects('backend');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Backend API');
    });

    it('should return all projects when query is empty', () => {
      const { result } = renderHook(() => useProjectStore());

      const results = result.current.searchProjects('');
      expect(results).toHaveLength(3);
    });

    it('should return empty array when no matches found', () => {
      const { result } = renderHook(() => useProjectStore());

      const results = result.current.searchProjects('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Project Statistics', () => {
    beforeEach(() => {
      // Setup initial projects
      act(() => {
        useProjectStore.setState({
          projects: {
            'project-1': {
              id: 'project-1',
              name: 'Project 1',
              status: 'active'
            },
            'project-2': {
              id: 'project-2',
              name: 'Project 2',
              status: 'active'
            },
            'project-3': {
              id: 'project-3',
              name: 'Project 3',
              status: 'inactive'
            }
          },
          lastUpdate: '2024-01-01T00:00:00.000Z'
        });
      });
    });

    it('should calculate project statistics', () => {
      const { result } = renderHook(() => useProjectStore());

      const stats = result.current.getProjectStats();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.lastUpdate).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useProjectStore());

      // Set an error
      act(() => {
        useProjectStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old projects when limit exceeded', () => {
      const { result } = renderHook(() => useProjectStore());

      // Create more projects than maxCacheSize
      const projects = {};
      for (let i = 0; i < 150; i++) {
        projects[`project-${i}`] = {
          id: `project-${i}`,
          name: `Project ${i}`,
          metadata: {
            lastAccessed: new Date(Date.now() - i * 1000).toISOString(),
            accessCount: i
          }
        };
      }

      act(() => {
        useProjectStore.setState({ projects });
      });

      expect(Object.keys(result.current.projects)).toHaveLength(150);

      act(() => {
        result.current.cleanup();
      });

      expect(Object.keys(result.current.projects)).toHaveLength(100);
    });
  });
});
