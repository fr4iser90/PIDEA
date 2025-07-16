const GetChatHistoryQuery = require('@application/queries/GetChatHistoryQuery');
const ChatMessage = require('@entities/ChatMessage');


const IDETypes = require('@services/ide/IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('ChatHistoryHandler');

class GetChatHistoryHandler {
  constructor(chatRepository, ideManager = null, serviceRegistry = null) {
    this.chatRepository = chatRepository;
    this.ideManager = ideManager;
    this.serviceRegistry = serviceRegistry;
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
    
          // logger.info(`getMessagesByPort called with port: ${port}`);

    // Use the new direct message method from ChatRepository
    const filteredMessages = await this.chatRepository.getMessagesByPort(port, userId);
    
    // logger.info(`Found ${filteredMessages.length} messages for port ${port}`);

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
    
          // logger.info(`getPortChatHistory called with port: ${port}`);

    // Get messages for this port and user
    const messages = await this.getMessagesByPort(port, userId, { limit, offset });

    // Try to extract live chat from IDE first
    let liveMessages = [];
    try {
      const ideService = await this.getIDEServiceForPort(port);
      if (ideService) {
        // logger.info(`Extracting live chat from IDE on port ${port}...`);
        // logger.info(`IDE Service type:`, ideService.constructor.name);
        // logger.info(`IDE Service methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(ideService)));
        
        liveMessages = await ideService.extractChatHistory();
        //logger.info(`Extracted ${liveMessages.length} live messages:`, liveMessages);
      } else {
        logger.info(`No IDE service found for port ${port}`);
      }
    } catch (error) {
      logger.info(`Failed to extract live chat: ${error.message}`);
      logger.error(`Full error:`, error);
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

  /**
   * Get the appropriate IDE service for a given port
   * @param {number} port - The IDE port
   * @returns {Object|null} The IDE service or null if not found
   */
  async getIDEServiceForPort(port) {
    try {
      if (!this.ideManager) {
        logger.info('No IDE manager available');
        return null;
      }

      // Get available IDEs to determine the type
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      // logger.info(`Available IDEs:`, availableIDEs);
      
      // FIXED: Handle the correct data structure from IDEManager
      // availableIDEs is an object with port as key, not an array
      const targetIDE = availableIDEs[port] || Object.values(availableIDEs).find(ide => ide.port === port);
      
      if (!targetIDE) {
        // logger.info(`No IDE found for port ${port} in available IDEs:`, availableIDEs);
        // Fallback: determine IDE type based on port range anyway
        // logger.info(`Using port range fallback for port ${port}`);
      }

      // Determine IDE type based on port range
      let ideType = IDETypes.CURSOR; // default
      if (port >= 9222 && port <= 9231) {
        ideType = IDETypes.CURSOR;
      } else if (port >= 9232 && port <= 9241) {
        ideType = IDETypes.VSCODE;
      } else if (port >= 9242 && port <= 9251) {
        ideType = IDETypes.WINDSURF;
      }

      // logger.info(`Detected IDE type ${ideType} for port ${port}`);

      // Get the appropriate service from registry
      if (this.serviceRegistry) {
        switch (ideType) {
          case IDETypes.CURSOR:
            return this.serviceRegistry.getService('cursorIDEService');
          case IDETypes.VSCODE:
            return this.serviceRegistry.getService('vscodeIDEService');
          case IDETypes.WINDSURF:
            return this.serviceRegistry.getService('windsurfIDEService');
          default:
            return this.serviceRegistry.getService('cursorIDEService'); // fallback
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error getting IDE service for port ${port}:`, error);
      return null;
    }
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