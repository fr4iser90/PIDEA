# BrowserManager Architecture Simplification – Phase 3: IDE Service Simplification

## Overview
Remove chat functionality from IDE services while preserving IDE-specific features like extensions, refactoring, and terminal management.

## Objectives
- [ ] Remove chat functionality from IDE services
- [ ] Keep IDE-specific features (extensions, refactoring, terminal)
- [ ] Update service dependencies in DI container
- [ ] Add deprecation warnings for removed methods

## Deliverables
- File: `backend/domain/services/CursorIDEService.js` - Remove chat functionality, keep IDE-specific features
- File: `backend/domain/services/VSCodeService.js` - Remove chat functionality, keep IDE-specific features
- File: `backend/domain/services/WindsurfIDEService.js` - Remove chat functionality, keep IDE-specific features
- File: `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Update service dependencies
- Documentation: Updated service documentation

## Dependencies
- Requires: Phase 2 - Step System Updates completion
- Blocks: Phase 4 - Testing & Validation

## Estimated Time
2 hours

## Success Criteria
- [ ] Chat functionality removed from IDE services
- [ ] IDE-specific features still work (extensions, refactoring, terminal)
- [ ] Service dependencies updated in DI container
- [ ] Deprecation warnings added for removed methods
- [ ] No breaking changes to existing IDE-specific functionality

## Implementation Details

### Current State Analysis
The current IDE services have chat functionality that creates infinite loops:
```javascript
// Current CursorIDEService.sendMessage() - creates infinite loop
async sendMessage(message, options = {}) {
  // ... port switching logic ...
  
  // This creates infinite loop - calls step which calls service
  const result = await stepRegistry.executeStep('IDESendMessageStep', stepData);
  
  return result;
}
```

### Required Changes

#### 1. Remove Chat Methods from CursorIDEService
```javascript
// backend/domain/services/CursorIDEService.js
class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null, stepRegistry = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.stepRegistry = stepRegistry;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager, 'cursor');
  }

  // REMOVE: sendMessage method - now handled by BrowserManager
  // REMOVE: extractChatHistory method - now handled by BrowserManager
  
  // KEEP: IDE-specific features
  async applyRefactoring(filePath, refactoredCode) {
    // IDE-specific refactoring logic
  }
  
  async monitorTerminalOutput() {
    // IDE-specific terminal monitoring
  }
  
  async getExtensions() {
    // IDE-specific extension management
  }
}
```

#### 2. Remove Chat Methods from VSCodeService
```javascript
// backend/domain/services/VSCodeService.js
class VSCodeIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.extensionManager = new VSCodeExtensionManager();
  }

  // REMOVE: sendMessage method - now handled by BrowserManager
  // REMOVE: extractChatHistory method - now handled by BrowserManager
  
  // KEEP: VSCode-specific features
  async getExtensions() {
    return await this.extensionManager.getExtensions();
  }
  
  async installExtension(extensionId) {
    return await this.extensionManager.installExtension(extensionId);
  }
}
```

#### 3. Remove Chat Methods from WindsurfIDEService
```javascript
// backend/domain/services/WindsurfIDEService.js
class WindsurfIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
  }

  // REMOVE: sendMessage method - now handled by BrowserManager
  // REMOVE: extractChatHistory method - now handled by BrowserManager
  
  // KEEP: Windsurf-specific features
  async getWindsurfFeatures() {
    // Windsurf-specific feature detection
  }
}
```

#### 4. Update Service Registry Dependencies
```javascript
// backend/infrastructure/dependency-injection/ServiceRegistry.js
// Update service registrations to remove stepRegistry dependency

// Legacy Cursor IDE service (for backward compatibility)
this.container.register('cursorIDEService', (browserManager, ideManager, eventBus) => {
  const CursorIDEService = require('@domain/services/CursorIDEService');
  return new CursorIDEService(browserManager, ideManager, eventBus); // Remove stepRegistry
}, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });

// VSCode IDE service
this.container.register('vscodeIDEService', (browserManager, ideManager, eventBus) => {
  const VSCodeIDEService = require('@domain/services/VSCodeService');
  return new VSCodeIDEService(browserManager, ideManager, eventBus);
}, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });

// Windsurf IDE service
this.container.register('windsurfIDEService', (browserManager, ideManager, eventBus) => {
  const WindsurfIDEService = require('@domain/services/WindsurfIDEService');
  return new WindsurfIDEService(browserManager, ideManager, eventBus);
}, { singleton: true, dependencies: ['browserManager', 'ideManager', 'eventBus'] });
```

#### 5. Add Deprecation Warnings
```javascript
// Add to each IDE service
class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    // ... existing constructor ...
    
    // Add deprecation warning
    console.warn('DEPRECATED: CursorIDEService.sendMessage() is deprecated. Use BrowserManager.typeMessage() or IDESendMessageStep instead.');
  }
  
  // Deprecated method with warning
  async sendMessage(message, options = {}) {
    console.warn('DEPRECATED: CursorIDEService.sendMessage() is deprecated. Use BrowserManager.typeMessage() or IDESendMessageStep instead.');
    throw new Error('sendMessage() - ChatMessageHandler removed, use IDE Steps instead');
  }
}
```

### Files to Modify
- `backend/domain/services/CursorIDEService.js` - Remove chat functionality, keep IDE-specific features
- `backend/domain/services/VSCodeService.js` - Remove chat functionality, keep IDE-specific features
- `backend/domain/services/WindsurfIDEService.js` - Remove chat functionality, keep IDE-specific features
- `backend/infrastructure/dependency-injection/ServiceRegistry.js` - Update service dependencies

### Files to Update
- `backend/application/handlers/categories/management/SendMessageHandler.js` - Update to use BrowserManager directly
- `backend/presentation/api/ide/IDEController.js` - Update to use BrowserManager directly

### Testing Strategy
- Unit tests for IDE-specific features (extensions, refactoring, terminal)
- Integration tests to ensure chat functionality is properly removed
- Error handling tests for deprecated methods
- Performance tests to ensure no regression

### Risk Mitigation
- Add deprecation warnings before removing methods
- Maintain backward compatibility for IDE-specific features
- Comprehensive testing of all IDE-specific functionality
- Clear documentation of changes

## Validation Checklist
- [ ] Chat functionality removed from IDE services
- [ ] IDE-specific features still work (extensions, refactoring, terminal)
- [ ] Service dependencies updated in DI container
- [ ] Deprecation warnings added for removed methods
- [ ] No breaking changes to existing IDE-specific functionality
- [ ] Integration tests pass
- [ ] Performance is maintained
- [ ] Documentation is updated 