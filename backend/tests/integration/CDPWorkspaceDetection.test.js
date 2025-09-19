const CDPConnectionManager = require('@external/cdp/CDPConnectionManager');
const CDPWorkspaceDetector = require('@services/workspace/CDPWorkspaceDetector');
const Logger = require('@logging/Logger');

// Mock dependencies
jest.mock('@logging/Logger');
jest.mock('playwright', () => ({
  chromium: {
    connectOverCDP: jest.fn()
  }
}));

describe('CDP Workspace Detection Integration', () => {
  let cdpManager;
  let workspaceDetector;
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
      connectionTimeout: 5000
    });
    
    workspaceDetector = new CDPWorkspaceDetector(cdpManager, {
      cacheTimeout: 1000,
      maxSearchDepth: 5
    });
  });

  afterEach(async () => {
    if (workspaceDetector) {
      await workspaceDetector.destroy();
    }
    if (cdpManager) {
      await cdpManager.destroy();
    }
  });

  describe('Full Workspace Detection Flow', () => {
    it('should detect workspace successfully', async () => {
      // Mock successful CDP connection and page evaluation
      const mockBrowser = {
        contexts: () => [{ pages: () => [{ title: () => 'Test Workspace - Cursor' }] }],
        close: jest.fn().mockResolvedValue()
      };
      
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue({
          workspacePath: null,
          workspaceName: 'Test Workspace',
          currentFile: '/path/to/file.js',
          ideType: 'cursor',
          extractionMethod: 'page_title'
        })
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      // Mock CDP manager methods
      cdpManager.executeWorkspaceDetection = jest.fn().mockImplementation(async (port, operation) => {
        return await operation({ browser: mockBrowser, page: mockPage });
      });

      cdpManager.extractWorkspaceInfo = jest.fn().mockResolvedValue({
        workspacePath: null,
        workspaceName: 'Test Workspace',
        currentFile: '/path/to/file.js',
        ideType: 'cursor',
        extractionMethod: 'page_title'
      });

      // Mock file system operations
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/Test Workspace') return true;
        return originalExistsSync(path);
      });

      await workspaceDetector.initialize();

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toBeDefined();
      expect(result.workspaceName).toBe('Test Workspace');
      expect(result.ideType).toBe('cursor');
      expect(result.port).toBe(9222);
      expect(result.detectionTime).toBeDefined();
      expect(result.detectionDuration).toBeDefined();

      // Restore original fs.existsSync
      fs.existsSync = originalExistsSync;
    });

    it('should handle detection failure gracefully', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      // Mock CDP manager to throw error
      cdpManager.executeWorkspaceDetection = jest.fn().mockRejectedValue(new Error('CDP connection failed'));

      await workspaceDetector.initialize();

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toBeNull();
    });

    it('should use cached result on subsequent calls', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Cached Workspace',
        ideType: 'cursor',
        extractionMethod: 'page_title'
      };

      cdpManager.executeWorkspaceDetection = jest.fn().mockResolvedValue(mockWorkspaceInfo);
      cdpManager.getCachedWorkspaceDetection = jest.fn().mockReturnValue(mockWorkspaceInfo);

      await workspaceDetector.initialize();

      const result1 = await workspaceDetector.detectWorkspace(9222);
      const result2 = await workspaceDetector.detectWorkspace(9222);

      expect(result1).toEqual(mockWorkspaceInfo);
      expect(result2).toEqual(mockWorkspaceInfo);
      expect(cdpManager.executeWorkspaceDetection).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });

  describe('Multiple Port Detection', () => {
    it('should detect workspaces for multiple ports', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockWorkspaceInfo1 = {
        workspacePath: '/path/to/workspace1',
        workspaceName: 'Workspace 1',
        ideType: 'cursor'
      };

      const mockWorkspaceInfo2 = {
        workspacePath: '/path/to/workspace2',
        workspaceName: 'Workspace 2',
        ideType: 'vscode'
      };

      cdpManager.executeWorkspaceDetection = jest.fn()
        .mockResolvedValueOnce(mockWorkspaceInfo1)
        .mockResolvedValueOnce(mockWorkspaceInfo2);

      await workspaceDetector.initialize();

      const results = await workspaceDetector.detectWorkspacesForPorts([9222, 9223]);

      expect(results).toHaveLength(2);
      expect(results[0].port).toBe(9222);
      expect(results[0].success).toBe(true);
      expect(results[0].workspaceInfo).toEqual(mockWorkspaceInfo1);
      expect(results[1].port).toBe(9223);
      expect(results[1].success).toBe(true);
      expect(results[1].workspaceInfo).toEqual(mockWorkspaceInfo2);
    });

    it('should handle mixed success and failure results', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Workspace',
        ideType: 'cursor'
      };

      cdpManager.executeWorkspaceDetection = jest.fn()
        .mockResolvedValueOnce(mockWorkspaceInfo)
        .mockRejectedValueOnce(new Error('Detection failed'));

      await workspaceDetector.initialize();

      const results = await workspaceDetector.detectWorkspacesForPorts([9222, 9223]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Detection failed');
    });
  });

  describe('Comprehensive Workspace Info', () => {
    it('should get comprehensive workspace info including Git data', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Git Workspace',
        ideType: 'cursor',
        extractionMethod: 'page_title'
      };

      const mockGitInfo = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main',
        remotes: { origin: 'https://github.com/user/repo.git' },
        extractionMethod: 'local'
      };

      cdpManager.executeWorkspaceDetection = jest.fn().mockResolvedValue(mockWorkspaceInfo);

      // Mock Git information extraction
      const { execSync } = require('child_process');
      const originalExecSync = execSync;
      execSync.mockImplementation((command, options) => {
        if (command.includes('git config --list')) {
          return 'user.name=Test User\nuser.email=test@example.com\n';
        }
        if (command.includes('git branch --show-current')) {
          return 'main';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/user/repo.git (fetch)\norigin\thttps://github.com/user/repo.git (push)';
        }
        if (command.includes('git status --porcelain')) {
          return 'M modified_file.js\nA new_file.js';
        }
        if (command.includes('git log -1 --oneline')) {
          return 'abc1234 Last commit message';
        }
        return '';
      });

      // Mock file system operations
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/workspace') return true;
        if (path === '/path/to/workspace/.git') return true;
        return originalExistsSync(path);
      });

      await workspaceDetector.initialize();

      const result = await workspaceDetector.getComprehensiveWorkspaceInfo(9222);

      expect(result).toBeDefined();
      expect(result.workspacePath).toBe('/path/to/workspace');
      expect(result.git).toBeDefined();
      expect(result.git.isGitRepo).toBe(true);
      expect(result.git.currentBranch).toBe('main');
      expect(result.hasGit).toBe(true);

      // Restore mocks
      execSync.mockImplementation(originalExecSync);
      fs.existsSync = originalExistsSync;
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle CDP connection failures', async () => {
      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockRejectedValue(new Error('Connection refused'));

      await expect(workspaceDetector.initialize()).rejects.toThrow('Connection refused');
    });

    it('should handle page evaluation failures', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockPage = {
        evaluate: jest.fn().mockRejectedValue(new Error('Page evaluation failed'))
      };

      cdpManager.executeWorkspaceDetection = jest.fn().mockImplementation(async (port, operation) => {
        return await operation({ browser: mockBrowser, page: mockPage });
      });

      await workspaceDetector.initialize();

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toBeNull();
    });

    it('should handle invalid workspace paths', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockWorkspaceInfo = {
        workspacePath: '/invalid/path',
        workspaceName: 'Invalid Workspace',
        ideType: 'cursor'
      };

      cdpManager.executeWorkspaceDetection = jest.fn().mockResolvedValue(mockWorkspaceInfo);

      // Mock file system to return false for invalid path
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/invalid/path') return false;
        return originalExistsSync(path);
      });

      await workspaceDetector.initialize();

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);

      // Restore original fs.existsSync
      fs.existsSync = originalExistsSync;
    });
  });

  describe('Performance and Caching', () => {
    it('should track detection history', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Test Workspace',
        ideType: 'cursor'
      };

      cdpManager.executeWorkspaceDetection = jest.fn().mockResolvedValue(mockWorkspaceInfo);

      await workspaceDetector.initialize();

      await workspaceDetector.detectWorkspace(9222);

      const history = workspaceDetector.getDetectionHistory(9222);
      expect(history).toHaveLength(1);
      expect(history[0].workspacePath).toBe('/path/to/workspace');
    });

    it('should provide statistics', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue()
      };

      const { chromium } = require('playwright');
      chromium.connectOverCDP.mockResolvedValue(mockBrowser);

      await workspaceDetector.initialize();

      const stats = workspaceDetector.getStatistics();

      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('successfulDetections');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('portsWithHistory');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats.isInitialized).toBe(true);
    });
  });
});
