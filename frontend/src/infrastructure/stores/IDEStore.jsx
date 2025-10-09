/**
 * IDE Store
 * Dedicated state management for IDE port management with persistence
 * EXTENDED with project data (git and analysis)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/infrastructure/logging/Logger';
import { apiCall } from '@/infrastructure/repositories/APIChatRepository.jsx';
import useAuthStore from './AuthStore.jsx';
import { cacheService } from '@/infrastructure/services/CacheService';
import useIDESwitchOptimizationStore from './IDESwitchOptimizationStore.jsx';
import performanceLogger from '@/infrastructure/services/PerformanceLogger';

// Using CacheService for caching instead of RequestDeduplicationService

// Helper function to get project ID from workspace path
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return null;
  const parts = workspacePath.split('/');
  const projectName = parts[parts.length - 1];
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

const useIDEStore = create(
  persist(
    (set, get) => ({
      // State
      activePort: null,
      portPreferences: [],
      availableIDEs: [],
      isLoading: false,
      error: null,
      lastUpdate: null,
      retryCount: 0,
      maxRetries: 3,
      loadingLock: false, // Prevent concurrent loading

      // NEW: Project Data
      projectData: {
        git: {}, // { '/path1': { status, branches, lastUpdate }, '/path2': { status, branches, lastUpdate } }
        analysis: {}, // { '/path1': { status, metrics, history, lastUpdate }, '/path2': { status, metrics, history, lastUpdate } }
        chat: {}, // { '/path1': { messages, lastUpdate }, '/path2': { messages, lastUpdate } }
        tasks: {}, // { '/path1': { tasks: [], lastUpdate }, '/path2': { tasks: [], lastUpdate } }
        lastUpdate: null
      },

      // NEW: Category-based Analysis Data Structure
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
      setActivePort: async (port) => {
        try {
          set({ isLoading: true, error: null });
          logger.info('Setting active port:', port);

          // ✅ FIX: Ensure IDE data is loaded first (only if needed)
          const { availableIDEs, lastUpdate } = get();
          if (availableIDEs.length === 0 || !lastUpdate || (Date.now() - new Date(lastUpdate).getTime()) > 30000) {
            logger.info('No IDEs loaded or data stale, loading available IDEs first');
            await get().loadAvailableIDEs();
          }

          // Validate port (use cached data if possible)
          const ide = availableIDEs.find(ide => ide.port === port);
          if (!ide) {
            logger.warn(`Port ${port} not found in available IDEs`);
            throw new Error(`Port ${port} is not valid`);
          }

          // Update state
          set({ activePort: port });

          // Update preferences
          const { portPreferences } = get();
          const existingPreference = portPreferences.find(p => p.port === port);
          
          if (existingPreference) {
            existingPreference.usageCount = (existingPreference.usageCount || 0) + 1;
            existingPreference.lastUsed = new Date().toISOString();
            existingPreference.weight = Math.min(existingPreference.weight + 10, 100);
          } else {
            portPreferences.push({
              port,
              weight: 100,
              usageCount: 1,
              lastUsed: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }

          set({ portPreferences: [...portPreferences] });
          logger.info('Active port set successfully:', port);
          
          // ✅ FIX: Update active status for all IDEs
          const currentAvailableIDEs = get().availableIDEs;
          const updatedIDEs = currentAvailableIDEs.map(ide => ({
            ...ide,
            active: ide.port === port
          }));
          set({ availableIDEs: updatedIDEs });
          
          // ✅ FIX: Initialize empty data AND load chat data when active port changes
          const activeIDE = updatedIDEs.find(ide => ide.port === port);
          if (activeIDE && activeIDE.workspacePath) {
            logger.info('Initializing empty data for new active port:', port, 'workspace:', activeIDE.workspacePath);
            // Initialize empty chat data immediately for UI responsiveness
            get().initializeEmptyChatData(activeIDE.workspacePath);
            // Load chat data asynchronously to avoid blocking the switch
            setTimeout(() => {
              get().loadChatData(activeIDE.workspacePath);
            }, 100);
          } else {
            logger.warn('No active IDE found or no workspace path for port:', port);
          }
        } catch (error) {
          logger.error('Error setting active port:', error);
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loadActivePort: async () => {
        try {
          const { isLoading } = get();
          if (isLoading) {
            logger.info('Port load already in progress, skipping');
            return get().activePort;
          }
          
          set({ isLoading: true, error: null });
          logger.info('Loading active port...');

          // Strategy 1: Try previously active port (use cached data)
          const { activePort, portPreferences, availableIDEs: cachedIDEs } = get();
          if (activePort) {
            const ide = cachedIDEs.find(ide => ide.port === activePort);
            if (ide && ide.status === 'running') {
              logger.info('Using previously active port:', activePort);
              set({ isLoading: false });
              return activePort;
            }
          }

          // Strategy 2: Try preferred ports (use cached data)
          const sortedPreferences = [...portPreferences]
            .sort((a, b) => b.weight - a.weight)
            .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));

          for (const preference of sortedPreferences) {
            const ide = cachedIDEs.find(ide => ide.port === preference.port);
            if (ide && ide.status === 'running') {
              logger.info('Using preferred port:', preference.port);
              set({ activePort: preference.port, isLoading: false });
              return preference.port;
            }
          }

          // Strategy 3: Load from API and use first available
          await get().loadAvailableIDEs();
          const { availableIDEs } = get();
          
          if (availableIDEs.length > 0) {
            const firstIDE = availableIDEs[0];
            logger.info('Using first available port:', firstIDE.port);
            set({ activePort: firstIDE.port, isLoading: false });
            return firstIDE.port;
          }

          logger.warn('No active port could be loaded');
          set({ isLoading: false });
          return null;
        } catch (error) {
          logger.error('Error loading active port:', error);
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      loadAvailableIDEs: async () => {
        const operationId = `load_available_ides_${Date.now()}`;
        performanceLogger.start(operationId, 'Load Available IDEs', { timestamp: new Date().toISOString() });
        
        try {
          const { isLoading, loadingLock, availableIDEs, lastUpdate } = get();
          
          // Prevent concurrent loading
          if (isLoading || loadingLock) {
            logger.info('⚠️ IDE load already in progress, skipping duplicate request');
            performanceLogger.end(operationId, { skipped: true, reason: 'already_loading' });
            return availableIDEs;
          }
          
          // Set loading lock
          set({ loadingLock: true });
          
          // CACHE FIRST: Always check cache before API
          
          // Check if user is authenticated before making API call
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) {
            logger.info('User not authenticated, skipping IDE load');
            performanceLogger.end(operationId, { skipped: true, reason: 'not_authenticated' });
            return [];
          }
          
          set({ isLoading: true, error: null });
          logger.info('Loading available IDEs...');
      
          // NO CACHE - ALWAYS FETCH FRESH DATA
          logger.info('🔄 Fetching fresh IDE data from API (no cache)');
          
          const apiStart = performance.now();
          const result = await apiCall('/api/ide/available');
          const apiDuration = performance.now() - apiStart;
          
          if (result.success) {
            const { activePort } = get();
            
            // Add active status to fresh data
            const availableIDEsWithActive = result.data.map(ide => ({
              ...ide,
              active: ide.port === activePort
            }));
            
            set({ availableIDEs: availableIDEsWithActive, isLoading: false, lastUpdate: Date.now(), loadingLock: false });
            performanceLogger.end(operationId, { 
              source: 'api', 
              apiDuration: apiDuration,
              ideCount: result.data.length 
            });
          } else {
            set({ error: result.error, isLoading: false, loadingLock: false });
            performanceLogger.end(operationId, { 
              source: 'api', 
              apiDuration: apiDuration,
              error: result.error 
            });
          }
        } catch (error) {
          logger.error('Error loading available IDEs:', error);
          set({ error: error.message, isLoading: false, loadingLock: false });
          performanceLogger.end(operationId, { error: error.message });
          return [];
        }
      },

      // NEW: Project Data Actions
      loadProjectData: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          // Get active port from state
          const { activePort, projectData } = get();
          if (!activePort) {
            logger.warn('No active port available for loading project data');
            return;
          }
          
          // ✅ FIXED: Check if data already exists in state
          const existingGitData = projectData?.git?.[workspacePath];
          const existingAnalysisData = projectData?.analysis?.[workspacePath];
          const existingChatData = projectData?.chat?.[workspacePath];
          
          // Check if data is recent (less than 30 seconds old)
          const isDataRecent = (data) => {
            if (!data?.lastUpdate) return false;
            const age = Date.now() - new Date(data.lastUpdate).getTime();
            return age < 30000; // 30 seconds
          };
          
          const hasRecentData = isDataRecent(existingGitData) && 
                               isDataRecent(existingChatData);
          
          if (hasRecentData) {
            logger.info('Using existing project data for workspace:', workspacePath);
            return; // Data is recent, no need to reload
          }
          
          logger.info('Loading project data for workspace:', workspacePath, 'projectId:', projectId, 'activePort:', activePort);
          
          // Load git and chat data in parallel (analysis only when AnalysisView is opened)
          const [gitResult, chatResult] = await Promise.allSettled([
            // Use CacheService for git status
            cacheService.getGitData(workspacePath, projectId),
            // Use CacheService for chat history  
            cacheService.getChatData(activePort)
          ]);
          
          const gitData = {
            status: gitResult.status === 'fulfilled' && gitResult.value.success ? gitResult.value.data : null,
            lastUpdate: new Date().toISOString()
          };
          
          // No analysis data - loaded only when AnalysisView is opened
          const analysisData = {
            status: null,
            recommendations: null,
            metrics: null,
            techStack: null,
            architecture: null,
            lastUpdate: new Date().toISOString()
          };
          
          const chatData = {
            messages: chatResult.status === 'fulfilled' && chatResult.value.success ? chatResult.value.data?.messages || [] : [],
            lastUpdate: new Date().toISOString()
          };
          
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: gitData
              },
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: analysisData
              },
              chat: {
                ...state.projectData.chat,
                [workspacePath]: chatData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('Project data loaded for workspace:', workspacePath);
        } catch (error) {
          logger.error('Failed to load project data:', error);
        }
      },

      // ✅ NEW: Load Analysis Data (LAZY LOADING - nur wenn AnalysisView geöffnet wird)
      loadAnalysisData: async (workspacePath = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) {
          logger.warn('No workspace path available for loading analysis data');
          return;
        }
        
        try {
          const projectId = getProjectIdFromWorkspace(targetWorkspacePath);
          if (!projectId) return;
          
          logger.info('Loading analysis data for workspace:', targetWorkspacePath);
          
          // Load all analysis data in parallel (nur wenn AnalysisView geöffnet wird)
          const [recommendationsResult, metricsResult, techStackResult, architectureResult] = await Promise.allSettled([
            apiCall(`/api/projects/${projectId}/analysis/recommendations`),
            apiCall(`/api/projects/${projectId}/analysis/metrics`),
            apiCall(`/api/projects/${projectId}/analysis/techstack`),
            apiCall(`/api/projects/${projectId}/analysis/architecture`)
          ]);
          
          set(state => ({
            projectData: {
              ...state.projectData,
              analysis: {
                ...state.projectData.analysis,
                [targetWorkspacePath]: {
                  ...state.projectData.analysis[targetWorkspacePath],
                  recommendations: recommendationsResult.status === 'fulfilled' && recommendationsResult.value.success ? recommendationsResult.value.data : [],
                  metrics: metricsResult.status === 'fulfilled' && metricsResult.value.success ? metricsResult.value.data : null,
                  techStack: techStackResult.status === 'fulfilled' && techStackResult.value.success ? techStackResult.value.data : null,
                  architecture: architectureResult.status === 'fulfilled' && architectureResult.value.success ? architectureResult.value.data : null,
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
          
          logger.info('Analysis data loaded for workspace:', targetWorkspacePath);
        } catch (error) {
          logger.error('Failed to load analysis data:', error);
        }
      },

      // NEW: Category-based Analysis Data Loading (7 categories with lazy loading)
      loadCategoryAnalysisData: async (workspacePath = null, category = null, endpoint = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) {
          logger.warn('No workspace path available for loading category analysis data');
          return;
        }
        
        try {
          const projectId = getProjectIdFromWorkspace(targetWorkspacePath);
          if (!projectId) return;
          
          const validCategories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
          const validEndpoints = ['recommendations', 'issues', 'metrics', 'summary', 'results'];
          
          // If specific category and endpoint provided, load only that
          if (category && endpoint) {
            if (!validCategories.includes(category)) {
              throw new Error(`Invalid category: ${category}`);
            }
            if (!validEndpoints.includes(endpoint)) {
              throw new Error(`Invalid endpoint: ${endpoint}`);
            }
            
            logger.info(`Loading ${category}/${endpoint} data for workspace:`, targetWorkspacePath);
            
            const result = await apiCall(`/api/projects/${projectId}/analysis/${category}/${endpoint}`, {}, projectId);
            
            set(state => ({
              categoryAnalysisData: {
                ...state.categoryAnalysisData,
                [targetWorkspacePath]: {
                  ...state.categoryAnalysisData[targetWorkspacePath],
                  [category]: {
                    ...state.categoryAnalysisData[targetWorkspacePath]?.[category],
                    [endpoint]: result,
                    lastUpdate: new Date().toISOString()
                  }
                }
              }
            }));
            
            logger.info(`${category}/${endpoint} data loaded for workspace:`, targetWorkspacePath);
            return;
          }
          
          // If only category provided, load all endpoints for that category
          if (category && !endpoint) {
            if (!validCategories.includes(category)) {
              throw new Error(`Invalid category: ${category}`);
            }
            
            logger.info(`Loading all ${category} data for workspace:`, targetWorkspacePath);
            
            const promises = validEndpoints.map(endpoint => 
              apiCall(`/api/projects/${projectId}/analysis/${category}/${endpoint}`, {}, projectId)
                .then(result => ({ endpoint, result }))
                .catch(error => ({ endpoint, error }))
            );
            
            const results = await Promise.allSettled(promises);
            
            const categoryData = {};
            results.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value.result) {
                // Backend returns direct data structure: { issues: [...] }, { recommendations: [...] }, etc.
                categoryData[result.value.endpoint] = result.value.result;
              } else {
                categoryData[result.value.endpoint] = null;
              }
            });
            
            set(state => ({
              categoryAnalysisData: {
                ...state.categoryAnalysisData,
                [targetWorkspacePath]: {
                  ...state.categoryAnalysisData[targetWorkspacePath],
                  [category]: {
                    ...categoryData,
                    lastUpdate: new Date().toISOString()
                  }
                }
              }
            }));
            
            logger.info(`All ${category} data loaded for workspace:`, targetWorkspacePath);
            return;
          }
          
          // If no specific category/endpoint, load only security by default (lazy loading)
          logger.info('Loading only security category by default for workspace:', targetWorkspacePath);
          
          // Only load security category initially, others will be loaded on demand
          const defaultCategory = 'security';
          const allPromises = [defaultCategory].flatMap(category => 
            validEndpoints.map(endpoint => 
              apiCall(`/api/projects/${projectId}/analysis/${category}/${endpoint}`, {}, projectId)
                .then(result => ({ category, endpoint, result }))
                .catch(error => ({ category, endpoint, error }))
            )
          );
          
          const allResults = await Promise.allSettled(allPromises);
          
          const allCategoryData = {};
          validCategories.forEach(category => {
            allCategoryData[category] = {
              recommendations: null,
              issues: null,
              metrics: null,
              summary: null,
              results: null,
              lastUpdate: new Date().toISOString()
            };
          });
          
          allResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.result) {
              const { category, endpoint } = result.value;
              // Backend returns direct data structure: { issues: [...] }, { recommendations: [...] }, etc.
              allCategoryData[category][endpoint] = result.value.result;
            }
          });
          
          set(state => ({
            categoryAnalysisData: {
              ...state.categoryAnalysisData,
              [targetWorkspacePath]: allCategoryData
            }
          }));
          
          logger.info('All category analysis data loaded for workspace:', targetWorkspacePath);
        } catch (error) {
          logger.error('Failed to load category analysis data:', error);
        }
      },

      // NEW: Get category analysis data from store
      getCategoryAnalysisData: (workspacePath = null, category = null, endpoint = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) return null;
        
        const categoryData = get().categoryAnalysisData[targetWorkspacePath];
        if (!categoryData) return null;
        
        if (category && endpoint) {
          return categoryData[category]?.[endpoint] || null;
        }
        
        if (category && !endpoint) {
          return categoryData[category] || null;
        }
        
        return categoryData;
      },

      // NEW: Check if category data is loaded
      isCategoryDataLoaded: (workspacePath = null, category = null, endpoint = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) return false;
        
        const categoryData = get().categoryAnalysisData[targetWorkspacePath];
        if (!categoryData) return false;
        
        if (category && endpoint) {
          return categoryData[category]?.[endpoint] !== null && categoryData[category]?.[endpoint] !== undefined;
        }
        
        if (category && !endpoint) {
          return categoryData[category] !== null && categoryData[category] !== undefined;
        }
        
        return Object.keys(categoryData).length > 0;
      },

      // NEW: Clear category analysis data
      clearCategoryAnalysisData: (workspacePath = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) return;
        
        set(state => ({
          categoryAnalysisData: {
            ...state.categoryAnalysisData,
            [targetWorkspacePath]: null
          }
        }));
        
        logger.info('Category analysis data cleared for workspace:', targetWorkspacePath);
      },

      // ✅ NEW: Refresh Git Status specifically
      refreshGitStatus: async (workspacePath = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) {
          logger.warn('No workspace path available for refreshing git status');
          return;
        }
        
        try {
          const projectId = getProjectIdFromWorkspace(targetWorkspacePath);
          if (!projectId) return;
          
          logger.info('Refreshing git status for workspace:', targetWorkspacePath);
          
          // Use CacheService for git status instead of direct API call
          const gitResult = await cacheService.getGitData(targetWorkspacePath, projectId);
          
          const gitData = {
            status: gitResult.success ? gitResult.data : null,
            lastUpdate: new Date().toISOString()
          };
          
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [targetWorkspacePath]: gitData
              }
            }
          }));
          
          logger.info('Git status refreshed for workspace:', targetWorkspacePath);
        } catch (error) {
          logger.error('Failed to refresh git status:', error);
        }
      },

      // NEW: Task Loading Action with Cache Integration
      loadProjectTasks: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          const { activePort } = get();
          if (!activePort) {
            logger.warn('No active port available for task loading');
            return;
          }
          
          logger.info('Loading project tasks for workspace:', workspacePath, 'projectId:', projectId, 'port:', activePort);
          
          // ✅ CRITICAL FIX: Check cache first using hierarchical key
          const cacheKey = cacheService.generateHierarchicalKey('tasks', activePort, projectId, 'data');
          const cachedTasks = cacheService.get(cacheKey);
          
          if (cachedTasks) {
            // ✅ CRITICAL FIX: Only use cache if it has real tasks
            const taskCount = cachedTasks.tasks?.length || 0;
            if (taskCount > 0) {
              logger.info('✅ Using cached tasks data:', { 
                workspacePath, 
                projectId, 
                port: activePort, 
                taskCount: taskCount 
              });
              
              // Update state with cached data
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
            } else {
              logger.warn('⚠️ Cached tasks are empty, clearing cache and loading fresh data');
              cacheService.delete(cacheKey);
            }
          }
          
          logger.info('Cache miss for tasks, loading from API:', { workspacePath, projectId, port: activePort });
          
          // Load tasks from API
          const response = await apiCall(`/api/projects/${projectId}/tasks`);
          
          const taskData = {
            tasks: response && response.success ? (Array.isArray(response.data) ? response.data : []) : [],
            lastUpdate: new Date().toISOString()
          };
          
          // ✅ CRITICAL FIX: Only cache if we have real tasks
          if (taskData.tasks.length > 0) {
            cacheService.set(cacheKey, taskData, 'tasks', 'tasks');
            logger.info('💾 Cached tasks data:', { 
              workspacePath, 
              projectId, 
              port: activePort, 
              taskCount: taskData.tasks.length 
            });
          } else {
            logger.warn('⚠️ No tasks to cache, skipping cache storage');
          }
          
          set(state => ({
            projectData: {
              ...state.projectData,
              tasks: {
                ...state.projectData.tasks,
                [workspacePath]: taskData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('Project tasks loaded for workspace:', workspacePath, 'taskCount:', taskData.tasks.length);
          return taskData;
          
        } catch (error) {
          logger.error('Failed to load project tasks:', error);
          return null;
        }
      },

      // NEW: Load Chat Data Action
      loadChatData: async (workspacePath = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) {
          logger.warn('No workspace path available for loading chat data');
          return;
        }
        
        try {
          const { activePort } = get();
          if (!activePort) {
            logger.warn('No active port available for loading chat data');
            return;
          }
          
          logger.info('Loading chat data for workspace:', targetWorkspacePath, 'activePort:', activePort);
          
          // Use CacheService for chat history instead of direct API call
          const response = await cacheService.getChatData(activePort);
          
          const chatData = {
            messages: response && response.success ? (response.data?.messages || []) : [],
            lastUpdate: new Date().toISOString()
          };
          
          set(state => ({
            projectData: {
              ...state.projectData,
              chat: {
                ...state.projectData.chat,
                [targetWorkspacePath]: chatData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('Chat data loaded for workspace:', targetWorkspacePath, 'messageCount:', chatData.messages.length);
        } catch (error) {
          logger.error('Failed to load chat data:', error);
          // Initialize empty chat data on error
          get().initializeEmptyChatData(targetWorkspacePath);
        }
      },

      // NEW: Initialize Empty Chat Data
      initializeEmptyChatData: (workspacePath) => {
        if (!workspacePath) return;
        
        logger.info('Initializing empty chat data for workspace:', workspacePath);
        
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
        
        logger.info('Empty chat data initialized for workspace:', workspacePath);
      },

      // NEW: Load Task Data Action
      loadTaskData: async (workspacePath = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) {
          logger.warn('No workspace path available for loading task data');
          return;
        }
        
        try {
          const projectId = getProjectIdFromWorkspace(targetWorkspacePath);
          if (!projectId) return;
          
          logger.info('Loading task data for workspace:', targetWorkspacePath, 'projectId:', projectId);
          
          // Use CacheService for tasks instead of direct API call
          const response = await cacheService.getTaskData(activePort);
          
          const taskData = {
            tasks: response && response.success ? (Array.isArray(response.data) ? response.data : []) : [],
            lastUpdate: new Date().toISOString()
          };
          
          set(state => ({
            projectData: {
              ...state.projectData,
              tasks: {
                ...state.projectData.tasks,
                [targetWorkspacePath]: taskData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('Task data loaded for workspace:', targetWorkspacePath, 'taskCount:', taskData.tasks.length);
        } catch (error) {
          logger.error('Failed to load task data:', error);
        }
      },

      // NEW: Load Git Data Action
      loadGitData: async (workspacePath = null) => {
        const targetWorkspacePath = workspacePath || get().availableIDEs.find(ide => ide.active)?.workspacePath;
        if (!targetWorkspacePath) {
          logger.warn('No workspace path available for loading git data');
          return;
        }
        
        try {
          const projectId = getProjectIdFromWorkspace(targetWorkspacePath);
          if (!projectId) return;
          
          logger.info('Loading git data for workspace:', targetWorkspacePath, 'projectId:', projectId);
          
          // Use CacheService for git status instead of direct API call
          const response = await cacheService.getGitData(targetWorkspacePath, projectId);
          
          const gitData = {
            status: response && response.success ? response.data : null,
            lastUpdate: new Date().toISOString()
          };
          
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [targetWorkspacePath]: gitData
              },
              lastUpdate: new Date().toISOString()
            }
          }));
          
          logger.info('Git data loaded for workspace:', targetWorkspacePath);
        } catch (error) {
          logger.error('Failed to load git data:', error);
        }
      },

      // NEW: Load Project Data For Port (enhanced version)
      loadProjectDataForPort: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          logger.info('Loading project data for port workspace:', workspacePath);
          
          // Load all project data in parallel
          await Promise.allSettled([
            get().loadGitData(workspacePath),
            get().loadTaskData(workspacePath),
            get().loadChatData(workspacePath)
          ]);
          
          logger.info('Project data loaded for port workspace:', workspacePath);
        } catch (error) {
          logger.error('Failed to load project data for port:', error);
        }
      },

      // NEW: Initialize Empty Data
      initializeEmptyData: (workspacePath) => {
        if (!workspacePath) return;
        
        logger.info('Initializing empty data for workspace:', workspacePath);
        
        const emptyData = {
          git: { status: null, lastUpdate: new Date().toISOString() },
          chat: { messages: [], lastUpdate: new Date().toISOString() },
          tasks: { tasks: [], lastUpdate: new Date().toISOString() },
          analysis: { status: null, lastUpdate: new Date().toISOString() }
        };
        
        set(state => ({
          projectData: {
            ...state.projectData,
            git: {
              ...state.projectData.git,
              [workspacePath]: emptyData.git
            },
            chat: {
              ...state.projectData.chat,
              [workspacePath]: emptyData.chat
            },
            tasks: {
              ...state.projectData.tasks,
              [workspacePath]: emptyData.tasks
            },
            analysis: {
              ...state.projectData.analysis,
              [workspacePath]: emptyData.analysis
            },
            lastUpdate: new Date().toISOString()
          }
        }));
        
        logger.info('Empty data initialized for workspace:', workspacePath);
      },

      // NEW: WebSocket Event Handler
      setupWebSocketListeners: (eventBus) => {
        if (!eventBus) return;
        
        logger.info('Setting up WebSocket listeners for project data');
        
        // Git Events - Listen to both local event bus and WebSocket service
        const handleGitStatusUpdated = (data) => {
          const { workspacePath, gitStatus } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: {
                  ...state.projectData.git[workspacePath],
                  status: gitStatus,
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
          logger.info('Git status updated via WebSocket for workspace:', workspacePath);
        };
        
        const handleGitBranchChanged = (data) => {
          const { workspacePath, newBranch } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              git: {
                ...state.projectData.git,
                [workspacePath]: {
                  ...state.projectData.git[workspacePath],
                  status: {
                    ...state.projectData.git[workspacePath]?.status,
                    currentBranch: newBranch
                  },
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
          logger.info('Git branch changed via WebSocket for workspace:', workspacePath, 'new branch:', newBranch);
        };
        
        // Listen to local event bus
        eventBus.on('git-status-updated', handleGitStatusUpdated);
        eventBus.on('git-branch-changed', handleGitBranchChanged);
        eventBus.on('ideListUpdated', () => {
          logger.info('IDE list updated event received - reloading available IDEs');
          get().loadAvailableIDEs();
        });
        
        // ALSO listen to WebSocket service directly (like other components do)
        import('@/infrastructure/services/WebSocketService.jsx').then(module => {
          const WebSocketService = module.default;
          if (WebSocketService) {
            // Start WebSocket connection
            WebSocketService.connect().then(() => {
              logger.info('WebSocket connected successfully');
            }).catch(error => {
              logger.warn('WebSocket connection failed:', error);
            });
            WebSocketService.on('git-status-updated', handleGitStatusUpdated);
            WebSocketService.on('git-branch-changed', handleGitBranchChanged);
            WebSocketService.on('ideListUpdated', () => {
              logger.info('IDE list updated event received via WebSocket - reloading available IDEs');
              get().loadAvailableIDEs();
            });
            WebSocketService.on('ai-version-analysis-completed', (data) => {
              logger.info('AI version analysis completed event received via WebSocket:', data);
              // Store the AI analysis result for components to access
              set({ aiVersionAnalysis: data.analysisResult });
            });
            WebSocketService.on('activePortChanged', (data) => {
              const { port } = data;
              logger.info('Active port changed via WebSocket:', port);
              // Update active port in store
              set({ activePort: port });
              // Update active status for all IDEs
              const { availableIDEs } = get();
              const updatedIDEs = availableIDEs.map(ide => ({
                ...ide,
                active: ide.port === port
              }));
              set({ availableIDEs: updatedIDEs });
            });
            
            WebSocketService.on('analysis-completed', (data) => {
              const { workspacePath, analysisData, workflowId, projectId, type, results } = data;
              logger.info('Analysis completed via WebSocketService for workspace:', workspacePath, 'type:', type);
              
              set(state => {
                const currentAnalysis = state.projectData.analysis[workspacePath] || {};
                const currentHistory = currentAnalysis.history || [];
                
                // Create new history entry
                const newHistoryEntry = {
                  id: workflowId || `analysis_${Date.now()}`,
                  type: type,
                  analysisType: type,
                  data: results || analysisData,
                  result: results || analysisData,
                  timestamp: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  projectId: projectId
                };
                
                // Add to history (avoid duplicates)
                const updatedHistory = [
                  ...currentHistory.filter(h => h.id !== newHistoryEntry.id),
                  newHistoryEntry
                ];
                
                return {
                  projectData: {
                    ...state.projectData,
                    analysis: {
                      ...state.projectData.analysis,
                      [workspacePath]: {
                        ...currentAnalysis,
                        history: updatedHistory,
                        lastUpdate: new Date().toISOString()
                      }
                    }
                  }
                };
              });
            });
            logger.info('WebSocket events connected for Git status and Analysis updates');
          }
        }).catch(error => {
          logger.warn('Could not import WebSocketService for events', error);
        });
        
        // Analysis Events
        eventBus.on('analysis-completed', (data) => {
          const { workspacePath, analysisData, workflowId, projectId, type, results } = data;
          logger.info('Analysis completed via WebSocket for workspace:', workspacePath, 'type:', type);
          
          set(state => {
            const currentAnalysis = state.projectData.analysis[workspacePath] || {};
            const currentHistory = currentAnalysis.history || [];
            
            // Create new history entry
            const newHistoryEntry = {
              id: workflowId || `analysis_${Date.now()}`,
              type: type,
              analysisType: type,
              data: results || analysisData,
              result: results || analysisData,
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              projectId: projectId
            };
            
            // Add to history (avoid duplicates)
            const updatedHistory = [
              ...currentHistory.filter(h => h.id !== newHistoryEntry.id),
              newHistoryEntry
            ];
            
            return {
              projectData: {
                ...state.projectData,
                analysis: {
                  ...state.projectData.analysis,
                  [workspacePath]: {
                    ...currentAnalysis,
                    history: updatedHistory,
                    lastUpdate: new Date().toISOString()
                  }
                }
              }
            };
          });
          
          logger.info('Analysis history updated for workspace:', workspacePath, 'historyCount:', 
            get().projectData.analysis[workspacePath]?.history?.length || 0);
        });
        
        eventBus.on('analysis-progress', (data) => {
          const { workspacePath, progress, currentStep } = data;
          set(state => ({
            projectData: {
              ...state.projectData,
              analysis: {
                ...state.projectData.analysis,
                [workspacePath]: {
                  ...state.projectData.analysis[workspacePath],
                  status: {
                    ...state.projectData.analysis[workspacePath]?.status,
                    progress,
                    currentStep
                  },
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
          logger.info('Analysis progress via WebSocket for workspace:', workspacePath, 'progress:', progress);
        });
      },

      cleanupWebSocketListeners: (eventBus) => {
        if (!eventBus) return;
        
        logger.info('Cleaning up WebSocket listeners for project data');
        
        eventBus.off('git-status-updated');
        eventBus.off('git-branch-changed');
        eventBus.off('ideListUpdated');
        eventBus.off('analysis-completed');
        eventBus.off('analysis-progress');
      },

      // Chat message management
      addChatMessage: (workspacePath, message) => {
        try {
          logger.info('Adding chat message for workspace:', workspacePath);
          
          set(state => ({
            projectData: {
              ...state.projectData,
              chat: {
                ...state.projectData.chat,
                [workspacePath]: {
                  ...state.projectData.chat[workspacePath],
                  messages: [
                    ...(state.projectData.chat[workspacePath]?.messages || []),
                    message
                  ],
                  lastUpdate: new Date().toISOString()
                }
              }
            }
          }));
          
          logger.info('Chat message added successfully');
        } catch (error) {
          logger.error('Failed to add chat message:', error);
        }
      },

      validatePort: async (port) => {
        try {
          logger.info('Validating port:', port);
          
          // Check if port is in valid range
          if (!get().isValidPortRange(port)) {
            logger.info('Port not in valid range:', port);
            return false;
          }

          // Check if IDE is available
          const { availableIDEs } = get();
          const ide = availableIDEs.find(ide => ide.port === port);
          
          if (!ide) {
            logger.info('IDE not found for port:', port);
            return false;
          }

          // Check if IDE is running
          if (ide.status !== 'running' && ide.status !== 'active') {
            logger.info('IDE not running on port:', port);
            return false;
          }

          // Check if IDE has workspace path
          if (!ide.workspacePath) {
            logger.info('IDE has no workspace path:', port);
            return false;
          }

          logger.info('Port validation successful:', port);
          return true;
        } catch (error) {
          logger.error('Error validating port:', port, error);
          return false;
        }
      },

      isValidPortRange: (port) => {
        // Cursor: 9222-9231
        if (port >= 9222 && port <= 9231) return true;
        // VSCode: 9232-9241
        if (port >= 9232 && port <= 9241) return true;
        // Windsurf: 9242-9251
        if (port >= 9242 && port <= 9251) return true;
        
        return false;
      },

      handlePortFailure: async (port, reason = 'unknown') => {
        try {
          logger.info('Handling port failure:', port, reason);
          
          // Remove failed port from preferences
          const { portPreferences } = get();
          const updatedPreferences = portPreferences.filter(p => p.port !== port);
          set({ portPreferences: updatedPreferences });
          
          // If this was the active port, select a new one
          const { activePort } = get();
          if (activePort === port) {
            logger.info('Active port failed, selecting new port');
            const newPort = await get().loadActivePort();
            return newPort;
          }
          
          return null;
        } catch (error) {
          logger.error('Error handling port failure:', error);
          return null;
        }
      },

      switchIDE: async (port, reason = 'manual') => {
        const optimizationStore = useIDESwitchOptimizationStore.getState();
        const startTime = Date.now();
        
        try {
          set({ isLoading: true, error: null });
          logger.info('Switching to IDE:', port, reason);

          // Start optimization tracking
          optimizationStore.startSwitch(port);

          // Check cache first using CacheService
          logger.info(`IDEStore: Starting switchIDE for port ${port}, cache enabled: ${optimizationStore.cacheEnabled}`);
          if (optimizationStore.cacheEnabled) {
            const key = `switch_ide_${port}`; // SAME KEY as APIChatRepository!
            const cached = cacheService.get(key);
            logger.info(`IDEStore: Cache check for key: ${key}, cached: ${!!cached}`);
            if (cached) {
              logger.info('Using cached switch result for port:', port);
              optimizationStore.updateProgress(50, 'Using cached result...');
              await get().setActivePort(port);
              optimizationStore.completeSwitch(true, Date.now() - startTime);
              return true;
            }
          } else {
            logger.warn(`IDEStore: Cache disabled - cacheEnabled: ${optimizationStore.cacheEnabled}`);
          }

          // Optimistic update
          if (optimizationStore.optimisticUpdates) {
            const previousPort = get().activePort;
            set({ activePort: port });
            
            // Also update availableIDEs optimistically
            const { availableIDEs } = get();
            const updatedIDEs = availableIDEs.map(ide => ({
              ...ide,
              active: ide.port === port
            }));
            set({ availableIDEs: updatedIDEs });
            
            optimizationStore.updateProgress(25, 'Updating UI optimistically...');
          }

          optimizationStore.updateProgress(50, 'Connecting to IDE...');
          
          // Use CacheService for IDE switching
          const key = `switch_ide_${port}`; // SAME KEY as APIChatRepository!
          logger.info(`IDEStore: Attempting IDE switch to port ${port} with key: ${key}`);
          
          let result;
          try {
            logger.info(`IDEStore: Making API call for IDE switch to port ${port}`);
            result = await apiCall(`/api/ide/switch/${port}`, {
              method: 'POST'
            });
            
            // Cache the result
            if (result.success) {
              cacheService.set(key, result, 'ide', 'ide');
            }
          } catch (executeError) {
            logger.error(`IDEStore: API call failed:`, executeError.message, executeError.stack);
            throw executeError;
          }
          
          logger.info(`IDEStore: Switch result:`, result);

          optimizationStore.updateProgress(75, 'Finalizing switch...');

          if (result.success) {
            // Cache is handled by CacheService
            // No need to manually cache here
            
            // ✅ NEW: Trigger cache warming after successful IDE switch
            try {
              const { availableIDEs } = get();
              const switchedIDE = availableIDEs.find(ide => ide.port === port);
              
              if (switchedIDE?.workspacePath) {
                const projectId = getProjectIdFromWorkspace(switchedIDE.workspacePath);
                
                if (projectId) {
                  logger.info('🔥 Triggering cache warming after IDE switch:', { port, projectId });
                  
                  // Import cache warming service dynamically to avoid circular dependencies
                  const { cacheWarmingService } = await import('@/infrastructure/services/CacheWarmingService');
                  
                  // Warm cache for IDE switch trigger
                  cacheWarmingService.warmForTrigger('ide:switch', port, projectId)
                    .then(results => {
                      logger.info('🔥 Cache warming completed:', results);
                    })
                    .catch(error => {
                      logger.error('🔥 Cache warming failed:', error);
                    });
                }
              }
            } catch (warmingError) {
              logger.error('Cache warming integration failed:', warmingError);
              // Don't fail the IDE switch if warming fails
            }
            
            // Update availableIDEs with new active status
            const { availableIDEs } = get();
            const updatedIDEs = availableIDEs.map(ide => ({
              ...ide,
              active: ide.port === port
            }));
            set({ availableIDEs: updatedIDEs });
            
            logger.info('Successfully switched to IDE:', port);
            optimizationStore.completeSwitch(true, Date.now() - startTime);
            return true;
          } else {
            // Revert on failure
            if (optimizationStore.optimisticUpdates) {
              set({ activePort: previousPort });
              
              // Also revert availableIDEs state
              const { availableIDEs } = get();
              const revertedIDEs = availableIDEs.map(ide => ({
                ...ide,
                active: ide.port === previousPort
              }));
              set({ availableIDEs: revertedIDEs });
            }
            throw new Error(result.error || 'Failed to switch IDE');
          }
        } catch (error) {
          logger.error('Error switching IDE:', error.message, error.stack);
          set({ error: error.message });
          optimizationStore.completeSwitch(false, Date.now() - startTime);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      refresh: async () => {
        try {
          logger.info('Refreshing...');
          
          // Reload available IDEs
          await get().loadAvailableIDEs();
          
          // DISABLED: Re-validate current active port - This was causing port to reset!
          // const { activePort } = get();
          // if (activePort) {
          //   const isValid = await get().validatePort(activePort);
          //   if (!isValid) {
          //     logger.info('Current active port invalid, selecting new one');
          //     await get().loadActivePort();
          //   }
          // } else {
          //   // No active port, select one
          //   await get().loadActivePort();
          // }
          
          logger.info('Refresh complete - NO PORT RESET!');
        } catch (error) {
          logger.error('Error refreshing:', error);
          set({ error: error.message });
        }
      },

      clearError: () => {
        set({ error: null });
      },


      reset: () => {
        set({
          activePort: null,
          portPreferences: [],
          availableIDEs: [],
          isLoading: false,
          error: null,
          lastUpdate: null,
          retryCount: 0,
          projectData: {
            git: {},
            analysis: {},
            lastUpdate: null
          }
        });
        
        logger.info('IDEStore reset - no cache to clear');
      },

      // Debug function to check performance
      debugPerformance: () => {
        const stats = cacheService.getStats();
        logger.info('Performance Debug:', {
          cacheServiceStats: stats,
          memoryUsage: {
            cacheSize: stats.memorySize,
            entryCount: stats.memoryEntries,
            hitRate: stats.hitRate
          },
          activePort: get().activePort,
          availableIDEs: get().availableIDEs.length
        });
        return stats;
      },

      // Custom port management methods
      setCustomPort: async (port) => {
        try {
          // Use existing validatePort method for validation
          const isValid = await get().validatePort(port);
          if (isValid) {
            set({ customPort: port });
            // Use existing persistence system
            const { portPreferences } = get();
            const existingPreference = portPreferences.find(p => p.port === port);
            if (!existingPreference) {
              portPreferences.push({
                port,
                weight: 100,
                usageCount: 1,
                lastUsed: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                isCustom: true
              });
              set({ portPreferences: [...portPreferences] });
            }
            return { success: true };
          } else {
            return { success: false, error: 'Invalid port' };
          }
        } catch (error) {
          logger.error('Failed to set custom port:', error);
          return { success: false, error: 'Failed to set port' };
        }
      },

      getCustomPort: () => {
        return get().customPort;
      },

      validateCustomPort: async (port) => {
        // Use existing validatePort method
        return await get().validatePort(port);
      },

      clearCustomPort: () => {
        set({ customPort: null });
        return { success: true };
      },

      // Project command methods (optional - can use existing terminal services)
      getProjectCommands: async (projectId) => {
        // Use existing APIChatRepository patterns
        return apiCall(`/api/projects/${projectId}/commands`);
      },

      executeProjectCommand: async (projectId, commandType) => {
        // Use existing terminal execution services
        return apiCall(`/api/projects/${projectId}/execute-command`, {
          method: 'POST',
          body: JSON.stringify({ commandType })
        });
      }
    }),
    {
      name: 'ide-storage',
      partialize: (state) => ({
        activePort: state.activePort,
        portPreferences: state.portPreferences,
        // NEW: Persist project data
        projectData: state.projectData
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          logger.info('State rehydrated:', {
            activePort: state.activePort,
            preferencesCount: state.portPreferences.length,
            projectDataKeys: Object.keys(state.projectData?.git || {}).length
          });
        }
      }
    }
  )
);

export default useIDEStore; 