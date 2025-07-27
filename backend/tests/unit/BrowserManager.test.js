/**
 * BrowserManager Unit Tests
 * Tests for IDE detection and selector management functionality
 */

const BrowserManager = require('@infrastructure/external/BrowserManager');
const IDESelectorManager = require('@domain/services/ide/IDESelectorManager');

describe('BrowserManager IDE Detection', () => {
  let browserManager;

  beforeEach(() => {
    browserManager = new BrowserManager();
  });

  describe('detectIDEType', () => {
    test('should detect Cursor IDE on port 9222', async () => {
      const ideType = await browserManager.detectIDEType(9222);
      expect(ideType).toBe('cursor');
    });

    test('should detect Cursor IDE on port 9231', async () => {
      const ideType = await browserManager.detectIDEType(9231);
      expect(ideType).toBe('cursor');
    });

    test('should detect VSCode IDE on port 9232', async () => {
      const ideType = await browserManager.detectIDEType(9232);
      expect(ideType).toBe('vscode');
    });

    test('should detect VSCode IDE on port 9241', async () => {
      const ideType = await browserManager.detectIDEType(9241);
      expect(ideType).toBe('vscode');
    });

    test('should detect Windsurf IDE on port 9242', async () => {
      const ideType = await browserManager.detectIDEType(9242);
      expect(ideType).toBe('windsurf');
    });

    test('should detect Windsurf IDE on port 9251', async () => {
      const ideType = await browserManager.detectIDEType(9251);
      expect(ideType).toBe('windsurf');
    });

    test('should fallback to cursor for unknown port', async () => {
      const ideType = await browserManager.detectIDEType(9999);
      expect(ideType).toBe('cursor');
    });

    test('should fallback to cursor for port 9221', async () => {
      const ideType = await browserManager.detectIDEType(9221);
      expect(ideType).toBe('cursor');
    });

    test('should fallback to cursor for port 9252', async () => {
      const ideType = await browserManager.detectIDEType(9252);
      expect(ideType).toBe('cursor');
    });
  });

  describe('getIDESelectors', () => {
    test('should get selectors for Cursor IDE', async () => {
      const selectors = await browserManager.getIDESelectors('cursor');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('aislash-editor-input');
    });

    test('should get selectors for VSCode IDE', async () => {
      const selectors = await browserManager.getIDESelectors('vscode');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('chat-input');
    });

    test('should get selectors for Windsurf IDE', async () => {
      const selectors = await browserManager.getIDESelectors('windsurf');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('chat-input');
    });

    test('should get fallback selectors for unknown IDE', async () => {
      const selectors = await browserManager.getIDESelectors('unknown');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('chat-input');
    });
  });
});

describe('IDESelectorManager', () => {
  describe('getSelectors', () => {
    test('should get selectors for Cursor IDE', () => {
      const selectors = IDESelectorManager.getSelectors('cursor');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('aislash-editor-input');
    });

    test('should get selectors for VSCode IDE', () => {
      const selectors = IDESelectorManager.getSelectors('vscode');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('chat-input');
    });

    test('should get selectors for Windsurf IDE', () => {
      const selectors = IDESelectorManager.getSelectors('windsurf');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('chat-input');
    });

    test('should get fallback selectors for unknown IDE', () => {
      const selectors = IDESelectorManager.getSelectors('unknown');
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.input).toContain('chat-input');
    });
  });

  describe('getFallbackSelectors', () => {
    test('should return fallback selectors', () => {
      const selectors = IDESelectorManager.getFallbackSelectors();
      expect(selectors).toBeDefined();
      expect(selectors.input).toBeDefined();
      expect(selectors.sendButton).toBeDefined();
      expect(selectors.messagesContainer).toBeDefined();
    });
  });

  describe('hasSelectors', () => {
    test('should return true for supported IDE types', () => {
      expect(IDESelectorManager.hasSelectors('cursor')).toBe(true);
      expect(IDESelectorManager.hasSelectors('vscode')).toBe(true);
      expect(IDESelectorManager.hasSelectors('windsurf')).toBe(true);
    });

    test('should return false for unsupported IDE types', () => {
      expect(IDESelectorManager.hasSelectors('unknown')).toBe(false);
      expect(IDESelectorManager.hasSelectors('invalid')).toBe(false);
    });
  });

  describe('getSupportedIDETypes', () => {
    test('should return array of supported IDE types', () => {
      const supportedTypes = IDESelectorManager.getSupportedIDETypes();
      expect(Array.isArray(supportedTypes)).toBe(true);
      expect(supportedTypes).toContain('cursor');
      expect(supportedTypes).toContain('vscode');
      expect(supportedTypes).toContain('windsurf');
    });
  });

  describe('getSelector', () => {
    test('should get specific selector for Cursor IDE', () => {
      const inputSelector = IDESelectorManager.getSelector('cursor', 'input');
      expect(inputSelector).toBeDefined();
      expect(inputSelector).toContain('aislash-editor-input');
    });

    test('should get specific selector for VSCode IDE', () => {
      const inputSelector = IDESelectorManager.getSelector('vscode', 'input');
      expect(inputSelector).toBeDefined();
      expect(inputSelector).toContain('chat-input');
    });

    test('should return null for non-existent selector', () => {
      const selector = IDESelectorManager.getSelector('cursor', 'nonexistent');
      expect(selector).toBeNull();
    });
  });
}); 