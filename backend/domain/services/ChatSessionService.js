/**
 * ChatSessionService - Domain Layer: Chat session management
 * Provides browser-tab-like session management for IDE chat functionality
 */

const ChatSession = require('@entities/ChatSession');
const ChatMessage = require('@entities/ChatMessage');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ChatSessionService {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.eventBus = dependencies.eventBus;
    this.ideManager = dependencies.ideManager;
    this.chatRepository = dependencies.chatRepository;
    
    // Session management
    this.activeSessions = new Map(); // userId -> active session
    this.sessionHistory = new Map(); // userId -> session list
    this.sessionCounter = 0;
    
    // Event listeners
    this.setupEventListeners();
    
    logger.info('✅ Chat session service initialized');
  }

  /**
   * Validate service dependencies
   * @param {Object} dependencies - Service dependencies
   * @throws {Error} If dependencies are invalid
   */
  validateDependencies(dependencies) {
    const required = ['eventBus', 'ideManager', 'chatRepository'];
    for (const dep of required) {
      if (!dependencies[dep]) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.eventBus) {
      this.eventBus.subscribe('ide.portChanged', async (eventData) => {
        await this.handlePortChange(eventData);
      });
      
      this.eventBus.subscribe('user.logout', async (eventData) => {
        await this.handleUserLogout(eventData);
      });
    }
  }

  /**
   * Create new chat session
   * @param {string} userId - User ID
   * @param {string} title - Session title
   * @param {Object} metadata - Session metadata
   * @returns {Promise<ChatSession>} Created session
   */
  async createSession(userId, title = 'New Chat', metadata = {}) {
    try {
      // Get current IDE port
      const activePort = this.ideManager.getActivePort();
      
      // Create session with IDE port
      const session = ChatSession.createSession(userId, title, {
        ...metadata,
        idePort: activePort,
        createdAt: new Date(),
        status: 'active'
      });

      // Save to repository
      await this.chatRepository.saveSession(session);

      // Set as active session
      this.activeSessions.set(userId, session);

      // Add to history
      if (!this.sessionHistory.has(userId)) {
        this.sessionHistory.set(userId, []);
      }
      this.sessionHistory.get(userId).push(session);

      // Publish event
      await this.eventBus.publish('chat.session.created', {
        sessionId: session.id,
        userId: userId,
        title: title,
        idePort: activePort,
        timestamp: new Date()
      });

      logger.info(`Created session ${session.id} for user ${userId}`);
      return session;
    } catch (error) {
      logger.error(`Failed to create session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Switch to existing chat session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<ChatSession>} Switched session
   */
  async switchSession(userId, sessionId) {
    try {
      // Find session
      const session = await this.chatRepository.findSessionById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check access
      if (!session.belongsToUser(userId)) {
        throw new Error('Access denied to this session');
      }

      // Update active session
      const previousSession = this.activeSessions.get(userId);
      this.activeSessions.set(userId, session);

      // Publish event
      await this.eventBus.publish('chat.session.switched', {
        sessionId: session.id,
        userId: userId,
        previousSessionId: previousSession?.id,
        timestamp: new Date()
      });

      logger.info(`Switched to session ${sessionId} for user ${userId}`);
      return session;
    } catch (error) {
      logger.error(`Failed to switch to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get active session for user
   * @param {string} userId - User ID
   * @returns {Promise<ChatSession|null>} Active session
   */
  async getActiveSession(userId) {
    try {
      let activeSession = this.activeSessions.get(userId);
      
      if (!activeSession) {
        // Create new session if none exists
        activeSession = await this.createSession(userId);
      }

      return activeSession;
    } catch (error) {
      logger.error(`Failed to get active session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List user's chat sessions
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Session list
   */
  async listSessions(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, includeArchived = false } = options;
      
      const sessions = await this.chatRepository.findSessionsByUserId(userId, {
        limit,
        offset,
        includeArchived
      });

      // Mark active session
      const activeSession = this.activeSessions.get(userId);
      if (activeSession) {
        sessions.forEach(session => {
          session.isActive = session.id === activeSession.id;
        });
      }

      return sessions;
    } catch (error) {
      logger.error(`Failed to list sessions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Close chat session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async closeSession(userId, sessionId) {
    try {
      // Find session
      const session = await this.chatRepository.findSessionById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check access
      if (!session.belongsToUser(userId)) {
        throw new Error('Access denied to this session');
      }

      // Close session
      session.close();
      await this.chatRepository.saveSession(session);

      // Remove from active sessions if it's the active one
      const activeSession = this.activeSessions.get(userId);
      if (activeSession && activeSession.id === sessionId) {
        this.activeSessions.delete(userId);
      }

      // Publish event
      await this.eventBus.publish('chat.session.closed', {
        sessionId: session.id,
        userId: userId,
        timestamp: new Date()
      });

      logger.info(`Closed session ${sessionId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to close session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get chat history for session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Message history
   */
  async getChatHistory(userId, sessionId, options = {}) {
    try {
      // Find session
      const session = await this.chatRepository.findSessionById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check access
      if (!session.belongsToUser(userId)) {
        throw new Error('Access denied to this session');
      }

      const { limit = 100, offset = 0 } = options;
      const messages = await this.chatRepository.findMessagesBySessionId(sessionId, {
        limit,
        offset,
        orderBy: 'timestamp',
        orderDirection: 'ASC'
      });

      return messages;
    } catch (error) {
      logger.error(`Failed to get chat history for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle IDE port change
   * @param {Object} eventData - Port change event data
   */
  async handlePortChange(eventData) {
    try {
      const { port, userId } = eventData;
      
      // Update active session's IDE port if exists
      const activeSession = this.activeSessions.get(userId);
      if (activeSession) {
        activeSession.metadata.idePort = port;
        await this.chatRepository.saveSession(activeSession);
        
        logger.info(`Updated IDE port to ${port} for session ${activeSession.id}`);
      }
    } catch (error) {
      logger.error('Failed to handle port change:', error);
    }
  }

  /**
   * Handle user logout
   * @param {Object} eventData - Logout event data
   */
  async handleUserLogout(eventData) {
    try {
      const { userId } = eventData;
      
      // Clear active session
      this.activeSessions.delete(userId);
      
      logger.info(`Cleared active session for user ${userId}`);
    } catch (error) {
      logger.error('Failed to handle user logout:', error);
    }
  }

  /**
   * Get session statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getSessionStats(userId) {
    try {
      const sessions = await this.listSessions(userId, { includeArchived: true });
      
      const stats = {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        archived: sessions.filter(s => s.status === 'archived').length,
        hasActiveSession: this.activeSessions.has(userId)
      };

      return stats;
    } catch (error) {
      logger.error(`Failed to get session stats for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = ChatSessionService; 