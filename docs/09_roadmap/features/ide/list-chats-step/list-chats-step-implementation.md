# List Chats Step Implementation

## 1. Project Overview
- **Feature/Component Name**: List Chats Step
- **Priority**: High
- **Category**: ide
- **Estimated Time**: 3 hours
- **Dependencies**: ChatSessionService, EventBus
- **Related Issues**: Convert ListChatsHandler to Step for 2-layer DDD architecture

## 2. Technical Requirements
- **Tech Stack**: Node.js, StepRegistry, ChatSessionService, EventBus
- **Architecture Pattern**: DDD (Domain-Driven Design) - 2-layer (Steps → Services)
- **Database Changes**: None (ChatSessionService already exists)
- **API Changes**: None (Step internal)
- **Backend Changes**: Create new Step, remove Handler/Command, integrate with existing services
- **Frontend Changes**: None
- **Infrastructure Changes**: None

## 3. File Impact Analysis
#### Files to Create:
- [ ] `backend/domain/steps/categories/ide/list_chats_step.js` - New Step implementation with business logic
- [ ] `docs/09_roadmap/features/ide/list-chats-step/list-chats-step-index.md` - Master index file

#### Files to Modify:
- [ ] `backend/framework/workflows/task-workflows.json` - Add list_chats_step to workflows
- [ ] `backend/domain/steps/StepRegistry.js` - Register new step (automatic)

#### Files to Delete:
- [ ] `backend/application/commands/categories/ide/ListChatsCommand.js` - Remove Command (redundant)
- [ ] `backend/application/handlers/categories/ide/ListChatsHandler.js` - Remove Handler (redundant)

## 4. Implementation Phases

#### Phase 1: Foundation Setup (0.5 hour)
- [ ] Create list_chats_step.js file structure
- [ ] Set up Step configuration with proper metadata
- [ ] Add dependencies and validation rules
- [ ] Create master index file

#### Phase 2: Core Implementation (1.5 hours)
- [ ] Implement execute() method with business logic
- [ ] Add context validation (userId required)
- [ ] Integrate ChatSessionService for session listing
- [ ] Add pagination support (limit, offset)
- [ ] Implement event publishing via EventBus
- [ ] Add proper error handling and logging

#### Phase 3: Integration (0.5 hours)
- [ ] Register Step in StepRegistry (automatic via file placement)
- [ ] Update task-workflows.json to include list_chats_step
- [ ] Test Step execution via WorkflowController
- [ ] Verify Step appears in StepRegistry

#### Phase 4: Testing & Cleanup (0.5 hours)
- [ ] Write unit tests for list_chats_step.js
- [ ] Remove old ListChatsCommand.js file
- [ ] Remove old ListChatsHandler.js file
- [ ] Update documentation and examples
- [ ] Verify no broken references

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Input validation and sanitization for userId
- [ ] User authentication verification (userId must be valid)
- [ ] Pagination limits (prevent excessive data retrieval)
- [ ] Event publishing security (validate event data)
- [ ] Error message security (no sensitive data in errors)

