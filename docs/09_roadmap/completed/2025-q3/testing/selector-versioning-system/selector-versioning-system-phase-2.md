# Selector Versioning System – Phase 2: IDETypes Restructure

## Overview
Restructure the IDETypes.js file to organize selectors by IDE version instead of having hardcoded selectors. This phase moves the existing selectors into a version-based structure while maintaining backward compatibility.

## Objectives
- [ ] Restructure IDETypes.js to organize selectors by IDE version
- [ ] Move current selectors to version-specific structure
- [ ] Add version mapping for each IDE type
- [ ] Maintain backward compatibility

## Deliverables

### Core Files
- [ ] File: `backend/domain/services/ide/IDETypes.js` - Restructured with version-based selectors
- [ ] File: `backend/domain/services/ide/IDESelectorManager.js` - Updated to use versioned selectors

### Testing
- [ ] File: `tests/unit/ide/IDETypes.test.js` - Test version-based selector loading
- [ ] File: `tests/unit/ide/IDESelectorManager.test.js` - Test selector manager with versions

## Dependencies
- Requires: Phase 1 (IDE Version Detection) completion
- Blocks: Phase 3 (SelectorVersionManager)

## Estimated Time
2 hours

## Success Criteria
- [ ] IDETypes.js restructured with version-based selectors
- [ ] Current selectors moved to version-specific structure
- [ ] Backward compatibility maintained
- [ ] Version mapping works correctly
- [ ] Unit tests pass with 90% coverage

## Implementation Details

