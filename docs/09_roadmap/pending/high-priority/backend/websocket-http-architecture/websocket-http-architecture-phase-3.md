# WebSocket vs HTTP Architecture Centralization – Phase 3: State Management Integration

## Overview
Integrate the centralized WebSocket event system with the frontend state management to ensure proper synchronization between real-time events and component state. This phase fixes the core issue where IDE switching UI doesn't update correctly and ensures all components receive real-time updates.

## Objectives
- [ ] Fix IDEStore state synchronization with WebSocket events
- [ ] Update SidebarLeft to use correct active state logic (ide.port === activePort)
- [ ] Implement proper event bus integration between WebSocket and components
- [ ] Add error handling and reconnection logic
- [ ] Ensure all components receive real-time updates

## Deliverables
- File: `frontend/src/infrastructure/stores/IDEStore.jsx` - Updated state synchronization
- File: `frontend/src/presentation/components/SidebarLeft.jsx` - Fixed active state logic
- File: `frontend/src/presentation/components/ide/IDEContext.jsx` - Enhanced event handling
- File: `frontend/src/infrastructure/websocket/WebSocketEventHub.jsx` - Enhanced event bus integration
- Test: `tests/integration/websocket/WebSocketFlow.test.js` - Integration tests for full flow

## Dependencies
- Requires: Phase 1 and Phase 2 completion
- Blocks: Phase 4 start

## Estimated Time
4 hours

## Current State Analysis

### ✅ Existing Infrastructure
- `IDEStore.jsx` has state management with Zustand
- `SidebarLeft.jsx` receives `activePort` prop
- `IDEContext.jsx` manages IDE state and features
- WebSocket connection and event handling exists

### ❌ Critical Problems Identified
- **CRITICAL**: SidebarLeft uses `ide.active` instead of comparing with `activePort`
- **CRITICAL**: IDEStore doesn't sync with WebSocket events
- **CRITICAL**: IDEContext doesn't receive WebSocket events
- State updates don't trigger UI re-renders
- No proper error handling for WebSocket disconnections
- Missing reconnection logic

### 🔧 Required Changes

#### 1. Fix SidebarLeft Active State Logic
```javascript
// frontend/src/presentation/components/SidebarLeft.jsx
// CURRENT (WRONG):
className={`ide-item${ide.active === true ? ' active' : ''}`}
{ide.active && <span className="active-indicator">✓</span>}

// FIXED:
className={`ide-item${ide.port === activePort ? ' active' : ''}`}
{ide.port === activePort && <span className="active-indicator">✓</span>}
```

#### 2. Update IDEStore for WebSocket Synchronization
```javascript
// frontend/src/infrastructure/stores/IDEStore.jsx
const useIDEStore = create(
  persist(
    (set, get) => ({
      // ... existing state ...

      // Add WebSocket event handlers
      handleWebSocketEvent: (eventType, data) => {
        switch (eventType) {
          case 'activeIDEChanged':
            if (data.port) {
              set({ activePort: data.port });
              // Refresh IDE list to update active status
              get().loadAvailableIDEs();
            }
            break;
          case 'ideListUpdated':
            get().loadAvailableIDEs();
            break;
          case 'ideStatusChanged':
            // Update specific IDE status
            const { availableIDEs } = get();
            const updatedIDEs = availableIDEs.map(ide => 
              ide.port === data.port 
                ? { ...ide, status: data.status }
                : ide
            );
            set({ availableIDEs: updatedIDEs });
            break;
        }
      },

      // ... existing actions ...
    }),
    {
      name: 'ide-store'
    }
  )
);
```

