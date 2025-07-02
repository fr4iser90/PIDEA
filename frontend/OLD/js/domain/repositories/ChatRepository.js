class ChatRepository {
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

export default ChatRepository; 