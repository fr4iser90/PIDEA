const GetChatHistoryQuery = require('../queries/GetChatHistoryQuery');
const ChatMessage = require('../../domain/entities/ChatMessage');
const ChatSession = require('../../domain/entities/ChatSession');

class GetChatHistoryHandler {
  constructor(chatRepository) {
    this.chatRepository = chatRepository;
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
    const { userId, sessionId, limit = 50, offset = 0, includeUserData = false } = query;

    if (sessionId) {
      // Get specific session for user
      const session = await this.chatRepository.findSessionById(sessionId);
      if (!session || session.userId !== userId) {
        throw new Error('Session not found or access denied');
      }

      let messages = session.messages || [];
      
      // Apply pagination
      if (offset) {
        messages = messages.slice(offset);
      }
      if (limit) {
        messages = messages.slice(0, limit);
      }

      return {
        sessionId: session.id,
        messages: messages.map(m => this.sanitizeMessage(m, includeUserData)),
        totalCount: session.messages ? session.messages.length : 0,
        hasMore: (session.messages ? session.messages.length : 0) > (offset + limit)
      };
    } else {
      // Get all sessions for user
      const userSessions = await this.getUserSessions(userId, { limit, offset });
      const allMessages = [];

      for (const session of userSessions) {
        if (session.messages) {
          allMessages.push(...session.messages);
        }
      }

      // Sort by timestamp
      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return {
        sessionId: 'user-all',
        messages: allMessages.map(m => this.sanitizeMessage(m, includeUserData)),
        totalCount: allMessages.length,
        hasMore: allMessages.length > (offset + limit)
      };
    }
  }

  async handleLegacyQuery(query) {
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

  async getUserSessions(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    // Get all sessions and filter by user
    const allSessions = await this.chatRepository.getAllSessions();
    const userSessions = allSessions.filter(session => session.userId === userId);

    // Apply pagination
    const paginatedSessions = userSessions.slice(offset, offset + limit);

    return paginatedSessions.map(session => ({
      id: session.id,
      title: session.title || `Chat Session ${session.id}`,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messages ? session.messages.length : 0,
      lastMessage: session.messages && session.messages.length > 0 
        ? this.sanitizeMessage(session.messages[session.messages.length - 1], false)
        : null
    }));
  }

  async createSession(userId, options = {}) {
    const { title, metadata = {} } = options;

    const session = new ChatSession(
      null,
      userId,
      title,
      new Date(),
      new Date(),
      metadata
    );

    await this.chatRepository.saveSession(session);
    return session;
  }

  async deleteSession(sessionId, userId) {
    const session = await this.chatRepository.findSessionById(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.userId !== userId) {
      throw new Error('Access denied to this session');
    }

    // Note: This would need to be implemented in the repository
    // For now, we'll just return success
    return true;
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