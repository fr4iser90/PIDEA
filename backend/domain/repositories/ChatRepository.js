const ChatSession = require('@/domain/entities/ChatSession');

class ChatRepository {
  constructor() {
    this.sessions = new Map();
  }

  async saveSession(session) {
    if (!(session instanceof ChatSession)) {
      throw new Error('Invalid session');
    }
    this.sessions.set(session.id, session.toJSON());
  }

  async findSessionById(sessionId) {
    const data = this.sessions.get(sessionId);
    if (!data) return null;
    return ChatSession.fromJSON(data);
  }

  async getAllSessions() {
    return Array.from(this.sessions.values()).map(s => ChatSession.fromJSON(s));
  }

  async findAllSessions() {
    throw new Error('findAllSessions method must be implemented');
  }

  async deleteSession(id) {
    throw new Error('deleteSession method must be implemented');
  }

  async addMessageToSession(sessionId, message) {
    throw new Error('addMessageToSession method must be implemented');
  }

  async getSessionMessages(sessionId) {
    throw new Error('getSessionMessages method must be implemented');
  }

  async updateSession(session) {
    throw new Error('updateSession method must be implemented');
  }
}

module.exports = ChatRepository; 