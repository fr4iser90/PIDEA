/**
 * IDETypes Unit Tests
 * Tests for version-based IDE type management functionality
 */

const IDETypes = require('@domain/services/ide/IDETypes');

describe('IDETypes', () => {
  describe('IDE type constants', () => {
    it('should have correct IDE type constants', () => {
      expect(IDETypes.CURSOR).toBe('cursor');
      expect(IDETypes.VSCODE).toBe('vscode');
      expect(IDETypes.WINDSURF).toBe('windsurf');
      expect(IDETypes.JETBRAINS).toBe('jetbrains');
      expect(IDETypes.SUBLIME).toBe('sublime');
    });
  });

  describe('getAllTypes', () => {
    it('should return all IDE type constants', () => {
      const types = IDETypes.getAllTypes();
      expect(types).toContain('cursor');
      expect(types).toContain('vscode');
      expect(types).toContain('windsurf');
      expect(types).toContain('jetbrains');
      expect(types).toContain('sublime');
    });
  });

  describe('isValid', () => {
    it('should return true for valid IDE types', () => {
      expect(IDETypes.isValid('cursor')).toBe(true);
      expect(IDETypes.isValid('vscode')).toBe(true);
      expect(IDETypes.isValid('windsurf')).toBe(true);
    });

    it('should return false for invalid IDE types', () => {
      expect(IDETypes.isValid('invalid')).toBe(false);
      expect(IDETypes.isValid('')).toBe(false);
      expect(IDETypes.isValid(null)).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for valid IDE types', () => {
      const cursorMetadata = IDETypes.getMetadata('cursor');
      expect(cursorMetadata).toBeDefined();
      expect(cursorMetadata.name).toBe('Cursor');
      expect(cursorMetadata.displayName).toBe('Cursor IDE');
      expect(cursorMetadata.latestVersion).toBe('0.42.0');
      expect(cursorMetadata.versions).toBeDefined();
    });

    it('should return null for invalid IDE types', () => {
      const metadata = IDETypes.getMetadata('invalid');
      expect(metadata).toBeNull();
    });
  });

  describe('getSupportedFeatures', () => {
    it('should return supported features for valid IDE types', () => {
      const cursorFeatures = IDETypes.getSupportedFeatures('cursor');
      expect(cursorFeatures).toContain('chat');
      expect(cursorFeatures).toContain('refactoring');
      expect(cursorFeatures).toContain('terminal');
    });

    it('should return empty array for invalid IDE types', () => {
      const features = IDETypes.getSupportedFeatures('invalid');
      expect(features).toEqual([]);
    });
  });

  describe('supportsFeature', () => {
    it('should return true for supported features', () => {
      expect(IDETypes.supportsFeature('cursor', 'chat')).toBe(true);
      expect(IDETypes.supportsFeature('cursor', 'refactoring')).toBe(true);
    });

    it('should return false for unsupported features', () => {
      expect(IDETypes.supportsFeature('cursor', 'unsupported')).toBe(false);
    });

    it('should return false for invalid IDE types', () => {
      expect(IDETypes.supportsFeature('invalid', 'chat')).toBe(false);
    });
  });

  describe('getDetectionPatterns', () => {
    it('should return detection patterns for valid IDE types', () => {
      const cursorPatterns = IDETypes.getDetectionPatterns('cursor');
      expect(cursorPatterns).toContain('cursor');
      expect(cursorPatterns).toContain('Cursor');
    });

    it('should return empty array for invalid IDE types', () => {
      const patterns = IDETypes.getDetectionPatterns('invalid');
      expect(patterns).toEqual([]);
    });
  });

  describe('getStartupCommand', () => {
    it('should return startup command for valid IDE types', () => {
      expect(IDETypes.getStartupCommand('cursor')).toBe('cursor');
      expect(IDETypes.getStartupCommand('vscode')).toBe('code');
      expect(IDETypes.getStartupCommand('windsurf')).toBe('windsurf');
    });

    it('should return null for invalid IDE types', () => {
      expect(IDETypes.getStartupCommand('invalid')).toBeNull();
    });
  });

  describe('getDisplayName', () => {
    it('should return display name for valid IDE types', () => {
      expect(IDETypes.getDisplayName('cursor')).toBe('Cursor IDE');
      expect(IDETypes.getDisplayName('vscode')).toBe('Visual Studio Code');
      expect(IDETypes.getDisplayName('windsurf')).toBe('Windsurf IDE');
    });

    it('should return null for invalid IDE types', () => {
      expect(IDETypes.getDisplayName('invalid')).toBeNull();
    });
  });

  describe('getDescription', () => {
    it('should return description for valid IDE types', () => {
      expect(IDETypes.getDescription('cursor')).toBe('AI-powered code editor');
      expect(IDETypes.getDescription('vscode')).toBe('Lightweight code editor');
      expect(IDETypes.getDescription('windsurf')).toBe('Modern development environment');
    });

    it('should return null for invalid IDE types', () => {
      expect(IDETypes.getDescription('invalid')).toBeNull();
    });
  });

  describe('getSupportedFileExtensions', () => {
    it('should return supported file extensions for valid IDE types', () => {
      const cursorExtensions = IDETypes.getSupportedFileExtensions('cursor');
      expect(cursorExtensions).toContain('.js');
      expect(cursorExtensions).toContain('.jsx');
      expect(cursorExtensions).toContain('.ts');
    });

    it('should return empty array for invalid IDE types', () => {
      const extensions = IDETypes.getSupportedFileExtensions('invalid');
      expect(extensions).toEqual([]);
    });
  });

  describe('supportsFileExtension', () => {
    it('should return true for supported file extensions', () => {
      expect(IDETypes.supportsFileExtension('cursor', '.js')).toBe(true);
      expect(IDETypes.supportsFileExtension('cursor', '.tsx')).toBe(true);
    });

    it('should return false for unsupported file extensions', () => {
      expect(IDETypes.supportsFileExtension('cursor', '.py')).toBe(false);
    });

    it('should return false for invalid IDE types', () => {
      expect(IDETypes.supportsFileExtension('invalid', '.js')).toBe(false);
    });
  });

  describe('getChatSelectors', () => {
    it('should return chat selectors for valid IDE types', () => {
      const cursorSelectors = IDETypes.getChatSelectors('cursor');
      expect(cursorSelectors).toBeDefined();
      expect(cursorSelectors.input).toBeDefined();
      expect(cursorSelectors.inputContainer).toBeDefined();
    });

    it('should return null for invalid IDE types', () => {
      const selectors = IDETypes.getChatSelectors('invalid');
      expect(selectors).toBeNull();
    });
  });

  describe('hasChatSupport', () => {
    it('should return true for IDEs with chat support', () => {
      expect(IDETypes.hasChatSupport('cursor')).toBe(true);
      expect(IDETypes.hasChatSupport('vscode')).toBe(true);
      expect(IDETypes.hasChatSupport('windsurf')).toBe(true);
    });

    it('should return false for IDEs without chat support', () => {
      expect(IDETypes.hasChatSupport('jetbrains')).toBe(false);
      expect(IDETypes.hasChatSupport('sublime')).toBe(false);
    });

    it('should return false for invalid IDE types', () => {
      expect(IDETypes.hasChatSupport('invalid')).toBe(false);
    });
  });

  describe('Version management methods', () => {
    describe('getSelectorsForVersion', () => {
      it('should return selectors for specific version', () => {
        const selectors = IDETypes.getSelectorsForVersion('cursor', '0.42.0');
        expect(selectors).toBeDefined();
        expect(selectors.chatSelectors).toBeDefined();
        expect(selectors.chatSelectors.input).toBeDefined();
      });

      it('should return selectors for latest version when specific version not found', () => {
        const selectors = IDETypes.getSelectorsForVersion('cursor', '0.99.0');
        expect(selectors).toBeDefined();
        expect(selectors.chatSelectors).toBeDefined();
      });

      it('should return null for invalid IDE types', () => {
        const selectors = IDETypes.getSelectorsForVersion('invalid', '0.42.0');
        expect(selectors).toBeNull();
      });
    });

    describe('getLatestVersion', () => {
      it('should return latest version for valid IDE types', () => {
        expect(IDETypes.getLatestVersion('cursor')).toBe('0.42.0');
        expect(IDETypes.getLatestVersion('vscode')).toBe('1.85.0');
        expect(IDETypes.getLatestVersion('windsurf')).toBe('1.0.0');
      });

      it('should return null for invalid IDE types', () => {
        expect(IDETypes.getLatestVersion('invalid')).toBeNull();
      });
    });

    describe('getAvailableVersions', () => {
      it('should return available versions for valid IDE types', () => {
        const cursorVersions = IDETypes.getAvailableVersions('cursor');
        expect(cursorVersions).toContain('0.42.0');
        expect(cursorVersions).toContain('0.43.0');
        expect(cursorVersions).toEqual(['0.42.0', '0.43.0']);
      });

      it('should return empty array for invalid IDE types', () => {
        const versions = IDETypes.getAvailableVersions('invalid');
        expect(versions).toEqual([]);
      });
    });

    describe('hasVersion', () => {
      it('should return true for existing versions', () => {
        expect(IDETypes.hasVersion('cursor', '0.42.0')).toBe(true);
        expect(IDETypes.hasVersion('cursor', '0.43.0')).toBe(true);
        expect(IDETypes.hasVersion('vscode', '1.85.0')).toBe(true);
        expect(IDETypes.hasVersion('windsurf', '1.0.0')).toBe(true);
      });

      it('should return false for non-existing versions', () => {
        expect(IDETypes.hasVersion('cursor', '0.99.0')).toBe(false);
        expect(IDETypes.hasVersion('vscode', '2.0.0')).toBe(false);
      });

      it('should return false for invalid IDE types', () => {
        expect(IDETypes.hasVersion('invalid', '0.42.0')).toBe(false);
      });
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain backward compatibility with old chatSelectors structure', () => {
      const cursorMetadata = IDETypes.getMetadata('cursor');
      expect(cursorMetadata.chatSelectors).toBeDefined();
      expect(cursorMetadata.chatSelectors.input).toBeDefined();
      expect(cursorMetadata.chatSelectors.inputContainer).toBeDefined();
    });

    it('should have both versioned and legacy selectors', () => {
      const cursorMetadata = IDETypes.getMetadata('cursor');
      expect(cursorMetadata.versions).toBeDefined();
      expect(cursorMetadata.chatSelectors).toBeDefined();
      
      // Versioned selectors should exist
      expect(cursorMetadata.versions['0.42.0']).toBeDefined();
      expect(cursorMetadata.versions['0.42.0'].chatSelectors).toBeDefined();
      
      // Legacy selectors should exist
      expect(cursorMetadata.chatSelectors).toBeDefined();
    });
  });
});
