const CDPConnectionManager = require('@external/cdp/CDPConnectionManager');
const Logger = require('@logging/Logger');

// Mock dependencies
jest.mock('@logging/Logger');
jest.mock('playwright', () => ({
  chromium: {
    connectOverCDP: jest.fn()
  }
}));

describe('CDPConnectionManager', () => {
  let cdpManager;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    Logger.mockImplementation(() => mockLogger);
    
    cdpManager = new CDPConnectionManager({
      maxConnections: 2,
      connectionTimeout: 5000,
      healthCheckInterval: 10000,
      cleanupInterval: 20000
    });
  });

  afterEach(async () => {
    if (cdpManager) {
      await cdpManager.destroy();
    }
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new CDPConnectionManager();
      expect(manager.options.maxConnections).toBe(5);
      expect(manager.options.connectionTimeout).toBe(15000);
      expect(manager.options.host).toBe('127.0.0.1');
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        maxConnections: 3,
        connectionTimeout: 10000,
        host: 'localhost'
      };
      
      const manager = new CDPConnectionManager(customOptions);
      expect(manager.options.maxConnections).toBe(3);
      expect(manager.options.connectionTimeout).toBe(10000);
      expect(manager.options.host).toBe('localhost');
    });

    it('should initialize connection pool', () => {
      expect(cdpManager.connectionPool).toBeDefined();
      expect(cdpManager.workspaceDetectionCache).toBeDefined();
      expect(cdpManager.detectionTimeouts).toBeDefined();
      expect(cdpManager.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      // Mock successful CDP test
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();

      expect(cdpManager.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('CDPConnectionManager initialized successfully');
    });

    it('should handle initialization failure', async () => {
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockRejectedValue(new Error('Connection failed'));

      await expect(cdpManager.initialize()).rejects.toThrow('Connection failed');
      expect(cdpManager.isInitialized).toBe(false);
    });

    it('should not initialize twice', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
      await cdpManager.initialize(); // Second call

      expect(mockLogger.debug).toHaveBeenCalledWith('CDPConnectionManager already initialized');
    });
  });

  describe('testCDPAvailability', () => {
    it('should return true when CDP is available', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const result = await cdpManager.testCDPAvailability();

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('CDP availability test passed'));
    });

    it('should return false when CDP is not available', async () => {
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockRejectedValue(new Error('Connection failed'));

      const result = await cdpManager.testCDPAvailability();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('CDP availability test failed on all test ports');
    });
  });

  describe('getWorkspaceDetectionConnection', () => {
    beforeEach(async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
    });

    it('should get connection successfully', async () => {
      const mockConnection = {
        browser: { contexts: () => [{ pages: () => [{ title: () => 'Test' }] }] },
        page: { title: () => 'Test' }
      };

      // Mock connection pool
      cdpManager.connectionPool.getConnection = jest.fn().mockResolvedValue(mockConnection);

      const result = await cdpManager.getWorkspaceDetectionConnection(9222);

      expect(result).toBe(mockConnection);
      expect(cdpManager.connectionPool.getConnection).toHaveBeenCalledWith(9222);
    });

    it('should throw error for invalid connection', async () => {
      cdpManager.connectionPool.getConnection = jest.fn().mockResolvedValue(null);

      await expect(cdpManager.getWorkspaceDetectionConnection(9222))
        .rejects.toThrow('Invalid connection received for port 9222');
    });
  });

  describe('executeWorkspaceDetection', () => {
    beforeEach(async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
    });

    it('should execute operation successfully', async () => {
      const mockConnection = {
        browser: { contexts: () => [{ pages: () => [{ title: () => 'Test' }] }] },
        page: { title: () => 'Test' }
      };

      const mockOperation = jest.fn().mockResolvedValue('test result');

      cdpManager.getWorkspaceDetectionConnection = jest.fn().mockResolvedValue(mockConnection);

      const result = await cdpManager.executeWorkspaceDetection(9222, mockOperation);

      expect(result).toBe('test result');
      expect(mockOperation).toHaveBeenCalledWith(mockConnection);
    });

    it('should handle operation failure', async () => {
      const mockConnection = {
        browser: { contexts: () => [{ pages: () => [{ title: () => 'Test' }] }] },
        page: { title: () => 'Test' }
      };

      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      cdpManager.getWorkspaceDetectionConnection = jest.fn().mockResolvedValue(mockConnection);

      await expect(cdpManager.executeWorkspaceDetection(9222, mockOperation))
        .rejects.toThrow('Operation failed');
    });
  });

  describe('extractWorkspaceInfo', () => {
    beforeEach(async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
    });

    it('should extract workspace info from page title', async () => {
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue({
          workspacePath: '/path/to/workspace',
          workspaceName: 'MyWorkspace',
          currentFile: '/path/to/file.js',
          ideType: 'cursor',
          extractionMethod: 'page_title'
        })
      };

      const connection = { page: mockPage };

      const result = await cdpManager.extractWorkspaceInfo(connection);

      expect(result).toEqual({
        workspacePath: '/path/to/workspace',
        workspaceName: 'MyWorkspace',
        currentFile: '/path/to/file.js',
        ideType: 'cursor',
        extractionMethod: 'page_title'
      });

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle extraction failure', async () => {
      const mockPage = {
        evaluate: jest.fn().mockRejectedValue(new Error('Page evaluation failed'))
      };

      const connection = { page: mockPage };

      await expect(cdpManager.extractWorkspaceInfo(connection))
        .rejects.toThrow('Page evaluation failed');
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
    });

    it('should cache workspace detection result', () => {
      const workspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'MyWorkspace',
        ideType: 'cursor'
      };

      cdpManager.cacheWorkspaceDetection(9222, workspaceInfo, 1000);

      expect(cdpManager.workspaceDetectionCache.has('workspace-9222')).toBe(true);
      expect(cdpManager.detectionTimeouts.has(9222)).toBe(true);
    });

    it('should retrieve cached workspace detection result', () => {
      const workspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'MyWorkspace',
        ideType: 'cursor'
      };

      cdpManager.cacheWorkspaceDetection(9222, workspaceInfo, 1000);

      const result = cdpManager.getCachedWorkspaceDetection(9222);

      expect(result).toEqual(workspaceInfo);
    });

    it('should return null for expired cache', () => {
      const workspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'MyWorkspace',
        ideType: 'cursor'
      };

      cdpManager.cacheWorkspaceDetection(9222, workspaceInfo, 1); // 1ms TTL

      // Wait for cache to expire
      setTimeout(() => {
        const result = cdpManager.getCachedWorkspaceDetection(9222);
        expect(result).toBeNull();
      }, 10);
    });

    it('should clear workspace detection cache', () => {
      const workspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'MyWorkspace',
        ideType: 'cursor'
      };

      cdpManager.cacheWorkspaceDetection(9222, workspaceInfo, 1000);
      cdpManager.clearWorkspaceDetectionCache(9222);

      expect(cdpManager.workspaceDetectionCache.has('workspace-9222')).toBe(false);
      expect(cdpManager.detectionTimeouts.has(9222)).toBe(false);
    });

    it('should clear all workspace detection cache', () => {
      const workspaceInfo1 = { workspacePath: '/path1' };
      const workspaceInfo2 = { workspacePath: '/path2' };

      cdpManager.cacheWorkspaceDetection(9222, workspaceInfo1, 1000);
      cdpManager.cacheWorkspaceDetection(9223, workspaceInfo2, 1000);
      cdpManager.clearAllWorkspaceDetectionCache();

      expect(cdpManager.workspaceDetectionCache.size).toBe(0);
      expect(cdpManager.detectionTimeouts.size).toBe(0);
    });
  });

  describe('health and statistics', () => {
    beforeEach(async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
    });

    it('should return health status', () => {
      const health = cdpManager.getHealthStatus();

      expect(health).toHaveProperty('total');
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('failed');
      expect(health).toHaveProperty('connecting');
      expect(health).toHaveProperty('maxConnections');
      expect(health).toHaveProperty('cacheSize');
      expect(health).toHaveProperty('isInitialized');
      expect(health.isInitialized).toBe(true);
    });

    it('should return statistics', () => {
      const stats = cdpManager.getStatistics();

      expect(stats).toHaveProperty('connectionPool');
      expect(stats).toHaveProperty('workspaceDetectionCache');
      expect(stats).toHaveProperty('options');
      expect(stats.options).toEqual(cdpManager.options);
    });
  });

  describe('destroy', () => {
    it('should destroy successfully', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();
      await cdpManager.destroy();

      expect(cdpManager.isInitialized).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('CDPConnectionManager destroyed successfully');
    });

    it('should handle destroy failure gracefully', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };
      
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await cdpManager.initialize();

      // Test that destroy completes even if there are issues
      await expect(cdpManager.destroy()).resolves.not.toThrow();
    });
  });
});
