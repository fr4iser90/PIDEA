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
}

export { API_CONFIG, apiCall }; 