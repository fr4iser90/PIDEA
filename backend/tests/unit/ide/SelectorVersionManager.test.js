/**
 * SelectorVersionManager Unit Tests
 * Tests for version-based selector management functionality
 */

const SelectorVersionManager = require('@domain/services/ide/SelectorVersionManager');
const IDETypes = require('@domain/services/ide/IDETypes');

describe('SelectorVersionManager', () => {
  let versionManager;
  let mockIDETypes;

  beforeEach(() => {
    // Mock IDETypes
    mockIDETypes = {
      getSelectorsForVersion: jest.fn(),
      getLatestVersion: jest.fn(),
      getAvailableVersions: jest.fn(),
      hasVersion: jest.fn(),
      getMetadata: jest.fn()
    };

    versionManager = new SelectorVersionManager({
      ideTypes: mockIDETypes
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default dependencies', () => {
      const manager = new SelectorVersionManager();
      expect(manager.ideTypes).toBe(IDETypes);
      expect(manager.versionCache).toBeInstanceOf(Map);
      expect(manager.cacheTimeout).toBe(5 * 60 * 1000);
    });

    it('should initialize with custom dependencies', () => {
      const customLogger = { info: jest.fn() };
      const manager = new SelectorVersionManager({
        ideTypes: mockIDETypes,
        logger: customLogger
      });
      expect(manager.ideTypes).toBe(mockIDETypes);
      expect(manager.logger).toBe(customLogger);
    });
  });

  describe('getSelectors', () => {
    it('should return cached selectors if available', async () => {
      const mockSelectors = { input: '.test-input' };
      const cacheKey = 'cursor:latest';
      
      // Set up cache
      versionManager.versionCache.set(cacheKey, {
        selectors: mockSelectors,
        timestamp: Date.now()
      });

      mockIDETypes.getLatestVersion.mockReturnValue('0.42.0');
      mockIDETypes.getSelectorsForVersion.mockReturnValue(mockSelectors);

      const result = await versionManager.getSelectors('cursor');

      expect(result).toBe(mockSelectors);
      expect(mockIDETypes.getSelectorsForVersion).not.toHaveBeenCalled();
    });

    it('should return version-specific selectors when version is provided', async () => {
      const mockSelectors = { input: '.test-input' };
      mockIDETypes.getSelectorsForVersion.mockReturnValue(mockSelectors);

      const result = await versionManager.getSelectors('cursor', '0.42.0');

      expect(result).toBe(mockSelectors);
      expect(mockIDETypes.getSelectorsForVersion).toHaveBeenCalledWith('cursor', '0.42.0');
    });

    it('should fallback to latest version when specific version not found', async () => {
      const mockSelectors = { input: '.test-input' };
      mockIDETypes.getSelectorsForVersion
        .mockReturnValueOnce(null) // First call for specific version
        .mockReturnValueOnce(mockSelectors); // Second call for latest version
      mockIDETypes.getLatestVersion.mockReturnValue('0.43.0');

      const result = await versionManager.getSelectors('cursor', '0.99.0');

      expect(result).toBe(mockSelectors);
      expect(mockIDETypes.getSelectorsForVersion).toHaveBeenCalledWith('cursor', '0.99.0');
      expect(mockIDETypes.getSelectorsForVersion).toHaveBeenCalledWith('cursor', '0.43.0');
    });

    it('should fallback to hardcoded selectors when versioned selectors not found', async () => {
      const mockMetadata = { chatSelectors: { input: '.hardcoded-input' } };
      mockIDETypes.getSelectorsForVersion.mockReturnValue(null);
      mockIDETypes.getLatestVersion.mockReturnValue('0.42.0');
      mockIDETypes.getMetadata.mockReturnValue(mockMetadata);

      const result = await versionManager.getSelectors('cursor', '0.99.0');

      expect(result).toBe(mockMetadata.chatSelectors);
      expect(mockIDETypes.getMetadata).toHaveBeenCalledWith('cursor');
    });

    it('should return generic fallback selectors when all else fails', async () => {
      mockIDETypes.getSelectorsForVersion.mockReturnValue(null);
      mockIDETypes.getLatestVersion.mockReturnValue(null);
      mockIDETypes.getMetadata.mockReturnValue(null);

      const result = await versionManager.getSelectors('unknown-ide');

      expect(result).toEqual(expect.objectContaining({
        input: expect.any(String),
        inputContainer: expect.any(String),
        userMessages: expect.any(String),
        aiMessages: expect.any(String)
      }));
    });

    it('should handle errors gracefully', async () => {
      mockIDETypes.getSelectorsForVersion.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await versionManager.getSelectors('cursor');

      expect(result).toEqual(expect.objectContaining({
        input: expect.any(String),
        inputContainer: expect.any(String)
      }));
    });

    it('should cache results after successful retrieval', async () => {
      const mockSelectors = { input: '.test-input' };
      mockIDETypes.getSelectorsForVersion.mockReturnValue(mockSelectors);
      mockIDETypes.getLatestVersion.mockReturnValue('0.42.0');

      await versionManager.getSelectors('cursor', '0.42.0');

      const cacheKey = 'cursor:0.42.0';
      const cached = versionManager.versionCache.get(cacheKey);
      expect(cached).toBeDefined();
      expect(cached.selectors).toBe(mockSelectors);
      expect(cached.timestamp).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('detectIDEVersion', () => {
    it('should return latest version for IDE type', async () => {
      mockIDETypes.getLatestVersion.mockReturnValue('0.42.0');

      const result = await versionManager.detectIDEVersion('cursor');

      expect(result).toBe('0.42.0');
      expect(mockIDETypes.getLatestVersion).toHaveBeenCalledWith('cursor');
    });

    it('should return unknown when latest version not available', async () => {
      mockIDETypes.getLatestVersion.mockReturnValue(null);

      const result = await versionManager.detectIDEVersion('cursor');

      expect(result).toBe('unknown');
    });

    it('should handle errors gracefully', async () => {
      mockIDETypes.getLatestVersion.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await versionManager.detectIDEVersion('cursor');

      expect(result).toBe('unknown');
    });
  });

  describe('getAvailableVersions', () => {
    it('should return available versions for IDE type', () => {
      const mockVersions = ['0.42.0', '0.43.0'];
      mockIDETypes.getAvailableVersions.mockReturnValue(mockVersions);

      const result = versionManager.getAvailableVersions('cursor');

      expect(result).toBe(mockVersions);
      expect(mockIDETypes.getAvailableVersions).toHaveBeenCalledWith('cursor');
    });
  });

  describe('hasVersion', () => {
    it('should return true when version exists', () => {
      mockIDETypes.hasVersion.mockReturnValue(true);

      const result = versionManager.hasVersion('cursor', '0.42.0');

      expect(result).toBe(true);
      expect(mockIDETypes.hasVersion).toHaveBeenCalledWith('cursor', '0.42.0');
    });

    it('should return false when version does not exist', () => {
      mockIDETypes.hasVersion.mockReturnValue(false);

      const result = versionManager.hasVersion('cursor', '0.99.0');

      expect(result).toBe(false);
    });
  });

  describe('getFallbackSelectors', () => {
    it('should return generic fallback selectors', () => {
      const result = versionManager.getFallbackSelectors();

      expect(result).toEqual(expect.objectContaining({
        input: expect.any(String),
        inputContainer: expect.any(String),
        userMessages: expect.any(String),
        aiMessages: expect.any(String),
        messagesContainer: expect.any(String),
        chatContainer: expect.any(String),
        isActive: expect.any(String),
        isInputReady: expect.any(String),
        codeBlocks: expect.any(String),
        codeBlockContent: expect.any(String),
        inlineCode: expect.any(String),
        syntaxClasses: expect.objectContaining({
          keyword: expect.any(String),
          string: expect.any(String),
          comment: expect.any(String),
          function: expect.any(String)
        })
      }));
    });
  });

  describe('clearCache', () => {
    it('should clear version cache', () => {
      // Add some cache entries
      versionManager.versionCache.set('cursor:0.42.0', { selectors: {}, timestamp: Date.now() });
      versionManager.versionCache.set('vscode:1.85.0', { selectors: {}, timestamp: Date.now() });

      expect(versionManager.versionCache.size).toBe(2);

      versionManager.clearCache();

      expect(versionManager.versionCache.size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Add some cache entries
      versionManager.versionCache.set('cursor:0.42.0', { selectors: {}, timestamp: Date.now() });
      versionManager.versionCache.set('vscode:1.85.0', { selectors: {}, timestamp: Date.now() });

      const stats = versionManager.getCacheStats();

      expect(stats).toEqual({
        size: 2,
        keys: ['cursor:0.42.0', 'vscode:1.85.0'],
        timeout: 5 * 60 * 1000
      });
    });
  });
});
