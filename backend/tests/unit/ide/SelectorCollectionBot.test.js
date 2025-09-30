/**
 * Unit Tests for SelectorCollectionBot
 */

const SelectorCollectionBot = require('@domain/services/ide/SelectorCollectionBot');

describe('SelectorCollectionBot', () => {
  let bot;
  let mockSelectorCollector;
  let mockSelectorVersionManager;
  let mockIDETypesUpdater;
  let mockLogger;

  beforeEach(() => {
    // Mock selector collector
    mockSelectorCollector = {
      collectSelectors: jest.fn()
    };

    // Mock selector version manager
    mockSelectorVersionManager = {
      getSelectors: jest.fn(),
      addVersion: jest.fn()
    };

    // Mock IDE types updater
    mockIDETypesUpdater = {
      updateVersion: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create bot instance
    bot = new SelectorCollectionBot({
      selectorCollector: mockSelectorCollector,
      selectorVersionManager: mockSelectorVersionManager,
      ideTypesUpdater: mockIDETypesUpdater,
      logger: mockLogger
    });
  });

  describe('collectSelectors', () => {
    it('should collect selectors for Cursor', async () => {
      const mockSelectors = {
        chatInput: '.aislash-editor-input',
        chatContainer: '.aislash-container',
        monacoEditor: '.monaco-editor'
      };

      mockSelectorCollector.collectSelectors.mockResolvedValue(mockSelectors);

      const result = await bot.collectSelectors('cursor', '1.6.0', 9222);

      expect(result).toHaveProperty('chat');
      expect(mockSelectorCollector.collectSelectors).toHaveBeenCalledWith(9222);
    });

    it('should collect selectors for VSCode', async () => {
      const mockSelectors = {
        chatInput: '.chat-input',
        monacoEditor: '.monaco-editor'
      };

      mockSelectorCollector.collectSelectors.mockResolvedValue(mockSelectors);

      const result = await bot.collectSelectors('vscode', '1.85.0', 9232);

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it('should use cache for repeated requests', async () => {
      const mockSelectors = {
        chatInput: '.aislash-editor-input'
      };

      mockSelectorCollector.collectSelectors.mockResolvedValue(mockSelectors);

      await bot.collectSelectors('cursor', '1.6.0', 9222);
      await bot.collectSelectors('cursor', '1.6.0', 9222);

      expect(mockSelectorCollector.collectSelectors).toHaveBeenCalledTimes(1);
    });

    it('should throw error when no selectors collected', async () => {
      mockSelectorCollector.collectSelectors.mockResolvedValue({});

      await expect(bot.collectSelectors('cursor', '1.6.0', 9222)).rejects.toThrow(
        'No selectors collected for cursor version 1.6.0'
      );
    });

    it('should handle collection failures', async () => {
      mockSelectorCollector.collectSelectors.mockRejectedValue(
        new Error('CDP connection failed')
      );

      await expect(bot.collectSelectors('cursor', '1.6.0', 9222)).rejects.toThrow();
    });
  });

  describe('validateSelectors', () => {
    it('should validate correct selectors', async () => {
      const selectors = {
        chatInput: '.aislash-editor-input',
        chatContainer: '#chat-container',
        button: 'button.primary'
      };

      const result = await bot.validateSelectors(selectors);

      expect(Object.keys(result).length).toBe(3);
      expect(result.chatInput).toBe('.aislash-editor-input');
    });

    it('should filter out invalid selectors', async () => {
      const selectors = {
        valid: '.valid-class',
        invalid: null,
        empty: '',
        dangerous: '<script>alert(1)</script>'
      };

      const result = await bot.validateSelectors(selectors);

      expect(Object.keys(result).length).toBe(1);
      expect(result.valid).toBe('.valid-class');
    });

    it('should reject dangerous selectors', async () => {
      const selectors = {
        xss: 'javascript:alert(1)',
        injection: 'onclick=alert(1)'
      };

      const result = await bot.validateSelectors(selectors);

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('isValidSelector', () => {
    it('should validate class selector', () => {
      expect(bot.isValidSelector('.my-class')).toBe(true);
    });

    it('should validate ID selector', () => {
      expect(bot.isValidSelector('#my-id')).toBe(true);
    });

    it('should validate element selector', () => {
      expect(bot.isValidSelector('div')).toBe(true);
    });

    it('should validate attribute selector', () => {
      expect(bot.isValidSelector('[data-testid="test"]')).toBe(true);
    });

    it('should validate pseudo-class selector', () => {
      expect(bot.isValidSelector(':hover')).toBe(true);
    });

    it('should reject empty selector', () => {
      expect(bot.isValidSelector('')).toBe(false);
    });

    it('should reject null selector', () => {
      expect(bot.isValidSelector(null)).toBe(false);
    });

    it('should reject dangerous patterns', () => {
      expect(bot.isValidSelector('<script>')).toBe(false);
      expect(bot.isValidSelector('javascript:')).toBe(false);
      expect(bot.isValidSelector('onerror=')).toBe(false);
    });
  });

  describe('categorizeSelectors', () => {
    it('should categorize chat selectors', async () => {
      const selectors = {
        chatInput: '.chat-input',
        chatMessage: '.message',
        aiResponse: '.ai-response'
      };

      const result = await bot.categorizeSelectors(selectors);

      expect(result).toHaveProperty('chat');
      expect(result.chat.chatInput).toBe('.chat-input');
    });

    it('should categorize editor selectors', async () => {
      const selectors = {
        monacoEditor: '.monaco-editor',
        editorLine: '.view-line'
      };

      const result = await bot.categorizeSelectors(selectors);

      expect(result).toHaveProperty('editor');
      expect(result.editor.monacoEditor).toBe('.monaco-editor');
    });

    it('should categorize terminal selectors', async () => {
      const selectors = {
        terminal: '.terminal',
        xtermContainer: '.xterm'
      };

      const result = await bot.categorizeSelectors(selectors);

      expect(result).toHaveProperty('terminal');
    });

    it('should put uncategorized selectors in other', async () => {
      const selectors = {
        unknownElement: '.unknown'
      };

      const result = await bot.categorizeSelectors(selectors);

      expect(result).toHaveProperty('other');
      expect(result.other.unknownElement).toBe('.unknown');
    });

    it('should handle mixed selectors', async () => {
      const selectors = {
        chatInput: '.chat-input',
        monacoEditor: '.monaco-editor',
        terminal: '.terminal',
        unknown: '.unknown'
      };

      const result = await bot.categorizeSelectors(selectors);

      expect(result).toHaveProperty('chat');
      expect(result).toHaveProperty('editor');
      expect(result).toHaveProperty('terminal');
      expect(result).toHaveProperty('other');
    });
  });

  describe('saveSelectors', () => {
    it('should save selectors successfully', async () => {
      const selectors = {
        chat: { chatInput: '.chat-input' },
        editor: { monacoEditor: '.monaco-editor' }
      };

      mockIDETypesUpdater.updateVersion.mockResolvedValue({
        success: true,
        message: 'IDETypes.js updated successfully'
      });

      const result = await bot.saveSelectors('cursor', '1.6.0', selectors);

      expect(result.success).toBe(true);
      expect(mockIDETypesUpdater.updateVersion).toHaveBeenCalledWith('cursor', '1.6.0', selectors);
    });

    it('should throw error for invalid input', async () => {
      await expect(bot.saveSelectors(null, '1.6.0', {})).rejects.toThrow(
        'Invalid input: ideType, version, and selectors are required'
      );
    });

    it('should format selectors correctly', async () => {
      const selectors = {
        chat: { chatInput: '.chat-input' },
        editor: { monacoEditor: '.monaco-editor' }
      };

      mockIDETypesUpdater.updateVersion.mockResolvedValue({
        success: true,
        message: 'IDETypes.js updated successfully'
      });

      await bot.saveSelectors('cursor', '1.6.0', selectors);

      expect(mockIDETypesUpdater.updateVersion).toHaveBeenCalledWith('cursor', '1.6.0', selectors);
    });
  });

  describe('testSelectors', () => {
    it('should test selectors successfully', async () => {
      const selectors = {
        chat: {
          chatInput: '.chat-input',
          chatContainer: '.chat-container'
        },
        editor: {
          monacoEditor: '.monaco-editor'
        }
      };

      const result = await bot.testSelectors('cursor', '1.6.0', selectors, 9222);

      expect(result).toHaveProperty('tested');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('details');
      expect(result.tested).toBe(3);
    });

    it('should report test results correctly', async () => {
      const selectors = {
        chat: {
          valid: '.valid-class',
          invalid: ''
        }
      };

      const result = await bot.testSelectors('cursor', '1.6.0', selectors, 9222);

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should include detailed results', async () => {
      const selectors = {
        chat: {
          chatInput: '.chat-input'
        }
      };

      const result = await bot.testSelectors('cursor', '1.6.0', selectors, 9222);

      expect(result.details).toHaveProperty('chat');
      expect(result.details.chat).toHaveProperty('selectors');
      expect(result.details.chat.selectors.chatInput).toHaveProperty('status');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      bot.collectionCache.set('cursor:1.6.0', {
        selectors: {},
        timestamp: Date.now()
      });

      bot.clearCache();

      expect(bot.collectionCache.size).toBe(0);
    });

    it('should get cache statistics', () => {
      bot.collectionCache.set('cursor:1.6.0', {
        selectors: { chat: {} },
        timestamp: Date.now()
      });

      const stats = bot.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.timeout).toBe(30 * 60 * 1000);
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should get service statistics', () => {
      const stats = bot.getStats();

      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('error handling', () => {
    it('should handle collector errors gracefully', async () => {
      mockSelectorCollector.collectSelectors.mockRejectedValue(
        new Error('Collection error')
      );

      await expect(bot.collectSelectors('cursor', '1.6.0', 9222)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      const result = await bot.validateSelectors({ invalid: null });

      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle categorization errors gracefully', async () => {
      await expect(bot.categorizeSelectors(null)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

