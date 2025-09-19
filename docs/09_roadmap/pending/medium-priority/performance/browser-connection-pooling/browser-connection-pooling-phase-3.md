# Browser Connection Pooling – Phase 3: IDE Service Updates

## Overview
Update all IDE services (CursorIDEService, VSCodeIDEService, WindsurfIDEService) to use pooled connections from BrowserManager, removing redundant connection switching logic and improving performance.

## Objectives
- [ ] Update CursorIDEService to use pooled connections
- [ ] Update VSCodeIDEService to use pooled connections
- [ ] Update WindsurfIDEService to use pooled connections
- [ ] Remove redundant connection switching logic

## Deliverables
- File: `backend/domain/services/ide/CursorIDEService.js` - Updated to use pooled connections
- File: `backend/domain/services/ide/VSCodeIDEService.js` - Updated to use pooled connections
- File: `backend/domain/services/ide/WindsurfIDEService.js` - Updated to use pooled connections
- Test: `tests/unit/domain/services/ide/IDEServices.test.js` - Updated unit tests

## Dependencies
- Requires: Phase 2 - BrowserManager Integration completion
- Blocks: Phase 4 - Testing & Optimization

## Estimated Time
1 hour

## Success Criteria
- [ ] All IDE services use BrowserManager's pooled connections
- [ ] Redundant connection switching logic removed
- [ ] IDE switching performance improved by 95%+
- [ ] All existing functionality preserved
- [ ] Unit tests pass
- [ ] No connection leaks or memory issues

## Implementation Details

### Current State Analysis
All IDE services currently have redundant connection switching logic:

```javascript
// Current CursorIDEService.js lines 199-219
async switchToPort(port) {
  const currentActivePort = this.getActivePort();
  logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
  
  if (currentActivePort === port) {
    logger.info(`Already connected to port ${port}`);
    return;
  }
  
  logger.info(`Switching to port ${port}`);
  await this.browserManager.switchToPort(port); // This was slow (6s)
  
  // Update active port in IDE manager
  if (this.ideManager.switchToIDE) {
    logger.info(`Calling ideManager.switchToIDE(${port})`);
    await this.ideManager.switchToIDE(port); // This also calls browserManager.switchToPort
    logger.info(`ideManager.switchToIDE(${port}) completed`);
  }
}
```

**Issues Identified**:
1. **Double Switching**: IDE services call `browserManager.switchToPort()` then `ideManager.switchToIDE()` which calls it again
2. **Redundant Logic**: Each service implements similar connection switching
3. **Performance Impact**: Multiple 6-second delays during IDE switching

### New IDE Service Architecture
```javascript
// Updated CursorIDEService.js
class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager; // Now uses ConnectionPool internally
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    
    // Initialize separated services
    this.terminalMonitor = new TerminalMonitor(browserManager, eventBus);
    this.packageJsonAnalyzer = new PackageJsonAnalyzer(eventBus);
    this.workspacePathDetector = new WorkspacePathDetector(browserManager, ideManager);
    this.chatHistoryExtractor = new ChatHistoryExtractor(browserManager);
  }

  async switchToPort(port) {
    const currentActivePort = this.getActivePort();
    logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
    
    if (currentActivePort === port) {
      logger.info(`Already connected to port ${port}`);
      return;
    }
    
    logger.info(`Switching to port ${port} using pooled connections...`);
    
    // Use BrowserManager's pooled connection (now <100ms)
    await this.browserManager.switchToPort(port);
    
    // Update IDE manager state (no redundant browser switching)
    if (this.ideManager.switchToIDE) {
      logger.info(`Updating IDE manager state for port ${port}`);
      await this.ideManager.switchToIDE(port);
    }
    
    logger.info(`Successfully switched to port ${port} in <100ms`);
  }
}
```

### Key Changes Required

#### 1. CursorIDEService Updates
- **switchToPort Method**: Use BrowserManager's pooled connections
- **switchToSession Method**: Leverage instant port switching
- **Event Listeners**: Update to use pooled connections
- **Error Handling**: Graceful fallback to connection creation

#### 2. VSCodeIDEService Updates
- **switchToPort Method**: Use BrowserManager's pooled connections
- **switchToSession Method**: Leverage instant port switching
- **Event Listeners**: Update to use pooled connections
- **Extension Management**: Maintain VSCode-specific functionality

#### 3. WindsurfIDEService Updates
- **switchToPort Method**: Use BrowserManager's pooled connections
- **switchToSession Method**: Leverage instant port switching
- **Event Listeners**: Update to use pooled connections
- **Windsurf Features**: Maintain Windsurf-specific functionality

### Performance Benefits
- **Before**: 6+ seconds per IDE switch (multiple disconnect/connect cycles)
- **After**: <100ms per IDE switch (instant pooled connection)
- **Reduced Complexity**: Single connection management point
- **Better Reliability**: Automatic connection health monitoring
- **Memory Efficiency**: Shared connection pool across all services

### Integration Points
- **IDEManager**: Will benefit from faster IDE service switching
- **Step System**: Will execute faster with instant IDE switching
- **API Controllers**: Will respond faster to IDE operations
- **Event System**: Will handle IDE changes more efficiently

## Technical Requirements
- **Response Time**: IDE service switching < 100ms
- **Backward Compatibility**: All existing API methods preserved
- **Error Recovery**: Automatic fallback to connection creation
- **Memory Usage**: Shared connection pool across services
- **Logging**: Comprehensive logging for debugging

## Testing Strategy
- **Unit Tests**: IDE service switching, connection management
- **Integration Tests**: Service interaction with BrowserManager
- **Performance Tests**: Before/after benchmarking
- **Mock Requirements**: ConnectionPool, BrowserManager

## Risk Mitigation
- **Service Dependencies**: Maintain backward compatibility
- **Connection Failures**: Automatic retry and fallback
- **Performance Regression**: Comprehensive benchmarking
- **Memory Leaks**: Shared connection pool management

## Migration Strategy
1. **Phase 1**: Update service constructors to use pooled BrowserManager
2. **Phase 2**: Refactor switchToPort methods to use pooled connections
3. **Phase 3**: Remove redundant connection switching logic
4. **Phase 4**: Update event listeners and error handling
5. **Phase 5**: Performance validation and optimization 