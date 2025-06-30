const GetChatHistoryQuery = require('../queries/GetChatHistoryQuery');
const ChatMessage = require('../../domain/entities/ChatMessage');

class GetChatHistoryHandler {
  constructor(chatRepository, cursorIDEService) {
    this.chatRepository = chatRepository;
    this.cursorIDEService = cursorIDEService;
  }

  async handle(query) {
    // Validate query
    query.validate();

    try {
      let messages = [];

      if (query.sessionId) {
        // Get messages from specific session
        const session = await this.chatRepository.findSessionById(query.sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        messages = session.messages;
      } else {
        // Get messages from Cursor IDE
        const rawMessages = await this.cursorIDEService.extractChatHistory();
        messages = rawMessages.map(msgData => 
          ChatMessage.fromJSON({
            id: null,
            content: msgData.content,
            type: msgData.type,
            timestamp: new Date().toISOString(),
            metadata: {}
          })
        );
      }

      // Apply pagination
      const paginatedMessages = messages
        .slice(query.offset, query.offset + query.limit)
        .map(msg => msg.toJSON());

      return {
        messages: paginatedMessages,
        total: messages.length,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < messages.length
      };

    } catch (error) {
      console.error('[GetChatHistoryHandler] Error:', error);
      throw error;
    }
  }
}

module.exports = GetChatHistoryHandler; 