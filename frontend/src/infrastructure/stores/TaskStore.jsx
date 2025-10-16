/**
 * TaskStore
 * Refactored store using DDD patterns
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TaskApplicationService } from '../../application/services/TaskApplicationService.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { EventBus } from '../events/EventBus.js';
import { ApiService } from '../services/ApiService.js';
import { CacheService } from '../services/CacheService.js';

const useTaskStore = create(
  persist(
    (set, get) => ({
      // State
      tasks: {},
      isLoading: false,
      error: null,
      lastUpdate: null,

      // Services (initialized lazily)
      _taskApplicationService: null,
      _eventBus: null,

      // Initialize services
      initializeServices: () => {
        const state = get();
        if (!state._taskApplicationService) {
          const apiService = new ApiService();
          const cacheService = new CacheService();
          const taskRepository = new TaskRepository(apiService, cacheService);
          const eventBus = new EventBus();
          
          state._taskApplicationService = new TaskApplicationService(taskRepository, eventBus);
          state._eventBus = eventBus;
          
          set({ 
            _taskApplicationService: state._taskApplicationService,
            _eventBus: eventBus
          });
        }
      },

      // Actions
      createTask: async (projectId, type, options = {}) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const task = await state._taskApplicationService.createTask(projectId, type, options);
          
          set(state => ({
            tasks: {
              ...state.tasks,
              [task.id]: task.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return task;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      executeTask: async (taskId, options = {}) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const { ExecuteTaskCommand } = await import('../../application/commands/ExecuteTaskCommand.js');
          const command = new ExecuteTaskCommand(taskId, options);

          const task = await state._taskApplicationService.executeTask(command);
          
          set(state => ({
            tasks: {
              ...state.tasks,
              [task.id]: task.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return task;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      completeTask: async (taskId) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const task = await state._taskApplicationService.completeTask(taskId);
          
          set(state => ({
            tasks: {
              ...state.tasks,
              [task.id]: task.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return task;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      updateTaskProgress: async (taskId, progress) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const task = await state._taskApplicationService.updateTaskProgress(taskId, progress);
          
          set(state => ({
            tasks: {
              ...state.tasks,
              [task.id]: task.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return task;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      cancelTask: async (taskId) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const task = await state._taskApplicationService.cancelTask(taskId);
          
          set(state => ({
            tasks: {
              ...state.tasks,
              [task.id]: task.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return task;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      loadTasks: async (options = {}) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const { GetTasksQuery } = await import('../../application/queries/GetTasksQuery.js');
          const query = new GetTasksQuery(options);

          const result = await state._taskApplicationService.getTasks(query);
          
          const tasksMap = {};
          result.tasks.forEach(task => {
            tasksMap[task.id] = task;
          });
          
          set({
            tasks: tasksMap,
            isLoading: false,
            lastUpdate: new Date()
          });

          return result;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      getTaskStatistics: async (projectId) => {
        try {
          const state = get();
          state.initializeServices();
          
          const statistics = await state._taskApplicationService.getTaskStatistics(projectId);
          return statistics;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      // Computed getters
      getTaskList: () => {
        const state = get();
        return Object.values(state.tasks);
      },

      getTasksByProject: (projectId) => {
        const state = get();
        return Object.values(state.tasks).filter(task => task.projectId === projectId);
      },

      getTasksByStatus: (status) => {
        const state = get();
        return Object.values(state.tasks).filter(task => task.status === status);
      },

      getTasksByType: (type) => {
        const state = get();
        return Object.values(state.tasks).filter(task => task.type === type);
      },

      getActiveTasks: () => {
        const state = get();
        return Object.values(state.tasks).filter(task => task.status === 'running');
      },

      getTaskById: (taskId) => {
        const state = get();
        return state.tasks[taskId] || null;
      }
    }),
    {
      name: 'task-store',
      partialize: (state) => ({
        tasks: state.tasks,
        lastUpdate: state.lastUpdate
      })
    }
  )
);

export default useTaskStore;
