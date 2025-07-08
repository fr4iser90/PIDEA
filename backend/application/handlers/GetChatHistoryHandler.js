const GetChatHistoryQuery = require('@/application/queries/GetChatHistoryQuery');
const ChatMessage = require('@/domain/entities/ChatMessage');

class GetChatHistoryHandler {
  constructor(chatRepository, cursorIDEService = null) {
    this.chatRepository = chatRepository;
    this.cursorIDEService = cursorIDEService;
  }

  async handle(query) {
    // Handle new user-specific query format
    if (query.userId) {
      return await this.handleUserSpecificQuery(query);
    }

    // Legacy query handling for backward compatibility
    return await this.handleLegacyQuery(query);
  }

  async handleUserSpecificQuery(query) {
    const { userId, port, limit = 50, offset = 0, includeUserData = false } = query;

    if (port) {
      // Get messages for specific port and user
      const messages = await this.getMessagesByPort(port, userId, { limit, offset });
      
      return {
        port: port,
        messages: messages.map(m => this.sanitizeMessage(m, includeUserData)),
        totalCount: messages.length,
        hasMore: messages.length >= limit
      };
    } else {
      // Get all messages for user across all ports
      const allMessages = await this.getAllMessagesForUser(userId, { limit, offset });
      
      return {
        port: 'all',
        messages: allMessages.map(m => this.sanitizeMessage(m, includeUserData)),
        totalCount: allMessages.length,
        hasMore: allMessages.length >= limit
      };
    }
  }

  async handleLegacyQuery(query) {
    // Validate query
    query.validate();
    
    // If port is provided, get messages for that port
    if (query.port) {
      const messages = await this.getMessagesByPort(query.port, null, { 
        limit: query.limit, 
        offset: query.offset 
      });
      
      return {
        port: query.port,
        messages: messages.map(m => m.toJSON())
      };
    }
    
    // If no port, get all messages (global chat)
    const allMessages = await this.getAllMessages({ 
      limit: query.limit, 
      offset: query.offset 
    });
    
    return {
      port: 'global',
      messages: allMessages.map(m => m.toJSON())
    };
  }

  async getMessagesByPort(port, userId = null, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    console.log(`[GetChatHistoryHandler] getMessagesByPort called with port: ${port}, userId: ${userId}`);

    // Use the new direct message method from ChatRepository
    const filteredMessages = await this.chatRepository.getMessagesByPort(port, userId);
    
    console.log(`[GetChatHistoryHandler] Found ${filteredMessages.length} messages for port ${port}`);

    // Sort by timestamp (newest first)
    filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    let paginatedMessages = filteredMessages;
    if (offset) {
      paginatedMessages = paginatedMessages.slice(offset);
    }
    if (limit) {
      paginatedMessages = paginatedMessages.slice(0, limit);
    }

    return paginatedMessages;
  }

  async getAllMessagesForUser(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    // Use the new direct message method from ChatRepository
    const userMessages = await this.chatRepository.getMessagesByUser(userId);

    // Sort by timestamp (newest first)
    userMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    let paginatedMessages = userMessages;
    if (offset) {
      paginatedMessages = paginatedMessages.slice(offset);
    }
    if (limit) {
      paginatedMessages = paginatedMessages.slice(0, limit);
    }

    return paginatedMessages;
  }

  async getAllMessages(options = {}) {
    const { limit = 50, offset = 0 } = options;

    // Use the new direct message method from ChatRepository
    const allMessages = await this.chatRepository.getAllMessages();

    // Sort by timestamp (newest first)
    allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    let paginatedMessages = allMessages;
    if (offset) {
      paginatedMessages = paginatedMessages.slice(offset);
    }
    if (limit) {
      paginatedMessages = paginatedMessages.slice(0, limit);
    }

    return paginatedMessages;
  }

  async getPortChatHistory(port, userId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    console.log(`[GetChatHistoryHandler] getPortChatHistory called with port: ${port}, userId: ${userId}`);

    // Get messages for this port and user
    const messages = await this.getMessagesByPort(port, userId, { limit, offset });

    // Try to extract live chat from IDE first
    let liveMessages = [];
    try {
      if (this.cursorIDEService) {
        console.log(`[GetChatHistoryHandler] Extracting live chat from IDE...`);
        liveMessages = await this.cursorIDEService.extractChatHistory();
        console.log(`[GetChatHistoryHandler] Extracted ${liveMessages.length} live messages`);
      }
    } catch (error) {
      console.log(`[GetChatHistoryHandler] Failed to extract live chat: ${error.message}`);
    }

    // If we have live messages, return them
    if (liveMessages && liveMessages.length > 0) {
      return {
        messages: liveMessages.map(m => ({
          id: m.id || Date.now() + Math.random(),
          content: m.content,
          sender: m.sender,
          type: m.type || 'text',
          timestamp: m.timestamp || new Date().toISOString(),
          metadata: m.metadata || {}
        })),
        port: port,
        totalCount: liveMessages.length,
        hasMore: false
      };
    }

    // Return stored messages
    return {
      messages: messages.map(m => this.sanitizeMessage(m, false)),
      port: port,
      totalCount: messages.length,
      hasMore: messages.length >= limit
    };
  }

  sanitizeMessage(message, includeUserData) {
    const messageData = message.toJSON ? message.toJSON() : message;
    
    if (!includeUserData) {
      // Remove sensitive user data
      delete messageData.userId;
      delete messageData.userEmail;
    }

    return messageData;
  }
}

module.exports = GetChatHistoryHandler; 