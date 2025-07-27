# WebSocket vs HTTP Architecture Centralization – Phase 2: Frontend WebSocket Centralization

## Overview
Centralize WebSocket event handling in the frontend by creating a unified WebSocket event hub that properly receives and forwards events from the backend to local components. This phase addresses the missing WebSocket event listeners in IDEContext and improves the overall frontend event handling architecture.

## Objectives
- [ ] Create WebSocketEventHub for centralized event handling
- [ ] Define frontend WebSocketEventTypes (matching backend)
- [ ] Refactor WebSocketService to use centralized event system
- [ ] Update IDEContext to properly handle WebSocket events
- [ ] Add WebSocket connection management and error handling

## Deliverables
- File: `frontend/src/infrastructure/websocket/WebSocketEventHub.jsx` - Centralized frontend WebSocket event handling
- File: `frontend/src/infrastructure/websocket/WebSocketEventTypes.js` - Frontend event type definitions
- File: `frontend/src/infrastructure/services/WebSocketService.jsx` - Updated to use centralized event system
- File: `frontend/src/presentation/components/ide/IDEContext.jsx` - Updated to handle WebSocket events
- Test: `tests/unit/websocket/WebSocketEventHub.test.js` - Unit tests for event hub

## Dependencies
- Requires: Phase 1 completion (backend WebSocket centralization)
- Blocks: Phase 3 start

## Estimated Time
4 hours

## Current State Analysis

### ✅ Existing Infrastructure
- `WebSocketService.jsx` exists with event handling capabilities
- `IDEContext.jsx` has event bus listeners for local events
- WebSocket connection management is implemented
- Event listeners for common events (chat, IDE state) exist

### ❌ Problems Identified
- **CRITICAL**: IDEContext doesn't listen to WebSocket events
- **CRITICAL**: SidebarLeft uses wrong active state logic (`ide.active` vs `activePort`)
- No centralized event handling in frontend
- WebSocket events not properly forwarded to local event bus
- No proper error handling and reconnection logic
- Missing WebSocket event type definitions

### 🔧 Required Changes

#### 1. Create WebSocketEventHub
```javascript
// frontend/src/infrastructure/websocket/WebSocketEventHub.jsx
class WebSocketEventHub {
  constructor(webSocketService, eventBus, logger) {
    this.webSocketService = webSocketService;
    this.eventBus = eventBus;
    this.logger = logger;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen to all WebSocket events and forward to local event bus
    Object.values(WebSocketEvents.IDE).forEach(eventType => {
      this.webSocketService.on(eventType, (data) => {
        this.logger.info(`WebSocket ${eventType} received, forwarding to event bus`);
        this.eventBus.emit(eventType, data);
      });
    });
  }
}
```

#### 2. Create Frontend WebSocketEventTypes
```javascript
// frontend/src/infrastructure/websocket/WebSocketEventTypes.js
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

#### 3. Update IDEContext
```javascript
// frontend/src/presentation/components/ide/IDEContext.jsx
// Add WebSocket event handling
useEffect(() => {
  if (!eventBus) return;

  // WebSocket events are automatically forwarded to event bus by WebSocketEventHub
  const handleActiveIDEChanged = (data) => {
    if (data.port) {
      setActivePort(data.port);
      loadIdeFeatures(data.port);
      loadIdeStatus(data.port);
    }
  };

  eventBus.on('activeIDEChanged', handleActiveIDEChanged);
  
  return () => {
    eventBus.off('activeIDEChanged', handleActiveIDEChanged);
  };
}, [eventBus, setActivePort]);
```

#### 4. Update WebSocketService
```javascript
// frontend/src/infrastructure/services/WebSocketService.jsx
// Add centralized event handling
class WebSocketService {
  constructor() {
    // ... existing code ...
    this.eventHub = null;
  }

  setEventHub(eventHub) {
    this.eventHub = eventHub;
  }

  handleMessage(message) {
    // Forward to event hub if available
    if (this.eventHub) {
      this.eventHub.handleWebSocketMessage(message);
    }
    
    // ... existing message handling ...
  }
}
```

#### 5. Fix SidebarLeft Active State Logic
```javascript
// frontend/src/presentation/components/SidebarLeft.jsx
// Replace ide.active with port comparison
className={`ide-item${ide.port === activePort ? ' active' : ''}`}

// Remove ide.active check for active indicator
{ide.port === activePort && <span className="active-indicator">✓</span>}
```

## Success Criteria
- [ ] IDEContext receives WebSocket events properly
- [ ] SidebarLeft shows correct active IDE state
- [ ] All WebSocket events are centralized through WebSocketEventHub
- [ ] Event types are standardized between frontend and backend
- [ ] Error handling and reconnection work properly
- [ ] Unit tests pass

## Risk Assessment
- **High Risk**: Breaking existing frontend functionality
- **Mitigation**: Gradual migration with fallback mechanisms
- **Rollback Plan**: Keep old event handling as backup

## Testing Strategy
- Unit tests for WebSocketEventHub
- Integration tests for WebSocket event flow
- Verify IDE switching UI updates correctly
- Test error handling and reconnection scenarios

## Next Phase Dependencies
- Phase 3 requires this centralized frontend system
- State management integration depends on proper event handling
- All components must receive real-time updates correctly 