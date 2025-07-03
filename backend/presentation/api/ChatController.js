const SendMessageCommand = require('../../application/commands/SendMessageCommand');
const GetChatHistoryQuery = require('../../application/queries/GetChatHistoryQuery');

class ChatController {
  constructor(sendMessageHandler, getChatHistoryHandler, cursorIDEService) {
    this.sendMessageHandler = sendMessageHandler;
    this.getChatHistoryHandler = getChatHistoryHandler;
    this.cursorIDEService = cursorIDEService;
  }

  async sendMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          error: 'No message provided',
          code: 'MISSING_MESSAGE'
        });
      }

      const command = new SendMessageCommand(message, sessionId);
      const result = await this.sendMessageHandler.handle(command);

      res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          messageId: result.messageId,
          message: result.message.toJSON()
        }
      });

    } catch (error) {
      console.error('[ChatController] Send message error:', error);
      
      if (error.message.includes('Message content cannot be empty')) {
        return res.status(400).json({ 
          error: error.message,
          code: 'INVALID_MESSAGE'
        });
      }
      
      if (error.message.includes('Session not found')) {
        return res.status(404).json({ 
          error: error.message,
          code: 'SESSION_NOT_FOUND'
        });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getChatHistory(req, res) {
    try {
      const { sessionId, limit = 100, offset = 0 } = req.query;
      
      const query = new GetChatHistoryQuery(
        sessionId || null,
        parseInt(limit),
        parseInt(offset)
      );
      
      const result = await this.getChatHistoryHandler.handle(query);

      if (result && result.messages) {
        result.messages = result.messages.map(msg => {
          if (msg.toJSON) return msg.toJSON();
          return msg;
        });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[ChatController] Get chat history error:', error);
      
      if (error.message.includes('Session not found')) {
        return res.status(404).json({ 
          error: error.message,
          code: 'SESSION_NOT_FOUND'
        });
      }

      if (error.message.includes('Limit must be between')) {
        return res.status(400).json({ 
          error: error.message,
          code: 'INVALID_LIMIT'
        });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getConnectionStatus(req, res) {
    try {
      const isConnected = await this.cursorIDEService.isConnected();
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[ChatController] Connection status error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const isConnected = await this.cursorIDEService.isConnected();
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          cursorIDE: isConnected ? 'connected' : 'disconnected'
        }
      });

    } catch (error) {
      console.error('[ChatController] Health check error:', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  async getChatHistoryForPort(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      if (isNaN(port) || port < 1000 || port > 65535) {
        return res.status(400).json({
          error: 'Invalid port number',
          code: 'INVALID_PORT'
        });
      }
      
      // Switch to port first
      await this.cursorIDEService.switchToPort(port);
      
      // Extract chat history
      const messages = await this.cursorIDEService.extractChatHistory();
      
      // Get all sessions from repository
      const allSessions = await this.getChatHistoryHandler.chatRepository.getAllSessions();
      
      let targetSession = allSessions.find(s => s.idePort === port);
      
      if (!targetSession) {
        targetSession = {
          id: `port-${port}-session`,
          idePort: port,
          title: `IDE Port ${port}`,
          messageCount: messages.length,
          lastActivity: new Date().toISOString(),
          messages: []
        };
      }
      
      const serialMessages = messages.map(msg => {
        if (msg.toJSON) return msg.toJSON();
        return msg;
      });
      
      res.json({
        success: true,
        data: {
          port: port,
          sessionId: targetSession.id,
          session: targetSession,
          messages: serialMessages
        }
      });
    } catch (error) {
      console.error('[ChatController] Get chat history for port error:', error);
      res.status(500).json({ 
        error: 'Failed to load chat for port',
        code: 'PORT_CHAT_ERROR',
        details: error.message
      });
    }
  }

  async switchToPortEndpoint(req, res) {
    try {
      const port = parseInt(req.params.port);
      
      if (isNaN(port) || port < 1000 || port > 65535) {
        return res.status(400).json({
          error: 'Invalid port number',
          code: 'INVALID_PORT'
        });
      }
      
      await this.cursorIDEService.switchToPort(port);
      
      res.json({
        success: true,
        data: { port: port }
      });
    } catch (error) {
      console.error('[ChatController] Switch to port error:', error);
      res.status(500).json({ 
        error: 'Failed to switch to port',
        code: 'PORT_SWITCH_ERROR',
        details: error.message
      });
    }
  }

  async getQuickPrompts(req, res) {
    try {
      const quickPrompts = [
        {
          id: 'code-review',
          title: 'Code Review',
          content: 'Please review this code and suggest improvements for readability, performance, and best practices.',
          category: 'development'
        },
        {
          id: 'bug-fix',
          title: 'Bug Fix',
          content: 'I found a bug in this code. Can you help me identify the issue and provide a fix?',
          category: 'debugging'
        },
        {
          id: 'refactor',
          title: 'Refactor Code',
          content: 'This code works but could be cleaner. Can you help me refactor it to be more maintainable?',
          category: 'development'
        },
        {
          id: 'explain',
          title: 'Explain Code',
          content: 'Can you explain what this code does and how it works?',
          category: 'learning'
        },
        {
          id: 'optimize',
          title: 'Optimize Performance',
          content: 'This code is slow. Can you help me optimize it for better performance?',
          category: 'performance'
        },
        {
          id: 'test',
          title: 'Write Tests',
          content: 'Can you help me write unit tests for this code?',
          category: 'testing'
        },
        {
          id: 'document',
          title: 'Add Documentation',
          content: 'Can you help me add proper documentation and comments to this code?',
          category: 'documentation'
        },
        {
          id: 'security',
          title: 'Security Review',
          content: 'Can you review this code for potential security vulnerabilities?',
          category: 'security'
        }
      ];
      
      res.json({
        success: true,
        prompts: quickPrompts
      });

    } catch (error) {
      console.error('[ChatController] Get quick prompts error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getSettings(req, res) {
    try {
      const settings = {
        theme: 'dark',
        autoScroll: true,
        showTimestamps: true,
        maxMessages: 100,
        enableNotifications: true,
        language: 'en'
      };
      
      res.json({
        success: true,
        settings: settings
      });

    } catch (error) {
      console.error('[ChatController] Get settings error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = ChatController; 