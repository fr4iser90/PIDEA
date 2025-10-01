# Phase 2: Event-Driven Backend Integration

## 📋 Phase Overview
- **Phase Name**: Event-Driven Backend Integration
- **Duration**: 6 hours
- **Status**: Planning
- **Dependencies**: Phase 1 (Foundation Setup)
- **Deliverables**: Enhanced WebSocket events, backend event handlers, event emission system

## 🎯 Objectives
Enhance the backend to emit WebSocket events for all data changes that require frontend refresh, creating a complete event-driven communication system.

## 📝 Tasks

### 1. Enhance VersionController to Emit WebSocket Events (1 hour)
- [ ] Modify `backend/presentation/api/controllers/VersionController.js`
- [ ] Add event emission for version changes
- [ ] Add event emission for version history updates
- [ ] Add event emission for version validation results
- [ ] Implement event data formatting
- [ ] Add error handling for event emission failures

**Implementation Details:**
```javascript
// In VersionController.js
class VersionController {
  constructor(dependencies = {}) {
    this.eventBus = dependencies.eventBus;
    this.webSocketManager = dependencies.webSocketManager;
  }
  
  async updateVersion(req, res) {
    try {
      // Existing version update logic
      const result = await this.versionService.updateVersion(versionData);
      
      // Emit WebSocket event
      this.emitVersionUpdatedEvent(result);
      
      res.json({ success: true, data: result });
    } catch (error) {
      // Error handling
    }
  }
  
  emitVersionUpdatedEvent(versionData) {
    const eventData = {
      type: 'version:updated',
      data: {
        version: versionData.version,
        timestamp: new Date().toISOString(),
        workspacePath: versionData.workspacePath
      }
    };
    
    this.eventBus.emit('version:updated', eventData);
    this.webSocketManager?.broadcastToAll('version:updated', eventData);
  }
}
```

### 2. Enhance QueueController to Emit WebSocket Events (1 hour)
- [ ] Modify `backend/presentation/api/controllers/QueueController.js`
- [ ] Add event emission for queue status changes
- [ ] Add event emission for queue item updates
- [ ] Add event emission for workflow progress updates
- [ ] Implement event data formatting for queue events
- [ ] Add error handling for queue event emission

### 3. Enhance AnalysisController to Emit WebSocket Events (1 hour)
- [ ] Modify `backend/presentation/api/controllers/AnalysisController.js`
- [ ] Add event emission for analysis completion
- [ ] Add event emission for analysis progress updates
- [ ] Add event emission for analysis results
- [ ] Implement event data formatting for analysis events
- [ ] Add error handling for analysis event emission

### 4. Add RefreshWebSocket Handlers for Backend Events (1 hour)
- [ ] Create `backend/presentation/websocket/RefreshWebSocket.js`
- [ ] Implement WebSocket event handlers for refresh operations
- [ ] Add event routing and filtering
- [ ] Create event validation and sanitization
- [ ] Add event logging and monitoring
- [ ] Implement event retry mechanisms

**WebSocket Handler Structure:**
```javascript
class RefreshWebSocket {
  constructor(dependencies = {}) {
    this.io = dependencies.io;
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
  }
  
  setupEventHandlers() {
    // Version events
    this.eventBus.on('version:updated', this.handleVersionUpdated.bind(this));
    this.eventBus.on('version:history:updated', this.handleVersionHistoryUpdated.bind(this));
    
    // Git events
    this.eventBus.on('git:status:changed', this.handleGitStatusChanged.bind(this));
    this.eventBus.on('git:branch:changed', this.handleGitBranchChanged.bind(this));
    
    // IDE events
    this.eventBus.on('ide:switched', this.handleIDESwitched.bind(this));
    this.eventBus.on('ide:status:changed', this.handleIDEStatusChanged.bind(this));
  }
  
  handleVersionUpdated(data) {
    this.broadcastEvent('version:updated', data);
  }
  
  broadcastEvent(eventType, data) {
    this.io.emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 5. Add QueueWebSocket Handlers for Queue Events (0.5 hours)
- [ ] Create `backend/presentation/websocket/QueueWebSocket.js`
- [ ] Implement WebSocket event handlers for queue operations
- [ ] Add event routing for queue events
- [ ] Create event validation for queue events
- [ ] Add event logging for queue events

### 6. Add AnalysisWebSocket Handlers for Analysis Events (0.5 hours)
- [ ] Create `backend/presentation/websocket/AnalysisWebSocket.js`
- [ ] Implement WebSocket event handlers for analysis operations
- [ ] Add event routing for analysis events
- [ ] Create event validation for analysis events
- [ ] Add event logging for analysis events

### 7. Update Application.js with New Event Handlers (1 hour)
- [ ] Modify `backend/Application.js`
- [ ] Add RefreshWebSocket initialization
- [ ] Integrate RefreshWebSocket with existing WebSocket manager
- [ ] Add event handler registration
- [ ] Implement event logging and monitoring
- [ ] Add error handling for WebSocket events

**Application.js Integration:**
```javascript
// In Application.js setupWebSocketManager method
setupWebSocketManager() {
  // Existing WebSocket setup
  
  // Add RefreshWebSocket
  this.refreshWebSocket = new RefreshWebSocket({
    io: this.io,
    eventBus: this.eventBus,
    logger: this.logger
  });
  
  this.refreshWebSocket.setupEventHandlers();
  
  // Add to existing WebSocket manager
  if (this.webSocketManager) {
    this.webSocketManager.addHandler('refresh', this.refreshWebSocket);
  }
}
```

### 8. Implement Event Emission for Git Status Changes (0.5 hours)
- [ ] Modify git-related services to emit events
- [ ] Add event emission for git status updates
- [ ] Add event emission for git branch changes
- [ ] Add event emission for git commit operations
- [ ] Implement event data formatting for git events
- [ ] Add error handling for git event emission

**Git Event Emission:**
```javascript
// In git service files
class GitService {
  constructor(dependencies = {}) {
    this.eventBus = dependencies.eventBus;
  }
  
