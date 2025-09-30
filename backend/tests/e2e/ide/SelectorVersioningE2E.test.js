/**
 * Selector Versioning System End-to-End Tests
 * Tests for complete selector versioning workflow
 */

const IDESelectorManager = require('@domain/services/ide/IDESelectorManager');
const IDETypes = require('@domain/services/ide/IDETypes');
const SelectorVersionManager = require('@domain/services/ide/SelectorVersionManager');

describe('Selector Versioning System E2E Tests', () => {
  let selectorManager;
  let versionManager;

  beforeEach(() => {
    selectorManager = new IDESelectorManager();
    versionManager = new SelectorVersionManager();
  });

  describe('Complete versioning workflow', () => {
    it('should handle complete selector versioning workflow for Cursor', async () => {
      // Step 1: Check available versions
      const availableVersions = IDETypes.getAvailableVersions('cursor');
      expect(availableVersions).toContain('0.42.0');
      expect(availableVersions).toContain('0.43.0');

      // Step 2: Get latest version
      const latestVersion = IDETypes.getLatestVersion('cursor');
      expect(latestVersion).toBe('0.42.0');

      // Step 3: Check if specific version exists
      expect(IDETypes.hasVersion('cursor', '0.42.0')).toBe(true);
      expect(IDETypes.hasVersion('cursor', '0.99.0')).toBe(false);

      // Step 4: Get version-specific selectors
      const versionSelectors = IDETypes.getSelectorsForVersion('cursor', '0.42.0');
      expect(versionSelectors).toBeDefined();
      expect(versionSelectors.chatSelectors).toBeDefined();
      expect(versionSelectors.chatSelectors.input).toContain('aislash-editor-input');

      // Step 5: Use SelectorVersionManager to get selectors
      const managerSelectors = await versionManager.getSelectors('cursor', '0.42.0');
      expect(managerSelectors).toBeDefined();
      expect(managerSelectors.chatSelectors).toBeDefined();

      // Step 6: Use IDESelectorManager to get selectors
      const selectorManagerSelectors = await selectorManager.getSelectors('cursor', '0.42.0');
      expect(selectorManagerSelectors).toBeDefined();
      expect(selectorManagerSelectors.chatSelectors).toBeDefined();

      // Step 7: Verify all selectors are consistent
      expect(versionSelectors.chatSelectors.input).toBe(managerSelectors.chatSelectors.input);
      expect(managerSelectors.chatSelectors.input).toBe(selectorManagerSelectors.chatSelectors.input);
    });

    it('should handle complete selector versioning workflow for VSCode', async () => {
      // Step 1: Check available versions
      const availableVersions = IDETypes.getAvailableVersions('vscode');
      expect(availableVersions).toContain('1.85.0');

      // Step 2: Get latest version
      const latestVersion = IDETypes.getLatestVersion('vscode');
      expect(latestVersion).toBe('1.85.0');

      // Step 3: Check if specific version exists
      expect(IDETypes.hasVersion('vscode', '1.85.0')).toBe(true);
      expect(IDETypes.hasVersion('vscode', '2.0.0')).toBe(false);

      // Step 4: Get version-specific selectors
      const versionSelectors = IDETypes.getSelectorsForVersion('vscode', '1.85.0');
      expect(versionSelectors).toBeDefined();
      expect(versionSelectors.chatSelectors).toBeDefined();
      expect(versionSelectors.chatSelectors.input).toContain('chat-input');

      // Step 5: Use SelectorVersionManager to get selectors
      const managerSelectors = await versionManager.getSelectors('vscode', '1.85.0');
      expect(managerSelectors).toBeDefined();
      expect(managerSelectors.chatSelectors).toBeDefined();

      // Step 6: Use IDESelectorManager to get selectors
      const selectorManagerSelectors = await selectorManager.getSelectors('vscode', '1.85.0');
      expect(selectorManagerSelectors).toBeDefined();
      expect(selectorManagerSelectors.chatSelectors).toBeDefined();

      // Step 7: Verify all selectors are consistent
      expect(versionSelectors.chatSelectors.input).toBe(managerSelectors.chatSelectors.input);
      expect(managerSelectors.chatSelectors.input).toBe(selectorManagerSelectors.chatSelectors.input);
    });

    it('should handle complete selector versioning workflow for Windsurf', async () => {
      // Step 1: Check available versions
      const availableVersions = IDETypes.getAvailableVersions('windsurf');
      expect(availableVersions).toContain('1.0.0');

      // Step 2: Get latest version
      const latestVersion = IDETypes.getLatestVersion('windsurf');
      expect(latestVersion).toBe('1.0.0');

      // Step 3: Check if specific version exists
      expect(IDETypes.hasVersion('windsurf', '1.0.0')).toBe(true);
      expect(IDETypes.hasVersion('windsurf', '2.0.0')).toBe(false);

      // Step 4: Get version-specific selectors
      const versionSelectors = IDETypes.getSelectorsForVersion('windsurf', '1.0.0');
      expect(versionSelectors).toBeDefined();
      expect(versionSelectors.chatSelectors).toBeDefined();
      expect(versionSelectors.chatSelectors.input).toContain('chat-input');

      // Step 5: Use SelectorVersionManager to get selectors
      const managerSelectors = await versionManager.getSelectors('windsurf', '1.0.0');
      expect(managerSelectors).toBeDefined();
      expect(managerSelectors.chatSelectors).toBeDefined();

      // Step 6: Use IDESelectorManager to get selectors
      const selectorManagerSelectors = await selectorManager.getSelectors('windsurf', '1.0.0');
      expect(selectorManagerSelectors).toBeDefined();
      expect(selectorManagerSelectors.chatSelectors).toBeDefined();

      // Step 7: Verify all selectors are consistent
      expect(versionSelectors.chatSelectors.input).toBe(managerSelectors.chatSelectors.input);
      expect(managerSelectors.chatSelectors.input).toBe(selectorManagerSelectors.chatSelectors.input);
    });
  });

  describe('Fallback mechanisms', () => {
    it('should fallback to latest version when specific version not found', async () => {
      // Try to get selectors for non-existent version
      const selectors = await versionManager.getSelectors('cursor', '0.99.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('aislash-editor-input');
    });

    it('should fallback to hardcoded selectors when versioned selectors not available', async () => {
      // Try to get selectors for IDE without versioned selectors
      const selectors = await versionManager.getSelectors('jetbrains', '2023.1');
      
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      expect(selectors.chatSelectors.input).toContain('chat-input');
    });

    it('should fallback to generic selectors when all else fails', async () => {
      // Try to get selectors for completely unknown IDE
      const selectors = await versionManager.getSelectors('unknown-ide', '1.0.0');
      
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.inputContainer).toBeDefined();
      expect(selectors.userMessages).toBeDefined();
      expect(selectors.aiMessages).toBeDefined();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain backward compatibility with existing code', () => {
      // Test static method still works
      const cursorSelectors = IDESelectorManager.getSelectors('cursor');
      const vscodeSelectors = IDESelectorManager.getSelectors('vscode');
      const windsurfSelectors = IDESelectorManager.getSelectors('windsurf');
      
      expect(cursorSelectors).toBeDefined();
      expect(vscodeSelectors).toBeDefined();
      expect(windsurfSelectors).toBeDefined();
      
      expect(cursorSelectors.chatSelectors).toBeDefined();
      expect(vscodeSelectors.chatSelectors).toBeDefined();
      expect(windsurfSelectors.chatSelectors).toBeDefined();
    });

    it('should provide fallback selectors for unknown IDEs', () => {
      const fallbackSelectors = IDESelectorManager.getFallbackSelectors();
      
      expect(fallbackSelectors).toBeDefined();
      expect(fallbackSelectors.input).toBeDefined();
      expect(fallbackSelectors.inputContainer).toBeDefined();
      expect(fallbackSelectors.userMessages).toBeDefined();
      expect(fallbackSelectors.aiMessages).toBeDefined();
      expect(fallbackSelectors.syntaxClasses).toBeDefined();
    });
  });

  describe('Performance and caching', () => {
    it('should cache selector results for performance', async () => {
      // First call
      const start1 = Date.now();
      const selectors1 = await versionManager.getSelectors('cursor', '0.42.0');
      const duration1 = Date.now() - start1;
      
      // Second call (should be faster due to cache)
      const start2 = Date.now();
      const selectors2 = await versionManager.getSelectors('cursor', '0.42.0');
      const duration2 = Date.now() - start2;
      
      expect(selectors1).toBe(selectors2);
      expect(duration2).toBeLessThan(duration1);
      
      // Check cache stats
      const cacheStats = versionManager.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.keys).toContain('cursor:0.42.0');
    });

    it('should clear cache when requested', async () => {
      // Add some cache entries
      await versionManager.getSelectors('cursor', '0.42.0');
      await versionManager.getSelectors('vscode', '1.85.0');
      await versionManager.getSelectors('windsurf', '1.0.0');
      
      expect(versionManager.getCacheStats().size).toBe(3);
      
      // Clear cache
      versionManager.clearCache();
      
      expect(versionManager.getCacheStats().size).toBe(0);
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle errors gracefully throughout the workflow', async () => {
      // Test various error scenarios
      const scenarios = [
        { ideType: 'invalid-ide', version: '1.0.0' },
        { ideType: 'cursor', version: 'invalid-version' },
        { ideType: null, version: '1.0.0' },
        { ideType: 'cursor', version: null }
      ];
      
      for (const scenario of scenarios) {
        const selectors = await versionManager.getSelectors(scenario.ideType, scenario.version);
        expect(selectors).toBeDefined();
        expect(selectors.input).toBeDefined();
      }
    });

    it('should maintain system stability under error conditions', async () => {
      // Simulate multiple error conditions
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(versionManager.getSelectors('invalid-ide', '1.0.0'));
        promises.push(versionManager.getSelectors('cursor', 'invalid-version'));
      }
      
      const results = await Promise.all(promises);
      
      // All results should be valid fallback selectors
      results.forEach(selectors => {
        expect(selectors).toBeDefined();
        expect(selectors.input).toBeDefined();
        expect(selectors.inputContainer).toBeDefined();
      });
    });
  });

  describe('Cross-IDE compatibility', () => {
    it('should work consistently across all supported IDEs', async () => {
      const ideTypes = ['cursor', 'vscode', 'windsurf'];
      
      for (const ideType of ideTypes) {
        // Test version management
        const availableVersions = IDETypes.getAvailableVersions(ideType);
        const latestVersion = IDETypes.getLatestVersion(ideType);
        
        expect(availableVersions.length).toBeGreaterThan(0);
        expect(latestVersion).toBeDefined();
        
        // Test selector retrieval
        const selectors = await versionManager.getSelectors(ideType, latestVersion);
        expect(selectors).toBeDefined();
        expect(selectors.chatSelectors).toBeDefined();
        expect(selectors.chatSelectors.input).toBeDefined();
        
        // Test static method compatibility
        const staticSelectors = IDESelectorManager.getSelectors(ideType);
        expect(staticSelectors).toBeDefined();
        expect(staticSelectors.chatSelectors).toBeDefined();
      }
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should handle typical IDE automation workflow', async () => {
      // Simulate typical workflow: detect IDE, get version, load selectors
      const ideType = 'cursor';
      const version = '0.42.0';
      
      // Step 1: Validate IDE type
      expect(IDETypes.isValid(ideType)).toBe(true);
      
      // Step 2: Check if version exists
      expect(IDETypes.hasVersion(ideType, version)).toBe(true);
      
      // Step 3: Get selectors for automation
      const selectors = await selectorManager.getSelectors(ideType, version);
      expect(selectors).toBeDefined();
      expect(selectors.chatSelectors).toBeDefined();
      
      // Step 4: Use specific selectors
      const inputSelector = selectors.chatSelectors.input;
      const containerSelector = selectors.chatSelectors.inputContainer;
      
      expect(inputSelector).toBeDefined();
      expect(containerSelector).toBeDefined();
      
      // Step 5: Verify selectors are valid CSS selectors
      expect(inputSelector).toMatch(/^[.#]?[\w-]+/);
      expect(containerSelector).toMatch(/^[.#]?[\w-]+/);
    });

    it('should handle IDE version updates gracefully', async () => {
      // Simulate IDE version update scenario
      const ideType = 'cursor';
      const oldVersion = '0.42.0';
      const newVersion = '0.43.0';
      
      // Get selectors for old version
      const oldSelectors = await selectorManager.getSelectors(ideType, oldVersion);
      expect(oldSelectors).toBeDefined();
      
      // Get selectors for new version
      const newSelectors = await selectorManager.getSelectors(ideType, newVersion);
      expect(newSelectors).toBeDefined();
      
      // Both should work
      expect(oldSelectors.chatSelectors.input).toBeDefined();
      expect(newSelectors.chatSelectors.input).toBeDefined();
      
      // They might be different (version-specific selectors)
      // or the same (if selectors haven't changed)
      expect(typeof oldSelectors.chatSelectors.input).toBe('string');
      expect(typeof newSelectors.chatSelectors.input).toBe('string');
    });
  });
});
