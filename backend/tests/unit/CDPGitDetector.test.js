const CDPGitDetector = require('@services/git/CDPGitDetector');
const Logger = require('@logging/Logger');

// Mock dependencies
jest.mock('@logging/Logger');
jest.mock('fs');
jest.mock('child_process');

describe('CDPGitDetector', () => {
  let gitDetector;
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
      clearAllWorkspaceDetectionCache: jest.fn()
    };
    
    gitDetector = new CDPGitDetector(mockCDPManager, {
      cacheTimeout: 1000,
      commandTimeout: 2000,
      enableCDPExtraction: true,
      enableLocalExtraction: true
    });
  });

  afterEach(async () => {
    if (gitDetector) {
      await gitDetector.destroy();
    }
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const detector = new CDPGitDetector(mockCDPManager);
      expect(detector.options.cacheTimeout).toBe(300000);
      expect(detector.options.commandTimeout).toBe(5000);
      expect(detector.options.enableCDPExtraction).toBe(true);
      expect(detector.options.enableLocalExtraction).toBe(true);
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        cacheTimeout: 5000,
        commandTimeout: 1000,
        enableCDPExtraction: false,
        enableLocalExtraction: true
      };
      
      const detector = new CDPGitDetector(mockCDPManager, customOptions);
      expect(detector.options.cacheTimeout).toBe(5000);
      expect(detector.options.commandTimeout).toBe(1000);
      expect(detector.options.enableCDPExtraction).toBe(false);
      expect(detector.options.enableLocalExtraction).toBe(true);
    });

    it('should initialize state', () => {
      expect(gitDetector.gitCache).toBeDefined();
      expect(gitDetector.extractionHistory).toBeDefined();
      expect(gitDetector.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await gitDetector.initialize();

      expect(mockCDPManager.initialize).toHaveBeenCalled();
      expect(gitDetector.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('CDPGitDetector initialized successfully');
    });

    it('should handle initialization failure', async () => {
      mockCDPManager.initialize.mockRejectedValue(new Error('CDP initialization failed'));

      await expect(gitDetector.initialize()).rejects.toThrow('CDP initialization failed');
      expect(gitDetector.isInitialized).toBe(false);
    });

    it('should not initialize twice', async () => {
      await gitDetector.initialize();
      await gitDetector.initialize(); // Second call

      expect(mockCDPManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('CDPGitDetector already initialized');
    });
  });

  describe('extractGitInfoFromCDP', () => {
    it('should extract Git info from VS Code API', async () => {
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue({
          isGitRepo: true,
          gitRoot: '/path/to/workspace',
          currentBranch: 'main',
          remotes: { origin: 'https://github.com/user/repo.git' },
          status: { modified: 2, staged: 1 },
          extractionMethod: 'cdp'
        })
      };

      const connection = { page: mockPage };

      const result = await gitDetector.extractGitInfoFromCDP(connection);

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(true);
      expect(result.gitRoot).toBe('/path/to/workspace');
      expect(result.currentBranch).toBe('main');
      expect(result.extractionMethod).toBe('cdp');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should extract Git info from DOM elements', async () => {
      const mockPage = {
        evaluate: jest.fn().mockResolvedValue({
          isGitRepo: true,
          currentBranch: 'feature-branch',
          extractionMethod: 'dom_element'
        })
      };

      const connection = { page: mockPage };

      const result = await gitDetector.extractGitInfoFromCDP(connection);

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(true);
      expect(result.currentBranch).toBe('feature-branch');
      expect(result.extractionMethod).toBe('dom_element');
    });

    it('should handle page evaluation failure', async () => {
      const mockPage = {
        evaluate: jest.fn().mockRejectedValue(new Error('Page evaluation failed'))
      };

      const connection = { page: mockPage };

      const result = await gitDetector.extractGitInfoFromCDP(connection);

      expect(result).toBeNull();
    });
  });

  describe('extractGitInfoLocally', () => {
    it('should return null for invalid workspace path', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = await gitDetector.extractGitInfoLocally('/invalid/path');

      expect(result).toBeNull();
    });

    it('should return non-Git repo info for directory without .git', async () => {
      const fs = require('fs');
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path === '/path/to/workspace') return true;
        if (path === '/path/to/workspace/.git') return false;
        return false;
      });

      const result = await gitDetector.extractGitInfoLocally('/path/to/workspace');

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(false);
      expect(result.extractionMethod).toBe('local');
    });

    it('should extract Git info for valid repository', async () => {
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
          return 'M modified_file.js\nA new_file.js\nD deleted_file.js\n?? untracked_file.js';
        }
        if (command.includes('git log -1 --oneline')) {
          return 'abc1234 Last commit message';
        }
        return '';
      });

      const result = await gitDetector.extractGitInfoLocally('/path/to/workspace');

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(true);
      expect(result.gitRoot).toBe('/path/to/workspace');
      expect(result.currentBranch).toBe('main');
      expect(result.remotes.origin).toBe('https://github.com/user/repo.git');
      expect(result.status.modified).toBe(1);
      expect(result.status.added).toBe(1);
      expect(result.status.deleted).toBe(1);
      expect(result.status.untracked).toBe(1);
      expect(result.lastCommit).toBe('abc1234 Last commit message');
      expect(result.extractionMethod).toBe('local');
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
        if (command.includes('git branch --show-current')) {
          throw new Error('Git branch failed');
        }
        return '';
      });

      const result = await gitDetector.extractGitInfoLocally('/path/to/workspace');

      expect(result).toBeDefined();
      expect(result.isGitRepo).toBe(true);
      expect(result.configError).toBe('Git config failed');
      expect(result.branchError).toBe('Git branch failed');
    });
  });

  describe('getGitInformation', () => {
    beforeEach(async () => {
      await gitDetector.initialize();
    });

    it('should use cached result', async () => {
      const cachedResult = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.getCachedGitInfo = jest.fn().mockReturnValue(cachedResult);

      const result = await gitDetector.getGitInformation('/path/to/workspace');

      expect(result).toEqual(cachedResult);
      expect(gitDetector.getCachedGitInfo).toHaveBeenCalledWith('/path/to/workspace');
    });

    it('should try CDP extraction first when port is provided', async () => {
      const mockCDPResult = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main',
        extractionMethod: 'cdp'
      };

      gitDetector.getCachedGitInfo = jest.fn().mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockResolvedValue(mockCDPResult);

      const result = await gitDetector.getGitInformation('/path/to/workspace', 9222);

      expect(result).toEqual(mockCDPResult);
      expect(mockCDPManager.executeWorkspaceDetection).toHaveBeenCalledWith(9222, expect.any(Function));
    });

    it('should fallback to local extraction when CDP fails', async () => {
      const mockLocalResult = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main',
        extractionMethod: 'local'
      };

      gitDetector.getCachedGitInfo = jest.fn().mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockRejectedValue(new Error('CDP failed'));
      gitDetector.extractGitInfoLocally = jest.fn().mockResolvedValue(mockLocalResult);

      const result = await gitDetector.getGitInformation('/path/to/workspace', 9222);

      expect(result).toEqual(mockLocalResult);
      expect(gitDetector.extractGitInfoLocally).toHaveBeenCalledWith('/path/to/workspace');
    });

    it('should skip CDP extraction when disabled', async () => {
      const detector = new CDPGitDetector(mockCDPManager, {
        enableCDPExtraction: false,
        enableLocalExtraction: true
      });
      await detector.initialize();

      const mockLocalResult = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main',
        extractionMethod: 'local'
      };

      detector.getCachedGitInfo = jest.fn().mockReturnValue(null);
      detector.extractGitInfoLocally = jest.fn().mockResolvedValue(mockLocalResult);

      const result = await detector.getGitInformation('/path/to/workspace', 9222);

      expect(result).toEqual(mockLocalResult);
      expect(mockCDPManager.executeWorkspaceDetection).not.toHaveBeenCalled();
    });

    it('should skip local extraction when disabled', async () => {
      const detector = new CDPGitDetector(mockCDPManager, {
        enableCDPExtraction: true,
        enableLocalExtraction: false
      });
      await detector.initialize();

      detector.getCachedGitInfo = jest.fn().mockReturnValue(null);
      mockCDPManager.executeWorkspaceDetection.mockRejectedValue(new Error('CDP failed'));

      const result = await detector.getGitInformation('/path/to/workspace', 9222);

      expect(result).toBeNull();
    });

    it('should cache the result', async () => {
      const mockResult = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.getCachedGitInfo = jest.fn().mockReturnValue(null);
      gitDetector.extractGitInfoLocally = jest.fn().mockResolvedValue(mockResult);
      gitDetector.cacheGitInfo = jest.fn();

      await gitDetector.getGitInformation('/path/to/workspace');

      expect(gitDetector.cacheGitInfo).toHaveBeenCalledWith('/path/to/workspace', mockResult, 1000);
    });

    it('should record extraction history', async () => {
      const mockResult = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.getCachedGitInfo = jest.fn().mockReturnValue(null);
      gitDetector.extractGitInfoLocally = jest.fn().mockResolvedValue(mockResult);
      gitDetector.recordExtractionHistory = jest.fn();

      await gitDetector.getGitInformation('/path/to/workspace');

      expect(gitDetector.recordExtractionHistory).toHaveBeenCalledWith('/path/to/workspace', expect.any(Object));
    });
  });

  describe('caching', () => {
    it('should cache Git information', () => {
      const gitInfo = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.cacheGitInfo('/path/to/workspace', gitInfo, 1000);

      expect(gitDetector.gitCache.has('/path/to/workspace')).toBe(true);
      const cacheEntry = gitDetector.gitCache.get('/path/to/workspace');
      expect(cacheEntry.gitInfo).toEqual(gitInfo);
      expect(cacheEntry.timestamp).toBeDefined();
      expect(cacheEntry.ttl).toBe(1000);
    });

    it('should retrieve cached Git information', () => {
      const gitInfo = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.cacheGitInfo('/path/to/workspace', gitInfo, 1000);

      const result = gitDetector.getCachedGitInfo('/path/to/workspace');

      expect(result).toEqual(gitInfo);
    });

    it('should return null for expired cache', () => {
      const gitInfo = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.cacheGitInfo('/path/to/workspace', gitInfo, 1); // 1ms TTL

      // Wait for cache to expire
      setTimeout(() => {
        const result = gitDetector.getCachedGitInfo('/path/to/workspace');
        expect(result).toBeNull();
      }, 10);
    });

    it('should clear Git cache for specific workspace', () => {
      gitDetector.gitCache.set('/path/to/workspace', { gitInfo: {}, timestamp: Date.now(), ttl: 1000 });

      gitDetector.clearGitCache('/path/to/workspace');

      expect(gitDetector.gitCache.has('/path/to/workspace')).toBe(false);
    });

    it('should clear all Git cache', () => {
      gitDetector.gitCache.set('/path/to/workspace1', { gitInfo: {}, timestamp: Date.now(), ttl: 1000 });
      gitDetector.gitCache.set('/path/to/workspace2', { gitInfo: {}, timestamp: Date.now(), ttl: 1000 });

      gitDetector.clearAllGitCache();

      expect(gitDetector.gitCache.size).toBe(0);
    });
  });

  describe('extraction history', () => {
    it('should record extraction history', () => {
      const result = {
        isGitRepo: true,
        gitRoot: '/path/to/workspace',
        currentBranch: 'main'
      };

      gitDetector.recordExtractionHistory('/path/to/workspace', result);

      const history = gitDetector.getExtractionHistory('/path/to/workspace');
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(expect.objectContaining(result));
      expect(history[0].timestamp).toBeDefined();
    });

    it('should keep only last 10 extractions', () => {
      const result = { isGitRepo: true };

      // Add 11 extractions
      for (let i = 0; i < 11; i++) {
        gitDetector.recordExtractionHistory('/path/to/workspace', { ...result, index: i });
      }

      const history = gitDetector.getExtractionHistory('/path/to/workspace');
      expect(history).toHaveLength(10);
      expect(history[0].index).toBe(1); // First one should be removed
      expect(history[9].index).toBe(10); // Last one should be kept
    });

    it('should clear extraction history for specific workspace', () => {
      gitDetector.extractionHistory.set('/path/to/workspace', [{ test: 'data' }]);

      gitDetector.clearExtractionHistory('/path/to/workspace');

      expect(gitDetector.extractionHistory.has('/path/to/workspace')).toBe(false);
    });

    it('should clear all extraction history', () => {
      gitDetector.extractionHistory.set('/path/to/workspace1', [{ test: 'data1' }]);
      gitDetector.extractionHistory.set('/path/to/workspace2', [{ test: 'data2' }]);

      gitDetector.clearAllExtractionHistory();

      expect(gitDetector.extractionHistory.size).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should provide statistics', async () => {
      await gitDetector.initialize();

      const stats = gitDetector.getStatistics();

      expect(stats).toHaveProperty('totalExtractions');
      expect(stats).toHaveProperty('successfulExtractions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('workspacesWithHistory');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('options');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should destroy successfully', async () => {
      await gitDetector.initialize();
      await gitDetector.destroy();

      expect(gitDetector.isInitialized).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('CDPGitDetector destroyed successfully');
    });

    it('should handle destroy failure gracefully', async () => {
      await gitDetector.initialize();

      // Test that destroy completes even if there are issues
      await expect(gitDetector.destroy()).resolves.not.toThrow();
    });
  });
});
