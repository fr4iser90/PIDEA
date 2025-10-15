import { ApiService } from '@/infrastructure/services/ApiService.js';
import ChatSession from '@/domain/entities/ChatSession.jsx';
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';

export default class ChatService {
  constructor() {
    this.api = new ApiService();
  }

  async loadSession(sessionId) {
    return await this.api.call(`/api/chat/history/${sessionId}`);
  }

  async sendMessage(content, sessionId) {
    return await this.api.call('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: content, sessionId })
    });
  }

  // Get authenticated headers for API calls
  getAuthHeaders() {
    const { getAuthHeaders } = useAuthStore.getState();
    return getAuthHeaders();
  }
} 