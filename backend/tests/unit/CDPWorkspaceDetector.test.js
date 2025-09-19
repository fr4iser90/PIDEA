const CDPWorkspaceDetector = require('@services/workspace/CDPWorkspaceDetector');
const Logger = require('@logging/Logger');

// Mock dependencies
jest.mock('@logging/Logger');
jest.mock('fs');
jest.mock('child_process');

describe('CDPWorkspaceDetector', () => {
  let workspaceDetector;
  let mockCDPManager;
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
    
    mockCDPManager = {
      initialize: jest.fn().mockResolvedValue(),
      executeWorkspaceDetection: jest.fn(),
      extractWorkspaceInfo: jest.fn(),
      getCachedWorkspaceDetection: jest.fn(),
      cacheWorkspaceDetection: jest.fn(),
      clearAllWorkspaceDetectionCache: jest.fn()
    };
    
    workspaceDetector = new CDPWorkspaceDetector(mockCDPManager, {
      cacheTimeout: 1000,
      maxSearchDepth: 5
    });
  });

  afterEach(async () => {
    if (workspaceDetector) {
      await workspaceDetector.destroy();
    }
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const detector = new CDPWorkspaceDetector(mockCDPManager);
      expect(detector.options.cacheTimeout).toBe(300000);
      expect(detector.options.maxSearchDepth).toBe(10);
      expect(detector.options.enableFallback).toBe(true);
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        cacheTimeout: 5000,
        maxSearchDepth: 3,
        enableFallback: false
      };
      
      const detector = new CDPWorkspaceDetector(mockCDPManager, customOptions);
      expect(detector.options.cacheTimeout).toBe(5000);
      expect(detector.options.maxSearchDepth).toBe(3);
      expect(detector.options.enableFallback).toBe(false);
    });

    it('should initialize state', () => {
      expect(workspaceDetector.detectionHistory).toBeDefined();
      expect(workspaceDetector.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await workspaceDetector.initialize();

      expect(mockCDPManager.initialize).toHaveBeenCalled();
      expect(workspaceDetector.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('CDPWorkspaceDetector initialized successfully');
    });

    it('should handle initialization failure', async () => {
      mockCDPManager.initialize.mockRejectedValue(new Error('CDP initialization failed'));

      await expect(workspaceDetector.initialize()).rejects.toThrow('CDP initialization failed');
      expect(workspaceDetector.isInitialized).toBe(false);
    });

    it('should not initialize twice', async () => {
      await workspaceDetector.initialize();
      await workspaceDetector.initialize(); // Second call

      expect(mockCDPManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('CDPWorkspaceDetector already initialized');
    });
  });

  describe('detectWorkspace', () => {
    beforeEach(async () => {
      await workspaceDetector.initialize();
    });

    it('should detect workspace successfully', async () => {
      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Test Workspace',
        currentFile: '/path/to/file.js',
        ideType: 'cursor',
        extractionMethod: 'page_title'
      };

      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(mockWorkspaceInfo);

      // Mock file system operations
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(true);

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toBeDefined();
      expect(result.workspacePath).toBe('/path/to/workspace');
      expect(result.workspaceName).toBe('Test Workspace');
      expect(result.port).toBe(9222);
      expect(result.detectionTime).toBeDefined();
      expect(result.detectionDuration).toBeDefined();
      expect(result.isValid).toBe(true);

      expect(mockCDPManager.cacheWorkspaceDetection).toHaveBeenCalledWith(9222, expect.any(Object), 1000);
    });

    it('should use cached result', async () => {
      const cachedResult = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Cached Workspace',
        ideType: 'cursor'
      };

      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(cachedResult);

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toEqual(cachedResult);
      expect(mockCDPManager.executeWorkspaceDetection).not.toHaveBeenCalled();
    });

    it('should handle detection failure', async () => {
      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockRejectedValue(new Error('Detection failed'));

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result).toBeNull();
    });

    it('should resolve workspace path from workspace name', async () => {
      const mockWorkspaceInfo = {
        workspacePath: null,
        workspaceName: 'Test Workspace',
        ideType: 'cursor'
      };

      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(mockWorkspaceInfo);

      // Mock file system operations
      const fs = require('fs');
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/Test Workspace') return true;
        return false;
      });

      // Mock process.cwd to return a known path
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue('/path/to');

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result.workspacePath).toBe('/path/to/Test Workspace');

      // Restore original process.cwd
      process.cwd = originalCwd;
    });

    it('should validate workspace path', async () => {
      const mockWorkspaceInfo = {
        workspacePath: '/invalid/path',
        workspaceName: 'Invalid Workspace',
        ideType: 'cursor'
      };

      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(mockWorkspaceInfo);

      // Mock file system operations
      const fs = require('fs');
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/invalid/path') return false;
        return true;
      });

      const result = await workspaceDetector.detectWorkspace(9222);

      expect(result.isValid).toBe(false);
    });
  });

  describe('detectWorkspacesForPorts', () => {
    beforeEach(async () => {
      await workspaceDetector.initialize();
    });

    it('should detect workspaces for multiple ports', async () => {
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

      mockCDPManager.getCachedWorkspaceDetection
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);
      
      mockCDPManager.executeWorkspaceDetection
        .mockResolvedValueOnce(mockWorkspaceInfo1)
        .mockResolvedValueOnce(mockWorkspaceInfo2);

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
      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Workspace',
        ideType: 'cursor'
      };

      mockCDPManager.getCachedWorkspaceDetection
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);
      
      mockCDPManager.executeWorkspaceDetection
        .mockResolvedValueOnce(mockWorkspaceInfo)
        .mockRejectedValueOnce(new Error('Detection failed'));

      const results = await workspaceDetector.detectWorkspacesForPorts([9222, 9223]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Detection failed');
    });
  });

  describe('getGitInformation', () => {
    it('should return null for invalid workspace path', async () => {
      const result = await workspaceDetector.getGitInformation(null);
      expect(result).toBeNull();
    });

    it('should return null for non-existent workspace path', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = await workspaceDetector.getGitInformation('/invalid/path');
      expect(result).toBeNull();
    });

    it('should return Git information for valid repository', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/workspace' || path === '/path/to/workspace/.git') return true;
        return false;
      });

      const { execSync } = require('child_process');
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

      const result = await workspaceDetector.getGitInformation('/path/to/workspace');

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(true);
      expect(result.gitRoot).toBe('/path/to/workspace');
      expect(result.currentBranch).toBe('main');
      expect(result.remotes.origin).toBe('https://github.com/user/repo.git');
      expect(result.status.modified).toBe(1);
      expect(result.status.added).toBe(1);
      expect(result.lastCommit).toBe('abc1234 Last commit message');
    });

    it('should handle Git command failures gracefully', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/workspace' || path === '/path/to/workspace/.git') return true;
        return false;
      });

      const { execSync } = require('child_process');
      execSync.mockImplementation((command, options) => {
        if (command.includes('git config --list')) {
          throw new Error('Git config failed');
        }
        return '';
      });

      const result = await workspaceDetector.getGitInformation('/path/to/workspace');

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(true);
      expect(result.configError).toBe('Git config failed');
    });
  });

  describe('getComprehensiveWorkspaceInfo', () => {
    beforeEach(async () => {
      await workspaceDetector.initialize();
    });

    it('should get comprehensive workspace info including Git data', async () => {
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
        remotes: { origin: 'https://github.com/user/repo.git' }
      };

      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(mockWorkspaceInfo);

      // Mock file system operations
      const fs = require('fs');
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/workspace' || path === '/path/to/workspace/.git') return true;
        return false;
      });

      // Mock Git information extraction
      const { execSync } = require('child_process');
      execSync.mockImplementation((command, options) => {
        if (command.includes('git branch --show-current')) {
          return 'main';
        }
        if (command.includes('git remote -v')) {
          return 'origin\thttps://github.com/user/repo.git (fetch)';
        }
        return '';
      });

      const result = await workspaceDetector.getComprehensiveWorkspaceInfo(9222);

      expect(result).toBeDefined();
      expect(result.workspacePath).toBe('/path/to/workspace');
      expect(result.git).toBeDefined();
      expect(result.git.isGitRepo).toBe(true);
      expect(result.hasGit).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle case when workspace detection fails', async () => {
      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(null);

      const result = await workspaceDetector.getComprehensiveWorkspaceInfo(9222);

      expect(result).toBeNull();
    });
  });

  describe('detection history', () => {
    beforeEach(async () => {
      await workspaceDetector.initialize();
    });

    it('should record detection history', async () => {
      const mockWorkspaceInfo = {
        workspacePath: '/path/to/workspace',
        workspaceName: 'Test Workspace',
        ideType: 'cursor'
      };

      mockCDPManager.getCachedWorkspaceDetection.mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(mockWorkspaceInfo);

      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(true);

      await workspaceDetector.detectWorkspace(9222);

      const history = workspaceDetector.getDetectionHistory(9222);
      expect(history).toHaveLength(1);
      expect(history[0].workspacePath).toBe('/path/to/workspace');
      expect(history[0].timestamp).toBeDefined();
    });

    it('should clear detection history', () => {
      workspaceDetector.detectionHistory.set(9222, [{ test: 'data' }]);
      
      workspaceDetector.clearDetectionHistory(9222);
      
      expect(workspaceDetector.detectionHistory.has(9222)).toBe(false);
    });

    it('should clear all detection history', () => {
      workspaceDetector.detectionHistory.set(9222, [{ test: 'data1' }]);
      workspaceDetector.detectionHistory.set(9223, [{ test: 'data2' }]);
      
      workspaceDetector.clearAllDetectionHistory();
      
      expect(workspaceDetector.detectionHistory.size).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should provide statistics', async () => {
      await workspaceDetector.initialize();

      const stats = workspaceDetector.getStatistics();

      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('successfulDetections');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('portsWithHistory');
      expect(stats).toHaveProperty('options');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should destroy successfully', async () => {
      await workspaceDetector.initialize();
      await workspaceDetector.destroy();

      expect(workspaceDetector.isInitialized).toBe(false);
      expect(mockCDPManager.clearAllWorkspaceDetectionCache).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('CDPWorkspaceDetector destroyed successfully');
    });

    it('should handle destroy failure gracefully', async () => {
      await workspaceDetector.initialize();

      // Test that destroy completes even if there are issues
      await expect(workspaceDetector.destroy()).resolves.not.toThrow();
    });
  });
});
