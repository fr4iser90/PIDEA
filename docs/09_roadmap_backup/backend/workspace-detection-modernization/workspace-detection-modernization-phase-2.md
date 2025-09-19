# Workspace Detection Modernization – Phase 2: Core CDP Detection Services

## Overview
Implement the core CDP-based workspace and Git detection services. This phase creates the main detection logic using CDP to extract workspace information directly from IDE DOM, eliminating the need for terminal-based detection.

## Objectives
- [ ] Implement CDPWorkspaceDetector using find-workspace.js logic
- [ ] Implement CDPGitDetector using find-git.js logic
- [ ] Add comprehensive error handling and fallback mechanisms
- [ ] Implement caching for detected workspace information
- [ ] Add support for multiple IDE types (Cursor, VSCode, Windsurf)

## Deliverables
- File: `backend/domain/services/workspace/CDPWorkspaceDetector.js` - Complete CDP-based workspace detector
- File: `backend/domain/services/git/CDPGitDetector.js` - CDP-based Git information detector
- File: `backend/tests/unit/CDPWorkspaceDetector.test.js` - Unit tests for workspace detector
- File: `backend/tests/unit/CDPGitDetector.test.js` - Unit tests for Git detector
- Documentation: CDP detection patterns and IDE compatibility guide

## Dependencies
- Requires: Phase 1 (CDP Infrastructure Setup) completion
- Blocks: Phase 3 (Service Integration) start

## Estimated Time
6 hours

## Success Criteria
- [ ] CDPWorkspaceDetector successfully extracts workspace info from IDE title and DOM
- [ ] CDPGitDetector extracts Git repository information via CDP
- [ ] Caching system improves performance for subsequent detections
- [ ] Error handling provides graceful fallbacks to legacy system
- [ ] Support for Cursor, VSCode, and Windsurf IDEs
- [ ] Unit tests achieve 90% coverage
- [ ] Performance target <2 seconds per detection met

## Technical Implementation Details

### CDPWorkspaceDetector Implementation
```javascript
class CDPWorkspaceDetector {
  constructor(cdpConnectionManager) {
    this.cdpManager = cdpConnectionManager;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  async detectWorkspace(port) {
    const cacheKey = `workspace-${port}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    // Extract workspace from page title (from find-workspace.js)
    const { page } = await this.cdpManager.getWorkspaceConnection(port);
    const pageTitle = await page.evaluate(() => document.title);
    const titleMatch = pageTitle.match(/([^-]+)\s*-\s*Cursor/);
    
    if (titleMatch) {
      const workspaceName = titleMatch[1].trim();
      const workspacePath = await this.findWorkspacePath(workspaceName);
      
      const result = { workspacePath, workspaceName, port };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
    
    return null;
  }
}
```

### CDPGitDetector Implementation
```javascript
class CDPGitDetector {
  constructor(cdpConnectionManager) {
    this.cdpManager = cdpConnectionManager;
  }
  
  async detectGitInfo(port, workspacePath) {
    const { page } = await this.cdpManager.getWorkspaceConnection(port);
    
    // Extract Git info from VS Code API
    const gitInfo = await page.evaluate(() => {
      if (window.vscode && window.vscode.extensions) {
        const gitExtension = window.vscode.extensions.getExtension('vscode.git');
        if (gitExtension && gitExtension.exports) {
          const git = gitExtension.exports.getAPI(1);
          if (git && git.repositories && git.repositories.length > 0) {
            const repo = git.repositories[0];
            return {
              root: repo.rootUri?.fsPath,
              state: repo.state,
              head: repo.state.head?.name,
              remotes: repo.state.remotes?.map(r => ({ name: r.name, fetchUrl: r.fetchUrl }))
            };
          }
        }
      }
      return null;
    });
    
    return gitInfo;
  }
}
```

### Caching Strategy
- TTL-based caching with 5-minute expiration
- Cache invalidation on IDE restart
- Memory-efficient cache cleanup
- Cache hit/miss monitoring

### IDE Compatibility
- **Cursor**: Extract from page title pattern `([^-]+)\s*-\s*Cursor`
- **VSCode**: Use VS Code API workspace folders
- **Windsurf**: Adapt title pattern for Windsurf-specific format

### Error Handling
- Graceful fallback to legacy FileBasedWorkspaceDetector
- Comprehensive error logging
- Retry logic for transient failures
- Connection health monitoring

## Risk Mitigation
- **IDE Compatibility Issues**: Extensive testing with different IDE versions
- **Performance Degradation**: Implement caching and connection reuse
- **Detection Failures**: Robust fallback mechanisms to legacy system