## 7. Performance Requirements
- **Response Time**: < 300ms for session listing
- **Throughput**: 500+ session listings per minute
- **Memory Usage**: < 20MB per step execution
- **Database Queries**: Optimize ChatSessionService calls with pagination
- **Caching Strategy**: No caching needed for session listing

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/ListChatsStep.test.js`
- [ ] Test cases: 
  - Valid session listing with userId
  - Invalid userId (missing/empty)
  - Pagination with limit and offset
  - Empty session list handling
  - Service failure handling
  - Event publishing verification
- [ ] Mock requirements: ChatSessionService, EventBus

#### Integration Tests:
- [ ] Test file: `tests/integration/ListChatsStep.test.js`
- [ ] Test scenarios: 
  - Step execution via StepRegistry
  - Workflow integration
  - Database interaction
  - Event system integration
- [ ] Test data: Valid user IDs, various pagination scenarios

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for ListChatsStep class and execute method
- [ ] README updates with new step functionality
- [ ] Step configuration documentation
- [ ] Integration examples with workflows

#### User Documentation:
- [ ] Step usage guide for developers
- [ ] Workflow integration examples
- [ ] Troubleshooting guide for common issues

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Step file deployed to correct location
- [ ] StepRegistry automatically loads new step
- [ ] Workflow configurations updated
- [ ] Old Command/Handler files removed

#### Post-deployment:
- [ ] Monitor logs for step execution
- [ ] Verify step appears in StepRegistry
- [ ] Test workflow execution with new step
- [ ] Verify event publishing works correctly

## 11. Rollback Plan
- [ ] Keep old Command/Handler files until verification complete
- [ ] Database rollback not needed (no schema changes)
- [ ] Step file rollback procedure documented
- [ ] Workflow configuration rollback procedure

## 12. Success Criteria
- [ ] ListChatsStep successfully lists chat sessions
- [ ] Step integrates with existing ChatSessionService
- [ ] Event publishing works correctly
- [ ] All tests pass (unit, integration)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] Old Command/Handler files removed
- [ ] Step appears in StepRegistry
- [ ] Workflow execution works with new step

## 13. Risk Assessment

#### High Risk:
- [ ] **Service integration failure** - Mitigation: Thorough testing with mocked services
- [ ] **Event publishing failure** - Mitigation: Graceful error handling, fallback mechanisms

#### Medium Risk:
- [ ] **StepRegistry registration issues** - Mitigation: Verify file placement and naming conventions
- [ ] **Workflow integration problems** - Mitigation: Test with existing workflow system

#### Low Risk:
- [ ] **Documentation updates** - Mitigation: Automated documentation generation
- [ ] **Code style issues** - Mitigation: ESLint and Prettier configuration

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/ide/list-chats-step/list-chats-step-implementation.md'
- **category**: 'ide'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/list-chats-step",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300,
  "step_location": "backend/domain/steps/categories/ide/list_chats_step.js",
  "service_dependencies": ["ChatSessionService", "EventBus"]
}
```

#### Success Indicators:
- [ ] list_chats_step.js file created and functional
- [ ] Step appears in StepRegistry
- [ ] All tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Old Command/Handler files removed

## 15. References & Resources
- **Technical Documentation**: [ChatSessionService documentation]
- **API References**: [EventBus API]
- **Design Patterns**: [DDD Step pattern, Service integration pattern]
- **Best Practices**: [Step development guidelines, Error handling patterns]
- **Similar Implementations**: [create_chat_step.js, close_chat_step.js, switch_chat_step.js]

## 16. Implementation Details

### Step Structure:
```javascript
// backend/domain/steps/categories/ide/list_chats_step.js
const config = {
  name: 'ListChatsStep',
  type: 'ide',
  category: 'ide',
  description: 'List available chat sessions for user',
  version: '1.0.0',
  dependencies: ['chatSessionService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId'],
    optional: ['limit', 'offset', 'includeArchived']
  }
};

class ListChatsStep {
  async execute(context = {}) {
    // 1. Validate context
    this.validateContext(context);
    
    // 2. Get services
    const chatSessionService = context.getService('ChatSessionService');
    const eventBus = context.getService('EventBus');
    
    // 3. List sessions
    const sessions = await chatSessionService.listSessions(
      context.userId,
      {
        limit: context.limit || 10,
        offset: context.offset || 0,
        includeArchived: context.includeArchived || false
      }
    );
    
    // 4. Get session statistics
    const stats = await chatSessionService.getSessionStats(context.userId);
    
    // 5. Publish event
    await eventBus.publish('chat.listed', {
      userId: context.userId,
      sessionCount: sessions.length,
      stats: stats
    });
    
    // 6. Return result
    return {
      success: true,
      sessions: sessions,
      stats: stats,
      pagination: {
        limit: context.limit || 10,
        offset: context.offset || 0,
        total: sessions.length
      }
    };
  }
}
```

### Workflow Integration:
```json
{
  "chat-management-workflow": {
    "steps": [
      {
        "name": "list-chats",
        "step": "ListChatsStep",
        "options": { 
          "limit": 10,
          "includeArchived": false
        }
      },
      {
        "name": "switch-to-first-chat",
        "step": "SwitchChatStep",
        "options": {
          "sessionId": "{{list_chats.sessions[0].id}}"
        }
      }
    ]
  }
}
```

---

**Note**: This implementation converts the ListChatsHandler to a Step following DDD principles with 2-layer architecture (Steps → Services), removing the redundant Command/Handler layer for better performance and maintainability. 