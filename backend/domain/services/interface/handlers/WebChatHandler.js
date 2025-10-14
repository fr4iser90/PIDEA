/**
 * WebChat Handler - ChatGPT/DeepSeek via Browser
 *
 * Handles web-based chat interfaces like ChatGPT, DeepSeek, Claude, etc.
 * Uses browser automation to interact with chat services.
 */

const Logger = require("@logging/Logger");
const ServiceLogger = require("@logging/ServiceLogger");

class WebChatHandler {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger("WebChatHandler");
    this.browserManager = dependencies.browserManager;
    this.eventBus = dependencies.eventBus;
    this.serviceRegistry = dependencies.serviceRegistry;

    // WebChat state
    this.activeChats = new Map(); // sessionId -> chat instance
    this.chatHistory = new Map(); // sessionId -> message history
  }

  /**
   * Create WebChat interface instance
   * @param {Object} config - WebChat configuration
   * @param {string} interfaceId - Interface ID
   * @returns {Promise<Object>} WebChat interface instance
   */
  async createInterface(config, interfaceId) {
    try {
      const { chatUrl, provider, sessionId, autoLogin } = config;

      this.logger.info(`Creating WebChat interface: ${interfaceId}`, {
        chatUrl,
        provider,
        sessionId,
        autoLogin,
      });

      // Initialize browser session
      const browserSession = await this.initializeBrowserSession(
        chatUrl,
        provider,
        autoLogin,
      );

      // Store active chat
      this.activeChats.set(sessionId || interfaceId, {
        id: interfaceId,
        chatUrl,
        provider,
        sessionId: sessionId || interfaceId,
        browserSession,
        status: "connected",
        createdAt: new Date(),
      });

      return {
        id: interfaceId,
        type: "webchat",
        chatUrl,
        provider,
        sessionId: sessionId || interfaceId,
        status: "connected",
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to create WebChat interface:", error);
      throw new Error(`Failed to create WebChat interface: ${error.message}`);
    }
  }

  /**
   * Initialize browser session for chat
   * @param {string} chatUrl - Chat URL
   * @param {string} provider - Chat provider
   * @param {boolean} autoLogin - Auto-login capability
   * @returns {Promise<Object>} Browser session
   */
  async initializeBrowserSession(chatUrl, provider, autoLogin = false) {
    try {
      this.logger.info(
        `Initializing browser session for ${provider} at ${chatUrl}`,
      );

      if (!this.browserManager) {
        throw new Error("Browser Manager not available");
      }

      const session = await this.browserManager.createSession({
        url: chatUrl,
        provider,
        autoLogin,
      });

      this.logger.info(`Browser session initialized for ${provider}`);

      return session;
    } catch (error) {
      this.logger.error("Failed to initialize browser session:", error);
      throw new Error(`Failed to initialize browser session: ${error.message}`);
    }
  }

  /**
   * Send message to chat
   * @param {string} sessionId - Session ID
   * @param {string} message - Message to send
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(sessionId, message) {
    try {
      const chat = this.activeChats.get(sessionId);

      if (!chat) {
        throw new Error(`Chat session ${sessionId} not found`);
      }

      this.logger.info(`Sending message to ${chat.provider}`, {
        sessionId,
        message,
      });

      const result = await this.browserManager.sendMessage(
        chat.browserSession,
        message,
      );

      // Store in history
      if (!this.chatHistory.has(sessionId)) {
        this.chatHistory.set(sessionId, []);
      }

      this.chatHistory.get(sessionId).push({
        type: "user",
        message,
        timestamp: new Date(),
      });

      if (result.response) {
        this.chatHistory.get(sessionId).push({
          type: "assistant",
          message: result.response,
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      this.logger.error("Failed to send message:", error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Get chat history
   * @param {string} sessionId - Session ID
   * @returns {Array} Chat history
   */
  getChatHistory(sessionId) {
    return this.chatHistory.get(sessionId) || [];
  }

  /**
   * Get available chat providers
   * @returns {Array} Available providers
   */
  getAvailableProviders() {
    return [
      {
        name: "chatgpt",
        url: "https://chat.openai.com",
        features: ["text", "code", "images"],
        supported: true,
      },
      {
        name: "deepseek",
        url: "https://chat.deepseek.com",
        features: ["text", "code"],
        supported: true,
      },
      {
        name: "claude",
        url: "https://claude.ai",
        features: ["text", "code", "files"],
        supported: true,
      },
      {
        name: "gemini",
        url: "https://gemini.google.com",
        features: ["text", "code", "images"],
        supported: true,
      },
    ];
  }

  /**
   * Get chat status
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Chat status
   */
  async getChatStatus(sessionId) {
    try {
      const chat = this.activeChats.get(sessionId);

      if (!chat) {
        throw new Error(`Chat session ${sessionId} not found`);
      }

      const status = await this.browserManager.getSessionStatus(
        chat.browserSession,
      );

      return {
        sessionId,
        status: chat.status,
        provider: chat.provider,
        chatUrl: chat.chatUrl,
        uptime: Date.now() - chat.createdAt.getTime(),
        ...status,
      };
    } catch (error) {
      this.logger.error("Failed to get chat status:", error);
      throw new Error(`Failed to get chat status: ${error.message}`);
    }
  }

  /**
   * Close chat session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Close result
   */
  async closeChat(sessionId) {
    try {
      const chat = this.activeChats.get(sessionId);

      if (!chat) {
        throw new Error(`Chat session ${sessionId} not found`);
      }

      await this.browserManager.closeSession(chat.browserSession);

      // Remove from active chats
      this.activeChats.delete(sessionId);
      this.chatHistory.delete(sessionId);

      this.logger.info(`Chat session ${sessionId} closed`);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to close chat:", error);
      throw new Error(`Failed to close chat: ${error.message}`);
    }
  }

  /**
   * Get WebChat statistics
   * @returns {Object} WebChat statistics
   */
  getWebChatStats() {
    return {
      activeChats: this.activeChats.size,
      totalHistory: Array.from(this.chatHistory.values()).reduce(
        (total, history) => total + history.length,
        0,
      ),
      providers: this.getAvailableProviders().length,
      lastActivity: new Date(),
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Close all active chats
      for (const [sessionId, chat] of this.activeChats) {
        try {
          await this.closeChat(sessionId);
        } catch (error) {
          this.logger.warn(`Failed to close chat ${sessionId}:`, error.message);
        }
      }

      // Clear state
      this.activeChats.clear();
      this.chatHistory.clear();

      this.logger.info("WebChat Handler cleanup completed");
    } catch (error) {
      this.logger.error("Failed to cleanup WebChat Handler:", error);
    }
  }
}

module.exports = WebChatHandler;
