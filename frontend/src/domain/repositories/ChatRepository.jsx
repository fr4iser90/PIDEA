import ChatSession from '../entities/ChatSession';

export default class ChatRepository {
  constructor() {
    this.sessions = new Map();
  }

  saveSession(session) {
    if (!(session instanceof ChatSession)) {
      throw new Error('Invalid session');
    }
    this.sessions.set(session.id, session);
  }

  findSessionById(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return session;
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  async getChatHistory() {
    throw new Error('getChatHistory method must be implemented');
  }

  async sendMessage(message) {
    throw new Error('sendMessage method must be implemented');
  }

  async getCurrentSession() {
    throw new Error('getCurrentSession method must be implemented');
  }

  async createSession(session) {
    throw new Error('createSession method must be implemented');
  }

  async updateSession(session) {
    throw new Error('updateSession method must be implemented');
  }

  async deleteSession(sessionId) {
    throw new Error('deleteSession method must be implemented');
  }
} 