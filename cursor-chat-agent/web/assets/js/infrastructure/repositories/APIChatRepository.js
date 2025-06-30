import ChatRepository from '../../domain/repositories/ChatRepository.js';
import ChatMessage from '../../domain/entities/ChatMessage.js';
import ChatSession from '../../domain/entities/ChatSession.js';

class APIChatRepository extends ChatRepository {
  constructor(baseURL = '') {
    super();
    this.baseURL = baseURL;
    this.currentSession = null;
  }

  async getChatHistory() {
    try {
      const response = await fetch(`${this.baseURL}/api/chat/history`);
      const data = await response.json();
      
      let messages = [];
      if (data.messages) {
        messages = data.messages;
      } else if (data.data && data.data.messages) {
        messages = data.data.messages;
      }

      return messages
        .filter(m => {
          if (typeof m === 'object' && m.type && m.content) return true;
          const msg = m.toString().trim();
          return !msg.startsWith('[Web]') && !msg.startsWith('Debug') && 
                 !msg.startsWith('Fehler') && !msg.startsWith('Error') && 
                 !Array.isArray(msg) && msg.length > 0;
        })
        .map(m => ChatMessage.fromJSON(m));
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw new Error(`Failed to load chat history: ${error.message}`);
    }
  }

  async sendMessage(message) {
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.content })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
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
}

export default APIChatRepository; 