#### 3. Enhance IDEContext Event Handling
```javascript
// frontend/src/presentation/components/ide/IDEContext.jsx
export const IDEProvider = ({ children, eventBus }) => {
  const {
    activePort,
    availableIDEs,
    isLoading,
    error,
    loadActivePort,
    loadAvailableIDEs,
    handleWebSocketEvent, // Add this
    switchIDE,
    refresh,
    clearError
  } = useIDEStore();

  // WebSocket event handling
  useEffect(() => {
    if (!eventBus) return;

    const handleActiveIDEChanged = (data) => {
      logger.info('WebSocket activeIDEChanged received:', data);
      handleWebSocketEvent('activeIDEChanged', data);
      
      if (data.port) {
        loadIdeFeatures(data.port);
        loadIdeStatus(data.port);
      }
    };

    const handleIDEListUpdated = (data) => {
      logger.info('WebSocket ideListUpdated received:', data);
      handleWebSocketEvent('ideListUpdated', data);
    };

    const handleIDEStatusChanged = (data) => {
      logger.info('WebSocket ideStatusChanged received:', data);
      handleWebSocketEvent('ideStatusChanged', data);
    };

    // Listen to WebSocket events forwarded by WebSocketEventHub
    eventBus.on('activeIDEChanged', handleActiveIDEChanged);
    eventBus.on('ideListUpdated', handleIDEListUpdated);
    eventBus.on('ideStatusChanged', handleIDEStatusChanged);

    return () => {
      eventBus.off('activeIDEChanged', handleActiveIDEChanged);
      eventBus.off('ideListUpdated', handleIDEListUpdated);
      eventBus.off('ideStatusChanged', handleIDEStatusChanged);
    };
  }, [eventBus, handleWebSocketEvent]);
```

#### 4. Enhance WebSocketEventHub
```javascript
// frontend/src/infrastructure/websocket/WebSocketEventHub.jsx
class WebSocketEventHub {
  constructor(webSocketService, eventBus, logger) {
    this.webSocketService = webSocketService;
    this.eventBus = eventBus;
    this.logger = logger;
    this.setupEventListeners();
    this.setupConnectionHandling();
  }
  
  setupEventListeners() {
    // Listen to all WebSocket events and forward to local event bus
    Object.values(WebSocketEvents.IDE).forEach(eventType => {
      this.webSocketService.on(eventType, (data) => {
        this.logger.info(`WebSocket ${eventType} received, forwarding to event bus`);
        this.eventBus.emit(eventType, data);
      });
    });

    // Handle connection events
    this.webSocketService.on('connection-established', () => {
      this.logger.info('WebSocket connection established');
      this.eventBus.emit('websocket:connected');
    });

    this.webSocketService.on('disconnect', () => {
      this.logger.warn('WebSocket connection lost');
      this.eventBus.emit('websocket:disconnected');
    });
  }

  setupConnectionHandling() {
    // Handle reconnection
    this.eventBus.on('websocket:disconnected', () => {
      this.logger.info('Attempting to reconnect...');
      setTimeout(() => {
        this.webSocketService.connect();
      }, 3000);
    });
  }
}
```

#### 5. Add Error Handling and Reconnection
```javascript
// frontend/src/infrastructure/services/WebSocketService.jsx
class WebSocketService {
  constructor() {
    // ... existing code ...
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  handleDisconnect() {
    this.isConnected = false;
    this.emit('disconnect');
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
}
```

## Success Criteria
- [ ] IDE switching UI updates correctly in real-time
- [ ] SidebarLeft shows correct active IDE state
- [ ] IDEStore synchronizes with WebSocket events
- [ ] All components receive real-time updates
- [ ] Error handling and reconnection work properly
- [ ] Integration tests pass

## Risk Assessment
- **High Risk**: Breaking existing state management
- **Mitigation**: Gradual migration with state validation
- **Rollback Plan**: Keep old state management as fallback

## Testing Strategy
- Integration tests for full WebSocket flow
- Test IDE switching with multiple IDEs
- Verify state synchronization
- Test error handling and reconnection
- Performance testing for state updates

## Next Phase Dependencies
- Phase 4 requires stable state management
- All real-time features must work correctly
- Performance requirements must be met 