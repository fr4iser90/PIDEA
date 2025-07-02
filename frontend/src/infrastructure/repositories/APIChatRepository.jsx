import ChatRepository from '@domain/repositories/ChatRepository.jsx';
import ChatMessage from '@domain/entities/ChatMessage.jsx';
import ChatSession from '@domain/entities/ChatSession.jsx';

// Central API Configuration
const API_CONFIG = {
  baseURL: 'http://localhost:3000',
  endpoints: {
    chat: {
      history: '/api/chat/history',
      send: '/api/chat/send',
      sessions: '/api/chat/sessions',
      info: '/api/chat/info'
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
    settings: '/api/settings'
  }
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ API call failed for ${endpoint}:`, error);
    throw error;
  }
};

class APIChatRepository extends ChatRepository {
  constructor() {
    super();
    this.baseURL = API_CONFIG.baseURL;
    this.currentSession = null;
  }

  async getChatHistory() {
    return apiCall(API_CONFIG.endpoints.chat.history);
  }

  async sendMessage(message) {
    return apiCall(API_CONFIG.endpoints.chat.send, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  async getCurrentSession() {
    if (!this.currentSession) {
      this.currentSession = new ChatSession('default', 'Current Chat');
    }
    return this.currentSession;
  }

  async createSession(session) {
    // In a real app, this would create a session on the server
    this.currentSession = session;
    return session;
  }

  async updateSession(session) {
    // In a real app, this would update the session on the server
    this.currentSession = session;
    return session;
  }

  async deleteSession(sessionId) {
    // In a real app, this would delete the session on the server
    if (this.currentSession && this.currentSession.id === sessionId) {
      this.currentSession = null;
    }
    return true;
  }

  async getChatSessions() {
    return apiCall(API_CONFIG.endpoints.chat.sessions);
  }

  async getChatInfo() {
    return apiCall(API_CONFIG.endpoints.chat.info);
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
}

export default APIChatRepository;
export { API_CONFIG, apiCall }; 