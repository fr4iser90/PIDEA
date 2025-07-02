class ChatRepository {
  async saveSession(session) {
    throw new Error('saveSession method must be implemented');
  }

  async findSessionById(id) {
    throw new Error('findSessionById method must be implemented');
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