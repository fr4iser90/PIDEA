# WebSocket vs HTTP Architecture Centralization - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: WebSocket vs HTTP Architecture Centralization
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 16 hours
- **Dependencies**: Existing WebSocket and HTTP infrastructure, Event Bus system
- **Related Issues**: IDE switching UI not updating, real-time communication gaps, scattered event handling

## 2. Technical Requirements
- **Tech Stack**: Node.js, WebSocket (ws), Express, React, Zustand, Event Bus, Winston Logger
- **Architecture Pattern**: Event-Driven Architecture with centralized WebSocket management
- **Database Changes**: None required
- **API Changes**: Centralize WebSocket event handling, improve HTTP endpoint organization
- **Frontend Changes**: Centralize WebSocket connection management, improve event handling
- **Backend Changes**: Centralize WebSocket broadcasting, improve event routing

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/presentation/websocket/WebSocketManager.js` - Centralize all WebSocket event broadcasting
- [ ] `backend/Application.js` - Improve event handler organization and centralization
- [ ] `frontend/src/infrastructure/services/WebSocketService.jsx` - Centralize WebSocket connection and event handling
- [ ] `frontend/src/presentation/components/ide/IDEContext.jsx` - Add WebSocket event listeners and proper event forwarding
- [ ] `frontend/src/presentation/components/SidebarLeft.jsx` - Fix IDE active state logic to use activePort instead of ide.active
- [ ] `frontend/src/infrastructure/stores/IDEStore.jsx` - Improve state synchronization with WebSocket events
- [ ] `backend/presentation/api/ide/IDEController.js` - Use centralized WebSocket event broadcasting
- [ ] `backend/infrastructure/external/ide/IDEManager.js` - Use centralized WebSocket event broadcasting

### Files to Create:
- [ ] `backend/infrastructure/websocket/WebSocketEventManager.js` - Centralized WebSocket event management
- [ ] `backend/infrastructure/websocket/WebSocketEventTypes.js` - Event type definitions and constants
- [ ] `frontend/src/infrastructure/websocket/WebSocketEventHub.jsx` - Centralized frontend WebSocket event handling
- [ ] `frontend/src/infrastructure/websocket/WebSocketEventTypes.js` - Frontend event type definitions
- [ ] `docs/architecture/websocket-http-architecture.md` - Architecture documentation
- [ ] `tests/unit/websocket/WebSocketEventManager.test.js` - Unit tests for WebSocket event manager
- [ ] `tests/integration/websocket/WebSocketFlow.test.js` - Integration tests for WebSocket flow

### Files to Delete:
- [ ] None - improving existing structure

## 4. Implementation Phases

### Phase 1: Backend WebSocket Centralization (4 hours)
- [ ] Create WebSocketEventManager for centralized event broadcasting
- [ ] Define WebSocketEventTypes with all event constants
- [ ] Refactor WebSocketManager to use centralized event system
- [ ] Update Application.js event handlers to use new system
- [ ] Update IDEController and IDEManager to use centralized broadcasting

### Phase 2: Frontend WebSocket Centralization (4 hours)
- [ ] Create WebSocketEventHub for centralized event handling
- [ ] Define frontend WebSocketEventTypes
- [ ] Refactor WebSocketService to use centralized event system
- [ ] Update IDEContext to properly handle WebSocket events
- [ ] Add WebSocket connection management and error handling

### Phase 3: State Management Integration (4 hours)
- [ ] Fix IDEStore state synchronization with WebSocket events
- [ ] Update SidebarLeft to use correct active state logic (ide.port === activePort)
- [ ] Implement proper event bus integration between WebSocket and components
- [ ] Add error handling and reconnection logic
- [ ] Ensure all components receive real-time updates

### Phase 4: Testing & Documentation (4 hours)
- [ ] Write unit tests for WebSocket event handling
- [ ] Write integration tests for full WebSocket flow
- [ ] Create comprehensive architecture documentation
- [ ] Test all real-time features (IDE switching, chat, analysis)
- [ ] Performance testing for WebSocket connections

## 5. Current Architecture Analysis

### Backend WebSocket Status:
```javascript
// ✅ GOOD: WebSocketManager exists with broadcastToAll method
webSocketManager.broadcastToAll('activeIDEChanged', data);

// ❌ PROBLEM: Events scattered across different files
// Application.js, IDEController.js, IDEManager.js all send events directly
// No centralized event type management
// No standardized event structure
```

### Frontend WebSocket Status:
```javascript
// ✅ GOOD: WebSocketService exists with event handling
// ❌ PROBLEM: No centralized event handling
// ❌ PROBLEM: IDEContext doesn't listen to WebSocket events
// ❌ PROBLEM: SidebarLeft uses wrong active state logic (ide.active vs activePort)
// ❌ PROBLEM: No proper error handling and reconnection
```

## 6. Best Practice Architecture Plan

### Backend Architecture:
```javascript
// 1. Centralized Event Manager
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

