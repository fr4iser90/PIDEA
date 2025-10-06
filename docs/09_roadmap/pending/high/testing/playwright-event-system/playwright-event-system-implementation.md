# Playwright Event System Implementation

## 1. Project Overview
- **Feature/Component Name**: Playwright Event System
- **Priority**: High
- **Category**: testing
- **Status**: pending
- **Estimated Time**: 4 hours
- **Dependencies**: Existing EventBus, WebSocketManager, PlaywrightTestApplicationService
- **Related Issues**: Test Configuration Auto-Refresh Bug Fix
- **Created**: 2024-01-15T10:30:00.000Z
- **Last Updated**: 2025-10-06T01:50:21.000Z

## 2. Technical Requirements
- **Tech Stack**: Node.js, WebSocket, EventBus, React, JavaScript
- **Architecture Pattern**: Event-Driven Architecture
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**: Event listeners in TestConfiguration component, remove manual notifications
- **Backend Changes**: Event emission in PlaywrightTestApplicationService, Application.js event handlers

## 3. File Impact Analysis

### Files to Modify:
- [ ] `backend/application/services/PlaywrightTestApplicationService.js` - Add event emission after config save (Line 540)
- [ ] `backend/Application.js` - Add event handlers for playwright events (Line 1280)
- [ ] `frontend/src/presentation/components/tests/main/TestConfiguration.jsx` - Add WebSocket event listeners, remove manual notifications (Line 131)
- [ ] `frontend/src/presentation/components/tests/main/TestRunnerComponent.jsx` - No changes needed (already uses WebSocketService)

### Files to Create:
- [ ] `backend/tests/unit/PlaywrightEventSystem.test.js` - Unit tests for event system
- [ ] `backend/tests/integration/PlaywrightEventFlow.test.js` - Integration tests for event flow

### Files to Delete:
- None

## 4. Implementation Phases

### Phase 1: Backend Event Emission (1 hour)
- [ ] Add event emission to PlaywrightTestApplicationService.saveConfigurationToDatabase()
- [ ] Add playwright:config:saved event emission for success
- [ ] Add playwright:config:failed event emission for errors
- [ ] Add proper logging for event emission
- [ ] Test event emission in service

### Phase 2: Application Event Handlers (1 hour)
- [ ] Add playwright:config:saved event handler in Application.js
- [ ] Add playwright:config:failed event handler in Application.js
- [ ] Configure WebSocket broadcast for playwright events
- [ ] Add event logging in Application.js
- [ ] Test event flow from service to WebSocket

### Phase 3: Frontend Event Listeners (1.5 hours)
- [ ] Add WebSocketService import to TestConfiguration
- [ ] Add useEffect hook for WebSocket event listeners in TestConfiguration
- [ ] Implement handleConfigSaved function with WebSocket events
- [ ] Implement handleConfigFailed function with WebSocket events
- [ ] Add event cleanup in useEffect return
- [ ] Remove manual notification logic from handleConfigSubmit
- [ ] Test event reception in frontend

### Phase 4: Integration & Testing (0.5 hours)
- [ ] Test complete event flow end-to-end
- [ ] Verify auto-collapse works after save
- [ ] Verify notifications show correctly
- [ ] Test error scenarios
- [ ] Write unit tests for event system

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, kebab-case for events
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Event data sanitization
- [ ] Project ID validation in event handlers
- [ ] Rate limiting for event emission
- [ ] Audit logging for configuration changes
- [ ] Protection against malicious event data

## 7. Performance Requirements
- **Response Time**: < 100ms for event emission
- **Throughput**: Handle 100+ events per second
- **Memory Usage**: < 10MB for event listeners
- **Database Queries**: None (events only)
- **Caching Strategy**: No caching needed for events

## 8. Testing Strategy

### Unit Tests:
- [ ] Test file: `backend/tests/unit/PlaywrightEventSystem.test.js`
- [ ] Test cases: Event emission success, event emission failure, event data validation
- [ ] Mock requirements: EventBus, Application object

### Integration Tests:
- [ ] Test file: `backend/tests/integration/PlaywrightEventFlow.test.js`
- [ ] Test scenarios: Complete event flow from service to WebSocket broadcast
- [ ] Test data: Mock configuration data, project IDs

### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/PlaywrightConfigEventFlow.test.jsx`
- [ ] User flows: Save configuration, receive notification, auto-collapse
- [ ] Browser compatibility: Chrome, Firefox compatibility

## 9. Documentation Requirements

### Code Documentation:
- [ ] JSDoc comments for event emission functions
- [ ] JSDoc comments for event handler functions
- [ ] README updates with event system documentation
- [ ] Architecture diagrams for event flow

### User Documentation:
- [ ] Developer guide for playwright events
- [ ] Troubleshooting guide for event issues
- [ ] Event system overview documentation

## 10. Deployment Checklist

### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

### Deployment:
- [ ] No database migrations needed
- [ ] No environment variables needed
- [ ] No configuration updates needed
- [ ] Service restart not needed
- [ ] Health checks configured

### Post-deployment:
- [ ] Monitor logs for event errors
- [ ] Verify event flow in production
- [ ] Performance monitoring active
- [ ] User feedback collection enabled

## 11. Rollback Plan
- [ ] Remove event emission from PlaywrightTestApplicationService
- [ ] Remove event handlers from Application.js
- [ ] Restore manual notification logic in TestConfiguration
- [ ] Revert frontend event listeners
- [ ] Communication plan for stakeholders

## 12. Success Criteria
- [ ] Configuration save triggers backend event
- [ ] Frontend receives event and shows notification
- [ ] Auto-collapse works after successful save
- [ ] Error events show error notifications
- [ ] No more manual refresh issues
- [ ] All tests pass
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate

## 13. Risk Assessment

### High Risk:
- [ ] Event not reaching frontend - Mitigation: Add fallback notification system
- [ ] Event timing issues - Mitigation: Add event queuing and retry logic

### Medium Risk:
- [ ] Performance impact from events - Mitigation: Event throttling and batching
- [ ] Memory leaks from event listeners - Mitigation: Proper cleanup in useEffect

### Low Risk:
- [ ] Event data corruption - Mitigation: Data validation and sanitization
- [ ] WebSocket connection issues - Mitigation: Connection retry logic

## 14. AI Auto-Implementation Instructions

### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/pending/high/testing/playwright-event-system/playwright-event-system-implementation.md'
- **category**: 'testing'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: false

### AI Execution Context:
```json
{
  "requires_new_chat": false,
  "git_branch_name": "feature/playwright-event-system",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 15. Initial Prompt Documentation

### Original Prompt (Sanitized):
```markdown
# Initial Prompt: Playwright Event System

## User Request:
Implement event-driven system for Playwright test configuration to fix auto-refresh bug and provide proper notifications

## Language Detection:
- **Original Language**: English
- **Translation Status**: ✅ Already in English
- **Sanitization Status**: ✅ No credentials or personal data

## Prompt Analysis:
- **Intent**: Fix test configuration auto-refresh bug using event-driven architecture
- **Complexity**: Medium based on requirements
- **Scope**: Backend event emission, frontend event listeners, notification system
- **Dependencies**: Existing EventBus, WebSocketManager

## Sanitization Applied:
- [x] No credentials to remove
- [x] No personal information to anonymize
- [x] No sensitive file paths to generalize
- [x] Language already in English
- [x] Technical terms preserved
- [x] Intent and requirements maintained
```

## 16. References & Resources
- **Technical Documentation**: EventBus.js, WebSocketManager.js
- **API References**: PlaywrightTestApplicationService.js
- **Design Patterns**: Event-Driven Architecture pattern
- **Best Practices**: React useEffect cleanup, Winston logging
- **Similar Implementations**: Existing event handlers in Application.js

## 17. Implementation Details

### Backend Event Emission:
```javascript
// In PlaywrightTestApplicationService.js - saveConfigurationToDatabase method (Line 540)
await projectRepository.update(updatedProject);

this.logger.info(`Saved Playwright configuration to database for project: ${projectId}`);

// Emit event for successful configuration save
if (this.application && this.application.eventBus) {
  await this.application.eventBus.emit('playwright:config:saved', {
    projectId,
    config: validatedConfig,
    timestamp: new Date().toISOString()
  });
  this.logger.info(`Emitted playwright:config:saved event for project: ${projectId}`);
} else {
  this.logger.warn('EventBus not available for playwright:config:saved event');
}
```

### Application Event Handlers:
```javascript
// In Application.js setupEventHandlers() method (Line 1080)
// Playwright Test Configuration Events
this.eventBus.subscribe('playwright:config:saved', (data) => {
  this.logger.info('Playwright config saved event:', '[REDACTED_CONFIG_DATA]');
  if (this.webSocketManager) {
    this.webSocketManager.broadcastToAll('playwright:config:saved', data);
  } else {
    this.logger.warn('WebSocket manager not available for playwright:config:saved broadcast');
  }
});

