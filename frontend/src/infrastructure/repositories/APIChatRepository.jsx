import { logger } from "@/infrastructure/logging/Logger";
import ChatRepository from '@/domain/repositories/ChatRepository.jsx';
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import ChatSession from '@/domain/entities/ChatSession.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';
import etagManager from '@/infrastructure/services/ETagManager.js';

// Utility function to convert workspace path to project ID
const getProjectIdFromWorkspace = (workspacePath) => {
  if (!workspacePath) return 'default';
  
  // Extract project name from path
  const pathParts = workspacePath.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Convert to lowercase and remove special characters
  return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
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
      }
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
    docsTasks: {
      list: '/api/docs-tasks',
      details: (filename) => `/api/docs-tasks/${filename}`
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
  const url = typeof endpoint === 'function' ? endpoint() : `${API_CONFIG.baseURL}${endpoint}`;
  
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
    ...etagOptions
  };

  logger.info('🔍 [APIChatRepository] Final headers:', config.headers);
  logger.info('🔍 [APIChatRepository] Request config:', {
    method: config.method || 'GET',
    headers: config.headers,
    hasBody: !!config.body
  });

  try {
    const response = await fetch(url, config);
    
    logger.info('🔍 [APIChatRepository] Response status:', response.status);
    
    // Handle ETag response only for analysis endpoints
    if (isAnalysisEndpoint) {
    const etagResponse = etagManager.handleResponse(response, endpoint, projectId);
    
    if (response.status === 304) {
      // Handle 304 Not Modified
      const cachedData = etagManager.handleNotModified(endpoint, projectId);
      if (cachedData) {
        logger.info('✅ [APIChatRepository] Using cached data (304 Not Modified)');
        return cachedData;
        }
      }
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        logger.info('❌ [APIChatRepository] 401 Unauthorized - logging out user');
        // Token expired or invalid, logout user
        const { logout } = useAuthStore.getState();
        logout();
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache successful GET responses only for analysis endpoints
    if (isAnalysisEndpoint && (config.method === 'GET' || !config.method)) {
      etagManager.cacheData(endpoint, data, projectId);
    }
    
    logger.info('✅ [APIChatRepository] API call successful');
    return data;
  } catch (error) {
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
  }

  // Get current project ID from active IDE
  async getCurrentProjectId() {
    try {
      const ideList = await this.getIDEs();
      if (ideList.success && ideList.data) {
        const activeIDE = ideList.data.find(ide => ide.active);
        if (activeIDE && activeIDE.workspacePath) {
          this.currentProjectId = getProjectIdFromWorkspace(activeIDE.workspacePath);
          logger.info('🔍 [APIChatRepository] Current project ID:', this.currentProjectId, 'from workspace:', activeIDE.workspacePath);
          return this.currentProjectId;
        }
      }
    } catch (error) {
      logger.error('❌ [APIChatRepository] Error getting current project ID:', error);
    }
    
    // Fallback to default
    this.currentProjectId = 'default';
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
    return apiCall(API_CONFIG.endpoints.ide.list);
  }

  async getUserAppUrl() {
    return apiCall(API_CONFIG.endpoints.ide.userAppUrl);
  }

  async getUserAppUrlForPort(port) {
    return apiCall(API_CONFIG.endpoints.ide.userAppUrlForPort(port));
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
    return apiCall(API_CONFIG.endpoints.ide.workspaceInfo);
  }

  async setWorkspacePath(port, workspacePath) {
    return apiCall(API_CONFIG.endpoints.ide.setWorkspace(port), {
      method: 'POST',
      body: JSON.stringify({ workspacePath })
    });
  }

  async switchIDE(port) {
    return apiCall(API_CONFIG.endpoints.ide.switchIDE(port), {
      method: 'POST'
    });
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

  // Individual Analysis Step Methods
  async executeAnalysisStep(projectId = null, analysisType, options = {}) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/analysis/${analysisType}`, {
      method: 'POST',
      body: JSON.stringify(options)
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

  // Documentation Tasks Methods
  async getDocsTasks(projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(`/api/projects/${currentProjectId}/docs-tasks`, {}, currentProjectId);
  }

  async getDocsTaskDetails(taskId, projectId = null) {
    const currentProjectId = projectId || await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${currentProjectId}/docs-tasks/${taskId}`, {}, currentProjectId);
  }

  // NEW: Sync docs tasks to database
  async syncDocsTasks() {
    const projectId = await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${projectId}/tasks/sync-docs`, {
      method: 'POST'
    });
  }

  // NEW: Clean docs tasks from database
  async cleanDocsTasks() {
    const projectId = await this.getCurrentProjectId();
    return await apiCall(`/api/projects/${projectId}/tasks/clean-docs`, {
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
  async getGitStatus(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.status(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
  }

  async getGitBranches(projectId = null, projectPath = null) {
    const actualProjectId = projectId || await this.getCurrentProjectId();
    return apiCall(API_CONFIG.endpoints.git.branches(actualProjectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath })
    });
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
}

export { API_CONFIG }; 