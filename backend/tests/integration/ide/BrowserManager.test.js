const BrowserManager = require('@infrastructure/external/BrowserManager');
const ConnectionPool = require('@infrastructure/external/ConnectionPool');

// Mock Playwright
jest.mock('playwright', () => {
  const mockPage = {
    title: jest.fn().mockResolvedValue('Test Page'),
    isClosed: jest.fn().mockReturnValue(false)
  };

  const mockContext = {
    pages: jest.fn(() => [mockPage])
  };

  const mockBrowser = {
    contexts: jest.fn(() => [mockContext]),
    close: jest.fn().mockResolvedValue(undefined)
  };

  return {
    chromium: {
      connectOverCDP: jest.fn().mockResolvedValue(mockBrowser)
    }
  };
});

describe('BrowserManager Integration Tests', () => {
  let browserManager;

  beforeEach(() => {
    browserManager = new BrowserManager();
  });

  afterEach(async () => {
    await browserManager.destroy();
  });

  describe('Connection Pooling', () => {
    test('should initialize with connection pool', () => {
      expect(browserManager.connectionPool).toBeInstanceOf(ConnectionPool);
      expect(browserManager.currentPort).toBeNull();
    });

    test('should handle connection failures gracefully', async () => {
      // Mock a connection failure
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(browserManager.switchToPort(9999)).rejects.toThrow('Connection failed');
      expect(browserManager.currentPort).toBeNull();
      
      // Reset mock for other tests
      const playwright = require('playwright');
      const mockPage = {
        title: jest.fn().mockResolvedValue('Test Page'),
        isClosed: jest.fn().mockReturnValue(false)
      };
      const mockContext = {
        pages: jest.fn(() => [mockPage])
      };
      const mockBrowser = {
        contexts: jest.fn(() => [mockContext]),
        close: jest.fn().mockResolvedValue(undefined)
      };
      playwright.chromium.connectOverCDP.mockResolvedValue(mockBrowser);
    });
  });

  describe('getPage Method', () => {
    test('should return null when not connected', async () => {
      const page = await browserManager.getPage();
      expect(page).toBeNull();
    });
  });

  describe('Health Check', () => {
    test('should handle health check failures', async () => {
      const health = await browserManager.healthCheck();
      
      expect(health).toBeDefined();
      expect(typeof health).toBe('boolean');
      expect(health).toBe(false); // Should be false when not connected
    });
  });

  describe('Connection Pool Health and Stats', () => {
    test('should get connection pool stats', () => {
      const stats = browserManager.getConnectionPoolStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });
  });

  describe('Destroy', () => {
    test('should destroy browser manager and cleanup connections', async () => {
      await browserManager.destroy();
      
      expect(browserManager.browser).toBeNull();
      expect(browserManager.page).toBeNull();
      expect(browserManager.currentPort).toBeNull();
    });
  });
}); 