### 1. IDETypes.js Restructure
```javascript
// Before: Hardcoded selectors
static METADATA = {
  [IDETypes.CURSOR]: {
    name: 'Cursor',
    displayName: 'Cursor IDE',
    description: 'AI-powered code editor',
    supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
    fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
    startupCommand: 'cursor',
    detectionPatterns: ['cursor', 'Cursor'],
    chatSelectors: {
      input: '.aislash-editor-input[contenteditable="true"]',
      inputContainer: '.aislash-editor-container',
      userMessages: 'div.aislash-editor-input-readonly[contenteditable="false"]',
      aiMessages: 'span.anysphere-markdown-container-root',
      // ... other selectors
    }
  }
}

// After: Version-based selectors
static METADATA = {
  [IDETypes.CURSOR]: {
    name: 'Cursor',
    displayName: 'Cursor IDE',
    description: 'AI-powered code editor',
    supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
    fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
    startupCommand: 'cursor',
    detectionPatterns: ['cursor', 'Cursor'],
    latestVersion: '0.42.0',
    versions: {
      '0.42.0': {
        chatSelectors: {
          input: '.aislash-editor-input[contenteditable="true"]',
          inputContainer: '.aislash-editor-container',
          userMessages: 'div.aislash-editor-input-readonly[contenteditable="false"]',
          aiMessages: 'span.anysphere-markdown-container-root',
          messagesContainer: 'div[style*="display: flex; flex-direction: column"]',
          chatContainer: '.aislash-container',
          isActive: '.aislash-container',
          isInputReady: '.aislash-editor-input[contenteditable="true"]',
          codeBlocks: '.composer-code-block-container',
          codeBlockContent: '.composer-code-block-content',
          codeBlockHeader: '.composer-code-block-header',
          codeBlockFilename: '.composer-code-block-filename',
          codeBlockLanguage: '.composer-code-block-file-info .javascript-lang-file-icon',
          monacoEditor: '.monaco-editor',
          codeLines: '.view-line, .view-lines .view-line, span[class*="mtk"]',
          syntaxTokens: '.mtk1, .mtk4, .mtk14, .mtk18',
          codeBlockApplyButton: '.anysphere-text-button',
          inlineCode: 'code:not(pre code)',
          codeSpans: 'span[class*="code"]',
          syntaxClasses: {
            keyword: '.mtk1',
            string: '.mtk4',
            comment: '.mtk14',
            function: '.mtk18'
          }
        }
      },
      '0.43.0': {
        chatSelectors: {
          input: '.aislash-editor-input[contenteditable="true"]',
          inputContainer: '.aislash-editor-container',
          userMessages: 'div.aislash-editor-input-readonly[contenteditable="false"]',
          aiMessages: 'span.anysphere-markdown-container-root',
          messagesContainer: 'div[style*="display: flex; flex-direction: column"]',
          chatContainer: '.aislash-container',
          isActive: '.aislash-container',
          isInputReady: '.aislash-editor-input[contenteditable="true"]',
          codeBlocks: '.composer-code-block-container',
          codeBlockContent: '.composer-code-block-content',
          codeBlockHeader: '.composer-code-block-header',
          codeBlockFilename: '.composer-code-block-filename',
          codeBlockLanguage: '.composer-code-block-file-info .javascript-lang-file-icon',
          monacoEditor: '.monaco-editor',
          codeLines: '.view-line, .view-lines .view-line, span[class*="mtk"]',
          syntaxTokens: '.mtk1, .mtk4, .mtk14, .mtk18',
          codeBlockApplyButton: '.anysphere-text-button',
          inlineCode: 'code:not(pre code)',
          codeSpans: 'span[class*="code"]',
          syntaxClasses: {
            keyword: '.mtk1',
            string: '.mtk4',
            comment: '.mtk14',
            function: '.mtk18'
          }
        }
      }
    }
  },
  [IDETypes.VSCODE]: {
    name: 'VSCode',
    displayName: 'Visual Studio Code',
    description: 'Lightweight code editor',
    supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
    fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
    startupCommand: 'code',
    detectionPatterns: ['vscode', 'VSCode', 'code'],
    latestVersion: '1.85.0',
    versions: {
      '1.85.0': {
        chatSelectors: {
          input: 'textarea[data-testid="chat-input"], textarea[placeholder*="Copilot"], .chat-input-textarea',
          inputContainer: '.chat-input-container, .chat-editor-container',
          userMessages: '.interactive-item-container.interactive-request .value .rendered-markdown',
          aiMessages: '.interactive-item-container.interactive-response .value .rendered-markdown',
          messagesContainer: '.monaco-list-rows',
          chatContainer: '.chat-container, .interactive-session',
          isActive: '.chat-container, .interactive-session',
          isInputReady: 'textarea[data-testid="chat-input"]:not([disabled])',
          messageRows: '.monaco-list-row',
          userMessageRow: '.monaco-list-row .interactive-request',
          aiMessageRow: '.monaco-list-row .interactive-response'
        }
      }
    }
  },
  [IDETypes.WINDSURF]: {
    name: 'Windsurf',
    displayName: 'Windsurf IDE',
    description: 'Modern development environment',
    supportedFeatures: ['chat', 'refactoring', 'terminal', 'git'],
    fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
    startupCommand: 'windsurf',
    detectionPatterns: ['windsurf', 'Windsurf'],
    latestVersion: '1.0.0',
    versions: {
      '1.0.0': {
        chatSelectors: {
          input: '[data-testid="chat-input"]',
          inputContainer: '[data-testid="chat-container"]',
          userMessages: '[data-testid="user-message"]',
          aiMessages: '[data-testid="ai-message"]',
          messagesContainer: '[data-testid="chat-messages"]',
          chatContainer: '[data-testid="chat-panel"]',
          isActive: '[data-testid="chat-panel"]',
          isInputReady: '[data-testid="chat-input"]:not([disabled])'
        }
      }
    }
  }
};
```

