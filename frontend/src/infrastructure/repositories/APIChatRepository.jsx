import { logger } from "@/infrastructure/logging/Logger";
import ChatRepository from '@/domain/repositories/ChatRepository.jsx';
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import ChatSession from '@/domain/entities/ChatSession.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import etagManager from '@/infrastructure/services/ETagManager.js';
import { cacheService } from '@/infrastructure/services/CacheService';
import performanceLogger from '@/infrastructure/services/PerformanceLogger';
import TimeoutConfig from '@/config/timeout-config.js';

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Keep original case - Backend now supports it
  return projectName.replace(/[^a-zA-Z0-9]/g, '_');
};

// Central API Configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL,
  endpoints: {
    chat: {
      send: '/api/chat',
      history: '/api/chat/history',
      status: '/api/chat/status',
      portHistory: (port) => `/api/chat/port/${port}/history`,
      portSwitch: (port) => `/api/chat/port/${port}/switch`,
    },
    ide: {
      list: '/api/ide/available',
      userAppUrl: '/api/ide/user-app-url',
      userAppUrlForPort: (port) => `/api/ide/user-app-url/${port}`,
      monitorTerminal: '/api/ide/monitor-terminal',
      restartApp: '/api/ide/restart-app',
      detectWorkspacePaths: '/api/ide/detect-workspace-paths',
      workspaceInfo: '/api/ide/workspace-info',
      setWorkspace: (port) => `/api/ide/set-workspace/${port}`,
      switchIDE: (port) => `/api/ide/switch/${port}`,
      stopIDE: (port) => `/api/ide/stop/${port}`,
      status: '/api/ide/status',
      start: '/api/ide/start',
      mirror: {
        status: '/api/ide/mirror/status',
        connect: '/api/ide/mirror/connect',
        disconnect: '/api/ide/mirror/disconnect',
        data: '/api/ide/mirror/data'
      },
      newChat: (port) => `/api/ide/new-chat/${port}`
    },
    ideRequirements: {
      getDownloadLinks: '/api/ide/configurations/download-links',
      getExecutablePaths: '/api/ide/configurations/executable-paths',
      saveExecutablePaths: '/api/ide/configurations/executable-paths',
      validatePath: '/api/ide/configurations/validate-path'
    },
    projects: {
      list: '/api/projects',
      byId: (id) => `/api/projects/${id}`,
      updatePort: (projectId) => `/api/projects/${projectId}/port`,
      savePort: (projectId) => `/api/projects/${projectId}/save-port`,
      // ✅ PLAYWRIGHT TEST ROUTES - FEHLTEN!
      tests: {
        playwright: {
          config: (projectId) => `/api/projects/${projectId}/tests/playwright/config`,
          projects: (projectId) => `/api/projects/${projectId}/tests/playwright/projects`,
          execute: (projectId) => `/api/projects/${projectId}/tests/playwright/execute`,
          stop: (projectId) => `/api/projects/${projectId}/tests/playwright/stop`,
          create: (projectId) => `/api/projects/${projectId}/tests/playwright/projects`
        },
        browserEnvironment: '/api/tests/browser-environment'
      }
    },
    preview: {
      status: '/api/preview/status',
      data: '/api/preview/data'
    },
    prompts: {
      list: '/api/prompts',
      byCategory: (category) => `/api/prompts/${category}`,
      file: (category, filename) => `/api/prompts/${category}/${filename}`
    },
    templates: {
      list: '/api/templates',
      byCategory: (category) => `/api/templates/${category}`,
      file: (category, filename) => `/api/templates/${category}/${filename}`
    },
    frameworks: {
      list: '/api/frameworks',
      prompts: (frameworkId) => `/api/frameworks/${frameworkId}/prompts`,
      promptFile: (frameworkId, filename) => `/api/frameworks/${frameworkId}/prompts/${filename}`,
      templates: (frameworkId) => `/api/frameworks/${frameworkId}/templates`,
      templateFile: (frameworkId, filename) => `/api/frameworks/${frameworkId}/templates/${filename}`
    },
    tasks: {
      projectTasks: (projectId) => `/api/projects/${projectId}/tasks`,
      projectCreate: (projectId) => `/api/projects/${projectId}/tasks`,
      projectGet: (projectId, id) => `/api/projects/${projectId}/tasks/${id}`,
      projectUpdate: (projectId, id) => `/api/projects/${projectId}/tasks/${id}`,
      projectDelete: (projectId, id) => `/api/projects/${projectId}/tasks/${id}`,
      projectExecute: (projectId, taskId) => `/api/projects/${projectId}/tasks/${taskId}/execute`,
      projectStatus: (projectId, id) => `/api/projects/${projectId}/tasks/${id}/execution`,
      analysis: {
        project: (projectId) => `/api/projects/${projectId}/analysis`,
        ai: (projectId) => `/api/projects/${projectId}/analysis/ai`
      },
      autoMode: {
        start: (projectId) => `/api/projects/${projectId}/workflow/execute`,
          stop: (projectId) => `/api/projects/${projectId}/workflow/stop`,
  status: (projectId) => `/api/projects/${projectId}/workflow/status`
      },
      autoRefactor: {
        execute: (projectId) => `/api/projects/${projectId}/workflow/execute`
      },
      // 🆕 NEW: Task Status Sync endpoints
      syncManual: (projectId) => `/api/projects/${projectId}/tasks/sync-manual`,
      cleanManual: (projectId) => `/api/projects/${projectId}/tasks/clean-manual`,
      syncStatus: (projectId) => `/api/projects/${projectId}/tasks/sync-status`,
      validateStatus: (projectId) => `/api/projects/${projectId}/tasks/validate-status`,
      rollbackStatus: (projectId) => `/api/projects/${projectId}/tasks/rollback-status`
    },
    analysis: {
      history: (projectId) => `/api/projects/${projectId}/analysis/history`,
      file: (projectId, filename) => `/api/projects/${projectId}/analysis/files/${filename}`,
      report: (projectId) => `/api/projects/${projectId}/analysis/report`
    },
    vibecoder: {
        analyze: (projectId) => `/api/projects/${projectId}/workflow/execute`,
        refactor: (projectId) => `/api/projects/${projectId}/workflow/execute`,
        mode: (projectId) => `/api/projects/${projectId}/workflow/execute`,
        status: (projectId) => `/api/projects/${projectId}/workflow/status`,
        progress: (projectId) => `/api/projects/${projectId}/workflow/status`
    },
    git: {
      status: (projectId) => `/api/projects/${projectId}/git/status`,
      branches: (projectId) => `/api/projects/${projectId}/git/branches`,
      validate: (projectId) => `/api/projects/${projectId}/git/validate`,
      compare: (projectId) => `/api/projects/${projectId}/git/compare`,
      pull: (projectId) => `/api/projects/${projectId}/git/pull`,
      checkout: (projectId) => `/api/projects/${projectId}/git/checkout`,
      merge: (projectId) => `/api/projects/${projectId}/git/merge`,
      createBranch: (projectId) => `/api/projects/${projectId}/git/create-branch`,
      info: (projectId) => `/api/projects/${projectId}/git/info`,
      // Pidea-Agent specific endpoints
      pullPideaAgent: (projectId) => `/api/projects/${projectId}/git/pull-pidea-agent`,
      mergeToPideaAgent: (projectId) => `/api/projects/${projectId}/git/merge-to-pidea-agent`,
      pideaAgentStatus: (projectId) => `/api/projects/${projectId}/git/pidea-agent-status`,
      comparePideaAgent: (projectId) => `/api/projects/${projectId}/git/compare-pidea-agent`
    },
    settings: '/api/settings',
    health: '/api/health',
    manualTasks: {
      list: '/api/manual-tasks',
      details: (filename) => `/api/manual-tasks/${filename}`
    },
    framework: {
      structure: '/api/framework/structure',
      search: '/api/framework/search',
      stats: '/api/framework/stats'
    }
  }
};

