import ChatRepository from '@/infrastructure/repositories/ChatRepository.jsx';
import ChatSession from '@/domain/entities/ChatSession.jsx';
import ChatMessage from '@/domain/entities/ChatMessage.jsx';
import useAuthStore from '@/infrastructure/stores/AuthStore.jsx';

export default class ChatService {
  constructor() {
    this.api = new ChatRepository();
  }

  async loadSession(sessionId) {
    return await this.api.fetchChatHistory(sessionId);
  }

  async sendMessage(content, sessionId) {
    // type wird im Backend bestimmt, hier nur weiterleiten
    return await this.api.sendMessage(content, sessionId);
  }

  // Get authenticated headers for API calls
  getAuthHeaders() {
    const { getAuthHeaders } = useAuthStore.getState();
    return getAuthHeaders();
  }
} 