this.eventBus.subscribe('playwright:config:failed', (data) => {
  this.logger.info('Playwright config failed event:', '[REDACTED_ERROR_DATA]');
  if (this.webSocketManager) {
    this.webSocketManager.broadcastToAll('playwright:config:failed', data);
  } else {
    this.logger.warn('WebSocket manager not available for playwright:config:failed broadcast');
  }
});
```

### Frontend Event Listener:
```javascript
// In TestConfiguration.jsx - Add WebSocketService import and useEffect hook (Line 131)
import WebSocketService from '@/infrastructure/services/WebSocketService.jsx';

// Add event listeners for configuration save events
useEffect(() => {
  if (!projectId) return;

  const setupWebSocket = async () => {
    try {
      await WebSocketService.connect();
      
      const handleConfigSaved = (data) => {
        if (data.projectId === projectId) {
          // Update UI state via WebSocket event
          setConfigMessage('Configuration saved successfully!');
          
          // Show success notification via event system
          window.dispatchEvent(new CustomEvent('notification', {
            detail: {
              type: 'success',
              message: 'Test configuration saved!',
              duration: 3000
            }
          }));
          
          // Auto-collapse configuration card and exit edit mode AFTER notification
          setTimeout(() => {
            setIsEditingConfig(false);
            setIsConfigExpanded(false);
          }, 1000); // Wait 1 second to show notification first
          
          console.log('Configuration saved successfully via WebSocket event system');
        }
      };

      const handleConfigFailed = (data) => {
        if (data.projectId === projectId) {
          // Show error notification via event system
          window.dispatchEvent(new CustomEvent('notification', {
            detail: {
              type: 'error',
              message: data.error || 'Configuration save failed!',
              duration: 5000
            }
          }));
          
          console.error('Configuration save failed via WebSocket event system:', data.error);
        }
      };

      // Register WebSocket event listeners
      WebSocketService.on('playwright:config:saved', handleConfigSaved);
      WebSocketService.on('playwright:config:failed', handleConfigFailed);

      console.log('WebSocket event listeners registered for playwright config events');
      
      // Cleanup function
      return () => {
        WebSocketService.off('playwright:config:saved', handleConfigSaved);
        WebSocketService.off('playwright:config:failed', handleConfigFailed);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket for config events:', error);
    }
  };

  setupWebSocket();
}, [projectId]);
```

### TestRunnerComponent Integration:
```javascript
// In TestRunnerComponent.jsx - No changes needed
// TestRunnerComponent already receives eventBus as prop and passes it to TestConfiguration
// TestConfiguration will use WebSocketService directly instead of eventBus prop
```

---

**Note**: This implementation follows the event-driven architecture pattern to provide real-time notifications and fix the auto-refresh bug in the test configuration system.

## 18. Validation Results - 2025-01-15T12:00:00.000Z

### ✅ File Structure Validation Complete
- [x] Index: `playwright-event-system-index.md` - Status: Found
- [x] Implementation: `playwright-event-system-implementation.md` - Status: Found  
- [x] Phase 1: `playwright-event-system-phase-1.md` - Status: Found
- [x] Phase 2: `playwright-event-system-phase-2.md` - Status: Found
- [x] Phase 3: `playwright-event-system-phase-3.md` - Status: Found
- [x] Phase 4: `playwright-event-system-phase-4.md` - Status: Found

### ✅ Codebase Analysis Complete
- [x] EventBus system exists and is properly integrated (`backend/infrastructure/messaging/EventBus.js`)
- [x] WebSocketManager exists with broadcastToAll method (`backend/presentation/websocket/WebSocketManager.js`)
- [x] PlaywrightTestApplicationService exists with saveConfigurationToDatabase method (`backend/application/services/PlaywrightTestApplicationService.js`)
- [x] Application.js has setupEventHandlers method for event registration (`backend/Application.js`)
- [x] TestConfiguration.jsx exists with manual notification logic (`frontend/src/presentation/components/tests/main/TestConfiguration.jsx`)
- [x] WebSocketService exists as singleton (`frontend/src/infrastructure/services/WebSocketService.jsx`)

### ⚠️ Critical Issues Found
- [ ] **No event emission**: PlaywrightTestApplicationService.saveConfigurationToDatabase() doesn't emit events after config save (Line 540)
- [ ] **No event handlers**: Application.js setupEventHandlers() missing playwright event handlers (Line 1080)
- [ ] **Manual notifications**: TestConfiguration uses manual CustomEvent instead of WebSocket events (Line 131)
- [ ] **Missing WebSocket integration**: TestConfiguration doesn't use WebSocketService for events
- [ ] **Missing tests**: No unit tests for event system functionality exist
- [ ] **Event naming inconsistency**: Implementation uses kebab-case but EventBus uses colon notation

### 🔧 Improvements Made
- Updated file paths to match actual project structure
- Added proper error handling and logging patterns
- Corrected event naming conventions to match existing patterns (colon notation)
- Added fallback handling for missing EventBus/WebSocketManager
- Enhanced implementation details with real code examples
- Fixed WebSocketService integration (singleton pattern)
- Corrected TestRunnerComponent integration (no changes needed)
- Updated event names to match existing Application.js patterns

### 📊 Code Quality Metrics
- **Coverage**: 0% (no event system tests exist)
- **Security Issues**: None identified
- **Performance**: Good (events are lightweight)
- **Maintainability**: Excellent (follows existing patterns)
- **Architecture Compliance**: Perfect (uses established EventBus and WebSocket patterns)

### 🚀 Next Steps
1. Add event emission to PlaywrightTestApplicationService.saveConfigurationToDatabase() (Line 540)
2. Add playwright event handlers to Application.js setupEventHandlers() (Line 1080)
3. Update TestConfiguration to use WebSocketService instead of manual notifications (Line 131)
4. Write unit tests for event system functionality
5. Test complete event flow end-to-end

### 📋 Task Splitting Analysis
- **Current Task Size**: 4 hours (within 8-hour limit) ✅
- **File Count**: 3 files to modify (within 10-file limit) ✅
- **Phase Count**: 4 phases (within 5-phase limit) ✅
- **Task Splitting**: Not required - task is appropriately sized
- **Dependencies**: Clear and manageable
- **Risk Level**: Low - follows established patterns

### 🔍 Detailed Implementation Analysis

#### Backend EventBus Integration
- **EventBus Location**: `backend/infrastructure/messaging/EventBus.js`
- **Methods Available**: `subscribe()`, `publish()`, `emit()` (alias), `on()` (alias)
- **Current Usage**: Application.js uses `subscribe()` method for event handlers
- **Event Naming**: Uses colon notation (e.g., 'ide-started', 'chat-message')

#### WebSocketManager Integration  
- **WebSocketManager Location**: `backend/presentation/websocket/WebSocketManager.js`
- **Broadcast Methods**: `broadcastToAll()`, `broadcastToUser()`
- **Current Usage**: Application.js uses `broadcastToAll()` for global events
- **Connection Management**: Handles authentication via cookies automatically

#### PlaywrightTestApplicationService Analysis
- **Service Location**: `backend/application/services/PlaywrightTestApplicationService.js`
- **Method**: `saveConfigurationToDatabase()` (Lines 493-545)
- **Current State**: Saves config but doesn't emit events
- **Integration Point**: Line 540 - after successful save
- **Dependencies**: Has access to `this.application` which contains EventBus

#### Frontend WebSocketService Analysis
- **Service Location**: `frontend/src/infrastructure/services/WebSocketService.jsx`
- **Pattern**: Singleton instance exported as default
- **Methods**: `on()`, `off()`, `connect()`, `send()`
- **Event Handling**: Uses `eventListeners` Map for event registration
- **Current Usage**: Used in App.jsx for global state management

#### TestConfiguration Component Analysis
- **Component Location**: `frontend/src/presentation/components/tests/main/TestConfiguration.jsx`
- **Current Notification**: Uses `window.dispatchEvent(new CustomEvent('notification'))` (Lines 153-161)
- **Integration Point**: `handleConfigSubmit()` method (Line 131)
- **State Management**: Uses local state for config form and messages
