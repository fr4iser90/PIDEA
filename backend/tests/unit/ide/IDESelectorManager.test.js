/**
 * IDESelectorManager Unit Tests
 * Tests for IDE selector management with version support
 */

const IDESelectorManager = require('@domain/services/ide/IDESelectorManager');
const IDETypes = require('@domain/services/ide/IDETypes');

describe('IDESelectorManager', () => {
  let selectorManager;

  beforeEach(() => {
    selectorManager = new IDESelectorManager();
  });

  describe('constructor', () => {
    it('should initialize with default dependencies', () => {
      const manager = new IDESelectorManager();
      expect(manager.versionManager).toBeDefined();
      expect(manager.logger).toBeDefined();
    });

    it('should initialize with custom dependencies', () => {
      const mockVersionManager = { getSelectors: jest.fn() };
      const mockLogger = { info: jest.fn() };
      
      const manager = new IDESelectorManager({
        versionManager: mockVersionManager,
        logger: mockLogger
      });
      
      expect(manager.versionManager).toBe(mockVersionManager);
      expect(manager.logger).toBe(mockLogger);
    });
  });

  describe('instance methods', () => {
    describe('getSelectors', () => {
      it('should return selectors from version manager', async () => {
        const mockSelectors = { input: '.test-input' };
        selectorManager.versionManager.getSelectors = jest.fn().mockResolvedValue(mockSelectors);

        const result = await selectorManager.getSelectors('cursor', '0.42.0');

        expect(result).toBe(mockSelectors);
        expect(selectorManager.versionManager.getSelectors).toHaveBeenCalledWith('cursor', '0.42.0');
      });

      it('should handle errors gracefully', async () => {
        const mockFallbackSelectors = { input: '.fallback-input' };
        selectorManager.versionManager.getSelectors = jest.fn().mockRejectedValue(new Error('Test error'));
        selectorManager.versionManager.getFallbackSelectors = jest.fn().mockReturnValue(mockFallbackSelectors);

        const result = await selectorManager.getSelectors('cursor');

        expect(result).toBe(mockFallbackSelectors);
      });
    });
  });

  describe('static methods', () => {
    describe('getSelectors', () => {
      it('should return versioned selectors for valid IDE types', () => {
        const result = IDESelectorManager.getSelectors('cursor');
        
        expect(result).toBeDefined();
        expect(result.chatSelectors).toBeDefined();
        expect(result.chatSelectors.input).toBeDefined();
      });

      it('should return fallback selectors for invalid IDE types', () => {
        const result = IDESelectorManager.getSelectors('invalid-ide');
        
        expect(result).toBeDefined();
        expect(result.input).toBeDefined();
        expect(result.inputContainer).toBeDefined();
      });

      it('should handle errors gracefully', () => {
        // Mock IDETypes to throw error
        const originalGetLatestVersion = IDETypes.getLatestVersion;
        IDETypes.getLatestVersion = jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        });

        const result = IDESelectorManager.getSelectors('cursor');
        
        expect(result).toBeDefined();
        expect(result.input).toBeDefined();

        // Restore original method
        IDETypes.getLatestVersion = originalGetLatestVersion;
      });
    });

    describe('getFallbackSelectors', () => {
      it('should return generic fallback selectors', () => {
        const result = IDESelectorManager.getFallbackSelectors();

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

    describe('hasSelectors', () => {
      it('should return true for IDEs with selectors', () => {
        expect(IDESelectorManager.hasSelectors('cursor')).toBe(true);
        expect(IDESelectorManager.hasSelectors('vscode')).toBe(true);
        expect(IDESelectorManager.hasSelectors('windsurf')).toBe(true);
      });

      it('should return false for IDEs without selectors', () => {
        expect(IDESelectorManager.hasSelectors('invalid-ide')).toBe(false);
      });

      it('should handle errors gracefully', () => {
        // Mock IDETypes to throw error
        const originalGetMetadata = IDETypes.getMetadata;
        IDETypes.getMetadata = jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        });

        const result = IDESelectorManager.hasSelectors('cursor');
        expect(result).toBe(false);

        // Restore original method
        IDETypes.getMetadata = originalGetMetadata;
      });
    });

    describe('getSupportedIDETypes', () => {
      it('should return IDE types that have selectors', () => {
        const supportedTypes = IDESelectorManager.getSupportedIDETypes();
        
        expect(supportedTypes).toContain('cursor');
        expect(supportedTypes).toContain('vscode');
        expect(supportedTypes).toContain('windsurf');
        expect(supportedTypes).not.toContain('invalid-ide');
      });
    });

    describe('getAvailableVersions', () => {
      it('should return available versions for IDE type', () => {
        const cursorVersions = IDESelectorManager.getAvailableVersions('cursor');
        expect(cursorVersions).toContain('0.42.0');
        expect(cursorVersions).toContain('0.43.0');
      });

      it('should return empty array for invalid IDE types', () => {
        const versions = IDESelectorManager.getAvailableVersions('invalid-ide');
        expect(versions).toEqual([]);
      });
    });

    describe('getLatestVersion', () => {
      it('should return latest version for IDE type', () => {
        expect(IDESelectorManager.getLatestVersion('cursor')).toBe('0.42.0');
        expect(IDESelectorManager.getLatestVersion('vscode')).toBe('1.85.0');
        expect(IDESelectorManager.getLatestVersion('windsurf')).toBe('1.0.0');
      });

      it('should return null for invalid IDE types', () => {
        expect(IDESelectorManager.getLatestVersion('invalid-ide')).toBeNull();
      });
    });

    describe('getSelector', () => {
      it('should return specific selector for IDE type and element type', () => {
        const inputSelector = IDESelectorManager.getSelector('cursor', 'input');
        expect(inputSelector).toBeDefined();
        expect(typeof inputSelector).toBe('string');
      });

      it('should return null for non-existent element types', () => {
        const selector = IDESelectorManager.getSelector('cursor', 'non-existent');
        expect(selector).toBeNull();
      });

      it('should handle errors gracefully', () => {
        // Mock getSelectors to throw error
        const originalGetSelectors = IDESelectorManager.getSelectors;
        IDESelectorManager.getSelectors = jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        });

        const result = IDESelectorManager.getSelector('cursor', 'input');
        expect(result).toBeNull();

        // Restore original method
        IDESelectorManager.getSelectors = originalGetSelectors;
      });
    });
  });

  describe('integration with IDETypes', () => {
    it('should work with versioned selectors', () => {
      const selectors = IDESelectorManager.getSelectors('cursor');
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('aislash-editor-input');
    });

    it('should work with VSCode selectors', () => {
      const selectors = IDESelectorManager.getSelectors('vscode');
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('chat-input');
    });

    it('should work with Windsurf selectors', () => {
      const selectors = IDESelectorManager.getSelectors('windsurf');
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('chat-input');
    });
  });

  describe('backward compatibility', () => {
    it('should maintain backward compatibility with existing code', () => {
      // Test that static method still works
      const selectors = IDESelectorManager.getSelectors('cursor');
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
    });

    it('should provide fallback selectors when versioned selectors are not available', () => {
      const fallbackSelectors = IDESelectorManager.getFallbackSelectors();
      expect(fallbackSelectors).toBeDefined();
      expect(fallbackSelectors.input).toBeDefined();
    });
  });
});
