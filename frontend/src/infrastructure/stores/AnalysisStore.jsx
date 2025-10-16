/**
 * AnalysisStore
 * Refactored store using DDD patterns
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalysisApplicationService } from '../../application/services/AnalysisApplicationService.js';
import { AnalysisRepository } from '../repositories/AnalysisRepository.js';
import { EventBus } from '../events/EventBus.js';
import { ApiService } from '../services/ApiService.js';
import { CacheService } from '../services/CacheService.js';

const useAnalysisStore = create(
  persist(
    (set, get) => ({
      // State
      analyses: {},
      isLoading: false,
      error: null,
      lastUpdate: null,

      // Services (initialized lazily)
      _analysisApplicationService: null,
      _eventBus: null,

      // Initialize services
      initializeServices: () => {
        const state = get();
        if (!state._analysisApplicationService) {
          const apiService = new ApiService();
          const cacheService = new CacheService();
          const analysisRepository = new AnalysisRepository(apiService, cacheService);
          const eventBus = new EventBus();
          
          state._analysisApplicationService = new AnalysisApplicationService(analysisRepository, eventBus);
          state._eventBus = eventBus;
          
          set({ 
            _analysisApplicationService: state._analysisApplicationService,
            _eventBus: eventBus
          });
        }
      },

      // Actions
      startAnalysis: async (projectId, category, options = {}) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const { StartAnalysisCommand } = await import('../../application/commands/StartAnalysisCommand.js');
          const command = new StartAnalysisCommand(projectId, category, options);

          const analysis = await state._analysisApplicationService.startAnalysis(command);
          
          set(state => ({
            analyses: {
              ...state.analyses,
              [analysis.id]: analysis.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return analysis;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      completeAnalysis: async (analysisId, results) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const analysis = await state._analysisApplicationService.completeAnalysis(analysisId, results);
          
          set(state => ({
            analyses: {
              ...state.analyses,
              [analysis.id]: analysis.toJSON()
            },
            isLoading: false,
            lastUpdate: new Date()
          }));

          return analysis;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      loadAnalyses: async (options = {}) => {
        try {
          set({ isLoading: true, error: null });
          
          const state = get();
          state.initializeServices();
          
          const { GetAnalysisQuery } = await import('../../application/queries/GetAnalysisQuery.js');
          const query = new GetAnalysisQuery(options);

          const result = await state._analysisApplicationService.getAnalysis(query);
          
          const analysesMap = {};
          result.analyses.forEach(analysis => {
            analysesMap[analysis.id] = analysis;
          });
          
          set({
            analyses: analysesMap,
            isLoading: false,
            lastUpdate: new Date()
          });

          return result;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      getLatestAnalysis: async (projectId, category) => {
        try {
          const state = get();
          state.initializeServices();
          
          const analysis = await state._analysisApplicationService.getLatestAnalysis(projectId, category);
          return analysis;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      getAnalysisStatistics: async (projectId) => {
        try {
          const state = get();
          state.initializeServices();
          
          const statistics = await state._analysisApplicationService.getAnalysisStatistics(projectId);
          return statistics;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      getRecommendedCategories: async (projectId) => {
        try {
          const state = get();
          state.initializeServices();
          
          const categories = await state._analysisApplicationService.getRecommendedCategories(projectId);
          return categories;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      // Computed getters
      getAnalysisList: () => {
        const state = get();
        return Object.values(state.analyses);
      },

      getAnalysesByProject: (projectId) => {
        const state = get();
        return Object.values(state.analyses).filter(analysis => analysis.projectId === projectId);
      },

      getAnalysesByCategory: (category) => {
        const state = get();
        return Object.values(state.analyses).filter(analysis => analysis.category === category);
      },

      getAnalysesByStatus: (status) => {
        const state = get();
        return Object.values(state.analyses).filter(analysis => analysis.status === status);
      },

      getRunningAnalyses: () => {
        const state = get();
        return Object.values(state.analyses).filter(analysis => analysis.status === 'running');
      },

      getCompletedAnalyses: () => {
        const state = get();
        return Object.values(state.analyses).filter(analysis => analysis.status === 'completed');
      },

      getAnalysisById: (analysisId) => {
        const state = get();
        return state.analyses[analysisId] || null;
      }
    }),
    {
      name: 'analysis-store',
      partialize: (state) => ({
        analyses: state.analyses,
        lastUpdate: state.lastUpdate
      })
    }
  )
);

export default useAnalysisStore;
