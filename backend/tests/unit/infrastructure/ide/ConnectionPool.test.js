const ConnectionPool = require('@infrastructure/external/ConnectionPool');
const { chromium } = require('playwright');

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    connectOverCDP: jest.fn()
  }
}));

// Mock Logger
jest.mock('@logging/Logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
});

describe('ConnectionPool', () => {
  let connectionPool;
  let mockBrowser;
  let mockPage;
  let mockContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock browser and page
    mockPage = {
      title: jest.fn().mockResolvedValue('Test Page'),
      isClosed: jest.fn().mockReturnValue(false)
    };
    
    mockContext = {
      pages: jest.fn().mockReturnValue([mockPage])
    };
    
    mockBrowser = {
      contexts: jest.fn().mockReturnValue([mockContext]),
      close: jest.fn().mockResolvedValue(undefined)
    };
    
    chromium.connectOverCDP.mockResolvedValue(mockBrowser);
    
    // Create connection pool with shorter intervals for testing
    connectionPool = new ConnectionPool({
      maxConnections: 3,
      connectionTimeout: 5000,
      cleanupInterval: 1000,
      healthCheckInterval: 1000
    });
  });

  afterEach(async () => {
    if (connectionPool) {
      await connectionPool.destroy();
    }
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const pool = new ConnectionPool();
      expect(pool.maxConnections).toBe(5);
      expect(pool.connectionTimeout).toBe(30000);
      expect(pool.cleanupInterval).toBe(60000);
      expect(pool.healthCheckInterval).toBe(30000);
      expect(pool.host).toBe('127.0.0.1');
      expect(pool.connections).toBeInstanceOf(Map);
      pool.destroy();
    });

    test('should initialize with custom options', () => {
      const pool = new ConnectionPool({
        maxConnections: 10,
        connectionTimeout: 15000,
        cleanupInterval: 30000,
        healthCheckInterval: 20000,
        host: 'localhost'
      });
      
      expect(pool.maxConnections).toBe(10);
      expect(pool.connectionTimeout).toBe(15000);
      expect(pool.cleanupInterval).toBe(30000);
      expect(pool.healthCheckInterval).toBe(20000);
      expect(pool.host).toBe('localhost');
      pool.destroy();
    });
  });

  describe('getConnection', () => {
    test('should create new connection when none exists', async () => {
      const connection = await connectionPool.getConnection(9222);
      
      expect(connection).toBeDefined();
      expect(connection.browser).toBe(mockBrowser);
      expect(connection.page).toBe(mockPage);
      expect(connection.health).toBe('healthy');
      expect(connection.lastUsed).toBeGreaterThan(0);
      expect(connectionPool.connections.has(9222)).toBe(true);
    });

    test('should return existing healthy connection', async () => {
      // Create initial connection
      const connection1 = await connectionPool.getConnection(9222);
      
      // Get same connection again
      const connection2 = await connectionPool.getConnection(9222);
      
      expect(connection1).toBe(connection2);
      expect(chromium.connectOverCDP).toHaveBeenCalledTimes(1);
    });

    test('should remove and recreate unhealthy connection', async () => {
      // Create initial connection
      await connectionPool.getConnection(9222);
      
      // Mark connection as failed
      const connection = connectionPool.connections.get(9222);
      connection.health = 'failed';
      
      // Get connection again - should recreate
      await connectionPool.getConnection(9222);
      
      expect(chromium.connectOverCDP).toHaveBeenCalledTimes(2);
    });

    test('should handle connection creation failure', async () => {
      chromium.connectOverCDP.mockRejectedValue(new Error('Connection failed'));
      
      await expect(connectionPool.getConnection(9222)).rejects.toThrow('Connection failed');
      expect(connectionPool.connections.has(9222)).toBe(false);
    });
  });

  describe('createConnection', () => {
    test('should create connection with proper structure', async () => {
      const connection = await connectionPool.createConnection(9222);
      
      expect(connection.browser).toBe(mockBrowser);
      expect(connection.page).toBe(mockPage);
      expect(connection.health).toBe('healthy');
      expect(connection.isConnecting).toBe(false);
      expect(connection.lastUsed).toBeGreaterThan(0);
      expect(connection.createdAt).toBeGreaterThan(0);
    });

    test('should handle connection limit by evicting oldest', async () => {
      // Create connections up to limit
      await connectionPool.getConnection(9222);
      await connectionPool.getConnection(9223);
      await connectionPool.getConnection(9224);
      
      // Try to create another connection
      await connectionPool.getConnection(9225);
      
      expect(connectionPool.connections.size).toBe(4);
      expect(connectionPool.connections.has(9225)).toBe(true);
    });

    test('should wait for existing connection attempt', async () => {
      // Start a connection attempt
      const connectionPromise = connectionPool.createConnection(9222);
      
      // Try to get same connection while it's connecting
      const connectionPromise2 = connectionPool.getConnection(9222);
      
      // Both should resolve to same connection
      const [connection1, connection2] = await Promise.all([connectionPromise, connectionPromise2]);
      expect(connection1).toStrictEqual(connection2);
    });
  });

  describe('closeConnection', () => {
    test('should close specific connection', async () => {
      await connectionPool.getConnection(9222);
      expect(connectionPool.connections.has(9222)).toBe(true);
      
      const result = await connectionPool.closeConnection(9222);
      
      expect(result).toBe(true);
      expect(connectionPool.connections.has(9222)).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('should handle closing non-existent connection', async () => {
      const result = await connectionPool.closeConnection(9999);
      expect(result).toBe(true);
    });

    test('should handle close failure gracefully', async () => {
      await connectionPool.getConnection(9222);
      mockBrowser.close.mockRejectedValue(new Error('Close failed'));
      
      const result = await connectionPool.closeConnection(9222);
      
      expect(result).toBe(false);
      expect(connectionPool.connections.has(9222)).toBe(false);
    });
  });

  describe('closeAllConnections', () => {
    test('should close all connections', async () => {
      await connectionPool.getConnection(9222);
      await connectionPool.getConnection(9223);
      
      expect(connectionPool.connections.size).toBe(2);
      
      await connectionPool.closeAllConnections();
      
      expect(connectionPool.connections.size).toBe(0);
      expect(mockBrowser.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('evictOldestConnection', () => {
    test('should evict oldest connection', async () => {
      // Create connections with different timestamps
      await connectionPool.getConnection(9222);
      await new Promise(resolve => setTimeout(resolve, 10));
      await connectionPool.getConnection(9223);
      
      // Manually set older timestamp for first connection
      const connection1 = connectionPool.connections.get(9222);
      connection1.lastUsed = Date.now() - 1000;
      
      await connectionPool.evictOldestConnection();
      
      expect(connectionPool.connections.has(9222)).toBe(false);
      expect(connectionPool.connections.has(9223)).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('should remove stale connections', async () => {
      await connectionPool.getConnection(9222);
      
      // Mark connection as stale
      const connection = connectionPool.connections.get(9222);
      connection.lastUsed = Date.now() - 3000; // Older than cleanup interval
      connection.health = 'failed';
      
      await connectionPool.cleanup();
      
      expect(connectionPool.connections.has(9222)).toBe(false);
    });

    test('should not remove healthy connections', async () => {
      await connectionPool.getConnection(9222);
      
      // Mark connection as stale but healthy
      const connection = connectionPool.connections.get(9222);
      connection.lastUsed = Date.now() - 3000;
      connection.health = 'healthy';
      
      await connectionPool.cleanup();
      
      expect(connectionPool.connections.has(9222)).toBe(true);
    });
  });

  describe('healthCheck', () => {
    test('should mark healthy connections as healthy', async () => {
      await connectionPool.getConnection(9222);
      
      await connectionPool.healthCheck();
      
      const connection = connectionPool.connections.get(9222);
      expect(connection.health).toBe('healthy');
    });

    test('should remove failed connections', async () => {
      await connectionPool.getConnection(9222);
      
      // Mock page.title to fail
      mockPage.title.mockRejectedValue(new Error('Page not available'));
      
      await connectionPool.healthCheck();
      
      expect(connectionPool.connections.has(9222)).toBe(false);
    });

    test('should handle connections without browser/page', async () => {
      await connectionPool.getConnection(9222);
      
      // Remove browser and page
      const connection = connectionPool.connections.get(9222);
      connection.browser = null;
      connection.page = null;
      
      await connectionPool.healthCheck();
      
      expect(connectionPool.connections.has(9222)).toBe(false);
    });
  });

  describe('getHealth', () => {
    test('should return correct health status', async () => {
      await connectionPool.getConnection(9222);
      await connectionPool.getConnection(9223);
      
      const health = connectionPool.getHealth();
      
      expect(health.total).toBe(2);
      expect(health.healthy).toBe(2);
      expect(health.failed).toBe(0);
      expect(health.connecting).toBe(0);
      expect(health.maxConnections).toBe(3);
      expect(health.utilization).toBe(2/3);
    });
  });

  describe('getStats', () => {
    test('should return connection statistics', async () => {
      await connectionPool.getConnection(9222);
      
      const stats = connectionPool.getStats();
      
      expect(stats.totalConnections).toBe(1);
      expect(stats.maxConnections).toBe(3);
      expect(stats.connections[9222]).toBeDefined();
      expect(stats.connections[9222].health).toBe('healthy');
      expect(stats.connections[9222].lastUsed).toBeGreaterThan(0);
      expect(stats.connections[9222].createdAt).toBeGreaterThan(0);
    });
  });

  describe('destroy', () => {
    test('should cleanup timers and connections', async () => {
      await connectionPool.getConnection(9222);
      
      const destroySpy = jest.spyOn(connectionPool, 'closeAllConnections');
      
      await connectionPool.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(connectionPool.cleanupTimer).toBeNull();
      expect(connectionPool.healthCheckTimer).toBeNull();
    });
  });

  describe('Error handling', () => {
    test('should handle connection creation timeout', async () => {
      chromium.connectOverCDP.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );
      
      await expect(connectionPool.getConnection(9222)).rejects.toThrow('Connection timeout');
    });

    test('should handle page not found error', async () => {
      mockContext.pages.mockReturnValue([]);
      
      await expect(connectionPool.getConnection(9222)).rejects.toThrow('No page found on port 9222');
    });
  });
}); 