// Helper function to make API calls with ETag support
export const apiCall = async (endpoint, options = {}, projectId = null) => {
  // Use relative URLs to work with Vite proxy
  const url = typeof endpoint === 'function' ? endpoint() : endpoint;
  
  logger.info('🔍 [APIChatRepository] Making API call to:', url);
  
  // Get authentication headers
  const { getAuthHeaders } = useAuthStore.getState();
  const authHeaders = getAuthHeaders();
  
  logger.info('🔍 [APIChatRepository] Auth headers:', authHeaders);
  
  // Add ETag headers only for analysis endpoints, not for IDE endpoints
  const isAnalysisEndpoint = endpoint.includes('/analysis') || endpoint.includes('/auto-finish') || endpoint.includes('/auto-test');
  const etagOptions = isAnalysisEndpoint ? etagManager.addETagHeaders(options, endpoint, projectId) : options;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(etagOptions.headers || {})
    },
    credentials: 'include', // Include cookies with all requests
    ...etagOptions
  };

  logger.info('🔍 [APIChatRepository] Final headers:', config.headers);
  logger.info('🔍 [APIChatRepository] Request config:', {
    method: config.method || 'GET',
    headers: config.headers,
    hasBody: !!config.body
  });

  // Initialize timeout variables outside try block for proper cleanup
  let timeoutId = null;
  let controller = null;

  try {
    // Get appropriate timeout based on endpoint type
    const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
    logger.info(`🔍 [APIChatRepository] Using timeout: ${timeoutMs}ms for endpoint: ${endpoint}`);
    
    // Add timeout to prevent hanging
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      logger.warn(`⏰ [APIChatRepository] Request timeout after ${timeoutMs}ms for ${endpoint}`);
      controller.abort();
    }, timeoutMs);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);
    
    logger.info('🔍 [APIChatRepository] Response status:', response.status);
    
    // Handle ETag response only for analysis endpoints
    if (isAnalysisEndpoint) {
      const etagResponse = etagManager.handleResponse(response, endpoint, projectId);
      
      if (response.status === 304) {
        // Handle 304 Not Modified - no data to return, client should use existing data
        const notModifiedData = etagManager.handleNotModified(endpoint, projectId);
        logger.info('✅ [APIChatRepository] Using cached data (304 Not Modified)');
        return notModifiedData;
      }
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [APIChatRepository] 401 Unauthorized - user not authenticated');
        
        // CRITICAL FIX: Clear local state and redirect to login
        const { handleAuthFailure } = useAuthStore.getState();
        handleAuthFailure('Session expired. Please log in again.');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // No data caching - only ETags for HTTP efficiency
    logger.info('✅ [APIChatRepository] API call successful');
    return data;
  } catch (error) {
    // Ensure timeout is cleared in all error scenarios
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Handle AbortError specifically for better error messages
    if (error.name === 'AbortError') {
      const timeoutMs = TimeoutConfig.getApiTimeout(endpoint);
      const timeoutError = new Error(`Request timeout after ${timeoutMs}ms for ${endpoint}. The server may be slow or unresponsive.`);
      timeoutError.name = 'TimeoutError';
      timeoutError.code = 'TIMEOUT';
      logger.error(`⏰ [APIChatRepository] Request timeout for ${url}:`, timeoutError);
      throw timeoutError;
    }
    
    logger.error(`❌ [APIChatRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

export default class APIChatRepository extends ChatRepository {
  constructor() {
    super();
    this.baseURL = API_CONFIG.baseURL;
    this.currentSession = null;
    this.currentProjectId = null;
    
    // Initialize cache service
    this.cacheService = cacheService;
  }

  // Get current project ID from active IDE
  async getCurrentProjectId() {
    try {
      // KORREKTE LÖSUNG: Hole ProjectId aus der aktiven IDE (dynamisch)
      const ideList = await this.getIDEs();
      if (ideList.success && ideList.data) {
        const activeIDE = ideList.data.find(ide => ide.active);
        if (activeIDE && activeIDE.workspacePath) {
          this.currentProjectId = getProjectIdFromWorkspace(activeIDE.workspacePath);
          logger.info('✅ [APIChatRepository] Current project ID from active IDE:', this.currentProjectId, 'from workspace:', activeIDE.workspacePath);
          return this.currentProjectId;
        }
        
        // Fallback: Nimm die erste verfügbare IDE
        const firstIDE = ideList.data[0];
        if (firstIDE && firstIDE.workspacePath) {
          this.currentProjectId = getProjectIdFromWorkspace(firstIDE.workspacePath);
          logger.info('🔍 [APIChatRepository] Current project ID from first IDE:', this.currentProjectId, 'from workspace:', firstIDE.workspacePath);
          return this.currentProjectId;
        }
      }
      
      // Fallback: Workspace Info
      const workspaceInfo = await this.getWorkspaceInfo();
      if (workspaceInfo.success && workspaceInfo.data && workspaceInfo.data.workspacePath) {
        this.currentProjectId = getProjectIdFromWorkspace(workspaceInfo.data.workspacePath);
        logger.info('🔍 [APIChatRepository] Current project ID from workspace info:', this.currentProjectId);
        return this.currentProjectId;
      }
      
    } catch (error) {
      logger.error('❌ [APIChatRepository] Error getting current project ID:', error);
    }
    
    // Final fallback: Hardcoded für PIDEA (nur als letzte Option)
    this.currentProjectId = 'pidea';
    logger.info('🔍 [APIChatRepository] Using hardcoded project ID:', this.currentProjectId);
    return this.currentProjectId;
  }

  async getChatHistory() {
    return apiCall(API_CONFIG.endpoints.chat.history);
  }

  async getPortChatHistory(port) {
    return apiCall(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.chat.portHistory(port)}`);
  }

  async sendMessage(message, sessionId) {
    // Get user info for requestedBy field
    const { user } = useAuthStore.getState();
    const requestedBy = user?.email || user?.id || 'unknown';
    
    const data = await apiCall(API_CONFIG.endpoints.chat.send, {
      method: 'POST',
      body: JSON.stringify({ message, requestedBy, sessionId })
    });
    if (!data.success || !data.data) throw new Error('Invalid response');
    
    // Create a ChatMessage from the response data
    const chatMessage = new ChatMessage(
      message,
      message.includes('```') ? 'code' : 'text',
      {
        id: data.data.messageId,
        sessionId: data.data.sessionId,
        timestamp: data.data.timestamp
      }
    );
    
    return chatMessage;
  }

  async getStatus() {
    return apiCall(API_CONFIG.endpoints.chat.status);
  }

  async getHealth() {
    return apiCall(API_CONFIG.endpoints.health);
  }

  async getIDEs() {
    const operationId = `get_available_ides_${Date.now()}`;
    performanceLogger.start(operationId, 'Get Available IDEs', { timestamp: new Date().toISOString() });
    
    const key = 'get_available_ides';
    
    // Check cache first
    const cacheStart = performance.now();
    const cachedResult = this.cacheService.get(key);
    const cacheDuration = performance.now() - cacheStart;
    
    if (cachedResult) {
      logger.info('Using cached IDE data');
      performanceLogger.end(operationId, { 
        source: 'cache', 
        cacheDuration: cacheDuration,
        ideCount: cachedResult.length 
      });
      return cachedResult;
    }
    
    // Make API call and cache result
    const apiStart = performance.now();
    const result = await apiCall(API_CONFIG.endpoints.ide.list);
    const apiDuration = performance.now() - apiStart;
    
    const cacheSetStart = performance.now();
    this.cacheService.set(key, result, 'ide', 'ide');
    const cacheSetDuration = performance.now() - cacheSetStart;
    
    performanceLogger.end(operationId, { 
      source: 'api', 
      apiDuration: apiDuration,
      cacheSetDuration: cacheSetDuration,
      ideCount: result.length 
    });
    return result;
  }

  async getUserAppUrl() {
    const operationId = `get_user_app_url_${Date.now()}`;
    performanceLogger.start(operationId, 'Get User App URL', { timestamp: new Date().toISOString() });
    
    const key = 'get_user_app_url';
    
    // Check cache first
    const cacheStart = performance.now();
    const cachedResult = this.cacheService.get(key);
    const cacheDuration = performance.now() - cacheStart;
    
    if (cachedResult) {
      logger.info('Using cached user app URL');
      performanceLogger.end(operationId, { 
        source: 'cache', 
        cacheDuration: cacheDuration 
      });
      return cachedResult;
    }
    
    // Make API call and cache result
    const apiStart = performance.now();
    const result = await apiCall(API_CONFIG.endpoints.ide.userAppUrl);
    const apiDuration = performance.now() - apiStart;
    
    const cacheSetStart = performance.now();
    this.cacheService.set(key, result, 'ide', 'ide');
    const cacheSetDuration = performance.now() - cacheSetStart;
    
    performanceLogger.end(operationId, { 
      source: 'api', 
      apiDuration: apiDuration,
      cacheSetDuration: cacheSetDuration 
    });
    return result;
  }

  /**
   * Get user app URL for specific port
   * @param {number} port - IDE port
   * @returns {Promise<Object>} User app URL result
   */
  async getUserAppUrlForPort(port) {
    return this.apiCall(API_CONFIG.endpoints.ide.userAppUrlForPort(port));
  }

  async monitorTerminal() {
    return apiCall(API_CONFIG.endpoints.ide.monitorTerminal, {
      method: 'POST'
    });
  }

  async restartApp(data) {
    return apiCall(API_CONFIG.endpoints.ide.restartApp, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async detectWorkspacePaths() {
    return apiCall(API_CONFIG.endpoints.ide.detectWorkspacePaths, {
      method: 'POST'
    });
  }

  async getWorkspaceInfo() {
    const key = 'get_workspace_info';
    
    // Check cache first
    const cachedResult = this.cacheService.get(key);
    if (cachedResult) {
      logger.info('Using cached workspace info');
      return cachedResult;
    }
    
    // Make API call and cache result
    const result = await apiCall(API_CONFIG.endpoints.ide.workspaceInfo);
    this.cacheService.set(key, result, 'ide', 'ide');
    return result;
  }

  async setWorkspacePath(port, workspacePath) {
    return apiCall(API_CONFIG.endpoints.ide.setWorkspace(port), {
      method: 'POST',
      body: JSON.stringify({ workspacePath })
    });
  }

  async switchIDE(port) {
    const key = `switch_ide_${port}`;
    
    logger.info(`Frontend: Attempting IDE switch to port ${port} with key: ${key}`);
    
    // Check cache first
    const cachedResult = this.cacheService.get(key);
    if (cachedResult) {
      logger.info(`Frontend: Using cached result for IDE switch to port ${port}`);
      return cachedResult;
    }
    
    // Make API call and cache result
    logger.info(`Frontend: Making API call for IDE switch to port ${port}`);
    const result = await apiCall(API_CONFIG.endpoints.ide.switchIDE(port), {
      method: 'POST'
    });
    this.cacheService.set(key, result, 'ide', 'ide');
    return result;
  }

  async stopIDE(port) {
    return apiCall(API_CONFIG.endpoints.ide.stopIDE(port), {
      method: 'DELETE'
    });
  }

  async getIDEStatus() {
    return apiCall(API_CONFIG.endpoints.ide.status);
  }

  async startIDE(workspacePath = null) {
    return apiCall(API_CONFIG.endpoints.ide.start, {
      method: 'POST',
      body: JSON.stringify({ workspacePath })
    });
  }

  async getPreviewStatus() {
    return apiCall(API_CONFIG.endpoints.preview.status);
  }

  async getPreviewData() {
    return apiCall(API_CONFIG.endpoints.preview.data);
  }

  async getQuickPrompts() {
    return apiCall(API_CONFIG.endpoints.prompts.quick);
  }

  async getSettings() {
    return apiCall(API_CONFIG.endpoints.settings);
  }

  async fetchChatHistory(sessionId) {
    const data = await apiCall(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
    if (!data.success || !data.data) throw new Error('Invalid response');
    const sessionData = data.data;
    return ChatSession.fromJSON({
      id: sessionData.sessionId || sessionData.id,
      title: sessionData.title,
      metadata: sessionData.metadata,
      idePort: sessionData.idePort,
      messages: (sessionData.messages || []).map(m => ChatMessage.fromJSON(m))
    });
  }

  // Task Management Methods
  async createTask(taskData, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectCreate(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async getTasks(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectTasks(currentProjectId));
  }

  async getTask(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectGet(currentProjectId, taskId));
  }

  async updateTask(taskId, taskData, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectUpdate(currentProjectId, taskId), {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  async deleteTask(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectDelete(currentProjectId, taskId), {
      method: 'DELETE'
    });
  }

  async executeTask(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectExecute(currentProjectId, taskId), {
      method: 'POST'
    });
  }

  async getTaskStatus(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.projectStatus(currentProjectId, taskId));
  }

  async analyzeProject(projectPath, options = {}, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.analysis.project(currentProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, ...options })
    });
  }

  async startAutoMode(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.start(currentProjectId), {
      method: 'POST',
      body: JSON.stringify({ ...options })
    });
  }

  async stopAutoMode(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.stop(currentProjectId), {
      method: 'POST'
    });
  }

  async getAutoModeStatus(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.status(currentProjectId));
  }

  async startAutoRefactor(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Get the current workspace path from the active IDE
    const ideList = await this.getIDEs();
    if (!ideList.success || !ideList.data) {
      throw new Error('Failed to get IDE information');
    }
    
    const activeIDE = ideList.data.find(ide => ide.active);
    if (!activeIDE || !activeIDE.workspacePath) {
      throw new Error('No active IDE with workspace path found');
    }
    
    // Use the unified auto mode with refactor mode
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.start(currentProjectId), {
      method: 'POST',
      body: JSON.stringify({ 
        mode: 'refactor',
        projectPath: activeIDE.workspacePath 
      })
    });
  }

  async getAnalysisFile(projectId, filename) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.analysis.file(currentProjectId, filename));
  }

  async generateAnalysisReport(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.analysis.report(currentProjectId), {
      method: 'POST'
    });
  }

  // New analysis methods for enhanced data viewer
  async getAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/metrics`, {}, currentProjectId);
  }

  async getAnalysisStatus(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/status`, {}, currentProjectId);
  }

  async getAnalysisCharts(projectId = null, type = 'trends') {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/charts/${type}`, {}, currentProjectId);
  }

  async getAnalysisHistory(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/history`, {}, currentProjectId);
  }

  // Enhanced analysis methods for new dashboard components
  async getAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/issues`, {}, currentProjectId);
  }

  async getAnalysisTechStack(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/techstack`, {}, currentProjectId);
  }

  async getAnalysisArchitecture(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture`, {}, currentProjectId);
  }

  async getAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/recommendations`, {}, currentProjectId);
  }

  // NEW: Category-based Analysis Methods (7 categories × 5 endpoints = 35 methods)
  
  // Security Analysis Methods
  async getSecurityAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/security/recommendations`, {}, currentProjectId);
  }

  async getSecurityAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/security/issues`, {}, currentProjectId);
  }

  async getSecurityAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/security/metrics`, {}, currentProjectId);
  }

  async getSecurityAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/security/summary`, {}, currentProjectId);
  }

  async getSecurityAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/security/results`, {}, currentProjectId);
  }

  // Performance Analysis Methods
  async getPerformanceAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/performance/recommendations`, {}, currentProjectId);
  }

  async getPerformanceAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/performance/issues`, {}, currentProjectId);
  }

  async getPerformanceAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/performance/metrics`, {}, currentProjectId);
  }

  async getPerformanceAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/performance/summary`, {}, currentProjectId);
  }

  async getPerformanceAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/performance/results`, {}, currentProjectId);
  }

  // Architecture Analysis Methods
  async getArchitectureAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture/recommendations`, {}, currentProjectId);
  }

  async getArchitectureAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture/issues`, {}, currentProjectId);
  }

  async getArchitectureAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture/metrics`, {}, currentProjectId);
  }

  async getArchitectureAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture/summary`, {}, currentProjectId);
  }

  async getArchitectureAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture/results`, {}, currentProjectId);
  }

  // Code Quality Analysis Methods
  async getCodeQualityAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/code-quality/recommendations`, {}, currentProjectId);
  }

  async getCodeQualityAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/code-quality/issues`, {}, currentProjectId);
  }

  async getCodeQualityAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/code-quality/metrics`, {}, currentProjectId);
  }

  async getCodeQualityAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/code-quality/summary`, {}, currentProjectId);
  }

  async getCodeQualityAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/code-quality/results`, {}, currentProjectId);
  }

  // Dependencies Analysis Methods
  async getDependenciesAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/dependencies/recommendations`, {}, currentProjectId);
  }

  async getDependenciesAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/dependencies/issues`, {}, currentProjectId);
  }

  async getDependenciesAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/dependencies/metrics`, {}, currentProjectId);
  }

  async getDependenciesAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/dependencies/summary`, {}, currentProjectId);
  }

  async getDependenciesAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/dependencies/results`, {}, currentProjectId);
  }

  // Manifest Analysis Methods
  async getManifestAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/manifest/recommendations`, {}, currentProjectId);
  }

  async getManifestAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/manifest/issues`, {}, currentProjectId);
  }

  async getManifestAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/manifest/metrics`, {}, currentProjectId);
  }

  async getManifestAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/manifest/summary`, {}, currentProjectId);
  }

  async getManifestAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/manifest/results`, {}, currentProjectId);
  }

  // Tech Stack Analysis Methods
  async getTechStackAnalysisRecommendations(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/tech-stack/recommendations`, {}, currentProjectId);
  }

  async getTechStackAnalysisIssues(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/tech-stack/issues`, {}, currentProjectId);
  }

  async getTechStackAnalysisMetrics(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/tech-stack/metrics`, {}, currentProjectId);
  }

  async getTechStackAnalysisSummary(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/tech-stack/summary`, {}, currentProjectId);
  }

  async getTechStackAnalysisResults(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/tech-stack/results`, {}, currentProjectId);
  }

  // Generic category-based method for dynamic access
  async getCategoryAnalysis(category, endpoint, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const validCategories = ['security', 'performance', 'architecture', 'code-quality', 'dependencies', 'manifest', 'tech-stack'];
    const validEndpoints = ['recommendations', 'issues', 'metrics', 'summary', 'results'];
    
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${validCategories.join(', ')}`);
    }
    
    if (!validEndpoints.includes(endpoint)) {
      throw new Error(`Invalid endpoint: ${endpoint}. Valid endpoints: ${validEndpoints.join(', ')}`);
    }
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/${category}/${endpoint}`, {}, currentProjectId);
  }

  // DEPRECATED: Legacy analysis methods (to be removed after migration)
  // These methods are kept for backward compatibility during transition
  async getAnalysisIssuesLegacy(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/issues`, {}, currentProjectId);
  }

  async getAnalysisTechStackLegacy(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/techstack`, {}, currentProjectId);
  }

  async getAnalysisArchitectureLegacy(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture`, {}, currentProjectId);
  }

  async getAnalysisRecommendationsLegacy(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/recommendations`, {}, currentProjectId);
  }

  // Individual Analysis Step Methods
  async executeAnalysisStep(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Map frontend analysis types to backend route names
    const routeMapping = {
      'code-quality': 'code-quality',
      'security': 'security',
      'performance': 'performance',
      'architecture': 'architecture',
      'tech-stack': 'tech-stack',
      'manifest': 'manifest',
      'dependencies': 'dependencies',
      'recommendations': 'recommendations',
      'security-recommendations': 'security-recommendations',
      'code-quality-recommendations': 'code-quality-recommendations',
      'architecture-recommendations': 'architecture-recommendations'
    };
    
    const routeName = routeMapping[analysisType] || analysisType;
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/${routeName}`, {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  // Start Analysis function for IndividualAnalysisButtons
  async startAnalysis(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Map frontend analysis types to backend step names
    const stepMapping = {
      'code-quality': 'CodeQualityAnalysisOrchestrator',
      'security': 'SecurityAnalysisOrchestrator',
      'performance': 'PerformanceAnalysisOrchestrator',
      'architecture': 'ArchitectureAnalysisOrchestrator',
      'tech-stack': 'TechStackAnalysisOrchestrator',
      'manifest': 'ManifestAnalysisOrchestrator',
      'dependencies': 'DependencyAnalysisOrchestrator',
      'recommendations': 'RecommendationsStep'
    };
    
    const stepName = stepMapping[analysisType] || analysisType;
    
    // Use workflow execution endpoint to run the specific step
    return apiCall(`/api/projects/${currentProjectId}/workflow/execute`, {
      method: 'POST',
      body: JSON.stringify({
        mode: analysisType + '-analysis',
        steps: [stepName],
        projectPath: options.projectPath || '/home/fr4iser/Documents/Git/PIDEA',
        options: {
          ...options,
          analysisType: analysisType
        }
      })
    }, currentProjectId);
  }

  // ✅ NEW: Direct analysis data fetching methods (bypass StepRegistry)
  
  /**
   * Get analysis data directly (fast, no workflow)
   * Use this for simple data fetching, not for running analysis
   */
  async getAnalysisData(projectId = null, analysisType = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    // Map analysis types to specific endpoints
    const endpointMapping = {
      'security': 'issues',
      'code-quality': 'issues',
      'architecture': 'architecture',
      'tech-stack': 'techstack',
      'recommendations': 'recommendations',
      'charts': 'charts'
    };
    
    const endpoint = endpointMapping[analysisType] || 'issues';
    
    if (endpoint === 'issues') {
      return this.getAnalysisIssuesDirect(currentProjectId, analysisType);
    } else if (endpoint === 'charts') {
      return this.getAnalysisChartsDirect(currentProjectId, options.chartType || 'trends');
    } else {
      const methodName = `getAnalysis${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}Direct`;
      return this[methodName]?.(currentProjectId) || Promise.resolve({ success: false, data: null });
    }
  }

  /**
   * Get analysis status directly (fast, no workflow)
   */
  async getAnalysisStatusDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/status`, {}, currentProjectId);
  }

  /**
   * Get analysis metrics directly (fast, no workflow)
   */
  async getAnalysisMetricsDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/metrics`, {}, currentProjectId);
  }

  /**
   * Get analysis history directly (fast, no workflow)
   */
  async getAnalysisHistoryDirect(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    const queryParams = new URLSearchParams();
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.types) queryParams.append('types', options.types);
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/history?${queryParams}`, {}, currentProjectId);
  }

  /**
   * Get analysis issues directly (fast, no workflow)
   */
  async getAnalysisIssuesDirect(projectId = null, type = 'code-quality') {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/issues?type=${type}`, {}, currentProjectId);
  }

  /**
   * Get analysis tech stack directly (fast, no workflow)
   */
  async getAnalysisTechStackDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/techstack`, {}, currentProjectId);
  }

  /**
   * Get analysis architecture directly (fast, no workflow)
   */
  async getAnalysisArchitectureDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/architecture`, {}, currentProjectId);
  }

  /**
   * Get analysis recommendations directly (fast, no workflow)
   */
  async getAnalysisRecommendationsDirect(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/recommendations`, {}, currentProjectId);
  }

  /**
   * Get analysis charts directly (fast, no workflow)
   */
  async getAnalysisChartsDirect(projectId = null, type = 'trends') {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/charts/${type}`, {}, currentProjectId);
  }

  /**
   * Execute analysis workflow (for complex runs like "Run All Analysis")
   * This uses StepRegistry and is slower but handles complex workflows
   */
  async executeAnalysisWorkflow(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    
    return apiCall(`/api/projects/${currentProjectId}/analysis/execute`, {
      method: 'POST',
      body: JSON.stringify({
        analysisType,
        options
      })
    }, currentProjectId);
  }

  // Get completion status
  async getCompletionStatus(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/completion/status`, {}, currentProjectId);
  }

  // Get completion history
  async getCompletionHistory(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/completion/history`, {}, currentProjectId);
  }

  // Cancel completion workflow
  async cancelCompletionWorkflow(projectId = null, sessionId) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/completion/cancel`, {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    }, currentProjectId);
  }

  async getAnalysisSteps(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const queryParams = new URLSearchParams(options).toString();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps?${queryParams}`, {}, currentProjectId);
  }

  async getAnalysisStep(stepId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/${stepId}`, {}, currentProjectId);
  }

  async getActiveAnalysisSteps(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/active`, {}, currentProjectId);
  }

  async cancelAnalysisStep(stepId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/${stepId}/cancel`, {
      method: 'POST'
    }, currentProjectId);
  }

  async retryAnalysisStep(stepId, projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/${stepId}/retry`, {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  async getAnalysisStepStats(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/steps/stats`, {}, currentProjectId);
  }

  // Manual Tasks methods
  async getManualTasks(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/tasks`, {}, currentProjectId);
  }

  async getManualTaskDetails(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${currentProjectId}/tasks/${taskId}`, {}, currentProjectId);
  }

  async syncManualTasks() {
    const projectId = await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${projectId}/tasks/sync-manual`, {
      method: 'POST'
    });
  }

  // 🆕 NEW: Task Status Sync methods
  async syncTaskStatuses(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(API_CONFIG.endpoints.tasks.syncStatus(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  async validateTaskStatuses(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(API_CONFIG.endpoints.tasks.validateStatus(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  async rollbackTaskStatuses(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(API_CONFIG.endpoints.tasks.rollbackStatus(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  async cleanManualTasks() {
    const projectId = await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${projectId}/tasks/clean-manual`, {
      method: 'POST'
    });
  }

  // Framework Methods
  async getFrameworkStructure() {
    return apiCall(API_CONFIG.endpoints.framework.structure);
  }

  async getFrameworkTemplate(templateId) {
    return apiCall(API_CONFIG.endpoints.framework.template(templateId));
  }

  async getFrameworkPrompt(promptId) {
    return apiCall(API_CONFIG.endpoints.framework.prompt(promptId));
  }

  async searchFrameworks(query) {
    return apiCall(`${API_CONFIG.endpoints.framework.search}?query=${encodeURIComponent(query)}`);
  }

  async getFrameworkStats() {
    return apiCall(API_CONFIG.endpoints.framework.stats);
  }

  // New Chat functionality
  async clickNewChat(port, message = null) {
    return apiCall(API_CONFIG.endpoints.ide.newChat(port), {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  // Git Management Methods
  // Git operations - Direct API calls (fast, no Steps)
  async getGitStatus(projectId = null, projectPath = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    // ✅ OPTIMIZATION: Use existing Git API (now uses direct Commands/Handlers)
    return apiCall(`/api/projects/${currentProjectId}/git/status`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath })
    }, currentProjectId);
  }

  async getGitBranches(projectId = null, projectPath = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    // ✅ OPTIMIZATION: Use existing Git API (now uses direct Commands/Handlers)
    return apiCall(`/api/projects/${currentProjectId}/git/branches`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath })
    }, currentProjectId);
  }

  async getGitInfo(projectId = null, projectPath = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    // ✅ OPTIMIZATION: Use existing Git API (now uses direct Commands/Handlers)
    return apiCall(`/api/projects/${currentProjectId}/git/info`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath })
    }, currentProjectId);
  }

  // Helper method to get project path
  async getProjectPath(projectId) {
    try {
      const response = await apiCall(`/api/projects/${projectId}/path`, {}, projectId);
      return response.data?.path || '/home/fr4iser/Documents/Git/PIDEA';
    } catch (error) {
      console.warn('Failed to get project path, using default:', error);
      return '/home/fr4iser/Documents/Git/PIDEA';
    }
  }

  // Git operations - Complex operations (still use existing API)
  async performGitOperation(projectId, projectPath, operation, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    return apiCall(`/api/projects/${currentProjectId}/git/${operation}`, {
      method: 'POST',
      body: JSON.stringify({ projectPath: currentProjectPath, ...options })
    }, currentProjectId);
  }

  async compareBranches(projectId, projectPath, sourceBranch, targetBranch) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    const currentProjectPath = projectPath || await this.getProjectPath(currentProjectId);
    
    return apiCall(`/api/projects/${currentProjectId}/git/compare`, {
      method: 'POST',
      body: JSON.stringify({ 
        projectPath: currentProjectPath, 
        sourceBranch, 
        targetBranch 
      })
    }, currentProjectId);
  }

  async validateGitChanges(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.validate(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  async compareGitBranches(projectId = null, projectPath = null, sourceBranch = null, targetBranch = 'main') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.compare(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch, targetBranch })
    });
  }

  async pullGitChanges(projectId = null, projectPath = null, branch = 'main', remote = 'origin') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.pull(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, branch, remote })
    });
  }

  async checkoutGitBranch(projectId = null, projectPath = null, branch = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.checkout(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, branch })
    });
  }

  async mergeGitBranches(projectId = null, projectPath = null, sourceBranch = null, targetBranch = 'main') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.merge(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch, targetBranch })
    });
  }

  async createGitBranch(projectId = null, projectPath = null, branchName = null, startPoint = 'main') {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.createBranch(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, branchName, startPoint })
    });
  }

  async getGitRepositoryInfo(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.info(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  // Pidea-Agent Git Management Methods
  async pullPideaAgentBranch(projectId = null, projectPath = null, options = {}) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    const { remote = 'origin', force = false } = options;
    
    return apiCall(API_CONFIG.endpoints.git.pullPideaAgent(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, remote, force })
    });
  }

  async mergeToPideaAgentBranch(projectId = null, projectPath = null, sourceBranch = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    
    if (!sourceBranch) {
      throw new Error('Source branch is required for merging to pidea-agent branch');
    }
    
    return apiCall(API_CONFIG.endpoints.git.mergeToPideaAgent(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch })
    });
  }

  async getPideaAgentBranchStatus(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    
    return apiCall(API_CONFIG.endpoints.git.pideaAgentStatus(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  async compareWithPideaAgentBranch(projectId = null, projectPath = null, sourceBranch = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    
    if (!sourceBranch) {
      throw new Error('Source branch is required for comparison with pidea-agent branch');
    }
    
    return apiCall(API_CONFIG.endpoints.git.comparePideaAgent(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, sourceBranch })
    });
  }

  // Pidea-Agent Utility Methods
  async isPideaAgentBranchAvailable(projectId = null, projectPath = null) {
    try {
      const status = await this.getPideaAgentBranchStatus(projectId, projectPath);
      return status.success && status.data?.pideaAgentExists;
    } catch (error) {
      logger.error('Failed to check pidea-agent branch availability:', error);
      return false;
    }
  }

  async getCurrentBranchForPideaAgent(projectId = null, projectPath = null) {
    try {
      const status = await this.getPideaAgentBranchStatus(projectId, projectPath);
      if (status.success && status.data) {
        return status.data.currentBranch;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get current branch for pidea-agent operations:', error);
      return null;
    }
  }

  /**
   * Get project commands from database
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project commands
   */
  async getProjectCommands(projectId = null) {
    try {
      const currentProjectId = projectId || await this.getCurrentProjectId();
      
      // Use existing terminal services to get project commands
      return apiCall(`/api/projects/${currentProjectId}/commands`);
    } catch (error) {
      logger.error('Failed to get project commands:', error);
      return { success: false, error: 'Failed to get project commands' };
    }
  }

  /**
   * Execute project command
   * @param {string} projectId - Project ID
   * @param {string} commandType - Command type (start, dev, build, test, stop)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Command execution result
   */
  async executeProjectCommand(projectId = null, commandType, options = {}) {
    try {
      const currentProjectId = projectId || await this.getCurrentProjectId();
      
      // Use existing terminal execution services
      return apiCall(`/api/projects/${currentProjectId}/execute-command`, {
        method: 'POST',
        body: JSON.stringify({ commandType, ...options })
      });
    } catch (error) {
      logger.error('Failed to execute project command:', error);
      return { success: false, error: 'Failed to execute command' };
    }
  }

  /**
   * Validate port (optional - uses IDEStore validation instead)
   * @param {number} port - Port to validate
   * @returns {Promise<Object>} Validation result
   */
  async validatePort(port) {
    try {
      // Use existing IDEStore validation instead of backend call
      // This method is kept for API consistency but delegates to IDEStore
      logger.info('Port validation requested via API:', port);
      
      // Return success - actual validation happens in IDEStore
      return { valid: true };
    } catch (error) {
      logger.error('Port validation failed:', error);
      return { valid: false, error: 'Port validation failed' };
    }
  }



  /**
   * Get project by workspace path
   * @param {string} workspacePath - Workspace path
   * @returns {Promise<Object>} Project data
   */
  async getProjectByWorkspacePath(workspacePath) {
    try {
      // Get workspace info from IDE API
      const workspaceResult = await this.getWorkspaceInfo();
      if (workspaceResult.success && workspaceResult.data) {
        const workspaceInfo = workspaceResult.data;
        
        // Find project by workspace path
        const projectsResult = await apiCall(API_CONFIG.endpoints.projects.list);
        if (projectsResult.success && projectsResult.data) {
          const project = projectsResult.data.find(p => p.workspacePath === workspacePath);
          if (project) {
            return { success: true, data: project };
          }
        }
      }
      
      return { success: false, error: 'Project not found for workspace path' };
    } catch (error) {
      logger.error('Failed to get project by workspace path:', error);
      return { success: false, error: 'Failed to get project' };
    }
  }

  /**
   * Save project port to database
   * @param {string} projectId - Project ID
   * @param {number} port - Port number to save
   * @param {string} portType - Type of port (frontend, backend, database)
   * @returns {Promise<Object>} Save result
   */
  async saveProjectPort(projectId, port, portType = 'frontend') {
    try {
      return apiCall(API_CONFIG.endpoints.projects.savePort(projectId), {
        method: 'POST',
        body: JSON.stringify({ port, portType })
      });
    } catch (error) {
      logger.error('Failed to save project port:', error);
      return { success: false, error: 'Failed to save port' };
    }
  }

  /**
   * Update project port
   * @param {string} projectId - Project ID
   * @param {number} port - Port number
   * @param {string} portType - Type of port (frontend, backend, database)
   * @returns {Promise<Object>} Update result
   */
  async updateProjectPort(projectId, port, portType = 'frontend') {
    try {
      return apiCall(API_CONFIG.endpoints.projects.updatePort(projectId), {
        method: 'PUT',
        body: JSON.stringify({ port, portType })
      });
    } catch (error) {
      logger.error('Failed to update project port:', error);
      return { success: false, error: 'Failed to update port' };
    }
  }

  // ✅ PLAYWRIGHT TEST METHODS - FEHLTEN!
  
  /**
   * Get Playwright test configuration for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Test configuration
   */
  async getPlaywrightTestConfig(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.projects.tests.playwright.config(currentProjectId), {}, currentProjectId);
  }

  /**
   * Update Playwright test configuration for a project
   * @param {string} projectId - Project ID
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Update result
   */
  async updatePlaywrightTestConfig(projectId = null, config) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.projects.tests.playwright.config(currentProjectId), {
      method: 'PUT',
      body: JSON.stringify({ config })
    }, currentProjectId);
  }

  /**
   * Get Playwright test projects for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Test projects
   */
  async getPlaywrightTestProjects(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.projects.tests.playwright.projects(currentProjectId), {}, currentProjectId);
  }

  /**
   * Execute Playwright tests for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executePlaywrightTests(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.projects.tests.playwright.execute(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Stop running Playwright tests for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Stop options
   * @returns {Promise<Object>} Stop result
   */
  async stopPlaywrightTests(projectId = null, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.projects.tests.playwright.stop(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(options)
    }, currentProjectId);
  }

  /**
   * Create a new Playwright test project
   * @param {string} projectId - Project ID
   * @param {Object} testData - Test project data
   * @returns {Promise<Object>} Creation result
   */
  async createPlaywrightTestProject(projectId = null, testData) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.projects.tests.playwright.create(currentProjectId), {
      method: 'POST',
      body: JSON.stringify(testData)
    }, currentProjectId);
  }

  /**
   * Get browser environment information
   * @returns {Promise<Object>} Browser environment data
   */
  async getBrowserEnvironment() {
    return apiCall(API_CONFIG.endpoints.projects.tests.browserEnvironment);
  }
}

export { API_CONFIG }; 
export { APIChatRepository }; 