const GetChatHistoryQuery = require('@application/queries/GetChatHistoryQuery');
const ChatMessage = require('@entities/ChatMessage');

const IDETypes = require('@services/ide/IDETypes');
const Logger = require('@logging/Logger');
const logger = new Logger('ChatHistoryHandler');

class GetChatHistoryHandler {
  constructor(chatRepository, ideManager = null, serviceRegistry = null, chatCacheService = null) {
    this.chatRepository = chatRepository;
    this.ideManager = ideManager;
    this.serviceRegistry = serviceRegistry;
    this.chatCacheService = chatCacheService;
  }

  /**
   * EINZIGE METHODE - Holt Chat-Historie (Datenbank + IDE)
   */
  async handle(query) {
    const { userId, port, limit = 50, offset = 0, includeUserData = false } = query;

    logger.info(`🔍 Getting chat history for port ${port}, user ${userId}`);

    // 1. Get messages from database
    const dbMessages = await this.chatRepository.getMessagesByPort(port, userId);
    logger.info(`📊 Found ${dbMessages.length} messages in database for port ${port}`);

    // 2. Get live messages from IDE (with caching)
    let liveMessages = [];
    try {
      // ✅ FIXED: Use chat cache service to prevent repeated extractions
      if (this.chatCacheService) {
        const cachedMessages = await this.chatCacheService.getChatHistory(port);
        if (cachedMessages && cachedMessages.length > 0) {
          logger.info(`📋 Using cached chat for port ${port}: ${cachedMessages.length} messages`);
          liveMessages = cachedMessages;
        } else {
          // Cache miss - extract live and cache it
          const ideService = await this.getIDEServiceForPort(port);
          if (ideService && typeof ideService.extractChatHistory === 'function') {
            logger.info(`📝 Extracting live chat from IDE on port ${port}...`);
            liveMessages = await ideService.extractChatHistory(port);
            logger.info(`✅ Extracted ${liveMessages.length} live messages from IDE`);
            
            // Cache the extracted messages
            await this.chatCacheService.setChatHistory(port, liveMessages);
            logger.info(`💾 Cached ${liveMessages.length} messages for port ${port}`);
          }
        }
      } else {
        // Fallback: direct extraction without cache
        const ideService = await this.getIDEServiceForPort(port);
        if (ideService && typeof ideService.extractChatHistory === 'function') {
          logger.info(`📝 Extracting live chat from IDE on port ${port}...`);
          liveMessages = await ideService.extractChatHistory(port);
          logger.info(`✅ Extracted ${liveMessages.length} live messages from IDE`);
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to extract live chat: ${error.message}`);
    }

    // 3. Combine and sort all messages
    const allMessages = [...dbMessages, ...liveMessages];
    allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 4. Apply pagination
    let paginatedMessages = allMessages;
    if (offset) {
      paginatedMessages = paginatedMessages.slice(offset);
    }
    if (limit) {
      paginatedMessages = paginatedMessages.slice(0, limit);
    }

    logger.info(`📤 Returning ${paginatedMessages.length} total messages for port ${port}`);

    return {
      port: port,
      messages: paginatedMessages.map(m => this.sanitizeMessage(m, includeUserData)),
      totalCount: paginatedMessages.length,
      hasMore: paginatedMessages.length >= limit
    };
  }

  /**
   * Get the appropriate IDE service for a given port
   */
  async getIDEServiceForPort(port) {
    try {
      if (!this.ideManager) {
        logger.info('No IDE manager available');
        return null;
      }

      // Get available IDEs
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const targetIDE = availableIDEs[port] || Object.values(availableIDEs).find(ide => ide.port === port);
      
      if (!targetIDE) {
        logger.warn(`❌ No IDE found for port ${port}`);
        return null;
      }

      logger.info(`✅ Found IDE for port ${port}:`, targetIDE);

      // Determine IDE type based on port range
      let ideType = IDETypes.CURSOR; // default
      if (port >= 9222 && port <= 9231) {
        ideType = IDETypes.CURSOR;
      } else if (port >= 9232 && port <= 9241) {
        ideType = IDETypes.VSCODE;
      } else if (port >= 9242 && port <= 9251) {
        ideType = IDETypes.WINDSURF;
      }

      // Get the appropriate service from registry
      if (this.serviceRegistry) {
        let service = null;
        
        switch (ideType) {
          case IDETypes.CURSOR:
            service = this.serviceRegistry.getService('cursorIDEService');
            break;
          case IDETypes.VSCODE:
            service = this.serviceRegistry.getService('vscodeIDEService');
            break;
          case IDETypes.WINDSURF:
            service = this.serviceRegistry.getService('windsurfIDEService');
            break;
        }
        
        if (service) {
          logger.info(`✅ Found IDE service: ${service.constructor.name}`);
          return service;
        }
      }

      logger.warn(`❌ No IDE service found for type ${ideType}`);
      return null;

    } catch (error) {
      logger.error(`❌ Error getting IDE service for port ${port}:`, error);
      return null;
    }
  }

  sanitizeMessage(message, includeUserData) {
    if (!message) return null;
    
    const sanitized = {
      id: message.id || message._id || Date.now() + Math.random(),
      content: message.content || message.message || '',
      sender: message.sender || message.user || 'unknown',
      type: message.type || 'text',
      timestamp: message.timestamp || message.created_at || new Date().toISOString(),
      port: message.port || null
    };

    if (includeUserData && message.metadata) {
      sanitized.metadata = message.metadata;
    }

    return sanitized;
  }
}

module.exports = GetChatHistoryHandler; 