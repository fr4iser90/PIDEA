# WebSocket vs HTTP Architecture Centralization – Phase 1: Backend WebSocket Centralization

## Overview
Centralize all WebSocket event broadcasting in the backend by creating a unified WebSocket event management system. This phase addresses the scattered event handling across multiple files and establishes a single point of control for all WebSocket communications.

## Objectives
- [ ] Create WebSocketEventManager for centralized event broadcasting
- [ ] Define WebSocketEventTypes with all event constants
- [ ] Refactor WebSocketManager to use centralized event system
- [ ] Update Application.js event handlers to use new system
- [ ] Update IDEController and IDEManager to use centralized broadcasting

## Deliverables
- File: `backend/infrastructure/websocket/WebSocketEventManager.js` - Centralized WebSocket event management
- File: `backend/infrastructure/websocket/WebSocketEventTypes.js` - Event type definitions and constants
- File: `backend/presentation/websocket/WebSocketManager.js` - Updated to use centralized system
- File: `backend/Application.js` - Updated event handlers
- File: `backend/presentation/api/ide/IDEController.js` - Updated to use centralized broadcasting
- File: `backend/infrastructure/external/ide/IDEManager.js` - Updated to use centralized broadcasting
- Test: `tests/unit/websocket/WebSocketEventManager.test.js` - Unit tests for event manager

## Dependencies
- Requires: Existing WebSocket infrastructure
- Blocks: Phase 2 start

## Estimated Time
4 hours

## Current State Analysis

### ✅ Existing Infrastructure
- `WebSocketManager.js` exists with `broadcastToAll()` method
- `Application.js` has event handlers for IDE and chat events
- `IDEController.js` publishes `activeIDEChanged` events
- `IDEManager.js` manages IDE state changes

### ❌ Problems Identified
- Events scattered across multiple files (Application.js, IDEController.js, IDEManager.js)
- No centralized event type management
- No standardized event structure
- Inconsistent event naming patterns
- No event validation or logging

### 🔧 Required Changes

#### 1. Create WebSocketEventManager
```javascript
// backend/infrastructure/websocket/WebSocketEventManager.js
class WebSocketEventManager {
  constructor(webSocketManager, logger) {
    this.webSocketManager = webSocketManager;
    this.logger = logger;
  }
  
  broadcast(eventType, data, options = {}) {
    // All WebSocket events go through here
    this.logger.info(`Broadcasting ${eventType} to all clients`);
    this.webSocketManager.broadcastToAll(eventType, {
      ...data,
      timestamp: new Date().toISOString(),
      ...options
    });
  }
  
  broadcastToUser(userId, eventType, data) {
    // User-specific broadcasts
    this.webSocketManager.broadcastToUser(userId, eventType, data);
  }
}
```

#### 2. Create WebSocketEventTypes
```javascript
// backend/infrastructure/websocket/WebSocketEventTypes.js
const WebSocketEvents = {
  IDE: {
    ACTIVE_CHANGED: 'activeIDEChanged',
    STATUS_CHANGED: 'ideStatusChanged',
    STARTED: 'ideStarted',
    STOPPED: 'ideStopped',
    LIST_UPDATED: 'ideListUpdated'
  },
  CHAT: {
    MESSAGE: 'chatMessage',
    HISTORY_UPDATED: 'chatHistoryUpdated',
    SESSION_CREATED: 'chatSessionCreated'
  },
  ANALYSIS: {
    STARTED: 'analysis:started',
    PROGRESS: 'analysis:progress',
    COMPLETED: 'analysis:completed',
    ERROR: 'analysis:error'
  },
  SYSTEM: {
    NOTIFICATION: 'notification',
    ERROR: 'error',
    USER_APP_DETECTED: 'userAppDetected'
  }
};
```

#### 3. Update IDEController
```javascript
// Replace direct eventBus.publish with centralized broadcasting
// OLD:
this.eventBus.publish('activeIDEChanged', data);

// NEW:
this.webSocketEventManager.broadcast(WebSocketEvents.IDE.ACTIVE_CHANGED, data);
```

#### 4. Update Application.js Event Handlers
```javascript
// Replace scattered event handlers with centralized system
// OLD:
this.eventBus.subscribe('ide-started', (data) => {
  this.webSocketManager.broadcastToUser('ide-started', data);
});

// NEW:
this.eventBus.subscribe('ide-started', (data) => {
  this.webSocketEventManager.broadcast(WebSocketEvents.IDE.STARTED, data);
});
```

## Success Criteria
- [ ] All WebSocket events go through WebSocketEventManager
- [ ] Event types are standardized and centralized
- [ ] No direct WebSocket broadcasting from controllers
- [ ] All existing functionality preserved
- [ ] Unit tests pass
- [ ] Event logging and validation implemented

## Risk Assessment
- **Medium Risk**: Breaking existing WebSocket functionality during refactoring
- **Mitigation**: Comprehensive testing and gradual migration
- **Rollback Plan**: Keep old event handlers as fallback during transition

## Testing Strategy
- Unit tests for WebSocketEventManager
- Integration tests for event broadcasting
- Verify all existing events still work
- Test error handling and validation

## Next Phase Dependencies
- Phase 2 requires this centralized backend system
- Frontend will need to handle standardized event types
- Event type definitions must be shared between backend and frontend 