const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('WebChatController');


class WebChatController {
  constructor(dependencies = {}) {
    this.webChatApplicationService = dependencies.webChatApplicationService;
    if (!this.webChatApplicationService) {
      throw new Error('WebChatController requires webChatApplicationService dependency');
    }
  }

  // POST /api/chat
  async sendMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }
      
      // Use authenticated user as requestedBy
      const requestedBy = req.user?.id || req.user?.email || 'unknown';
      // Send message via application service
      const messageData = {
        message: message.trim(),
        requestedBy: requestedBy,
        sessionId: sessionId,
        timestamp: new Date(),
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          userRole: req.user?.role
        }
      };
      
      const result = await this.webChatApplicationService.sendMessage(messageData, req.user?.id);
      res.json({
        success: true,
        data: {
          messageId: result.messageId,
          response: result.response,
          sessionId: result.sessionId,
          timestamp: result.timestamp,
          codeBlocks: result.codeBlocks || []
        }
      });
    } catch (error) {
      logger.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  }

  // GET /api/chat/history
  async getChatHistory(req, res) {
    try {
      const userId = req.user.id;
      const { sessionId, limit = 50, offset = 0 } = req.query;

      // Validate user can access this session
      if (sessionId && !req.user.canAccessResource('chat', sessionId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this chat session'
        });
      }

      // Create query with user context
      const query = {
        userId: userId,
        sessionId: sessionId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeUserData: req.user.isAdmin() // Only admins can see user data
      };

      // Get chat history via application service
      const result = await this.webChatApplicationService.getChatHistory(query, userId);

      res.json({
        success: true,
        data: {
          messages: result.messages,
          sessionId: result.sessionId,
          totalCount: result.totalCount,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      logger.error('Get chat history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat history'
      });
    }
  }

  // GET /api/chat/port/:port/history
  async getPortChatHistory(req, res) {
    try {
      const userId = req.user.id;
      const { port } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      logger.info(`Getting chat history for port ${port}`);

      // Get chat history for specific port via application service
      const queryData = {
        sessionId: null, // Will be determined by port
        limit: parseInt(limit),
        offset: parseInt(offset),
        port: port
      };

      const result = await this.webChatApplicationService.getPortChatHistory(queryData, { userId });

      res.json({
        success: true,
        data: {
          messages: result.messages || [],
          sessionId: result.sessionId,
          port: port,
          totalCount: result.totalCount || 0,
          hasMore: result.hasMore || false
        }
      });
    } catch (error) {
      logger.error('Get port chat history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get port chat history'
      });
    }
  }

  // GET /api/chat/sessions
  async getUserSessions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      // Get user's chat sessions via application service
      const queryData = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const result = await this.webChatApplicationService.getUserSessions(queryData, { userId });

      res.json({
        success: true,
        data: {
          sessions: result.sessions.map(session => ({
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messageCount,
            lastMessage: session.lastMessage
          }))
        }
      });
    } catch (error) {
      logger.error('Get user sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user sessions'
      });
    }
  }

  // POST /api/chat/sessions
  async createSession(req, res) {
    try {
      const userId = req.user.id;
      const { title } = req.body;

      // Create new chat session for user via application service
      const sessionData = {
        title: title || 'New Chat',
        metadata: {
          createdBy: userId,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      };

      const result = await this.webChatApplicationService.createChatSession(sessionData, { userId });

      res.status(201).json({
        success: true,
        data: {
          session: {
            id: result.session.id,
            title: result.session.title,
            createdAt: result.session.createdAt,
            updatedAt: result.session.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Create session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create chat session'
      });
    }
  }

  // DELETE /api/chat/sessions/:sessionId
  async deleteSession(req, res) {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      // Validate user can access this session
      if (!req.user.canAccessResource('chat', sessionId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this chat session'
        });
      }

      // Delete session via application service
      await this.webChatApplicationService.deleteChatSession(sessionId, { userId });

      res.json({
        success: true,
        message: 'Chat session deleted successfully'
      });
    } catch (error) {
      logger.error('Delete session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete chat session'
      });
    }
  }

  // GET /api/chat/status
  async getConnectionStatus(req, res) {
    try {
      const userId = req.user.id;

      // Get user-specific connection status
      const status = await this.cursorIDEService.getConnectionStatus(userId);

      res.json({
        success: true,
        data: {
          connected: status.connected,
          activePort: status.activePort,
          availablePorts: status.availablePorts,
          lastActivity: status.lastActivity,
          userPermissions: {
            canStartIDE: req.user.hasPermission('ide:own'),
            canAccessFiles: req.user.hasPermission('read:own'),
            canModifyFiles: req.user.hasPermission('write:own')
          }
        }
      });
    } catch (error) {
      logger.error('Get connection status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get connection status'
      });
    }
  }

  // GET /api/prompts/quick
  async getQuickPrompts(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      const userId = req.user.id;
      const userRole = req.user.role;

      // Get role-specific quick prompts
      const prompts = await this.getQuickPromptsForUser(userRole);

      res.json({
        success: true,
        data: {
          prompts: prompts
        }
      });
    } catch (error) {
      logger.error('Get quick prompts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/settings
  async getSettings(req, res) {
    try {
      const userId = req.user.id;

      // Get user-specific settings
      const settings = await this.getUserSettings(userId);

      res.json({
        success: true,
        data: {
          settings: settings
        }
      });
    } catch (error) {
      logger.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get settings'
      });
    }
  }

  // PUT /api/settings
  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const { settings } = req.body;

      // Validate settings
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Settings object is required'
        });
      }

      // Update user settings
      await this.updateUserSettings(userId, settings);

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }

  // Helper methods
  async getQuickPromptsForUser(userRole) {
    const basePrompts = [
      { id: 'help', text: 'Help me with my code', category: '' },
      { id: 'debug', text: 'Debug this issue', category: 'development' },
      { id: 'explain', text: 'Explain this code', category: 'learning' }
    ];

    if (userRole === 'admin') {
      return [
        ...basePrompts,
        { id: 'admin-help', text: 'Show admin commands', category: 'admin' },
        { id: 'system-status', text: 'Show system status', category: 'admin' }
      ];
    }

    return basePrompts;
  }

  async getUserSettings(userId) {
    // Default settings for user
    return {
      theme: 'dark',
      language: 'en',
      notifications: true,
      autoSave: true,
      maxHistoryLength: 100,
      allowedFileTypes: ['js', 'jsx', 'ts', 'tsx', 'json', 'md'],
      idePreferences: {
        fontSize: 14,
        tabSize: 2,
        wordWrap: true
      }
    };
  }

  async updateUserSettings(userId, settings) {
    // Update user settings in database
    // This would typically involve a UserSettingsRepository
          logger.info(`Updating user settings`);
  }
}

module.exports = WebChatController; 