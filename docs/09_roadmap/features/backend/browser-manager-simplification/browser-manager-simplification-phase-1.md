# BrowserManager Architecture Simplification – Phase 1: BrowserManager Enhancement

## Overview
Enhance BrowserManager with IDE detection and IDE-specific selectors to eliminate the need for separate IDE services for chat functionality.

## Objectives
- [x] Add IDE detection based on port ranges to BrowserManager
- [x] Integrate IDETypes.js selectors into BrowserManager
- [x] Update typeMessage method with IDE-specific logic
- [x] Add IDE-specific send methods (Enter vs Send button)
- [x] Add comprehensive error handling and logging

## Deliverables
- File: `backend/infrastructure/external/BrowserManager.js` - Enhanced with IDE detection and specific selectors
- File: `backend/domain/services/ide/IDESelectorManager.js` - Centralized IDE selector management
- Test: `tests/unit/BrowserManager.test.js` - IDE detection and selector tests
- Documentation: Updated BrowserManager API documentation

## Dependencies
- Requires: Existing IDETypes.js with IDE-specific selectors
- Blocks: Phase 2 - Step System Updates

## Estimated Time
3 hours

## Success Criteria
- [x] BrowserManager can detect IDE type based on port
- [x] BrowserManager uses IDE-specific selectors from IDETypes.js
- [x] Message sending works with all IDE types (Cursor, VSCode, Windsurf)
- [x] Error handling includes fallback to default selectors
- [x] Comprehensive logging for debugging
- [x] Unit tests pass with 90%+ coverage

## Implementation Details

### Current State Analysis
The current BrowserManager already has comprehensive IDE detection and selector logic in the `typeMessage` method:
```javascript
// Current implementation in BrowserManager.js lines 700-720
const currentPort = this.getCurrentPort();
let ideType = 'cursor'; // default

if (currentPort >= 9222 && currentPort <= 9231) {
  ideType = 'cursor';
} else if (currentPort >= 9232 && currentPort <= 9241) {
  ideType = 'vscode';
} else if (currentPort >= 9242 && currentPort <= 9251) {
  ideType = 'windsurf';
}

// Get IDE-specific selectors
const IDETypes = require('@services/ide/IDETypes');
const ideMetadata = IDETypes.getMetadata(ideType);
const chatSelectors = ideMetadata?.chatSelectors;
```

### Required Changes

#### 1. Extract IDE Detection to Separate Method
```javascript
async detectIDEType(port) {
  if (port >= 9222 && port <= 9231) return 'cursor';
  if (port >= 9232 && port <= 9241) return 'vscode';
  if (port >= 9242 && port <= 9251) return 'windsurf';
  return 'cursor'; // default fallback
}
```

#### 2. Create IDESelectorManager
```javascript
// backend/domain/services/ide/IDESelectorManager.js
class IDESelectorManager {
  static getSelectors(ideType) {
    const IDETypes = require('./IDETypes');
    const metadata = IDETypes.getMetadata(ideType);
    return metadata?.chatSelectors || this.getFallbackSelectors();
  }
  
  static getFallbackSelectors() {
    return {
      input: 'textarea[data-testid="chat-input"]',
      sendButton: 'button[aria-label*="Send"]',
      messagesContainer: '.chat-container'
    };
  }
}
```

#### 3. Refactor typeMessage Method
```javascript
async typeMessage(message, send = true) {
  try {
    const page = await this.getPage();
    if (!page) {
      throw new Error('No connection to IDE');
    }

    const currentPort = this.getCurrentPort();
    const ideType = await this.detectIDEType(currentPort);
    const selectors = IDESelectorManager.getSelectors(ideType);
    
    logger.info(`Detected IDE type: ${ideType} on port ${currentPort}`);
    logger.info(`Using selectors for ${ideType}:`, selectors);

    // Use IDE-specific selectors and send methods
    // ... implementation details
  } catch (error) {
    logger.error('Error typing message:', error.message);
    return false;
  }
}
```

### Files to Modify
- `backend/infrastructure/external/BrowserManager.js` - Add IDE detection and selector integration
- `backend/domain/services/ide/IDESelectorManager.js` - Create new file for selector management

### Files to Create
- `backend/domain/services/ide/IDESelectorManager.js` - Centralized IDE selector management

### Testing Strategy
- Unit tests for IDE detection accuracy
- Unit tests for selector retrieval
- Integration tests for message sending with different IDEs
- Error handling tests for fallback scenarios

### Risk Mitigation
- Fallback to default selectors if IDE detection fails
- Extensive logging for debugging
- Graceful error handling with meaningful error messages
- Backward compatibility with existing functionality

## Validation Checklist
- [ ] IDE detection works for all port ranges
- [ ] Selectors are correctly retrieved from IDETypes.js
- [ ] Message sending works with Cursor IDE
- [ ] Message sending works with VSCode IDE
- [ ] Message sending works with Windsurf IDE
- [ ] Error handling includes fallback mechanisms
- [ ] Logging provides sufficient debugging information
- [ ] Unit tests pass with 90%+ coverage
- [ ] No regression in existing functionality 