# Phase 1: Eliminate Double Switching

## Overview
Remove redundant `browserManager.switchToPort()` calls from IDE services to eliminate the double switching problem that causes 6-12 second delays during IDE switching.

## Objectives
- [ ] Remove redundant `browserManager.switchToPort()` calls from IDE services
- [ ] Update IDE services to only call `ideManager.switchToIDE()`
- [ ] Ensure IDEManager handles all browser switching internally
- [ ] Add performance logging to track switching times

## Deliverables
- File: `backend/domain/services/ide/CursorIDEService.js` - Updated to eliminate double switching
- File: `backend/domain/services/ide/VSCodeService.js` - Updated to eliminate double switching
- File: `backend/domain/services/ide/WindsurfIDEService.js` - Updated to eliminate double switching
- File: `backend/infrastructure/external/ide/IDEManager.js` - Optimized switchToIDE method
- Test: `tests/unit/domain/services/ide/IDEServiceSwitching.test.js` - Unit tests for switching logic

## Dependencies
- Requires: None (standalone optimization)
- Blocks: Phase 2 - Request Deduplication

## Estimated Time
1 hour

## Success Criteria
- [ ] No double switching calls detected in IDE services
- [ ] IDE switching time reduced from 6-12s to <2s
- [ ] All existing functionality preserved
- [ ] Unit tests pass
- [ ] Performance logging implemented

## Implementation Details

### Current Problem Analysis
The current IDE services have this problematic pattern:
```javascript
// Current problematic code in IDE services
async switchToPort(port) {
  await this.browserManager.switchToPort(port); // First call - 3-6 seconds
  await this.ideManager.switchToIDE(port); // Second call - also calls browserManager.switchToPort() - 3-6 seconds
}
```

This results in:
- **Double browser switching**: 6-12 seconds total
- **Redundant operations**: Same port switched twice
- **Performance bottleneck**: Primary cause of slow IDE switching

### Solution Architecture
```javascript
// Optimized code - only call ideManager
async switchToPort(port) {
  // Single call - ideManager handles browser switching internally
  await this.ideManager.switchToIDE(port);
}
```

### File Changes Required

#### 1. CursorIDEService.js
**Current Location**: `backend/domain/services/ide/CursorIDEService.js`
**Lines to Modify**: 201-231 (switchToPort method)

**Before**:
```javascript
async switchToPort(port) {
  const currentActivePort = this.getActivePort();
  logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
  
  if (currentActivePort === port) {
    logger.info(`Already connected to port ${port}`);
    return;
  }
  
  logger.info(`Switching to port ${port} using pooled connections...`);
  
  try {
    const start = process.hrtime.bigint();
    // Use BrowserManager's pooled connection
    await this.browserManager.switchToPort(port); // REMOVE THIS LINE
    const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
    
    // Update IDE manager state (no redundant browser switching)
    if (this.ideManager.switchToIDE) {
      logger.info(`Updating IDE manager state for port ${port}`);
      await this.ideManager.switchToIDE(port);
    }
    
    logger.info(`Successfully switched to port ${port} in ${duration.toFixed(2)}ms`);
  } catch (error) {
    logger.error(`Failed to switch to port ${port}:`, error.message);
    throw error;
  }
}
```

**After**:
```javascript
async switchToPort(port) {
  const currentActivePort = this.getActivePort();
  logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
  
  if (currentActivePort === port) {
    logger.info(`Already connected to port ${port}`);
    return;
  }
  
  logger.info(`Switching to port ${port} via IDE manager...`);
  
  try {
    const start = process.hrtime.bigint();
    
    // Single call - IDE manager handles browser switching internally
    await this.ideManager.switchToIDE(port);
    
    const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
    logger.info(`Successfully switched to port ${port} in ${duration.toFixed(2)}ms`);
  } catch (error) {
    logger.error(`Failed to switch to port ${port}:`, error.message);
    throw error;
  }
}
```

#### 2. VSCodeService.js
**Current Location**: `backend/domain/services/ide/VSCodeService.js`
**Lines to Modify**: 201-231 (switchToPort method)

**Same changes as CursorIDEService.js**

#### 3. WindsurfIDEService.js
**Current Location**: `backend/domain/services/ide/WindsurfIDEService.js`
**Lines to Modify**: 201-231 (switchToPort method)

**Same changes as CursorIDEService.js**

#### 4. IDEManager.js
**Current Location**: `backend/infrastructure/external/ide/IDEManager.js`
**Lines to Modify**: 254-305 (switchToIDE method)

**Before**:
```javascript
async switchToIDE(port) {
  if (!this.initialized) {
    await this.initialize();
  }

  logger.info(`Switching to IDE on port ${port}`);
  
  // Use port manager to validate and set active port
  const success = await this.portManager.setActivePort(port);
  if (!success) {
    throw new Error(`Failed to switch to IDE on port ${port}`);
  }
  
  // Update local state
  this.activePort = this.portManager.getActivePort();
  
  // Update the active status in ideStatus map
  if (this.ideStatus.has(port)) {
    // Set all IDEs as inactive first
    for (const [idePort] of this.ideStatus) {
      this.ideStatus.set(idePort, 'running');
    }
    // Set the target IDE as active
    this.ideStatus.set(port, 'active');
  }
  
  // Switch browser manager to the new port
  if (this.browserManager) {
    try {
      await this.browserManager.switchToPort(port);
      logger.info(`Browser manager switched to port ${port}`);
    } catch (error) {
      logger.warn('Failed to switch browser manager to port', port, ':', error.message);
    }
  }
  
  logger.info(`Successfully switched to IDE on port ${port}`);
  
  return {
    port: port,
    status: 'active',
    workspacePath: this.ideWorkspaces.get(port) || null,
    previousPort: this.activePort
  };
}
```

