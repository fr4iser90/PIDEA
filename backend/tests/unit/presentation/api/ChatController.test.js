const ChatController = require('@/presentation/api/ChatController');

describe('ChatController', () => {
  let controller;
  let mockSendMessageHandler;
  let mockGetChatHistoryHandler;
  let mockCursorIDEService;
  let mockAuthService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create mock services
    mockSendMessageHandler = {
      handle: jest.fn()
    };

    mockGetChatHistoryHandler = {
      handle: jest.fn(),
      getPortChatHistory: jest.fn(),
      getUserSessions: jest.fn(),
      createSession: jest.fn(),
      deleteSession: jest.fn()
    };

    mockCursorIDEService = {
      getConnectionStatus: jest.fn()
    };

    mockAuthService = {
      validateToken: jest.fn()
    };

    // Create controller instance
    controller = new ChatController(
      mockSendMessageHandler,
      mockGetChatHistoryHandler,
      mockCursorIDEService,
      mockAuthService
    );

    // Create mock request and response objects
    mockReq = {
      body: {},
      user: {
        id: 'user-123',
        role: 'user',
        canAccessResource: jest.fn().mockReturnValue(true),
        isAdmin: jest.fn().mockReturnValue(false),
        hasPermission: jest.fn().mockReturnValue(true)
      },
      params: {},
      query: {},
      get: jest.fn().mockReturnValue('test-user-agent'),
      ip: '127.0.0.1'
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Reset console mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(controller.sendMessageHandler).toBe(mockSendMessageHandler);
      expect(controller.getChatHistoryHandler).toBe(mockGetChatHistoryHandler);
      expect(controller.cursorIDEService).toBe(mockCursorIDEService);
      expect(controller.authService).toBe(mockAuthService);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockReq.body = {
        message: 'Hello, world!',
        requestedBy: 'user-123',
        sessionId: 'session-123'
      };
    });

    it('should send message successfully', async () => {
      const mockResult = {
        messageId: 'msg-123',
        response: 'Hello back!',
        sessionId: 'session-123',
        timestamp: new Date()
      };
      mockSendMessageHandler.handle.mockResolvedValue(mockResult);

      await controller.sendMessage(mockReq, mockRes);

      expect(mockSendMessageHandler.handle).toHaveBeenCalledWith({
        message: 'Hello, world!',
        requestedBy: 'user-123',
        sessionId: 'session-123',
        timestamp: expect.any(Date),
        metadata: {
          userAgent: 'test-user-agent',
          ipAddress: '127.0.0.1',
          userRole: 'user'
        }
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messageId: 'msg-123',
          response: 'Hello back!',
          sessionId: 'session-123',
          timestamp: mockResult.timestamp
        }
      });
    });

    it('should return 400 when message is missing', async () => {
      mockReq.body = { requestedBy: 'user-123' };

      await controller.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message content is required'
      });
    });

    it('should return 400 when message is empty', async () => {
      mockReq.body = { message: '   ', requestedBy: 'user-123' };

      await controller.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message content is required'
      });
    });

    it('should return 400 when requestedBy is missing', async () => {
      mockReq.body = { message: 'Hello, world!' };

      await controller.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Requested by is required'
      });
    });

    it('should trim message content', async () => {
      mockReq.body = {
        message: '  Hello, world!  ',
        requestedBy: 'user-123'
      };
      const mockResult = {
        messageId: 'msg-123',
        response: 'Hello back!',
        sessionId: 'session-123',
        timestamp: new Date()
      };
      mockSendMessageHandler.handle.mockResolvedValue(mockResult);

      await controller.sendMessage(mockReq, mockRes);

      expect(mockSendMessageHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hello, world!'
        })
      );
    });

    it('should handle send message errors', async () => {
      const error = new Error('Handler error');
      mockSendMessageHandler.handle.mockRejectedValue(error);

      await controller.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send message'
      });
    });
  });

  describe('getChatHistory', () => {
    beforeEach(() => {
      mockReq.query = { limit: '50', offset: '0' };
    });

    it('should get chat history successfully', async () => {
      const mockResult = {
        messages: [{ id: 'msg-1', content: 'Hello' }],
        sessionId: 'session-123',
        totalCount: 1,
        hasMore: false
      };
      mockGetChatHistoryHandler.handle.mockResolvedValue(mockResult);

      await controller.getChatHistory(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.handle).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: undefined,
        limit: 50,
        offset: 0,
        includeUserData: false
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: [{ id: 'msg-1', content: 'Hello' }],
          sessionId: 'session-123',
          totalCount: 1,
          hasMore: false
        }
      });
    });

    it('should get chat history with sessionId', async () => {
      mockReq.query = { sessionId: 'session-123', limit: '25', offset: '10' };
      const mockResult = {
        messages: [{ id: 'msg-1', content: 'Hello' }],
        sessionId: 'session-123',
        totalCount: 1,
        hasMore: false
      };
      mockGetChatHistoryHandler.handle.mockResolvedValue(mockResult);

      await controller.getChatHistory(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.handle).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: 'session-123',
        limit: 25,
        offset: 10,
        includeUserData: false
      });
    });

    it('should return 403 when user cannot access session', async () => {
      mockReq.query = { sessionId: 'session-123' };
      mockReq.user.canAccessResource.mockReturnValue(false);

      await controller.getChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this chat session'
      });
    });

    it('should include user data for admin users', async () => {
      mockReq.user.isAdmin.mockReturnValue(true);
      const mockResult = {
        messages: [{ id: 'msg-1', content: 'Hello' }],
        sessionId: 'session-123',
        totalCount: 1,
        hasMore: false
      };
      mockGetChatHistoryHandler.handle.mockResolvedValue(mockResult);

      await controller.getChatHistory(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.handle).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: undefined,
        limit: 50,
        offset: 0,
        includeUserData: true
      });
    });

    it('should handle get chat history errors', async () => {
      const error = new Error('Handler error');
      mockGetChatHistoryHandler.handle.mockRejectedValue(error);

      await controller.getChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get chat history'
      });
    });
  });

  describe('getPortChatHistory', () => {
    beforeEach(() => {
      mockReq.params = { port: '3000' };
      mockReq.query = { limit: '50', offset: '0' };
    });

    it('should get port chat history successfully', async () => {
      const mockResult = {
        messages: [{ id: 'msg-1', content: 'Hello' }],
        sessionId: 'session-123',
        totalCount: 1,
        hasMore: false
      };
      mockGetChatHistoryHandler.getPortChatHistory.mockResolvedValue(mockResult);

      await controller.getPortChatHistory(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.getPortChatHistory).toHaveBeenCalledWith(
        '3000',
        'user-123',
        {
          limit: 50,
          offset: 0
        }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: [{ id: 'msg-1', content: 'Hello' }],
          sessionId: 'session-123',
          port: '3000',
          totalCount: 1,
          hasMore: false
        }
      });
    });

    it('should handle empty result gracefully', async () => {
      const mockResult = {};
      mockGetChatHistoryHandler.getPortChatHistory.mockResolvedValue(mockResult);

      await controller.getPortChatHistory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: [],
          sessionId: undefined,
          port: '3000',
          totalCount: 0,
          hasMore: false
        }
      });
    });

    it('should handle get port chat history errors', async () => {
      const error = new Error('Handler error');
      mockGetChatHistoryHandler.getPortChatHistory.mockRejectedValue(error);

      await controller.getPortChatHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get port chat history'
      });
    });
  });

  describe('getUserSessions', () => {
    beforeEach(() => {
      mockReq.query = { limit: '20', offset: '0' };
    });

    it('should get user sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Chat Session 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 5,
          lastMessage: 'Hello'
        }
      ];
      mockGetChatHistoryHandler.getUserSessions.mockResolvedValue(mockSessions);

      await controller.getUserSessions(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.getUserSessions).toHaveBeenCalledWith(
        'user-123',
        {
          limit: 20,
          offset: 0
        }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: 'Chat Session 1',
              createdAt: mockSessions[0].createdAt,
              updatedAt: mockSessions[0].updatedAt,
              messageCount: 5,
              lastMessage: 'Hello'
            }
          ]
        }
      });
    });

    it('should handle get user sessions errors', async () => {
      const error = new Error('Handler error');
      mockGetChatHistoryHandler.getUserSessions.mockRejectedValue(error);

      await controller.getUserSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get user sessions'
      });
    });
  });

  describe('createSession', () => {
    beforeEach(() => {
      mockReq.body = { title: 'New Chat Session' };
    });

    it('should create session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        title: 'New Chat Session',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockGetChatHistoryHandler.createSession.mockResolvedValue(mockSession);

      await controller.createSession(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.createSession).toHaveBeenCalledWith(
        'user-123',
        {
          title: 'New Chat Session',
          metadata: {
            createdBy: 'user-123',
            userAgent: 'test-user-agent',
            ipAddress: '127.0.0.1'
          }
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          session: {
            id: 'session-123',
            title: 'New Chat Session',
            createdAt: mockSession.createdAt,
            updatedAt: mockSession.updatedAt
          }
        }
      });
    });

    it('should create session with default title when not provided', async () => {
      mockReq.body = {};
      const mockSession = {
        id: 'session-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockGetChatHistoryHandler.createSession.mockResolvedValue(mockSession);

      await controller.createSession(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.createSession).toHaveBeenCalledWith(
        'user-123',
        {
          title: 'New Chat',
          metadata: {
            createdBy: 'user-123',
            userAgent: 'test-user-agent',
            ipAddress: '127.0.0.1'
          }
        }
      );
    });

    it('should handle create session errors', async () => {
      const error = new Error('Handler error');
      mockGetChatHistoryHandler.createSession.mockRejectedValue(error);

      await controller.createSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create chat session'
      });
    });
  });

  describe('deleteSession', () => {
    beforeEach(() => {
      mockReq.params = { sessionId: 'session-123' };
    });

    it('should delete session successfully', async () => {
      mockGetChatHistoryHandler.deleteSession.mockResolvedValue();

      await controller.deleteSession(mockReq, mockRes);

      expect(mockGetChatHistoryHandler.deleteSession).toHaveBeenCalledWith(
        'session-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Chat session deleted successfully'
      });
    });

    it('should return 403 when user cannot access session', async () => {
      mockReq.user.canAccessResource.mockReturnValue(false);

      await controller.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this chat session'
      });
    });

    it('should handle delete session errors', async () => {
      const error = new Error('Handler error');
      mockGetChatHistoryHandler.deleteSession.mockRejectedValue(error);

      await controller.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to delete chat session'
      });
    });
  });

  describe('getConnectionStatus', () => {
    it('should get connection status successfully', async () => {
      const mockStatus = {
        connected: true,
        activePort: 3000,
        availablePorts: [3000, 3001],
        lastActivity: new Date()
      };
      mockCursorIDEService.getConnectionStatus.mockResolvedValue(mockStatus);

      await controller.getConnectionStatus(mockReq, mockRes);

      expect(mockCursorIDEService.getConnectionStatus).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          connected: true,
          activePort: 3000,
          availablePorts: [3000, 3001],
          lastActivity: mockStatus.lastActivity,
          userPermissions: {
            canStartIDE: true,
            canAccessFiles: true,
            canModifyFiles: true
          }
        }
      });
    });

    it('should handle get connection status errors', async () => {
      const error = new Error('Service error');
      mockCursorIDEService.getConnectionStatus.mockRejectedValue(error);

      await controller.getConnectionStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get connection status'
      });
    });
  });

  describe('getQuickPrompts', () => {
    it('should get quick prompts successfully for regular user', async () => {
      await controller.getQuickPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          prompts: [
            { id: 'help', text: 'Help me with my code', category: 'general' },
            { id: 'debug', text: 'Debug this issue', category: 'development' },
            { id: 'explain', text: 'Explain this code', category: 'learning' }
          ]
        }
      });
    });

    it('should get quick prompts with admin prompts for admin user', async () => {
      mockReq.user.role = 'admin';

      await controller.getQuickPrompts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          prompts: [
            { id: 'help', text: 'Help me with my code', category: 'general' },
            { id: 'debug', text: 'Debug this issue', category: 'development' },
            { id: 'explain', text: 'Explain this code', category: 'learning' },
            { id: 'admin-help', text: 'Show admin commands', category: 'admin' },
            { id: 'system-status', text: 'Show system status', category: 'admin' }
          ]
        }
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;

      await controller.getQuickPrompts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated'
      });
    });

    it('should handle get quick prompts errors', async () => {
      // Mock the getQuickPromptsForUser method to throw an error
      jest.spyOn(controller, 'getQuickPromptsForUser').mockRejectedValue(
        new Error('Database error')
      );

      await controller.getQuickPrompts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('getSettings', () => {
    it('should get settings successfully', async () => {
      await controller.getSettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          settings: {
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
          }
        }
      });
    });

    it('should handle get settings errors', async () => {
      // Mock the getUserSettings method to throw an error
      jest.spyOn(controller, 'getUserSettings').mockRejectedValue(
        new Error('Database error')
      );

      await controller.getSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get settings'
      });
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      mockReq.body = {
        settings: {
          theme: 'light',
          language: 'es'
        }
      };
    });

    it('should update settings successfully', async () => {
      await controller.updateSettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Settings updated successfully'
      });
    });

    it('should return 400 when settings object is missing', async () => {
      mockReq.body = {};

      await controller.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Settings object is required'
      });
    });

    it('should return 400 when settings is not an object', async () => {
      mockReq.body = { settings: 'invalid' };

      await controller.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Settings object is required'
      });
    });

    it('should handle update settings errors', async () => {
      // Mock the updateUserSettings method to throw an error
      jest.spyOn(controller, 'updateUserSettings').mockRejectedValue(
        new Error('Database error')
      );

      await controller.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update settings'
      });
    });
  });

  describe('getQuickPromptsForUser', () => {
    it('should return base prompts for regular user', async () => {
      const prompts = await controller.getQuickPromptsForUser('user');

      expect(prompts).toEqual([
        { id: 'help', text: 'Help me with my code', category: 'general' },
        { id: 'debug', text: 'Debug this issue', category: 'development' },
        { id: 'explain', text: 'Explain this code', category: 'learning' }
      ]);
    });

    it('should return extended prompts for admin user', async () => {
      const prompts = await controller.getQuickPromptsForUser('admin');

      expect(prompts).toEqual([
        { id: 'help', text: 'Help me with my code', category: 'general' },
        { id: 'debug', text: 'Debug this issue', category: 'development' },
        { id: 'explain', text: 'Explain this code', category: 'learning' },
        { id: 'admin-help', text: 'Show admin commands', category: 'admin' },
        { id: 'system-status', text: 'Show system status', category: 'admin' }
      ]);
    });
  });

  describe('getUserSettings', () => {
    it('should return default user settings', async () => {
      const settings = await controller.getUserSettings('user-123');

      expect(settings).toEqual({
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
      });
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings', async () => {
      const settings = { theme: 'light', language: 'es' };
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await controller.updateUserSettings('user-123', settings);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ChatController] Updating settings for user user-123:',
        settings
      );

      consoleSpy.mockRestore();
    });
  });
}); 