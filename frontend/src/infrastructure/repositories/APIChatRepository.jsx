import ChatRepository from '@domain/repositories/ChatRepository.jsx';
import ChatMessage from '@domain/entities/ChatMessage.jsx';
import ChatSession from '@domain/entities/ChatSession.jsx';
import useAuthStore from '@infrastructure/stores/AuthStore.jsx';

// Central API Configuration
const API_CONFIG = {
  baseURL: 'http://localhost:3000',
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
      }
    },
    preview: {
      status: '/api/preview/status',
      data: '/api/preview/data'
    },
    prompts: {
      quick: '/api/prompts/quick'
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
        start: (projectId) => `/api/projects/${projectId}/auto/execute`,
        stop: (projectId) => `/api/projects/${projectId}/auto/stop`,
        status: (projectId) => `/api/projects/${projectId}/auto/status`
      }
    },
    settings: '/api/settings',
    health: '/api/health'
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const url = typeof endpoint === 'function' ? endpoint() : `${API_CONFIG.baseURL}${endpoint}`;
  
  console.log('🔍 [APIChatRepository] Making API call to:', url);
  
  // Get authentication headers
  const { getAuthHeaders } = useAuthStore.getState();
  const authHeaders = getAuthHeaders();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers
    },
    ...options
  };

  console.log('🔍 [APIChatRepository] Request config:', {
    method: config.method || 'GET',
    headers: config.headers,
    hasBody: !!config.body
  });

  try {
    const response = await fetch(url, config);
    
    console.log('🔍 [APIChatRepository] Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ [APIChatRepository] 401 Unauthorized - logging out user');
        // Token expired or invalid, logout user
        const { logout } = useAuthStore.getState();
        logout();
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ [APIChatRepository] API call successful');
    return data;
  } catch (error) {
    console.error(`❌ [APIChatRepository] API call failed for ${url}:`, error);
    throw error;
  }
};

export default class APIChatRepository extends ChatRepository {
  constructor() {
    super();
    this.baseURL = API_CONFIG.baseURL;
    this.currentSession = null;
  }

  async getChatHistory() {
    return apiCall(API_CONFIG.endpoints.chat.history);
  }

  async getPortChatHistory(port) {
    return apiCall(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.chat.portHistory(port)}`);
  }

  async sendMessage(message, sessionId) {
    const data = await apiCall(API_CONFIG.endpoints.chat.send, {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    });
    if (!data.success || !data.data) throw new Error('Invalid response');
    const msg = data.data.message;
    return ChatMessage.fromJSON(msg);
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
  async createTask(taskData, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectCreate(projectId), {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async getTasks(projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectTasks(projectId));
  }

  async getTask(taskId, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectGet(projectId, taskId));
  }

  async updateTask(taskId, taskData, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectUpdate(projectId, taskId), {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  async deleteTask(taskId, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectDelete(projectId, taskId), {
      method: 'DELETE'
    });
  }

  async executeTask(taskId, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectExecute(projectId, taskId), {
      method: 'POST'
    });
  }

  async getTaskStatus(taskId, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.projectStatus(projectId, taskId));
  }

  async analyzeProject(projectPath, options = {}, projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.analysis.project(projectId), {
      method: 'POST',
      body: JSON.stringify({ projectPath, ...options })
    });
  }

  async startAutoMode(projectId = 'default', options = {}) {
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.start(projectId), {
      method: 'POST',
      body: JSON.stringify({ ...options })
    });
  }

  async stopAutoMode(projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.stop(projectId), {
      method: 'POST'
    });
  }

  async getAutoModeStatus(projectId = 'default') {
    return apiCall(API_CONFIG.endpoints.tasks.autoMode.status(projectId));
  }
}

export { API_CONFIG, apiCall }; 