**After**:
```javascript
async switchToIDE(port) {
  if (!this.initialized) {
    await this.initialize();
  }

  logger.info(`Switching to IDE on port ${port}`);
  
  // Check if already on correct port
  if (this.activePort === port) {
    logger.info(`Already active on port ${port}`);
    return {
      port: port,
      status: 'active',
      alreadyActive: true,
      workspacePath: this.ideWorkspaces.get(port) || null
    };
  }
  
  const start = process.hrtime.bigint();
  
  // Use port manager to validate and set active port
  const success = await this.portManager.setActivePort(port);
  if (!success) {
    throw new Error(`Failed to switch to IDE on port ${port}`);
  }
  
  // Update local state
  this.activePort = this.portManager.getActivePort();
  
  // Update the active status in ideStatus map
  if (this.ideStatus.has(port)) {
    // Set all IDEs as inactive first
    for (const [idePort] of this.ideStatus) {
      this.ideStatus.set(idePort, 'running');
    }
    // Set the target IDE as active
    this.ideStatus.set(port, 'active');
  }
  
  // Switch browser manager to the new port (only if necessary)
  if (this.browserManager) {
    try {
      const currentBrowserPort = this.browserManager.getCurrentPort();
      if (currentBrowserPort !== port) {
        logger.info(`Switching browser manager from port ${currentBrowserPort} to ${port}`);
        await this.browserManager.switchToPort(port);
        logger.info(`Browser manager switched to port ${port}`);
      } else {
        logger.info(`Browser manager already on port ${port}`);
      }
    } catch (error) {
      logger.warn('Failed to switch browser manager to port', port, ':', error.message);
    }
  }
  
  const duration = Number(process.hrtime.bigint() - start) / 1000; // Convert to milliseconds
  logger.info(`Successfully switched to IDE on port ${port} in ${duration.toFixed(2)}ms`);
  
  return {
    port: port,
    status: 'active',
    workspacePath: this.ideWorkspaces.get(port) || null,
    previousPort: this.activePort,
    switchTime: duration
  };
}
```

### Performance Benefits
- **Before**: 6-12 seconds per IDE switch (double switching)
- **After**: <2 seconds per IDE switch (single switching)
- **Improvement**: 70-80% performance improvement
- **Memory**: No additional memory usage
- **Reliability**: Reduced failure points

### Testing Strategy

#### Unit Tests
**File**: `tests/unit/domain/services/ide/IDEServiceSwitching.test.js`

```javascript
describe('IDE Service Switching', () => {
  test('should not call browserManager.switchToPort() directly', async () => {
    const mockBrowserManager = {
      switchToPort: jest.fn()
    };
    const mockIDEManager = {
      switchToIDE: jest.fn().mockResolvedValue({ success: true })
    };
    
    const cursorService = new CursorIDEService(mockBrowserManager, mockIDEManager);
    
    await cursorService.switchToPort(9222);
    
    // Should NOT call browserManager.switchToPort directly
    expect(mockBrowserManager.switchToPort).not.toHaveBeenCalled();
    
    // Should call ideManager.switchToIDE
    expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(9222);
  });
  
  test('should handle already active port efficiently', async () => {
    const mockIDEManager = {
      switchToIDE: jest.fn().mockResolvedValue({ 
        success: true, 
        alreadyActive: true,
        switchTime: 5 
      })
    };
    
    const cursorService = new CursorIDEService(null, mockIDEManager);
    
    const result = await cursorService.switchToPort(9222);
    
    expect(mockIDEManager.switchToIDE).toHaveBeenCalledWith(9222);
    expect(result).toBeDefined();
  });
});
```

#### Performance Tests
**File**: `tests/performance/IDESwitching.test.js`

```javascript
describe('IDE Switching Performance', () => {
  test('should complete switch in under 2 seconds', async () => {
    const start = Date.now();
    
    await cursorService.switchToPort(9222);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000); // Under 2 seconds
  });
  
  test('should handle rapid switches efficiently', async () => {
    const ports = [9222, 9223, 9224, 9222];
    const switchTimes = [];
    
    for (const port of ports) {
      const start = Date.now();
      await cursorService.switchToPort(port);
      const duration = Date.now() - start;
      switchTimes.push(duration);
    }
    
    // All switches should be under 2 seconds
    switchTimes.forEach(time => {
      expect(time).toBeLessThan(2000);
    });
    
    // Average should be under 1 second
    const average = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    expect(average).toBeLessThan(1000);
  });
});
```

### Validation Steps
1. **Code Review**: Verify no direct `browserManager.switchToPort()` calls in IDE services
2. **Performance Testing**: Confirm switching time <2 seconds
3. **Functionality Testing**: Ensure all IDE switching still works
4. **Logging Verification**: Check performance logs show improvement
5. **Integration Testing**: Test with multiple IDE instances

### Rollback Plan
If issues arise:
1. Revert IDE service changes to original implementation
2. Restore IDEManager.switchToIDE() to previous logic
3. Disable performance logging if causing issues
4. Communicate performance regression to stakeholders

### Success Metrics
- [ ] No `browserManager.switchToPort()` calls in IDE services
- [ ] IDE switching time <2 seconds (from 6-12 seconds)
- [ ] All unit tests pass
- [ ] Performance logs show improvement
- [ ] No breaking changes to existing functionality 