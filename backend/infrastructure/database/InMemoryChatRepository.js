const ChatRepository = require('@/domain/repositories/ChatRepository');
const ChatSession = require('@/domain/entities/ChatSession');
const ChatMessage = require('@/domain/entities/ChatMessage');

class InMemoryChatRepository extends ChatRepository {
  constructor() {
    super();
    this.sessions = new Map();
    this.messageCounter = 0;
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
    return Array.from(this.sessions.values());
  }

  async deleteSession(id) {
    const deleted = this.sessions.delete(id);
    return deleted;
  }

  async addMessageToSession(sessionId, message) {
    const session = await this.findSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!(message instanceof ChatMessage)) {
      throw new Error('message must be an instance of ChatMessage');
    }

    session.addMessage(message);
    await this.saveSession(session);
    return session;
  }

  async getSessionMessages(sessionId) {
    const session = await this.findSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session.messages;
  }

  async updateSession(session) {
    return this.saveSession(session);
  }

  // Additional methods for development/testing
  async clearAll() {
    this.sessions.clear();
    this.messageCounter = 0;
  }

  async getSessionCount() {
    return this.sessions.size;
  }

  async findSessionsByDateRange(startDate, endDate) {
    return Array.from(this.sessions.values()).filter(session => {
      const sessionDate = session.createdAt;
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }
}

module.exports = InMemoryChatRepository; 