  async updateGitStatus(workspacePath) {
    const gitStatus = await this.getGitStatus(workspacePath);
    
    // Emit event
    this.eventBus.emit('git:status:changed', {
      workspacePath,
      gitStatus,
      timestamp: new Date().toISOString()
    });
    
    return gitStatus;
  }
  
  async switchBranch(workspacePath, branchName) {
    const result = await this.executeGitCommand(['checkout', branchName]);
    
    // Emit event
    this.eventBus.emit('git:branch:changed', {
      workspacePath,
      newBranch: branchName,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }
}
```

### 9. Add Event Emission for IDE Switching (0.5 hours)
- [ ] Modify IDE switching services to emit events
- [ ] Add event emission for IDE port changes
- [ ] Add event emission for IDE status updates
- [ ] Add event emission for IDE feature updates
- [ ] Implement event data formatting for IDE events
- [ ] Add error handling for IDE event emission

**IDE Event Emission:**
```javascript
// In IDE service files
class IDEService {
  constructor(dependencies = {}) {
    this.eventBus = dependencies.eventBus;
  }
  
  async switchIDE(port) {
    const result = await this.performIDESwitch(port);
    
    // Emit event
    this.eventBus.emit('ide:switched', {
      newPort: port,
      previousPort: this.currentPort,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }
  
  async updateIDEStatus(port, status) {
    // Emit event
    this.eventBus.emit('ide:status:changed', {
      port,
      status,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 10. Test WebSocket Event Flow (1 hour)
- [ ] Create integration tests for WebSocket events
- [ ] Test event emission from controllers
- [ ] Test event broadcasting to clients
- [ ] Test event data formatting and validation
- [ ] Test error handling and retry mechanisms
- [ ] Test event performance and scalability

**Test Structure:**
```javascript
// backend/tests/integration/RefreshWebSocketIntegration.test.js
describe('RefreshWebSocket Integration', () => {
  test('should emit version:updated event when version changes', async () => {
    // Test implementation
  });
  
  test('should emit git:status:changed event when git status updates', async () => {
    // Test implementation
  });
  
  test('should emit ide:switched event when IDE switches', async () => {
    // Test implementation
  });
  
  test('should handle event emission failures gracefully', async () => {
    // Test implementation
  });
});
```

## 🧪 Testing Requirements

### Integration Tests Coverage:
- **VersionController Events**: 90% coverage
  - Version update event emission
  - Version history event emission
  - Event data formatting
  - Error handling
  
- **RefreshWebSocket**: 90% coverage
  - Event handler registration
  - Event broadcasting
  - Event validation
  - Error handling
  
- **Application.js Integration**: 85% coverage
  - WebSocket initialization
  - Event handler setup
  - Error handling
  
- **Git Service Events**: 85% coverage
  - Git status change events
  - Git branch change events
  - Event data formatting
  
- **IDE Service Events**: 85% coverage
  - IDE switch events
  - IDE status change events
  - Event data formatting

## 📋 Deliverables Checklist
- [ ] VersionController enhanced with WebSocket events
- [ ] RefreshWebSocket.js created and tested
- [ ] Application.js updated with new event handlers
- [ ] Git services enhanced with event emission
- [ ] IDE services enhanced with event emission
- [ ] Integration tests passing with required coverage
- [ ] WebSocket event flow tested and validated
- [ ] Documentation updated with new event system

## 🔄 Integration Points
- **Frontend WebSocketService**: Will connect to new events in Phase 3
- **Existing WebSocket Manager**: Enhanced with refresh event handling
- **Event Bus**: Extended with new refresh-related events
- **Logging System**: Enhanced with event emission logging

## 📊 Success Criteria
- [ ] All backend services emit appropriate WebSocket events
- [ ] WebSocket events are properly formatted and validated
- [ ] Event broadcasting works to all connected clients
- [ ] Integration tests achieve required coverage
- [ ] Error handling works for event emission failures
- [ ] Event logging and monitoring is functional
- [ ] No performance degradation from event emission
- [ ] WebSocket connection stability maintained

## 🚀 Next Phase Preparation
- Backend ready to emit all necessary refresh events
- WebSocket events properly formatted for frontend consumption
- Event system tested and validated
- Integration points ready for frontend connection
- Error handling and monitoring in place

---

**Phase 2 establishes the backend event emission system. The frontend will connect to these events in Phase 3 to create the complete event-driven refresh system.**
