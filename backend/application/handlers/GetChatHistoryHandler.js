const GetChatHistoryQuery = require('../queries/GetChatHistoryQuery');
const ChatMessage = require('../../domain/entities/ChatMessage');

class GetChatHistoryHandler {
  constructor(chatRepository) {
    this.chatRepository = chatRepository;
  }

  async handle(query) {
    // Validate query
    query.validate();
    
    // If sessionId is provided, use it (for backward compatibility)
    if (query.sessionId) {
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
      return {
        sessionId: session.id,
        idePort: session.idePort,
        messages: messages.map(m => m.toJSON())
      };
    }
    
    // If no sessionId, get all messages (global chat)
    const allSessions = await this.chatRepository.getAllSessions();
    let allMessages = [];
    
    allSessions.forEach(session => {
      allMessages = allMessages.concat(session.messages);
    });
    
    // Sort by timestamp
    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (query.offset) {
      allMessages = allMessages.slice(query.offset);
    }
    if (query.limit) {
      allMessages = allMessages.slice(0, query.limit);
    }
    
    return {
      sessionId: 'global',
      idePort: null,
      messages: allMessages.map(m => m.toJSON())
    };
  }
}

module.exports = GetChatHistoryHandler; 