### 2. New Methods in IDETypes
```javascript
/**
 * Get selectors for specific IDE type and version
 * @param {string} type - IDE type
 * @param {string} version - IDE version
 * @returns {Object|null} Version-specific selectors
 */
static getSelectorsForVersion(type, version) {
  const metadata = IDETypes.getMetadata(type);
  if (!metadata || !metadata.versions) {
    return null;
  }
  
  // Try to get specific version
  if (metadata.versions[version]) {
    return metadata.versions[version];
  }
  
  // Fallback to latest version
  if (metadata.latestVersion && metadata.versions[metadata.latestVersion]) {
    return metadata.versions[metadata.latestVersion];
  }
  
  return null;
}

/**
 * Get latest version for IDE type
 * @param {string} type - IDE type
 * @returns {string|null} Latest version
 */
static getLatestVersion(type) {
  const metadata = IDETypes.getMetadata(type);
  return metadata ? metadata.latestVersion : null;
}

/**
 * Get all available versions for IDE type
 * @param {string} type - IDE type
 * @returns {Array<string>} Available versions
 */
static getAvailableVersions(type) {
  const metadata = IDETypes.getMetadata(type);
  if (!metadata || !metadata.versions) {
    return [];
  }
  
  return Object.keys(metadata.versions).sort();
}

/**
 * Check if version exists for IDE type
 * @param {string} type - IDE type
 * @param {string} version - IDE version
 * @returns {boolean} True if version exists
 */
static hasVersion(type, version) {
  const metadata = IDETypes.getMetadata(type);
  return metadata && metadata.versions && metadata.versions[version];
}
```

### 3. IDESelectorManager Update
```javascript
/**
 * Get selectors for a specific IDE type and version
 * @param {string} ideType - The IDE type (cursor, vscode, windsurf)
 * @param {string} version - The IDE version (optional)
 * @returns {Object} IDE-specific selectors
 */
static getSelectors(ideType, version = null) {
  try {
    // If version is specified, try to get version-specific selectors
    if (version) {
      const versionSelectors = IDETypes.getSelectorsForVersion(ideType, version);
      if (versionSelectors) {
        logger.info(`Retrieved selectors for ${ideType} IDE version ${version}`);
        return versionSelectors;
      }
    }
    
    // Fallback to latest version
    const latestVersion = IDETypes.getLatestVersion(ideType);
    if (latestVersion) {
      const latestSelectors = IDETypes.getSelectorsForVersion(ideType, latestVersion);
      if (latestSelectors) {
        logger.info(`Retrieved selectors for ${ideType} IDE latest version ${latestVersion}`);
        return latestSelectors;
      }
    }
    
    // Final fallback to hardcoded selectors (backward compatibility)
    const metadata = IDETypes.getMetadata(ideType);
    const selectors = metadata?.chatSelectors;
    
    if (selectors) {
      logger.warn(`Using fallback selectors for ${ideType} IDE`);
      return selectors;
    } else {
      logger.warn(`No selectors found for ${ideType} IDE, using generic fallback`);
      return this.getFallbackSelectors();
    }
  } catch (error) {
    logger.error(`Error getting selectors for ${ideType}:`, error.message);
    return this.getFallbackSelectors();
  }
}
```

### 4. Backward Compatibility
```javascript
/**
 * Get chat selectors for IDE type (backward compatibility)
 * @param {string} type - IDE type
 * @returns {Object|null} Chat selectors
 */
static getChatSelectors(type) {
  // Try to get from versioned structure first
  const versionSelectors = IDETypes.getSelectorsForVersion(type, IDETypes.getLatestVersion(type));
  if (versionSelectors && versionSelectors.chatSelectors) {
    return versionSelectors.chatSelectors;
  }
  
  // Fallback to old structure
  const metadata = IDETypes.getMetadata(type);
  return metadata ? metadata.chatSelectors : null;
}
```

## Testing Strategy
- Unit tests for version-based selector loading
- Test backward compatibility
- Test fallback mechanisms
- Test version validation
- Test error handling

## Risk Mitigation
- Maintain backward compatibility with existing code
- Comprehensive fallback mechanisms
- Thorough testing of all IDE types
- Graceful handling of missing versions
