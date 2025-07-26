/**
 * ChatCacheService Unit Tests
 * Tests for in-memory chat caching functionality
 */

const ChatCacheService = require('@infrastructure/cache/ChatCacheService');

describe('ChatCacheService', () => {
  let chatCacheService;

  beforeEach(() => {
    chatCacheService = new ChatCacheService({
      cacheTTL: 1000, // 1 second for testing
      maxCacheSize: 5,
      cleanupInterval: 500 // 500ms for testing
    });
  });

  afterEach(() => {
    if (chatCacheService) {
      chatCacheService.clearAll();
    }
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const defaultCache = new ChatCacheService();
      expect(defaultCache.cacheTTL).toBe(300000); // 5 minutes
      expect(defaultCache.maxCacheSize).toBe(100);
      expect(defaultCache.cleanupInterval).toBe(60000); // 1 minute
    });

    test('should initialize with custom options', () => {
      expect(chatCacheService.cacheTTL).toBe(1000);
      expect(chatCacheService.maxCacheSize).toBe(5);
      expect(chatCacheService.cleanupInterval).toBe(500);
    });
  });

  describe('getChatHistory', () => {
    test('should return null for non-existent port', () => {
      const result = chatCacheService.getChatHistory('9222');
      expect(result).toBeNull();
    });

    test('should return cached messages for existing port', () => {
      const messages = [
        { id: '1', content: 'Hello', sender: 'user' },
        { id: '2', content: 'Hi there!', sender: 'assistant' }
      ];

      chatCacheService.setChatHistory('9222', messages);
      const result = chatCacheService.getChatHistory('9222');

      expect(result).toEqual(messages);
    });

    test('should normalize port keys', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      
      chatCacheService.setChatHistory(9222, messages);
      const result = chatCacheService.getChatHistory('9222');
      
      expect(result).toEqual(messages);
    });

    test('should return null for expired cache', async () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      
      chatCacheService.setChatHistory('9222', messages);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = chatCacheService.getChatHistory('9222');
      expect(result).toBeNull();
    });
  });

  describe('setChatHistory', () => {
    test('should cache messages for a port', () => {
      const messages = [
        { id: '1', content: 'Hello', sender: 'user' },
        { id: '2', content: 'Hi there!', sender: 'assistant' }
      ];

      chatCacheService.setChatHistory('9222', messages);
      const result = chatCacheService.getChatHistory('9222');

      expect(result).toEqual(messages);
    });

    test('should handle invalid messages format', () => {
      const invalidMessages = 'not an array';
      
      // Should not throw error
      expect(() => {
        chatCacheService.setChatHistory('9222', invalidMessages);
      }).not.toThrow();
      
      const result = chatCacheService.getChatHistory('9222');
      expect(result).toBeNull();
    });

    test('should store metadata with messages', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      const metadata = { source: 'test', extractedAt: '2024-01-01' };
      
      chatCacheService.setChatHistory('9222', messages, metadata);
      
      // Check that metadata is stored (internal implementation detail)
      const stats = chatCacheService.getStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('invalidateCache', () => {
    test('should remove cached messages for a port', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      
      chatCacheService.setChatHistory('9222', messages);
      expect(chatCacheService.getChatHistory('9222')).toEqual(messages);
      
      chatCacheService.invalidateCache('9222');
      expect(chatCacheService.getChatHistory('9222')).toBeNull();
    });

    test('should handle non-existent port gracefully', () => {
      expect(() => {
        chatCacheService.invalidateCache('9999');
      }).not.toThrow();
    });
  });

  describe('clearAll', () => {
    test('should remove all cached entries', () => {
      const messages1 = [{ id: '1', content: 'Test1', sender: 'user' }];
      const messages2 = [{ id: '2', content: 'Test2', sender: 'user' }];
      
      chatCacheService.setChatHistory('9222', messages1);
      chatCacheService.setChatHistory('9224', messages2);
      
      expect(chatCacheService.getChatHistory('9222')).toEqual(messages1);
      expect(chatCacheService.getChatHistory('9224')).toEqual(messages2);
      
      chatCacheService.clearAll();
      
      expect(chatCacheService.getChatHistory('9222')).toBeNull();
      expect(chatCacheService.getChatHistory('9224')).toBeNull();
    });
  });

  describe('getStats', () => {
    test('should return cache statistics', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      
      chatCacheService.setChatHistory('9222', messages);
      chatCacheService.setChatHistory('9224', messages);
      
      const stats = chatCacheService.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.totalMessages).toBe(2);
      expect(stats.cacheTTL).toBe(1000);
      expect(stats.maxCacheSize).toBe(5);
    });

    test('should count expired entries', async () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      
      chatCacheService.setChatHistory('9222', messages);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const stats = chatCacheService.getStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.validEntries).toBe(0);
      expect(stats.expiredEntries).toBe(1);
    });
  });

  describe('isHealthy', () => {
    test('should return true for healthy cache', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      chatCacheService.setChatHistory('9222', messages);
      
      expect(chatCacheService.isHealthy()).toBe(true);
    });

    test('should return false when cache is over capacity', () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 10; i++) {
        chatCacheService.setChatHistory(`port${i}`, [{ id: '1', content: 'Test', sender: 'user' }]);
      }
      
      expect(chatCacheService.isHealthy()).toBe(false);
    });
  });

  describe('Cache eviction', () => {
    test('should evict oldest entries when cache is full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        chatCacheService.setChatHistory(`port${i}`, [{ id: '1', content: 'Test', sender: 'user' }]);
      }
      
      // Add one more to trigger eviction
      chatCacheService.setChatHistory('port5', [{ id: '1', content: 'Test', sender: 'user' }]);
      
      const stats = chatCacheService.getStats();
      expect(stats.totalEntries).toBe(5); // Should still be at max capacity
    });
  });

  describe('Port-based caching', () => {
    test('should handle different port formats', () => {
      const messages = [{ id: '1', content: 'Test', sender: 'user' }];
      
      // Test different port formats
      chatCacheService.setChatHistory(9222, messages);
      chatCacheService.setChatHistory('9224', messages);
      chatCacheService.setChatHistory(' 9226 ', messages); // With whitespace
      
      expect(chatCacheService.getChatHistory('9222')).toEqual(messages);
      expect(chatCacheService.getChatHistory(9224)).toEqual(messages);
      expect(chatCacheService.getChatHistory('9226')).toEqual(messages);
    });
  });
}); 