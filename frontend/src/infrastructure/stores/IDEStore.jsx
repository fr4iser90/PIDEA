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
import requestDeduplicationService from '@/infrastructure/services/RequestDeduplicationService';
import useIDESwitchOptimizationStore from './IDESwitchOptimizationStore.jsx';

// Using RequestDeduplicationService for caching instead of local cache

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

      // NEW: Project Data
      projectData: {
        git: {}, // { '/path1': { status, branches, lastUpdate }, '/path2': { status, branches, lastUpdate } }
        analysis: {}, // { '/path1': { status, metrics, history, lastUpdate }, '/path2': { status, metrics, history, lastUpdate } }
        chat: {}, // { '/path1': { messages, lastUpdate }, '/path2': { messages, lastUpdate } }
        tasks: {}, // { '/path1': { tasks: [], lastUpdate }, '/path2': { tasks: [], lastUpdate } }
        lastUpdate: null
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
          
          // ✅ FIX: Load project data when active port changes - NOW ASYNC!
          const activeIDE = updatedIDEs.find(ide => ide.port === port);
          if (activeIDE && activeIDE.workspacePath) {
            logger.info('Loading project data for new active port:', port, 'workspace:', activeIDE.workspacePath);
            // Make project data loading asynchronous to avoid blocking the switch
            setTimeout(() => {
              get().loadProjectData(activeIDE.workspacePath);
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
        try {
          const { isLoading, availableIDEs, lastUpdate } = get();
          
          // Skip if already loading
          if (isLoading) {
            logger.info('IDE load already in progress, skipping');
            return availableIDEs;
          }
          
          // Skip if data is recent (less than 30 seconds old)
          if (lastUpdate && (Date.now() - lastUpdate) < 30000) {
            logger.info('Using recent IDE data, skipping API call');
            return availableIDEs;
          }
          
          // Check if user is authenticated before making API call
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) {
            logger.info('User not authenticated, skipping IDE load');
            return [];
          }
          
          set({ isLoading: true, error: null });
          logger.info('Loading available IDEs...');

          // Use deduplication service for loading IDEs
          const key = 'store_load_available_ides';
          const result = await requestDeduplicationService.execute(key, async () => {
            return apiCall('/api/ide/available');
          }, {
            useCache: true,
            cacheTTL: 30 * 1000 // 30 seconds
          });
          if (result.success) {
            // Handle both response formats: result.data.ides (new) and result.data (old)
            const ides = result.data.ides || result.data || [];
            logger.info('API Response:', { 
              hasData: !!result.data, 
              dataType: typeof result.data, 
              isArray: Array.isArray(result.data),
              idesLength: ides.length,
              firstIDE: ides[0]
            });
            
            // ✅ FIX: Set active status for IDEs
            const currentActivePort = get().activePort;
            const idesWithActiveStatus = ides.map(ide => ({
              ...ide,
              active: ide.port === currentActivePort
            }));
            
            set({ 
              availableIDEs: idesWithActiveStatus,
              lastUpdate: new Date().toISOString(),
              retryCount: 0,
              isLoading: false
            });
            logger.info('Loaded', idesWithActiveStatus.length, 'IDEs');
            
            // ✅ FIX: Auto-set active port if none is set and we have IDEs
            if (!currentActivePort && idesWithActiveStatus.length > 0) {
              const firstIDE = idesWithActiveStatus[0];
              logger.info('Auto-setting active port to:', firstIDE.port);
              set({ activePort: firstIDE.port });
              
              // ✅ FIX: Load project data for the auto-selected IDE
              if (firstIDE.workspacePath) {
                logger.info('Loading project data for auto-selected IDE:', firstIDE.workspacePath);
                await get().loadProjectData(firstIDE.workspacePath);
              }
            }
            
            return idesWithActiveStatus;
          } else {
            throw new Error(result.error || 'Failed to load IDEs');
          }
        } catch (error) {
          logger.error('Error loading available IDEs:', error);
          set({ error: error.message, isLoading: false });
          
          // Don't retry automatically - only on manual refresh
          // This prevents infinite loops
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
                               isDataRecent(existingAnalysisData) && 
                               isDataRecent(existingChatData);
          
          if (hasRecentData) {
            logger.info('Using existing project data for workspace:', workspacePath);
            return; // Data is recent, no need to reload
          }
          
          logger.info('Loading project data for workspace:', workspacePath, 'projectId:', projectId, 'activePort:', activePort);
          
          // Load git, analysis, and chat data in parallel
          const [gitResult, analysisResult, chatResult] = await Promise.allSettled([
            apiCall(`/api/projects/${projectId}/git/status`, { 
              method: 'POST',
              body: JSON.stringify({ projectPath: workspacePath })
            }),
            apiCall(`/api/projects/${projectId}/analysis/status`, {
              method: 'POST', 
              body: JSON.stringify({ projectPath: workspacePath })
            }),
            apiCall(`/api/chat/port/${activePort}/history`)
          ]);
          
          const gitData = {
            status: gitResult.status === 'fulfilled' && gitResult.value.success ? gitResult.value.data : null,
            lastUpdate: new Date().toISOString()
          };
          
          const analysisData = {
            status: analysisResult.status === 'fulfilled' && analysisResult.value.success ? analysisResult.value.data : null,
            // ✅ LAZY LOADING: Recommendations, metrics, techStack, architecture werden erst geladen wenn AnalysisView geöffnet wird
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
          
          const gitResult = await apiCall(`/api/projects/${projectId}/git/status`, { 
            method: 'POST',
            body: JSON.stringify({ projectPath: targetWorkspacePath })
          });
          
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

      // NEW: Task Loading Action
      loadProjectTasks: async (workspacePath) => {
        if (!workspacePath) return;
        
        try {
          const projectId = getProjectIdFromWorkspace(workspacePath);
          if (!projectId) return;
          
          logger.info('Loading project tasks for workspace:', workspacePath, 'projectId:', projectId);
          
          // Load tasks from API
          const response = await apiCall(`/api/projects/${projectId}/tasks`);
          
          const taskData = {
            tasks: response && response.success ? (Array.isArray(response.data) ? response.data : []) : [],
            lastUpdate: new Date().toISOString()
          };
          
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
        } catch (error) {
          logger.error('Failed to load project tasks:', error);
        }
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
        
        // ALSO listen to WebSocket service directly (like other components do)
        import('@/infrastructure/services/WebSocketService.jsx').then(module => {
          const WebSocketService = module.default;
          if (WebSocketService) {
            WebSocketService.on('git-status-updated', handleGitStatusUpdated);
            WebSocketService.on('git-branch-changed', handleGitBranchChanged);
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

          // Check cache first using RequestDeduplicationService
          logger.info(`IDEStore: Starting switchIDE for port ${port}, cache enabled: ${optimizationStore.cacheEnabled}, service available: ${!!requestDeduplicationService}`);
          if (optimizationStore.cacheEnabled && requestDeduplicationService) {
            const key = `switch_ide_${port}`; // SAME KEY as APIChatRepository!
            const cacheKey = requestDeduplicationService.generateCacheKey(key, {});
            const cached = requestDeduplicationService.getCached(cacheKey);
            logger.info(`IDEStore: Cache check for key: ${key}, generated key: ${cacheKey}, cached: ${!!cached}`);
            if (cached) {
              logger.info('Using cached switch result for port:', port);
              optimizationStore.updateProgress(50, 'Using cached result...');
              await get().setActivePort(port);
              optimizationStore.completeSwitch(true, Date.now() - startTime);
              return true;
            }
          } else {
            logger.warn(`IDEStore: Cache disabled or service unavailable - cacheEnabled: ${optimizationStore.cacheEnabled}, service: ${!!requestDeduplicationService}`);
          }

          // Optimistic update
          if (optimizationStore.optimisticUpdates) {
            const previousPort = get().activePort;
            set({ activePort: port });
            optimizationStore.updateProgress(25, 'Updating UI optimistically...');
          }

          optimizationStore.updateProgress(50, 'Connecting to IDE...');
          
          // Use deduplication service for IDE switching
          const key = `switch_ide_${port}`; // SAME KEY as APIChatRepository!
          logger.info(`IDEStore: Attempting IDE switch to port ${port} with key: ${key}`);
          logger.info(`IDEStore: RequestDeduplicationService available:`, !!requestDeduplicationService);
          if (requestDeduplicationService) {
            logger.info(`IDEStore: RequestDeduplicationService methods:`, Object.keys(requestDeduplicationService));
            logger.info(`IDEStore: RequestDeduplicationService execute method:`, typeof requestDeduplicationService.execute);
          } else {
            logger.error(`IDEStore: RequestDeduplicationService is null or undefined!`);
          }
          
          if (!requestDeduplicationService) {
            logger.error(`IDEStore: RequestDeduplicationService not available!`);
            logger.error(`IDEStore: Falling back to direct API call`);
            const result = await apiCall(`/api/ide/switch/${port}`, {
              method: 'POST'
            });
            return result;
          }
          
          let result;
          try {
            result = await requestDeduplicationService.execute(key, async () => {
              logger.info(`IDEStore: Making API call for IDE switch to port ${port}`);
              return apiCall(`/api/ide/switch/${port}`, {
                method: 'POST'
              });
            }, {
              useCache: true,
              cacheTTL: 5 * 60 * 1000 // 5 minutes
            });
          } catch (executeError) {
            logger.error(`IDEStore: RequestDeduplicationService.execute() failed:`, executeError.message, executeError.stack);
            // Fallback to direct API call
            logger.info(`IDEStore: Falling back to direct API call`);
            result = await apiCall(`/api/ide/switch/${port}`, {
              method: 'POST'
            });
          }
          
          logger.info(`IDEStore: Switch result:`, result);

          optimizationStore.updateProgress(75, 'Finalizing switch...');

          if (result.success) {
            // Cache is handled by RequestDeduplicationService
            // No need to manually cache here
            
            logger.info('Successfully switched to IDE:', port);
            optimizationStore.completeSwitch(true, Date.now() - startTime);
            return true;
          } else {
            // Revert on failure
            if (optimizationStore.optimisticUpdates) {
              set({ activePort: previousPort });
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
          
          // Re-validate current active port
          const { activePort } = get();
          if (activePort) {
            const isValid = await get().validatePort(activePort);
            if (!isValid) {
              logger.info('Current active port invalid, selecting new one');
              await get().loadActivePort();
            }
          } else {
            // No active port, select one
            await get().loadActivePort();
          }
          
          logger.info('Refresh complete');
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
        
        // Clear RequestDeduplicationService cache for IDE switches
        if (requestDeduplicationService) {
          requestDeduplicationService.clearCache();
        }
        logger.info('IDEStore reset - RequestDeduplicationService cache cleared');
      },

      // Debug function to check performance
      debugPerformance: () => {
        const stats = requestDeduplicationService.getStats();
        logger.info('Performance Debug:', {
          requestDeduplicationStats: stats,
          memoryUsage: {
            cacheSize: stats.cacheSize,
            pendingRequests: stats.pendingRequestsCount,
            cacheMemory: stats.cacheMemoryUsage,
            pendingMemory: stats.pendingMemoryUsage
          }
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