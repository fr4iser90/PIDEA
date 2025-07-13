# Modular IDE Commands – Phase 3: Browser/IDE Commands & Integration

## Overview
This phase implements browser/IDE commands for comprehensive IDE automation and integrates all modular commands into the existing workflow system, completing the modular IDE commands implementation.

## Objectives
- [ ] Create browser/IDE commands (SwitchIDEPort, OpenFileExplorer, OpenCommandPalette, ExecuteIDEAction, GetIDESelectors)
- [ ] Create corresponding handlers with selector integration
- [ ] Create WorkflowExecutionService for orchestrated execution
- [ ] Update WorkflowController and TaskService to use new commands
- [ ] Complete integration testing and validation

## Deliverables

### Browser/IDE Commands
- **File**: `backend/application/commands/categories/ide/SwitchIDEPortCommand.js` - Switch IDE port
- **File**: `backend/application/commands/categories/ide/OpenFileExplorerCommand.js` - Open file explorer
- **File**: `backend/application/commands/categories/ide/OpenCommandPaletteCommand.js` - Open command palette
- **File**: `backend/application/commands/categories/ide/ExecuteIDEActionCommand.js` - Execute IDE action
- **File**: `backend/application/commands/categories/ide/GetIDESelectorsCommand.js` - Get IDE selectors

### Browser/IDE Handlers
- **File**: `backend/application/handlers/categories/ide/SwitchIDEPortHandler.js` - Handle IDE port switching
- **File**: `backend/application/handlers/categories/ide/OpenFileExplorerHandler.js` - Handle file explorer
- **File**: `backend/application/handlers/categories/ide/OpenCommandPaletteHandler.js` - Handle command palette
- **File**: `backend/application/handlers/categories/ide/ExecuteIDEActionHandler.js` - Handle IDE actions
- **File**: `backend/application/handlers/categories/ide/GetIDESelectorsHandler.js` - Handle selector retrieval

### Domain Services
- **File**: `backend/domain/services/WorkflowExecutionService.js` - Workflow execution with chat control

### Integration Updates
- **File**: `backend/presentation/api/WorkflowController.js` - Use new chat commands
- **File**: `backend/domain/services/TaskService.js` - Use new chat commands
- **File**: `backend/Application.js` - Register new services

## Dependencies
- Requires: Phase 1 completion (IDE category, ChatSessionService)
- Requires: Phase 2 completion (IDEAutomationService)
- Requires: Existing WorkflowController, TaskService, Application.js
- Blocks: None (final phase)

## Estimated Time
2 hours

## Implementation Details

### 1. Browser/IDE Commands Implementation
All browser/IDE commands should:
- Use BrowserManager for IDE automation
- Support IDE-specific keyboard shortcuts and selectors
- Integrate with IDETypes for selector resolution
- Include proper error handling and fallback mechanisms
- Support multiple IDE types (Cursor, VSCode, Windsurf)

### 2. Browser/IDE Handlers Implementation
All browser/IDE handlers should:
- Use IDEAutomationService for unified automation
- Integrate with existing IDE services
- Support selector-based automation
- Include proper validation and error handling
- Follow existing Handler pattern structure

### 3. WorkflowExecutionService
Implement orchestrated workflow execution:
- Chat session management integration
- Terminal and analysis operation coordination
- IDE automation orchestration
- Event-driven workflow execution
- Error handling and rollback mechanisms

### 4. WorkflowController Integration
Update WorkflowController to use new modular commands:
```javascript
// Replace direct BrowserManager calls with modular commands
const createChatCommand = new CreateChatCommand({ port, message });
const result = await createChatCommand.execute();

// Use SwitchChatCommand for chat switching
const switchChatCommand = new SwitchChatCommand({ sessionId });
await switchChatCommand.execute();
```

### 5. TaskService Integration
Update TaskService to use new modular commands:
```javascript
// Use modular commands for task execution
const sendMessageCommand = new SendMessageCommand({ content, sessionId });
await sendMessageCommand.execute();

// Use analysis commands for project analysis
const analyzeProjectCommand = new AnalyzeProjectCommand({ workspacePath });
const analysis = await analyzeProjectCommand.execute();
```

### 6. Application.js Service Registration
Register new services in Application.js:
```javascript
// Register new domain services
this.container.register('chatSessionService', ChatSessionService);
this.container.register('ideAutomationService', IDEAutomationService);
this.container.register('workflowExecutionService', WorkflowExecutionService);
```

## Key Integration Points

### BrowserManager Integration
```javascript
// Use existing BrowserManager for IDE automation
const browserManager = this.browserManager;
await browserManager.switchToPort(port);
await browserManager.clickNewChat();
```

### IDETypes Integration
```javascript
// Use IDETypes for selector resolution
const selectors = IDETypes.getChatSelectors(ideType);
const chatInput = await page.$(selectors.input);
```

### Event System Integration
```javascript
// Publish events for workflow coordination
if (this.eventBus) {
  await this.eventBus.publish('ChatSessionCreated', { sessionId, port });
}
```

## Success Criteria
- [ ] All 5 browser/IDE commands created and functional
- [ ] All 5 browser/IDE handlers created and functional
- [ ] WorkflowExecutionService implemented with orchestration
- [ ] WorkflowController updated to use new commands
- [ ] TaskService updated to use new commands
- [ ] Application.js updated with new service registrations
- [ ] All commands integrate with existing services
- [ ] All commands support multiple IDE types
- [ ] Chat session management works like browser tabs
- [ ] Complete integration testing passing
- [ ] No build errors

## Testing Requirements
- [ ] Unit tests for all browser/IDE commands
- [ ] Unit tests for all browser/IDE handlers
- [ ] Unit tests for WorkflowExecutionService
- [ ] Integration tests for WorkflowController updates
- [ ] Integration tests for TaskService updates
- [ ] End-to-end tests for complete workflow
- [ ] Tests for multiple IDE type support
- [ ] Performance tests for workflow execution

## Risk Mitigation
- **Browser Automation Failures**: Use existing proven BrowserManager patterns
- **Integration Complexity**: Follow established integration patterns
- **IDE Selector Changes**: Use IDETypes system with fallback selectors
- **Workflow Conflicts**: Implement proper workflow coordination

## Performance Considerations
- **Workflow Execution**: Efficient orchestration of multiple commands
- **Event Handling**: Optimized event publishing and subscription
- **Service Integration**: Minimize overhead in service communication
- **Error Recovery**: Fast error detection and recovery mechanisms

## Final Validation Checklist
- [ ] All 25 planned files created and functional
- [ ] IDE category successfully added and integrated
- [ ] All commands use IDETypes for selector integration
- [ ] All commands support multiple IDE types
- [ ] Chat session management works like browser tabs
- [ ] Terminal operations use modular commands
- [ ] Analysis operations use modular commands
- [ ] Browser automation uses modular commands
- [ ] WorkflowController and TaskService updated
- [ ] All tests passing with 90%+ coverage
- [ ] No build errors or integration issues
- [ ] Performance requirements met
- [ ] Documentation updated and complete

## Post-Implementation Benefits
- **Modular Architecture**: Clean separation of concerns with reusable commands
- **IDE Flexibility**: Support for multiple IDE types with unified interface
- **Maintainability**: Easier to maintain and extend IDE automation
- **Testability**: Better test coverage with modular components
- **Scalability**: Easy to add new IDE types and commands
- **Reliability**: Proven integration with existing infrastructure 