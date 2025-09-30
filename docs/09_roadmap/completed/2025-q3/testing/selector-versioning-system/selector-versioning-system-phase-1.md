# Selector Versioning System – Phase 1: IDE Version Detection

## Overview
Ensure that IDE version detection works correctly for all supported IDEs (Cursor, VSCode, Windsurf). This phase focuses on making the existing `getVersion()` methods reliable and adding fallback mechanisms for version detection.

## Objectives
- [ ] Ensure IDE getVersion() methods work correctly
- [ ] Test version detection for Cursor, VSCode, Windsurf
- [ ] Add fallback version detection methods
- [ ] Validate version format consistency

## Deliverables

### IDE Implementation Updates
- [ ] File: `backend/domain/services/ide/implementations/CursorIDE.js` - Improve getVersion() method
- [ ] File: `backend/domain/services/ide/implementations/VSCodeIDE.js` - Improve getVersion() method
- [ ] File: `backend/domain/services/ide/implementations/WindsurfIDE.js` - Improve getVersion() method

### Testing
- [ ] File: `tests/unit/ide/CursorIDE.test.js` - Test version detection
- [ ] File: `tests/unit/ide/VSCodeIDE.test.js` - Test version detection
- [ ] File: `tests/unit/ide/WindsurfIDE.test.js` - Test version detection

## Dependencies
- Requires: Existing IDE implementations
- Blocks: Phase 2 (IDETypes Restructure)

## Estimated Time
1 hour

## Success Criteria
- [ ] All IDE getVersion() methods return correct version strings
- [ ] Version detection works reliably for all supported IDEs
- [ ] Fallback mechanisms work when version detection fails
- [ ] Version format is consistent across all IDEs
- [ ] Unit tests pass with 90% coverage

## Implementation Details

### 1. Cursor IDE Version Detection
```javascript
// In CursorIDE.js
async getVersion() {
  try {
    const page = await this.getPage();
    if (!page) {
      return 'unknown';
    }
    
    // Try multiple methods to get version
    const version = await page.evaluate(() => {
      // Method 1: Look for version in UI elements
      const versionElement = document.querySelector('[data-testid="version"]') ||
                           document.querySelector('.version') ||
                           document.querySelector('[title*="version"]') ||
                           document.querySelector('.status-bar-item[title*="version"]');
      
      if (versionElement) {
        return versionElement.textContent.trim();
      }
      
      // Method 2: Look in meta tags
      const metaVersion = document.querySelector('meta[name="cursor-version"]');
      if (metaVersion) {
        return metaVersion.content;
      }
      
      // Method 3: Look in window object
      if (window.cursor && window.cursor.version) {
        return window.cursor.version;
      }
      
      return 'unknown';
    });
    
    return version || 'unknown';
  } catch (error) {
    this.handleError(error, 'getVersion');
    return 'unknown';
  }
}
```

### 2. VSCode IDE Version Detection
```javascript
// In VSCodeIDE.js
async getVersion() {
  try {
    const page = await this.getPage();
    if (!page) {
      return 'unknown';
    }
    
    // Try multiple methods to get version
    const version = await page.evaluate(() => {
      // Method 1: Look for version in UI elements
      const versionElement = document.querySelector('[data-testid="version"]') ||
                           document.querySelector('.version') ||
                           document.querySelector('[title*="version"]') ||
                           document.querySelector('.status-bar-item[title*="version"]');
      
      if (versionElement) {
        return versionElement.textContent.trim();
      }
      
      // Method 2: Look in meta tags
      const metaVersion = document.querySelector('meta[name="vscode-version"]');
      if (metaVersion) {
        return metaVersion.content;
      }
      
      // Method 3: Look in window object
      if (window.vscode && window.vscode.version) {
        return window.vscode.version;
      }
      
      return 'unknown';
    });
    
    return version || 'unknown';
  } catch (error) {
    this.handleError(error, 'getVersion');
    return 'unknown';
  }
}
```

### 3. Windsurf IDE Version Detection
```javascript
// In WindsurfIDE.js
async getVersion() {
  try {
    const page = await this.browserManager.getPage();
    if (!page) {
      return 'unknown';
    }

    // Try multiple methods to get version
    const version = await page.evaluate(() => {
      // Method 1: Look for version in UI elements
      const versionElement = document.querySelector('[data-windsurf-version]') ||
                           document.querySelector('.windsurf-version') ||
                           document.querySelector('[title*="version"]');
      
      if (versionElement) {
        return versionElement.textContent.trim() || versionElement.getAttribute('data-windsurf-version');
      }
      
      // Method 2: Look in meta tags
      const metaVersion = document.querySelector('meta[name="windsurf-version"]');
      if (metaVersion) {
        return metaVersion.content;
      }
      
      // Method 3: Look in window object
      if (window.windsurf && window.windsurf.version) {
        return window.windsurf.version;
      }
      
      return 'unknown';
    });

    return version || 'unknown';
  } catch (error) {
    logger.error('Error getting version:', error);
    return 'unknown';
  }
}
```

### 4. Version Format Validation
```javascript
// Helper function to validate and normalize version format
function normalizeVersion(version) {
  if (!version || version === 'unknown') {
    return 'unknown';
  }
  
  // Remove any non-version characters
  const cleaned = version.replace(/[^0-9.]/g, '');
  
  // Ensure it's a valid semantic version
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  if (versionRegex.test(cleaned)) {
    return cleaned;
  }
  
  // Try to extract version from string
  const match = version.match(/(\d+\.\d+\.\d+)/);
  if (match) {
    return match[1];
  }
  
  return 'unknown';
}
```

### 5. Fallback Mechanisms
```javascript
// In each IDE implementation
async getVersionWithFallback() {
  // Try primary method
  let version = await this.getVersion();
  
  if (version === 'unknown') {
    // Try alternative methods
    version = await this.getVersionFromProcess();
  }
  
  if (version === 'unknown') {
    // Try environment variables
    version = await this.getVersionFromEnv();
  }
  
  if (version === 'unknown') {
    // Use default version
    version = this.getDefaultVersion();
  }
  
  return normalizeVersion(version);
}
```

## Testing Strategy
- Unit tests for each IDE's getVersion() method
- Mock page objects for testing
- Test fallback mechanisms
- Test version format validation
- Test error handling

## Risk Mitigation
- Multiple fallback methods for version detection
- Graceful handling of version detection failures
- Consistent version format across all IDEs
- Comprehensive error logging
