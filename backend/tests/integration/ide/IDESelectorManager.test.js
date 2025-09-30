/**
 * IDESelectorManager Integration Tests
 * Tests for IDE selector management with version support integration
 */

const IDESelectorManager = require('@domain/services/ide/IDESelectorManager');
const IDETypes = require('@domain/services/ide/IDETypes');

describe('IDESelectorManager Integration Tests', () => {
  let selectorManager;

  beforeEach(() => {
    selectorManager = new IDESelectorManager();
  });

  describe('Version-based selector loading', () => {
    it('should load version-specific selectors for Cursor', async () => {
      const selectors = await selectorManager.getSelectors('cursor', '0.42.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('aislash-editor-input');
      expect(selectors.chatSelectors.inputContainer).toContain('aislash-editor-container');
    });

    it('should load version-specific selectors for VSCode', async () => {
      const selectors = await selectorManager.getSelectors('vscode', '1.85.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('chat-input');
      expect(selectors.chatSelectors.inputContainer).toContain('chat-input-container');
    });

    it('should load version-specific selectors for Windsurf', async () => {
      const selectors = await selectorManager.getSelectors('windsurf', '1.0.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('chat-input');
      expect(selectors.chatSelectors.inputContainer).toContain('chat-container');
    });

    it('should fallback to latest version when specific version not found', async () => {
      const selectors = await selectorManager.getSelectors('cursor', '0.99.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      // Should fallback to latest version (0.42.0)
      expect(selectors.chatSelectors.input).toContain('aislash-editor-input');
    });

    it('should fallback to hardcoded selectors when versioned selectors not available', async () => {
      const selectors = await selectorManager.getSelectors('jetbrains', '2023.1');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('chat-input');
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain backward compatibility with static getSelectors method', () => {
      const selectors = IDESelectorManager.getSelectors('cursor');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('aislash-editor-input');
    });

    it('should work with existing IDE types', () => {
      const cursorSelectors = IDESelectorManager.getSelectors('cursor');
      const vscodeSelectors = IDESelectorManager.getSelectors('vscode');
      const windsurfSelectors = IDESelectorManager.getSelectors('windsurf');
      
      expect(cursorSelectors).toBeDefined();
      expect(vscodeSelectors).toBeDefined();
      expect(windsurfSelectors).toBeDefined();
      
      expect(cursorSelectors.chatSelectors.input).toContain('aislash-editor-input');
      expect(vscodeSelectors.chatSelectors.input).toContain('chat-input');
      expect(windsurfSelectors.chatSelectors.input).toContain('chat-input');
    });
  });

  describe('Version management integration', () => {
    it('should return available versions for IDE types', () => {
      const cursorVersions = IDESelectorManager.getAvailableVersions('cursor');
      const vscodeVersions = IDESelectorManager.getAvailableVersions('vscode');
      const windsurfVersions = IDESelectorManager.getAvailableVersions('windsurf');
      
      expect(cursorVersions).toContain('0.42.0');
      expect(cursorVersions).toContain('0.43.0');
      expect(vscodeVersions).toContain('1.85.0');
      expect(windsurfVersions).toContain('1.0.0');
    });

    it('should return latest version for IDE types', () => {
      expect(IDESelectorManager.getLatestVersion('cursor')).toBe('0.42.0');
      expect(IDESelectorManager.getLatestVersion('vscode')).toBe('1.85.0');
      expect(IDESelectorManager.getLatestVersion('windsurf')).toBe('1.0.0');
    });

    it('should return null for invalid IDE types', () => {
      expect(IDESelectorManager.getLatestVersion('invalid-ide')).toBeNull();
      expect(IDESelectorManager.getAvailableVersions('invalid-ide')).toEqual([]);
    });
  });

  describe('Selector validation', () => {
    it('should validate that selectors exist for supported IDE types', () => {
      expect(IDESelectorManager.hasSelectors('cursor')).toBe(true);
      expect(IDESelectorManager.hasSelectors('vscode')).toBe(true);
      expect(IDESelectorManager.hasSelectors('windsurf')).toBe(true);
    });

    it('should return false for unsupported IDE types', () => {
      expect(IDESelectorManager.hasSelectors('invalid-ide')).toBe(false);
    });

    it('should return supported IDE types', () => {
      const supportedTypes = IDESelectorManager.getSupportedIDETypes();
      
      expect(supportedTypes).toContain('cursor');
      expect(supportedTypes).toContain('vscode');
      expect(supportedTypes).toContain('windsurf');
    });
  });

  describe('Individual selector retrieval', () => {
    it('should return specific selectors for IDE types', () => {
      const cursorInput = IDESelectorManager.getSelector('cursor', 'input');
      const vscodeInput = IDESelectorManager.getSelector('vscode', 'input');
      const windsurfInput = IDESelectorManager.getSelector('windsurf', 'input');
      
      expect(cursorInput).toContain('aislash-editor-input');
      expect(vscodeInput).toContain('chat-input');
      expect(windsurfInput).toContain('chat-input');
    });

    it('should return null for non-existent selectors', () => {
      const selector = IDESelectorManager.getSelector('cursor', 'non-existent');
      expect(selector).toBeNull();
    });
  });

  describe('Fallback mechanisms', () => {
    it('should provide fallback selectors for unknown IDEs', () => {
      const fallbackSelectors = IDESelectorManager.getFallbackSelectors();
      
      expect(fallbackSelectors).toBeDefined();
      expect(fallbackSelectors.input).toBeDefined();
      expect(fallbackSelectors.inputContainer).toBeDefined();
      expect(fallbackSelectors.userMessages).toBeDefined();
      expect(fallbackSelectors.aiMessages).toBeDefined();
      expect(fallbackSelectors.syntaxClasses).toBeDefined();
    });

    it('should use fallback selectors when versioned selectors fail', async () => {
      // Mock a scenario where versioned selectors fail
      const selectors = await selectorManager.getSelectors('unknown-ide', '1.0.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.inputContainer).toBeDefined();
    });
  });

  describe('Caching behavior', () => {
    it('should cache selector results', async () => {
      // First call
      const selectors1 = await selectorManager.getSelectors('cursor', '0.42.0');
      
      // Second call should use cache
      const selectors2 = await selectorManager.getSelectors('cursor', '0.42.0');
      
      expect(selectors1).toBe(selectors2);
      
      // Check cache stats
      const cacheStats = selectorManager.versionManager.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.keys).toContain('cursor:0.42.0');
    });

    it('should clear cache when requested', async () => {
      // Add some cache entries
      await selectorManager.getSelectors('cursor', '0.42.0');
      await selectorManager.getSelectors('vscode', '1.85.0');
      
      expect(selectorManager.versionManager.getCacheStats().size).toBe(2);
      
      // Clear cache
      selectorManager.versionManager.clearCache();
      
      expect(selectorManager.versionManager.getCacheStats().size).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully in async methods', async () => {
      // Mock an error scenario
      const originalGetSelectors = selectorManager.versionManager.getSelectors;
      selectorManager.versionManager.getSelectors = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const selectors = await selectorManager.getSelectors('cursor');
      
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      
      // Restore original method
      selectorManager.versionManager.getSelectors = originalGetSelectors;
    });

    it('should handle errors gracefully in static methods', () => {
      // Mock an error scenario
      const originalGetLatestVersion = IDETypes.getLatestVersion;
      IDETypes.getLatestVersion = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const selectors = IDESelectorManager.getSelectors('cursor');
      
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      
      // Restore original method
      IDETypes.getLatestVersion = originalGetLatestVersion;
    });
  });

  describe('Performance', () => {
    it('should load selectors quickly', async () => {
      const startTime = Date.now();
      
      await selectorManager.getSelectors('cursor', '0.42.0');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should load within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should use cache for subsequent calls', async () => {
      // First call
      const start1 = Date.now();
      await selectorManager.getSelectors('cursor', '0.42.0');
      const duration1 = Date.now() - start1;
      
      // Second call (should be faster due to cache)
      const start2 = Date.now();
      await selectorManager.getSelectors('cursor', '0.42.0');
      const duration2 = Date.now() - start2;
      
      expect(duration2).toBeLessThan(duration1);
    });
  });
});
