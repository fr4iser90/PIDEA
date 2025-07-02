const GetChatHistoryQuery = require('../queries/GetChatHistoryQuery');
const ChatMessage = require('../../domain/entities/ChatMessage');

class GetChatHistoryHandler {
  constructor(chatRepository) {
    this.chatRepository = chatRepository;
  }

  async handle(query) {
    // Validate query
    query.validate();
    const session = await this.chatRepository.findSessionById(query.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    let messages = session.messages;
    if (query.offset) {
      messages = messages.slice(query.offset);
    }
    if (query.limit) {
      messages = messages.slice(0, query.limit);
    }
    // Immer sender/type/content serialisieren
    return {
      sessionId: session.id,
      idePort: session.idePort,
      messages: messages.map(m => m.toJSON())
    };
  }
}

module.exports = GetChatHistoryHandler; 