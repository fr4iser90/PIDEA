# IDE Switching Performance Optimization – Phase 1: Remove Double Browser Switching

## Overview
Remove the double browser switching issue in CursorIDE and VSCodeIDE services that causes 2-3 second delays per IDE switch. This is the root cause of performance degradation.

## Objectives
- [ ] Remove redundant browserManager.switchToPort() calls in CursorIDE.js
- [ ] Remove redundant browserManager.switchToPort() calls in VSCodeIDE.js
- [ ] Verify IDEManager.switchToIDE() handles browser switching correctly
- [ ] Test IDE switching performance improvement

## Deliverables
- File: `backend/domain/services/ide/implementations/CursorIDE.js` - Remove double switching
- File: `backend/domain/services/ide/implementations/VSCodeIDE.js` - Remove double switching
- Test: `tests/unit/domain/services/ide/CursorIDE.test.js` - Verify switching logic
- Test: `tests/unit/domain/services/ide/VSCodeIDE.test.js` - Verify switching logic

## Dependencies
- Requires: None (foundation phase)
- Blocks: Phase 2 - Request Deduplication Implementation

## Estimated Time
1 hour

## Success Criteria
- [ ] Double browser switching eliminated
- [ ] IDE switching performance improved by 50%
- [ ] No breaking changes to existing functionality
- [ ] Unit tests pass with 90%+ coverage
- [ ] Performance tests show <1 second switching time

## Implementation Details

### 1. CursorIDE.js Fix
**Location**: `backend/domain/services/ide/implementations/CursorIDE.js:193-235`

**Current Issue**:
```javascript
// PROBLEM: This calls browserManager.switchToPort() twice
async switchToPort(port) {
  // ... existing code ...
  
  // FIRST CALL: Direct browser switching
  await this.browserManager.switchToPort(port);
  
  // SECOND CALL: Through ideManager (which also calls browserManager)
  await this.ideManager.switchToIDE(port);
}
```

**Solution**:
```javascript
// FIX: Remove direct browser switching, let ideManager handle it
async switchToPort(port) {
  try {
    const currentActivePort = this.getActivePort();
    logger.info(`switchToPort(${port}) called, current active port:`, currentActivePort);
    
    if (currentActivePort === port) {
      logger.info(`Already connected to port ${port}`);
      return {
        success: true,
        port,
        message: 'Already connected to this port',
        timestamp: new Date()
      };
    }
    
    logger.info(`Switching to port ${port}`);
    
    // ONLY call ideManager - it handles browser switching internally
    if (this.ideManager.switchToIDE) {
      logger.info(`Calling ideManager.switchToIDE(${port})`);
      await this.ideManager.switchToIDE(port);
      logger.info(`ideManager.switchToIDE(${port}) completed`);
    }
    
    this.updateStatus('switched', { port, previousPort: currentActivePort });
    
    return {
      success: true,
      port,
      previousPort: currentActivePort,
      timestamp: new Date()
    };
  } catch (error) {
    return this.handleError(error, `switchToPort(${port})`);
  }
}
```

### 2. VSCodeIDE.js Fix
**Location**: `backend/domain/services/ide/implementations/VSCodeIDE.js:206-248`

**Apply same fix as CursorIDE.js**:
- Remove direct `this.browserManager.switchToPort(port)` call
- Keep only `this.ideManager.switchToIDE(port)` call
- Maintain error handling and logging

### 3. Verification
**Verify IDEManager.switchToIDE() handles browser switching**:
```javascript
// In IDEManager.js:250-317
async switchToIDE(port) {
  // ... existing validation code ...
  
  // Only switch browser manager if necessary
  if (this.browserManager && this.browserManager.getCurrentPort() !== port) {
    try {
      await this.browserManager.switchToPort(port);
      logger.info(`Browser manager switched to port ${port}`);
    } catch (error) {
      logger.warn('Failed to switch browser manager to port', port, ':', error.message);
    }
  } else {
    logger.info(`Browser manager already on port ${port}, no switching needed`);
  }
  
  // ... rest of method ...
}
```

## Testing Strategy

### Unit Tests
**File**: `tests/unit/domain/services/ide/CursorIDE.test.js`

**Test Cases**:
- [ ] `switchToPort()` calls ideManager.switchToIDE() only once
- [ ] `switchToPort()` does NOT call browserManager.switchToPort() directly
- [ ] `switchToPort()` returns correct response format
- [ ] `switchToPort()` handles errors properly

### Performance Tests
**File**: `tests/performance/ide-switching.test.js`

**Test Cases**:
- [ ] Single IDE switch completes in <1 second
- [ ] Multiple rapid switches don't cause delays
- [ ] Browser switching happens only once per switch
- [ ] No memory leaks from repeated switching

## Risk Assessment

### High Risk
- **Risk**: Removing browser switching breaks IDE connection
  - **Mitigation**: Comprehensive testing, verify IDEManager handles it correctly
  - **Rollback**: Revert changes if issues occur

### Medium Risk
- **Risk**: Performance improvement not as expected
  - **Mitigation**: Measure before/after performance
  - **Monitoring**: Track switching times in logs

### Low Risk
- **Risk**: Logging changes affect debugging
  - **Mitigation**: Maintain detailed logging in IDEManager

## Success Metrics
- **Performance**: IDE switching time reduced from 2-3 seconds to <1 second
- **Reliability**: No breaking changes to existing functionality
- **Code Quality**: Eliminated redundant code
- **Testing**: 90%+ test coverage maintained

## Next Phase Dependencies
This phase must be completed before Phase 2 (Request Deduplication) because:
1. Double switching elimination provides baseline performance improvement
2. Request deduplication builds on the optimized switching flow
3. Performance measurements need stable baseline

## Implementation Checklist
- [ ] Backup current CursorIDE.js and VSCodeIDE.js files
- [ ] Remove direct browserManager.switchToPort() calls
- [ ] Verify ideManager.switchToIDE() handles browser switching
- [ ] Update unit tests to reflect changes
- [ ] Run performance tests to measure improvement
- [ ] Update documentation if needed
- [ ] Commit changes with clear commit message 