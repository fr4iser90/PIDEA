/**
 * Project Store
 * Dedicated state management for project data with persistence
 * Handles project CRUD operations, metadata, and state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/infrastructure/logging/Logger';
import apiService from '@/infrastructure/services/ApiService.js';
import useAuthStore from './AuthStore.jsx';
import { cacheService } from '@/infrastructure/services/CacheService';

// Helper function to get project ID from workspace path
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  const parts = workspacePath.split('/');
  const projectName = parts[parts.length - 1];
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

// Helper function to generate project ID
const generateProjectId = (name, workspacePath) => {
  const baseId = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const timestamp = Date.now().toString(36);
  return `${baseId}_${timestamp}`;
};

const useProjectStore = create(
  persist(
    (set, get) => ({
      // State
      projects: {}, // { projectId: projectData }
      selectedProject: null,
      isLoading: false,
      error: null,
      lastUpdate: null,
      retryCount: 0,
      maxRetries: 3,
      loadingLock: false, // Prevent concurrent loading

      // Project metadata cache
      projectMetadata: {}, // { projectId: { lastAccessed, accessCount, preferences } }
      
      // Project configuration
      projectConfig: {
        autoSave: true,
        cacheEnabled: true,
        syncInterval: 30000, // 30 seconds
        maxCacheSize: 100, // Maximum number of projects to cache
        persistenceEnabled: true
      },

      // IDEStore migration: Project Data
      projectData: {
        git: {}, // { '/path1': { status, branches, lastUpdate }, '/path2': { status, branches, lastUpdate } }
        analysis: {}, // { '/path1': { status, metrics, history, lastUpdate }, '/path2': { status, metrics, history, lastUpdate } }
        chat: {}, // { '/path1': { messages, lastUpdate }, '/path2': { messages, lastUpdate } }
        tasks: {}, // { '/path1': { tasks: [], lastUpdate }, '/path2': { tasks: [], lastUpdate } }
        lastUpdate: null
      },

      // IDEStore migration: Category-based Analysis Data Structure
      categoryAnalysisData: {
        // { '/path1': { 
        //   security: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null },
        //   performance: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null },
        //   architecture: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null },
        //   codeQuality: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null },
        //   dependencies: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null },
        //   manifest: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null },
        //   techStack: { recommendations: null, issues: null, metrics: null, summary: null, results: null, lastUpdate: null }
        // }}
      },

      // Actions
      
      /**
       * Load all projects for the current user with caching
       */
      loadProjects: async () => {
        const state = get();
        const { isLoading, loadingLock } = state;
        
        // STRICT DEDUPLICATION - prevent multiple calls
        if (isLoading || loadingLock) {
          logger.warn('🚫 Project loading already in progress - DEDUPLICATION ACTIVE!', { 
            isLoading, 
            loadingLock 
          });
          return Promise.resolve(); // Return resolved promise to prevent hanging
        }

        try {
          logger.info('🔄 Starting project loading...');
          set({ isLoading: true, error: null, loadingLock: true });

          const { user } = useAuthStore.getState();
          logger.info('🔍 [ProjectStore] User state:', { user: !!user, userId: user?.id });
          
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Try cache first - USE YOUR CACHE!
          const cacheKey = `projectStore:projects:list:${user.id}`;
          const cachedData = cacheService.get(cacheKey);
          
          if (cachedData) {
            logger.info('✅ USING CACHED PROJECT LIST - NO API CALL!');
            set({
              projects: cachedData,
              isLoading: false,
              lastUpdate: new Date().toISOString(),
              retryCount: 0,
              loadingLock: false // CRITICAL: Always reset loadingLock
            });
            return;
          }

          // Load from API
          logger.info('🔍 [ProjectStore] Making API call to /api/projects...');
          const response = await apiService.call('/api/projects', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          logger.info('🔍 [ProjectStore] API response received:', { 
            hasData: !!response?.data, 
            hasPagination: !!response?.pagination,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : 'null'
          });

          // Handle 2025 Modern API response format
          // Backend returns: [projects] directly
          const projects = Array.isArray(response) ? response : [];
          
          logger.info('🔍 [ProjectStore] Extracted projects:', { 
            count: projects.length, 
            projects,
            isArray: Array.isArray(projects),
            type: typeof projects,
            backendResponse: response
          });
          
          // SAFETY CHECK: Ensure projects is an array
          if (!Array.isArray(projects)) {
            logger.error('❌ [ProjectStore] Projects is not an array!', { 
              projects, 
              type: typeof projects,
              isArray: Array.isArray(projects),
              backendResponse: response
            });
            throw new Error('Projects data is not in expected array format');
          }
          const projectsMap = {};
          
          // Convert array to map for easier access
          projects.forEach(project => {
            projectsMap[project.id] = {
              ...project,
              lastUpdate: new Date().toISOString(),
              metadata: {
                ...project.metadata,
                lastAccessed: new Date().toISOString(),
                accessCount: 0
              }
            };
          });

          // Cache the result
          cacheService.set(cacheKey, projectsMap, 'projectList', 'projectStore');

          set({
            projects: projectsMap,
            isLoading: false,
            lastUpdate: new Date().toISOString(),
            retryCount: 0,
            loadingLock: false // CRITICAL: Always reset loadingLock
          });

          logger.info(`✅ Loaded ${projects.length} projects and cached`);
        } catch (error) {
          logger.error('❌ Failed to load projects:', error);
          const { retryCount, maxRetries } = get();
          
          if (retryCount < maxRetries) {
            set({
              error: error.message,
              isLoading: false,
              retryCount: retryCount + 1,
              loadingLock: false // CRITICAL: Always reset loadingLock
            });
            
            // Retry after delay
            setTimeout(() => {
              get().loadProjects();
            }, 2000 * (retryCount + 1));
          } else {
            set({
              error: error.message,
              isLoading: false,
              retryCount: 0,
              loadingLock: false // CRITICAL: Always reset loadingLock
            });
          }
        }
      },

      /**
       * Create a new project with cache invalidation
       */
      createProject: async (projectData) => {
        try {
          set({ isLoading: true, error: null });
          logger.info('Creating project:', projectData.name);

          const { user } = useAuthStore.getState();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Generate project ID if not provided
          const projectId = projectData.id || generateProjectId(projectData.name, projectData.workspacePath);

          const response = await apiService.call('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...projectData,
              id: projectId,
              userId: user.id
            })
          });

          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }

          const newProject = {
            ...response,
            lastUpdate: new Date().toISOString(),
            metadata: {
              ...response.metadata,
              lastAccessed: new Date().toISOString(),
              accessCount: 0
            }
          };

          // Invalidate cache
          const cacheKey = `projectStore:projects:list:${user.id}`;
          cacheService.delete(cacheKey);
          cacheService.invalidateNamespace('projectStore');

          set(state => ({
            projects: {
              ...state.projects,
              [projectId]: newProject
            },
            isLoading: false,
            lastUpdate: new Date().toISOString()
          }));

          logger.info(`✅ Project created: ${projectId}`);
          
          // Refresh the project list to ensure consistency
          setTimeout(() => {
            get().loadProjects();
          }, 100);
          
          return newProject;
        } catch (error) {
          logger.error('❌ Failed to create project:', error);
          set({
            error: error.message,
            isLoading: false
          });
          throw error;
        }
      },

      /**
       * Update an existing project with cache invalidation
       */
      updateProject: async (projectId, updates) => {
        try {
          set({ isLoading: true, error: null });
          logger.info('Updating project:', projectId);

          const { user } = useAuthStore.getState();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const response = await apiService.call(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
          });

          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }

          const updatedProject = {
            ...response.data,
            lastUpdate: new Date().toISOString()
          };

          // Invalidate cache
          const cacheKey = `projectStore:projects:list:${user.id}`;
          const projectCacheKey = `projectStore:project:${projectId}`;
          cacheService.delete(cacheKey);
          cacheService.delete(projectCacheKey);
          cacheService.invalidateNamespace('projectStore');

          set(state => ({
            projects: {
              ...state.projects,
              [projectId]: updatedProject
            },
            isLoading: false,
            lastUpdate: new Date().toISOString()
          }));

          logger.info(`✅ Project updated: ${projectId}`);
          return updatedProject;
        } catch (error) {
          logger.error('❌ Failed to update project:', error);
          set({
            error: error.message,
            isLoading: false
          });
          throw error;
        }
      },

      /**
       * Delete a project with cache invalidation
       */
      deleteProject: async (projectId) => {
        try {
          set({ isLoading: true, error: null });
          logger.info('Deleting project:', projectId);

          const { user } = useAuthStore.getState();
          if (!user) {
            throw new Error('User not authenticated');
          }

          const response = await apiService.call(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }

          // Invalidate cache
          const cacheKey = `projectStore:projects:list:${user.id}`;
          const projectCacheKey = `projectStore:project:${projectId}`;
          cacheService.delete(cacheKey);
          cacheService.delete(projectCacheKey);
          cacheService.invalidateNamespace('projectStore');

          set(state => {
            const { [projectId]: deleted, ...remainingProjects } = state.projects;
            return {
              projects: remainingProjects,
              activeProject: state.activeProject === projectId ? null : state.activeProject,
              isLoading: false,
              lastUpdate: new Date().toISOString()
            };
          });

          logger.info(`✅ Project deleted: ${projectId}`);
        } catch (error) {
          logger.error('❌ Failed to delete project:', error);
          set({
            error: error.message,
            isLoading: false
          });
          throw error;
        }
      },

      /**
       * Set the selected project
       */
      setSelectedProject: (projectId) => {
        const { projects } = get();
        const project = projects[projectId];
        
        if (!project) {
          logger.warn('Project not found:', projectId);
          return;
        }

        set({
          selectedProject: projectId
        });

        // Update access metadata
        get().updateProjectMetadata(projectId, {
          lastAccessed: new Date().toISOString(),
          accessCount: (project.metadata?.accessCount || 0) + 1
        });

        logger.info('Selected project set:', projectId);
      },

      /**
       * Get project by ID with caching
       */
      getProject: (projectId) => {
        const { projects } = get();
        
        // Try cache first
        const cacheKey = `projectStore:project:${projectId}`;
        const cachedProject = cacheService.get(cacheKey);
        
        if (cachedProject) {
          return cachedProject;
        }
        
        const project = projects[projectId];
        if (project) {
          // Cache the project
          cacheService.set(cacheKey, project, 'projectStore', 'projectStore');
        }
        
        return project || null;
      },

      /**
       * Get project by workspace path
       */
      getProjectByWorkspace: (workspacePath) => {
        const { projects } = get();
        return Object.values(projects).find(project => 
          project.workspacePath === workspacePath
        ) || null;
      },

      /**
       * Update project metadata
       */
      updateProjectMetadata: (projectId, metadataUpdates) => {
        set(state => {
          const project = state.projects[projectId];
          if (!project) return state;

          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                metadata: {
                  ...project.metadata,
                  ...metadataUpdates
                },
                lastUpdate: new Date().toISOString()
              }
            }
          };
        });
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Force stop loading state
       */
      stopLoading: () => {
        logger.warn('🛑 FORCE STOPPING loading state - clearing all locks!');
        set({ 
          isLoading: false, 
          loadingLock: false, 
          error: 'Loading stopped by user',
          retryCount: 0 // Reset retry count too
        });
      },

      /**
       * Refresh projects data - MODERN CACHE STRATEGY
       * User wants fresh data → Clear cache + reload
       */
      refresh: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;
        
        // USER ACTION: Clear cache + fresh data
        const cacheKey = `projectStore:projects:list:${user.id}`;
        cacheService.delete(cacheKey);
        logger.info('🔄 User refresh: Cache cleared for fresh data');
        
        await get().loadProjects();
      },

      /**
       * Get project statistics with caching
       */
      getProjectStats: () => {
        const { projects, lastUpdate } = get();
        
        // Try cache first
        const cacheKey = 'projectStore:stats';
        const cachedStats = cacheService.get(cacheKey);
        
        if (cachedStats) {
          return cachedStats;
        }
        
        const projectList = Object.values(projects);
        const stats = {
          total: projectList.length,
          active: projectList.filter(p => p.status === 'active').length,
          inactive: projectList.filter(p => p.status === 'inactive').length,
          lastUpdate: lastUpdate
        };
        
        // Cache the stats
        cacheService.set(cacheKey, stats, 'projectStats', 'projectStore');
        
        return stats;
      },

      /**
       * Search projects
       */
      searchProjects: (query) => {
        const { projects } = get();
        const projectList = Object.values(projects);
        
        if (!query) return projectList;
        
        const lowercaseQuery = query.toLowerCase();
        return projectList.filter(project => 
          project.name.toLowerCase().includes(lowercaseQuery) ||
          project.description?.toLowerCase().includes(lowercaseQuery) ||
          project.workspacePath.toLowerCase().includes(lowercaseQuery)
        );
      },

      /**
       * Clean up old project data with cache cleanup
       */
      cleanup: () => {
        const { projects, projectConfig } = get();
        const projectList = Object.values(projects);
        
        if (projectList.length <= projectConfig.maxCacheSize) {
          return;
        }

        // Sort by last accessed and remove oldest
        const sortedProjects = projectList
          .sort((a, b) => new Date(a.metadata?.lastAccessed || 0) - new Date(b.metadata?.lastAccessed || 0));
        
        const projectsToRemove = sortedProjects.slice(0, projectList.length - projectConfig.maxCacheSize);
        
        // Clean up cache for removed projects
        projectsToRemove.forEach(project => {
          const projectCacheKey = `projectStore:project:${project.id}`;
          cacheService.delete(projectCacheKey);
        });
        
        set(state => {
          const updatedProjects = { ...state.projects };
          projectsToRemove.forEach(project => {
            delete updatedProjects[project.id];
          });
          
          return {
            projects: updatedProjects,
            lastUpdate: new Date().toISOString()
          };
        });

        logger.info(`Cleaned up ${projectsToRemove.length} old projects and cache entries`);
      },

      /**
       * Get cache statistics for ProjectStore
       */
      getCacheStats: () => {
        return cacheService.getStats();
      },

      /**
       * Clear all ProjectStore cache
       */
      clearCache: () => {
        cacheService.invalidateNamespace('projectStore');
        logger.info('ProjectStore cache cleared');
      },

      // IDEStore migration: Git functions
      loadGitStatus: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          logger.info('Loading git status for workspace:', workspacePath, 'projectId:', projectId);
          
          // Check cache first
          const cacheKey = `projectStore:git:${projectId}:status`;
          const cachedStatus = cacheService.get(cacheKey);
          
          if (cachedStatus) {
            logger.info('✅ Using cached git status');
            set(state => ({
              projectData: {
                ...state.projectData,
                git: {
                  ...state.projectData.git,
                  [workspacePath]: cachedStatus
                },
                lastUpdate: new Date().toISOString()
              }
            }));
            return cachedStatus;
          }
          
          // Load from API
          const response = await apiService.call(`/api/projects/${projectId}/git/status`, {
            method: 'GET'
          });
          
          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }
          
          const gitData = {
            status: response.data,
            lastUpdate: new Date().toISOString()
          };
          
          // Cache the result
          cacheService.set(cacheKey, gitData, 'projectMetadata', 'projectStore');
          
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: gitData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('✅ Loaded git status and cached');
          return gitData;
        } catch (error) {
          logger.error('❌ Failed to load git status:', error);
          throw error;
        }
      },

      refreshGitStatus: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          // Clear cache for this workspace
          const cacheKey = `projectStore:git:${projectId}:status`;
          cacheService.delete(cacheKey);
          
          // Reload git status
          return await get().loadGitStatus(workspacePath);
        } catch (error) {
          logger.error('❌ Failed to refresh git status:', error);
          throw error;
        }
      },

      // IDEStore migration: Analysis functions
      loadAnalysisData: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          logger.info('Loading analysis data for workspace:', workspacePath, 'projectId:', projectId);
          
          // Check cache first
          const cacheKey = `projectStore:analysis:${projectId}:data`;
          const cachedAnalysis = cacheService.get(cacheKey);
          
          if (cachedAnalysis) {
            logger.info('✅ Using cached analysis data');
            set(state => ({
              projectData: {
                ...state.projectData,
                analysis: {
                  ...state.projectData.analysis,
                  [workspacePath]: cachedAnalysis
                },
                lastUpdate: new Date().toISOString()
              }
            }));
            return cachedAnalysis;
          }
          
          // Load from API
          const response = await apiService.call(`/api/projects/${projectId}/analysis`, {
            method: 'GET'
          });
          
          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }
          
          const analysisData = {
            status: response.data.status,
            metrics: response.data.metrics,
            history: response.data.history || [],
            lastUpdate: new Date().toISOString()
          };
          
          // Cache the result
          cacheService.set(cacheKey, analysisData, 'projectMetadata', 'projectStore');
          
          set(state => ({
            projectData: {
              ...state.projectData,
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: analysisData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('✅ Loaded analysis data and cached');
          return analysisData;
        } catch (error) {
          logger.error('❌ Failed to load analysis data:', error);
          throw error;
        }
      },

      // IDEStore migration: Chat functions
      loadChatData: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          logger.info('Loading chat data for workspace:', workspacePath, 'projectId:', projectId);
          
          // Check cache first
          const cacheKey = `projectStore:chat:${projectId}:data`;
          const cachedChat = cacheService.get(cacheKey);
          
          if (cachedChat) {
            logger.info('✅ Using cached chat data');
            set(state => ({
              projectData: {
                ...state.projectData,
                chat: {
                  ...state.projectData.chat,
                  [workspacePath]: cachedChat
                },
                lastUpdate: new Date().toISOString()
              }
            }));
            return cachedChat;
          }
          
          // Load from API
          const response = await apiService.call(`/api/projects/${projectId}/chat`, {
            method: 'GET'
          });
          
          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }
          
          const chatData = {
            messages: response.data.messages || [],
            lastUpdate: new Date().toISOString()
          };
          
          // Cache the result
          cacheService.set(cacheKey, chatData, 'projectMetadata', 'projectStore');
          
          set(state => ({
            projectData: {
              ...state.projectData,
              chat: {
                ...state.projectData.chat,
                [workspacePath]: chatData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('✅ Loaded chat data and cached');
          return chatData;
        } catch (error) {
          logger.error('❌ Failed to load chat data:', error);
          throw error;
        }
      },

      // IDEStore migration: Task functions
      loadProjectTasks: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          logger.info('Loading project tasks for workspace:', workspacePath, 'projectId:', projectId);
          
          // Check cache first
          const cacheKey = `projectStore:tasks:${projectId}:data`;
          const cachedTasks = cacheService.get(cacheKey);
          
          if (cachedTasks) {
            logger.info('✅ Using cached tasks data');
            set(state => ({
              projectData: {
                ...state.projectData,
                tasks: {
                  ...state.projectData.tasks,
                  [workspacePath]: cachedTasks
                },
                lastUpdate: new Date().toISOString()
              }
            }));
            return cachedTasks;
          }
          
          // Load from API
          const response = await apiService.call(`/api/projects/${projectId}/tasks`, {
            method: 'GET'
          });
          
          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }
          
          const tasksData = {
            tasks: response.data.tasks || [],
            lastUpdate: new Date().toISOString()
          };
          
          // Cache the result
          cacheService.set(cacheKey, tasksData, 'projectMetadata', 'projectStore');
          
          set(state => ({
            projectData: {
              ...state.projectData,
              tasks: {
                ...state.projectData.tasks,
                [workspacePath]: tasksData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('✅ Loaded project tasks and cached');
          return tasksData;
        } catch (error) {
          logger.error('❌ Failed to load project tasks:', error);
          throw error;
        }
      },

      // IDEStore migration: Category analysis functions
      loadCategoryAnalysisData: async (workspacePath, category, endpoint) => {
        if (!workspacePath || !category) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          logger.info('Loading category analysis data:', { workspacePath, projectId, category, endpoint });
          
          // Check cache first
          const cacheKey = `projectStore:category:${projectId}:${category}:data`;
          const cachedCategoryData = cacheService.get(cacheKey);
          
          if (cachedCategoryData) {
            logger.info('✅ Using cached category analysis data');
            set(state => ({
              categoryAnalysisData: {
                ...state.categoryAnalysisData,
                [workspacePath]: {
                  ...state.categoryAnalysisData[workspacePath],
                  [category]: cachedCategoryData
                }
              }
            }));
            return cachedCategoryData;
          }
          
          // Load from API
          const apiEndpoint = endpoint || `/api/projects/${projectId}/analysis/${category}`;
          const response = await apiService.call(apiEndpoint, {
            method: 'GET'
          });
          
          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }
          
          const categoryData = {
            recommendations: response.data.recommendations || null,
            issues: response.data.issues || null,
            metrics: response.data.metrics || null,
            summary: response.data.summary || null,
            results: response.data.results || null,
            lastUpdate: new Date().toISOString()
          };
          
          // Cache the result
          cacheService.set(cacheKey, categoryData, 'projectMetadata', 'projectStore');
          
          set(state => ({
            categoryAnalysisData: {
              ...state.categoryAnalysisData,
              [workspacePath]: {
                ...state.categoryAnalysisData[workspacePath],
                [category]: categoryData
              }
            }
          }));
          
          logger.info('✅ Loaded category analysis data and cached');
          return categoryData;
        } catch (error) {
          logger.error('❌ Failed to load category analysis data:', error);
          throw error;
        }
      },

      // IDEStore migration: WebSocket functions
      setupWebSocketListeners: () => {
        logger.info('Setting up WebSocket listeners for ProjectStore');
        // TODO: Implement WebSocket listeners for real-time updates
      },

      cleanupWebSocketListeners: () => {
        logger.info('Cleaning up WebSocket listeners for ProjectStore');
        // TODO: Implement WebSocket cleanup
      },

      // IDEStore migration: Cache invalidation
      invalidateProjectCache: (workspacePath) => {
        if (!workspacePath) return;
        
        const projectId = getProjectIdFromWorkspace(workspacePath);
        if (!projectId) return;
        
        // Invalidate all cache entries for this project
        const keysToDelete = [
          `projectStore:git:${projectId}:status`,
          `projectStore:analysis:${projectId}:data`,
          `projectStore:chat:${projectId}:data`,
          `projectStore:tasks:${projectId}:data`
        ];
        
        keysToDelete.forEach(key => cacheService.delete(key));
        
        // Invalidate category analysis cache
        Object.keys(get().categoryAnalysisData[workspacePath] || {}).forEach(category => {
          cacheService.delete(`projectStore:category:${projectId}:${category}:data`);
        });
        
        logger.info('✅ Invalidated project cache for:', workspacePath);
      },


      // Chat Management Functions (migrated from IDEStore)
      addChatMessage: (workspacePath, message) => {
        try {
          if (!workspacePath || !message) {
            logger.warn('Invalid parameters for addChatMessage');
            return;
          }

          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) {
            logger.warn('Could not determine project ID for workspace:', workspacePath);
            return;
          }

          set(state => {
            const currentChatData = state.projectData.chat[workspacePath];
            const messages = currentChatData?.messages || [];
            
            const newMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: message.content,
              sender: message.sender || 'user',
              timestamp: new Date().toISOString(),
              type: message.type || 'text',
              metadata: message.metadata || {}
            };

            const updatedChatData = {
              messages: [...messages, newMessage],
              lastUpdate: new Date().toISOString()
            };

            // Update cache
            const cacheKey = `projectStore:chat:${projectId}:data`;
            cacheService.set(cacheKey, updatedChatData, 'projectMetadata', 'projectStore');

            return {
              projectData: {
                ...state.projectData,
                chat: {
                  ...state.projectData.chat,
                  [workspacePath]: updatedChatData
                },
                lastUpdate: new Date().toISOString()
              }
            };
          });

          logger.info('✅ Chat message added for workspace:', workspacePath);
        } catch (error) {
          logger.error('❌ Failed to add chat message:', error);
        }
      },

      initializeEmptyChatData: (workspacePath) => {
        try {
          if (!workspacePath) {
            logger.warn('Workspace path required for initializeEmptyChatData');
            return;
          }

          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) {
            logger.warn('Could not determine project ID for workspace:', workspacePath);
            return;
          }

          const emptyChatData = {
            messages: [],
            lastUpdate: new Date().toISOString()
          };

          set(state => ({
            projectData: {
              ...state.projectData,
              chat: {
                ...state.projectData.chat,
                [workspacePath]: emptyChatData
              },
              lastUpdate: new Date().toISOString()
            }
          }));

          // Cache the empty data
          const cacheKey = `projectStore:chat:${projectId}:data`;
          cacheService.set(cacheKey, emptyChatData, 'projectMetadata', 'projectStore');

          logger.info('✅ Empty chat data initialized for workspace:', workspacePath);
        } catch (error) {
          logger.error('❌ Failed to initialize empty chat data:', error);
        }
      },

      // Utility Functions (project-specific only)
      reset: () => {
        set({
          projects: {},
          selectedProject: null,
          isLoading: false,
          error: null,
          lastUpdate: null,
          retryCount: 0,
          projectData: {
            git: {},
            analysis: {},
            chat: {},
            tasks: {},
            lastUpdate: null
          },
          categoryAnalysisData: {}
        });
        
        // Clear all cache
        cacheService.invalidateNamespace('projectStore');
        logger.info('ProjectStore reset - cache cleared');
      },

      debugPerformance: () => {
        const stats = cacheService.getStats();
        const { projects, selectedProject } = get();
        
        logger.info('ProjectStore Performance Debug:', {
          cacheServiceStats: stats,
          memoryUsage: {
            cacheSize: stats.memorySize,
            entryCount: stats.memoryEntries,
            hitRate: stats.hitRate
          },
          projectStore: {
            projectCount: Object.keys(projects).length,
            selectedProject
          }
        });
        return stats;
      },

      getProjectCommands: async (projectId) => {
        try {
          if (!projectId) {
            throw new Error('Project ID required');
          }

          const response = await apiService.call(`/api/projects/${projectId}/commands`, {
            method: 'GET'
          });

          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }

          return response.data;
        } catch (error) {
          logger.error('❌ Failed to get project commands:', error);
          throw error;
        }
      },

      executeProjectCommand: async (projectId, commandType) => {
        try {
          if (!projectId || !commandType) {
            throw new Error('Project ID and command type required');
          }

          const response = await apiService.call(`/api/projects/${projectId}/execute-command`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ commandType })
          });

          // Handle direct data response (no success wrapper)
          if (!response) {
            throw new Error('No response received from server');
          }

          return response.data;
        } catch (error) {
          logger.error('❌ Failed to execute project command:', error);
          throw error;
        }
      },

      // Data Management Functions (migrated from IDEStore)
      getCategoryAnalysisData: (workspacePath = null, category = null, endpoint = null) => {
        try {
          const { categoryAnalysisData, selectedProject } = get();
          const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
          
          if (!targetWorkspacePath) {
            logger.warn('No workspace path available for getCategoryAnalysisData');
            return null;
          }

          const categoryData = categoryAnalysisData[targetWorkspacePath];
          if (!categoryData) {
            return null;
          }

          if (category) {
            return categoryData[category] || null;
          }

          return categoryData;
        } catch (error) {
          logger.error('❌ Failed to get category analysis data:', error);
          return null;
        }
      },

      isCategoryDataLoaded: (workspacePath = null, category = null, endpoint = null) => {
        try {
          const { categoryAnalysisData, selectedProject } = get();
          const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
          
          if (!targetWorkspacePath) {
            return false;
          }

          const categoryData = categoryAnalysisData[targetWorkspacePath];
          if (!categoryData) {
            return false;
          }

          if (category) {
            return !!(categoryData[category] && categoryData[category].lastUpdate);
          }

          return Object.keys(categoryData).some(key => 
            categoryData[key] && categoryData[key].lastUpdate
          );
        } catch (error) {
          logger.error('❌ Failed to check if category data is loaded:', error);
          return false;
        }
      },

      clearCategoryAnalysisData: (workspacePath = null) => {
        try {
          const { selectedProject } = get();
          const targetWorkspacePath = workspacePath || selectedProject?.workspacePath;
          
          if (!targetWorkspacePath) {
            logger.warn('No workspace path available for clearCategoryAnalysisData');
            return;
          }

          const projectId = getProjectIdFromWorkspace(targetWorkspacePath);
          if (!projectId) {
            logger.warn('Could not determine project ID for workspace:', targetWorkspacePath);
            return;
          }

          // Clear from state
          set(state => {
            const updatedCategoryData = { ...state.categoryAnalysisData };
            delete updatedCategoryData[targetWorkspacePath];
            
            return {
              categoryAnalysisData: updatedCategoryData
            };
          });

          // Clear from cache
          const categories = ['security', 'performance', 'architecture', 'codeQuality', 'dependencies', 'manifest', 'techStack'];
          categories.forEach(category => {
            const cacheKey = `projectStore:category:${projectId}:${category}:data`;
            cacheService.delete(cacheKey);
          });

          logger.info('✅ Category analysis data cleared for workspace:', targetWorkspacePath);
        } catch (error) {
          logger.error('❌ Failed to clear category analysis data:', error);
        }
      },

      loadProjectData: async (workspacePath) => {
        try {
          if (!workspacePath) {
            logger.warn('Workspace path required for loadProjectData');
            return;
          }

          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) {
            logger.warn('Could not determine project ID for workspace:', workspacePath);
            return;
          }

          logger.info('Loading project data for workspace:', workspacePath, 'projectId:', projectId);

          // Load all project data in parallel
          const promises = [
            get().loadGitStatus(workspacePath),
            get().loadAnalysisData(workspacePath),
            get().loadChatData(workspacePath),
            get().loadProjectTasks(workspacePath)
          ];

          await Promise.allSettled(promises);

          logger.info('✅ Project data loaded for workspace:', workspacePath);
        } catch (error) {
          logger.error('❌ Failed to load project data:', error);
          throw error;
        }
      },

      loadProjectDataForPort: async (workspacePath) => {
        try {
          if (!workspacePath) {
            logger.warn('Workspace path required for loadProjectDataForPort');
            return;
          }

          // Initialize empty data if not exists
          get().initializeEmptyData(workspacePath);

          // Load project data
          await get().loadProjectData(workspacePath);

          logger.info('✅ Project data loaded for port workspace:', workspacePath);
        } catch (error) {
          logger.error('❌ Failed to load project data for port:', error);
          throw error;
        }
      },

      initializeEmptyData: (workspacePath) => {
        try {
          if (!workspacePath) {
            logger.warn('Workspace path required for initializeEmptyData');
            return;
          }

          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) {
            logger.warn('Could not determine project ID for workspace:', workspacePath);
            return;
          }

          const emptyData = {
            git: { status: null, lastUpdate: null },
            analysis: { status: null, metrics: null, history: [], lastUpdate: null },
            chat: { messages: [], lastUpdate: null },
            tasks: { tasks: [], lastUpdate: null }
          };

          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: emptyData.git
              },
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: emptyData.analysis
              },
              chat: {
                ...state.projectData.chat,
                [workspacePath]: emptyData.chat
              },
              tasks: {
                ...state.projectData.tasks,
                [workspacePath]: emptyData.tasks
              },
              lastUpdate: new Date().toISOString()
            }
          }));

          // Cache empty data
          const cacheKeys = [
            `projectStore:git:${projectId}:status`,
            `projectStore:analysis:${projectId}:data`,
            `projectStore:chat:${projectId}:data`,
            `projectStore:tasks:${projectId}:data`
          ];

          cacheKeys.forEach((key, index) => {
            const dataType = ['git', 'analysis', 'chat', 'tasks'][index];
            cacheService.set(key, emptyData[dataType], 'projectMetadata', 'projectStore');
          });

          logger.info('✅ Empty data initialized for workspace:', workspacePath);
        } catch (error) {
          logger.error('❌ Failed to initialize empty data:', error);
        }
      }
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        projects: state.projects,
        selectedProject: state.selectedProject,
        projectConfig: state.projectConfig
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          logger.info('Project store rehydrated:', {
            projectCount: Object.keys(state.projects || {}).length,
            selectedProject: state.selectedProject
          });
          
          // Clean up old data on rehydration
          if (state.cleanup) {
            state.cleanup();
          }
        }
      }
    }
  )
);

export default useProjectStore;