// 2. Event Type Constants
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
  GIT: {
    STATUS_CHANGED: 'gitStatusChanged',
    BRANCH_CHANGED: 'gitBranchChanged',
    COMMIT_MADE: 'gitCommitMade'
  },
  SYSTEM: {
    NOTIFICATION: 'notification',
    ERROR: 'error',
    USER_APP_DETECTED: 'userAppDetected'
  }
};

// 3. Centralized Broadcasting Usage
// Instead of scattered event publishing:
eventBus.publish('activeIDEChanged', data);
// Use:
webSocketEventManager.broadcast(WebSocketEvents.IDE.ACTIVE_CHANGED, data);
```

### Frontend Architecture:
```javascript
// 1. Centralized Event Hub
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

// 2. Frontend Event Types (matching backend)
const WebSocketEvents = {
  IDE: {
    ACTIVE_CHANGED: 'activeIDEChanged',
    STATUS_CHANGED: 'ideStatusChanged',
    STARTED: 'ideStarted',
    STOPPED: 'ideStopped',
    LIST_UPDATED: 'ideListUpdated'
  },
  // ... same as backend
};

// 3. Component Usage
// IDEContext.jsx
useEffect(() => {
  // WebSocket events are automatically forwarded to event bus
  eventBus.on('activeIDEChanged', (data) => {
    setActivePort(data.port);
    loadIdeFeatures(data.port);
  });
}, [eventBus]);
```

## 7. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, UPPER_CASE for constants
- **Error Handling**: Try-catch with specific error types, proper error logging with Winston
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement for WebSocket components
- **Documentation**: JSDoc for all public methods, README updates

## 8. Security Considerations
- [ ] WebSocket connection authentication validation
- [ ] Event data sanitization and validation
- [ ] Rate limiting for WebSocket events
- [ ] User authorization for sensitive events
- [ ] Audit logging for all WebSocket broadcasts
- [ ] Protection against malicious event data

## 9. Performance Requirements
- **Response Time**: WebSocket events < 100ms
- **Throughput**: 1000+ concurrent WebSocket connections
- **Memory Usage**: < 50MB for WebSocket manager
- **Database Queries**: No additional queries for WebSocket events
- **Caching Strategy**: Event type definitions cached, connection pooling

## 10. Testing Strategy

### Unit Tests:
- [ ] Test file: `tests/unit/websocket/WebSocketEventManager.test.js`
- [ ] Test cases: Event broadcasting, user-specific broadcasts, error handling
- [ ] Mock requirements: WebSocketManager, Logger

### Integration Tests:
- [ ] Test file: `tests/integration/websocket/WebSocketFlow.test.js`
- [ ] Test scenarios: Full IDE switch flow, chat message flow, analysis progress flow
- [ ] Test data: Mock IDE data, chat messages, analysis results

### E2E Tests:
- [ ] Test file: `tests/e2e/websocket/WebSocketRealTime.test.js`
- [ ] User flows: IDE switching, real-time chat, analysis progress
- [ ] Browser compatibility: Chrome, Firefox, Safari

## 11. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for all WebSocket event methods
- [ ] README updates with WebSocket architecture
- [ ] API documentation for WebSocket events
- [ ] Architecture diagrams for WebSocket flow

### User Documentation:
- [ ] Developer guide for WebSocket event handling
- [ ] Troubleshooting guide for WebSocket connection issues
- [ ] Performance optimization guide

## 12. Deployment Checklist

### Pre-deployment:
- [ ] All WebSocket tests passing
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

### Deployment:
- [ ] WebSocket service configuration updated
- [ ] Environment variables configured
- [ ] Service restarts if needed
- [ ] Health checks configured

### Post-deployment:
- [ ] Monitor WebSocket connection logs
- [ ] Verify real-time features in production
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## 13. Rollback Plan
- [ ] WebSocket service rollback procedure
- [ ] Configuration rollback procedure
- [ ] Communication plan for stakeholders

## 14. Success Criteria
- [ ] IDE switching UI updates correctly in real-time
- [ ] All WebSocket events are properly centralized
- [ ] Frontend components receive real-time updates
- [ ] Error handling and reconnection work properly
- [ ] Performance requirements met
- [ ] All tests pass
- [ ] Documentation complete and accurate

## 15. Risk Assessment

### High Risk:
- [ ] WebSocket connection stability - Mitigation: Implement robust reconnection logic
- [ ] Event ordering issues - Mitigation: Use timestamps and sequence numbers

### Medium Risk:
- [ ] Performance impact with many connections - Mitigation: Implement connection pooling
- [ ] Event loss during reconnection - Mitigation: Implement event queuing

### Low Risk:
- [ ] Browser compatibility issues - Mitigation: Test across multiple browsers
- [ ] Event type naming conflicts - Mitigation: Use namespaced event types

## 16. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/backend/websocket-http-architecture/websocket-http-architecture-implementation.md'
- **category**: 'backend'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/websocket-http-architecture",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 600
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] WebSocket tests pass
- [ ] No build errors
- [ ] IDE switching UI works correctly
- [ ] Real-time features function properly
- [ ] Documentation updated

## 17. References & Resources
- **Technical Documentation**: WebSocket API documentation, Event Bus patterns
- **API References**: ws library documentation, Express WebSocket integration
- **Design Patterns**: Event-Driven Architecture, Observer Pattern
- **Best Practices**: WebSocket security best practices, real-time application patterns
- **Similar Implementations**: Existing WebSocketManager.js, WebSocketService.jsx

## 18. Implementation Priority

### Critical (Must Fix):
1. **IDE switching UI not updating** - Fix SidebarLeft active state logic
2. **WebSocket events not reaching frontend** - Add WebSocket listeners to IDEContext
3. **Scattered event handling** - Centralize WebSocket event broadcasting

### Important (Should Fix):
1. **Error handling and reconnection** - Improve WebSocket connection stability
2. **Event type standardization** - Create centralized event type definitions
3. **Performance optimization** - Implement connection pooling and event queuing

### Nice to Have:
1. **Advanced features** - User-specific broadcasts, event filtering
2. **Monitoring and analytics** - WebSocket connection metrics
3. **Advanced error recovery** - Automatic event replay on reconnection

## 19. Validation Results - 2024-12-27

### ✅ Completed Items
- [x] File: `backend/presentation/websocket/WebSocketManager.js` - Status: Implemented correctly with broadcastToAll method
- [x] File: `frontend/src/infrastructure/services/WebSocketService.jsx` - Status: Implemented correctly with event handling
- [x] File: `frontend/src/presentation/components/ide/IDEContext.jsx` - Status: Implemented but missing WebSocket event listeners
- [x] File: `frontend/src/presentation/components/SidebarLeft.jsx` - Status: Implemented but using wrong active state logic
- [x] File: `backend/presentation/api/ide/IDEController.js` - Status: Implemented correctly with event publishing
- [x] File: `backend/infrastructure/external/ide/IDEManager.js` - Status: Implemented correctly with IDE switching

### ⚠️ Issues Found
- [ ] File: `backend/infrastructure/websocket/WebSocketEventManager.js` - Status: Not found, needs creation
- [ ] File: `backend/infrastructure/websocket/WebSocketEventTypes.js` - Status: Not found, needs creation
- [ ] File: `frontend/src/infrastructure/websocket/WebSocketEventHub.jsx` - Status: Not found, needs creation
- [ ] File: `frontend/src/infrastructure/websocket/WebSocketEventTypes.js` - Status: Not found, needs creation
- [ ] Logic: SidebarLeft active state - Status: Uses `ide.active` instead of `ide.port === activePort`
- [ ] Logic: IDEContext WebSocket events - Status: Doesn't listen to WebSocket events

### 🔧 Improvements Made
- Updated file paths to match actual project structure
- Added missing WebSocket event type definitions
- Corrected SidebarLeft active state logic
- Added WebSocket event handling to IDEContext
- Enhanced error handling and reconnection logic

### 📊 Code Quality Metrics
- **Coverage**: 0% for WebSocket components (needs implementation)
- **Security Issues**: None identified in current implementation
- **Performance**: Good (WebSocketManager handles connections efficiently)
- **Maintainability**: Poor (scattered event handling needs centralization)

### 🚀 Next Steps
1. Create missing WebSocket infrastructure files
2. Fix SidebarLeft active state logic
3. Add WebSocket event listeners to IDEContext
4. Implement centralized event management
5. Add comprehensive testing

### 📋 Task Splitting Recommendations
- **Main Task**: WebSocket vs HTTP Architecture Centralization (16 hours) → Split into 4 phases
- **Phase 1**: Backend WebSocket Centralization (4 hours) - [websocket-http-architecture-phase-1.md](./websocket-http-architecture-phase-1.md)
- **Phase 2**: Frontend WebSocket Centralization (4 hours) - [websocket-http-architecture-phase-2.md](./websocket-http-architecture-phase-2.md)
- **Phase 3**: State Management Integration (4 hours) - [websocket-http-architecture-phase-3.md](./websocket-http-architecture-phase-3.md)
- **Phase 4**: Testing & Documentation (4 hours) - [websocket-http-architecture-phase-4.md](./websocket-http-architecture-phase-4.md) 