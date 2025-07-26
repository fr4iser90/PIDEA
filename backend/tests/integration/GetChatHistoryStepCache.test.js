/**
 * GetChatHistoryStep Cache Integration Tests
 * Tests for cache integration in chat history retrieval
 */

const { GetChatHistoryStep } = require('@domain/steps/categories/chat/get_chat_history_step');
const ChatCacheService = require('@infrastructure/cache/ChatCacheService');

describe('GetChatHistoryStep Cache Integration', () => {
  let getChatHistoryStep;
  let mockContext;
  let mockCursorIDEService;

  beforeEach(() => {
    getChatHistoryStep = new GetChatHistoryStep();
    
    // Mock cursorIDEService
    mockCursorIDEService = {
      extractChatHistory: jest.fn()
    };

    // Mock context
    mockContext = {
      userId: 'test-user-123',
      sessionId: '9222', // Port-based session
      port: '9222',
      limit: 50,
      offset: 0,
      getService: jest.fn((serviceName) => {
        if (serviceName === 'cursorIDEService') {
          return mockCursorIDEService;
        }
        if (serviceName === 'chatSessionService') {
          return {
            getChatHistory: jest.fn().mockResolvedValue([])
          };
        }
        if (serviceName === 'eventBus') {
          return {
            publish: jest.fn().mockResolvedValue()
          };
        }
        if (serviceName === 'ideManager') {
          return {};
        }
        return null;
      })
    };
  });

  afterEach(() => {
    // Clear cache after each test
    if (getChatHistoryStep.chatCacheService) {
      getChatHistoryStep.chatCacheService.clearAll();
    }
  });

  describe('Cache Hit Scenario', () => {
    test('should return cached messages when available', async () => {
      const cachedMessages = [
        { id: '1', content: 'Hello from cache', sender: 'user', type: 'text' },
        { id: '2', content: 'Hi there from cache!', sender: 'assistant', type: 'text' }
      ];

      // Pre-populate cache
      getChatHistoryStep.chatCacheService.setChatHistory('9222', cachedMessages);

      const result = await getChatHistoryStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.messages[0].content).toBe('Hello from cache');
      expect(result.data.cache.hit).toBe(true);
      
      // Should not call IDE service when cache hit
      expect(mockCursorIDEService.extractChatHistory).not.toHaveBeenCalled();
    });

    test('should include cache statistics in response', async () => {
      const cachedMessages = [{ id: '1', content: 'Test', sender: 'user', type: 'text' }];
      getChatHistoryStep.chatCacheService.setChatHistory('9222', cachedMessages);

      const result = await getChatHistoryStep.execute(mockContext);

      expect(result.data.cache.stats).toBeDefined();
      expect(result.data.cache.stats.totalEntries).toBe(1);
      expect(result.data.cache.stats.validEntries).toBe(1);
    });
  });

  describe('Cache Miss Scenario', () => {
    test('should extract from IDE and cache results on cache miss', async () => {
      const extractedMessages = [
        { id: '1', content: 'Hello from IDE', sender: 'user', type: 'text' },
        { id: '2', content: 'Hi there from IDE!', sender: 'assistant', type: 'text' }
      ];

      mockCursorIDEService.extractChatHistory.mockResolvedValue(extractedMessages);

      const result = await getChatHistoryStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.messages[0].content).toBe('Hello from IDE');
      expect(result.data.cache.hit).toBe(false);
      
      // Should call IDE service on cache miss
      expect(mockCursorIDEService.extractChatHistory).toHaveBeenCalledTimes(1);

      // Verify messages were cached
      const cachedMessages = getChatHistoryStep.chatCacheService.getChatHistory('9222');
      expect(cachedMessages).toEqual(extractedMessages);
    });

    test('should handle IDE extraction errors gracefully', async () => {
      mockCursorIDEService.extractChatHistory.mockRejectedValue(new Error('IDE connection failed'));

      const result = await getChatHistoryStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(0);
      expect(result.data.cache.hit).toBe(false);
    });
  });

  describe('Port-based Caching', () => {
    test('should cache separately for different ports', async () => {
      const messages9222 = [{ id: '1', content: 'Port 9222 message', sender: 'user', type: 'text' }];
      const messages9224 = [{ id: '2', content: 'Port 9224 message', sender: 'user', type: 'text' }];

      // Cache messages for different ports
      getChatHistoryStep.chatCacheService.setChatHistory('9222', messages9222);
      getChatHistoryStep.chatCacheService.setChatHistory('9224', messages9224);

      // Test port 9222
      mockContext.port = '9222';
      mockContext.sessionId = '9222';
      let result = await getChatHistoryStep.execute(mockContext);
      expect(result.data.messages[0].content).toBe('Port 9222 message');

      // Test port 9224
      mockContext.port = '9224';
      mockContext.sessionId = '9224';
      result = await getChatHistoryStep.execute(mockContext);
      expect(result.data.messages[0].content).toBe('Port 9224 message');
    });

    test('should handle port number and string formats', async () => {
      const messages = [{ id: '1', content: 'Test message', sender: 'user', type: 'text' }];
      
      // Cache with number format
      getChatHistoryStep.chatCacheService.setChatHistory(9222, messages);
      
      // Retrieve with string format
      mockContext.port = '9222';
      mockContext.sessionId = '9222';
      const result = await getChatHistoryStep.execute(mockContext);
      
      expect(result.data.messages[0].content).toBe('Test message');
      expect(result.data.cache.hit).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    test('should provide cache invalidation method', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user', type: 'text' }];
      getChatHistoryStep.chatCacheService.setChatHistory('9222', messages);
      
      expect(getChatHistoryStep.chatCacheService.getChatHistory('9222')).toEqual(messages);
      
      getChatHistoryStep.invalidateCache('9222');
      
      expect(getChatHistoryStep.chatCacheService.getChatHistory('9222')).toBeNull();
    });

    test('should provide cache statistics method', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user', type: 'text' }];
      getChatHistoryStep.chatCacheService.setChatHistory('9222', messages);
      
      const stats = getChatHistoryStep.getCacheStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.validEntries).toBe(1);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track cache hit vs miss performance', async () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user', type: 'text' }];
      
      // First call - cache miss, should extract from IDE
      mockCursorIDEService.extractChatHistory.mockResolvedValue(messages);
      let result = await getChatHistoryStep.execute(mockContext);
      expect(result.data.cache.hit).toBe(false);
      
      // Second call - cache hit, should return from cache
      result = await getChatHistoryStep.execute(mockContext);
      expect(result.data.cache.hit).toBe(true);
      
      // IDE service should only be called once (on cache miss)
      expect(mockCursorIDEService.extractChatHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle cache service errors gracefully', async () => {
      // Mock cache service to throw error
      const originalGetChatHistory = getChatHistoryStep.chatCacheService.getChatHistory;
      getChatHistoryStep.chatCacheService.getChatHistory = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      const extractedMessages = [{ id: '1', content: 'Test', sender: 'user', type: 'text' }];
      mockCursorIDEService.extractChatHistory.mockResolvedValue(extractedMessages);

      const result = await getChatHistoryStep.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(1);
      
      // Restore original method
      getChatHistoryStep.chatCacheService.getChatHistory = originalGetChatHistory;
    });
  });
}); 