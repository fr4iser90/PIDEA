/**
 * ProjectStore
 * Refactored store using DDD patterns
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectApplicationService } from '../../application/services/ProjectApplicationService.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import EventBus from '../events/EventBus.jsx';
import { ApiService } from '../services/ApiService.js';
import { CacheService } from '../services/CacheService.js';

const useProjectStore = create(
  persist(
    (set, get) => ({
      // State
      projects: {},
      selectedProject: null,
      isLoading: false,
      error: null,
      lastUpdate: null,

      // Services (initialized lazily)
      _projectApplicationService: null,
      _eventBus: null,

      // Initialize services
      initializeServices: () => {
        const state = get();
        if (!state._projectApplicationService) {
          const apiService = new ApiService();
          const cacheService = new CacheService();
          const projectRepository = new ProjectRepository(apiService, cacheService);
          const eventBus = new EventBus();
          
          state._projectApplicationService = new ProjectApplicationService(projectRepository, eventBus);
          state._eventBus = eventBus;
          
          set({ 
            _projectApplicationService: state._projectApplicationService,
            _eventBus: eventBus
          });
        }
      },

      // Actions
      createProject: async (projectData) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const { CreateProjectCommand } = await import('../../application/commands/CreateProjectCommand.js');
          const command = new CreateProjectCommand(
            projectData.name,
            projectData.workspacePath,
            {
              description: projectData.description,
              type: projectData.type,
              framework: projectData.framework,
              language: projectData.language,
              packageManager: projectData.packageManager,
              portConfiguration: projectData.portConfiguration,
              metadata: projectData.metadata
            }
          );

          const project = await state._projectApplicationService.createProject(command);
          
          set(state => ({
            projects: {
              ...state.projects,
              [project.id.value]: project.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return project;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      updateProject: async (projectId, updates) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const project = await state._projectApplicationService.updateProject(projectId, updates);
          
          set(state => ({
            projects: {
              ...state.projects,
              [project.id.value]: project.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return project;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      deleteProject: async (projectId) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          await state._projectApplicationService.deleteProject(projectId);
          
          set(state => {
            const { [projectId]: deleted, ...remainingProjects } = state.projects;
            return {
              projects: remainingProjects,
              selectedProject: state.selectedProject?.id === projectId ? null : state.selectedProject,
              isLoading: false,
              lastUpdate: new Date()
            };
          });
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      loadProjects: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const projects = await state._projectApplicationService.listProjects();
          
          const projectsMap = {};
          projects.forEach(project => {
            projectsMap[project.id] = project;
          });
          
          set({
            projects: projectsMap,
            isLoading: false,
            lastUpdate: new Date()
          });
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      getProject: async (projectId) => {
        try {
          const state = get();
          state.initializeServices();
          
          const { GetProjectQuery } = await import('../../application/queries/GetProjectQuery.js');
          const query = new GetProjectQuery(projectId, {
            includeStatistics: true,
            includeTasks: true,
            includeAnalysis: true
          });

          const result = await state._projectApplicationService.getProject(query);
          return result;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      selectProject: (projectId) => {
        const state = get();
        const project = state.projects[projectId];
        set({ selectedProject: project || null });
      },

      searchProjects: async (query, options = {}) => {
        try {
          const state = get();
          state.initializeServices();
          
          const projects = await state._projectApplicationService.searchProjects(query, options);
          return projects;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      getProjectStatistics: async (projectId) => {
        try {
          const state = get();
          state.initializeServices();
          
          const statistics = await state._projectApplicationService.getProjectStatistics(projectId);
          return statistics;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      // Computed getters
      getProjectList: () => {
        const state = get();
        return Object.values(state.projects);
      },

      getActiveProjects: () => {
        const state = get();
        return Object.values(state.projects).filter(project => project.isActive);
      },

      getProjectById: (projectId) => {
        const state = get();
        return state.projects[projectId] || null;
      }
    }),
    {
      name: 'project-store',
      partialize: (state) => ({
        projects: state.projects,
        selectedProject: state.selectedProject,
        lastUpdate: state.lastUpdate
      })
    }
  )
);

export default useProjectStore;