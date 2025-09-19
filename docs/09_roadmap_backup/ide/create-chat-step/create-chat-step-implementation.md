# Create Chat Step Implementation

## 1. Project Overview
- **Feature/Component Name**: Create Chat Step
- **Priority**: High
- **Category**: ide
- **Estimated Time**: 4 hours
- **Dependencies**: ChatSessionService, EventBus, BrowserManager
- **Related Issues**: Convert CreateChatHandler to Step for 2-layer DDD architecture

## 2. Technical Requirements
- **Tech Stack**: Node.js, StepRegistry, ChatSessionService, EventBus, BrowserManager
- **Architecture Pattern**: DDD (Domain-Driven Design) - 2-layer (Steps → Services)
- **Database Changes**: None (ChatSessionService already exists)
- **API Changes**: None (Step internal)
- **Backend Changes**: Create new Step, remove Handler/Command, integrate with existing services
- **Frontend Changes**: None
- **Infrastructure Changes**: None

## 3. File Impact Analysis
#### Files to Create:
- [ ] `backend/domain/steps/categories/ide/create_chat_step.js` - New Step implementation with business logic
- [ ] `docs/09_roadmap/tasks/ide/create-chat-step/create-chat-step-index.md` - Master index file

#### Files to Modify:
- [ ] `backend/framework/workflows/task-workflows.json` - Add create_chat_step to workflows
- [ ] `backend/domain/steps/StepRegistry.js` - Register new step (automatic)

#### Files to Delete:
- [ ] `backend/application/commands/categories/ide/CreateChatCommand.js` - Remove Command (redundant)
- [ ] `backend/application/handlers/categories/ide/CreateChatHandler.js` - Remove Handler (redundant)

## 4. Implementation Phases

#### Phase 1: Foundation Setup (1 hour)
- [ ] Create create_chat_step.js file structure
- [ ] Set up Step configuration with proper metadata
- [ ] Add dependencies and validation rules
- [ ] Create master index file

#### Phase 2: Core Implementation (2 hours)
- [ ] Implement execute() method with business logic
- [ ] Add context validation (userId, title required)
- [ ] Integrate ChatSessionService for session creation
- [ ] Add BrowserManager integration for IDE interaction
- [ ] Implement event publishing via EventBus
- [ ] Add proper error handling and logging

#### Phase 3: Integration (0.5 hours)
- [ ] Register Step in StepRegistry (automatic via file placement)
- [ ] Update task-workflows.json to include create_chat_step
- [ ] Test Step execution via WorkflowController
- [ ] Verify Step appears in StepRegistry

#### Phase 4: Testing & Cleanup (0.5 hours)
- [ ] Write unit tests for create_chat_step.js
- [ ] Remove old CreateChatCommand.js file
- [ ] Remove old CreateChatHandler.js file
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
- [ ] Input validation and sanitization for userId and title
- [ ] User authentication verification (userId must be valid)
- [ ] Session creation security (prevent duplicate sessions)
- [ ] Event publishing security (validate event data)
- [ ] Error message security (no sensitive data in errors)

## 7. Performance Requirements
- **Response Time**: < 1000ms for session creation
- **Throughput**: 100+ session creations per minute
- **Memory Usage**: < 50MB per step execution
- **Database Queries**: Optimize ChatSessionService calls
- **Caching Strategy**: No caching needed for session creation

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/CreateChatStep.test.js`
- [ ] Test cases: 
  - Valid session creation with userId and title
  - Invalid userId (missing/empty)
  - Invalid title (missing/empty/too long)
  - Service failure handling
  - Event publishing verification
- [ ] Mock requirements: ChatSessionService, EventBus, BrowserManager

#### Integration Tests:
- [ ] Test file: `tests/integration/CreateChatStep.test.js`
- [ ] Test scenarios: 
  - Step execution via StepRegistry
  - Workflow integration
  - Database interaction
  - Event system integration
- [ ] Test data: Valid user IDs, various title formats

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for CreateChatStep class and execute method
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
- [ ] CreateChatStep successfully creates chat sessions
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
- **source_path**: 'docs/09_roadmap/tasks/ide/create-chat-step/create-chat-step-implementation.md'
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
  "git_branch_name": "feature/create-chat-step",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300,
  "step_location": "backend/domain/steps/categories/ide/create_chat_step.js",
  "service_dependencies": ["ChatSessionService", "EventBus", "BrowserManager"]
}
```

#### Success Indicators:
- [ ] create_chat_step.js file created and functional
- [ ] Step appears in StepRegistry
- [ ] All tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Old Command/Handler files removed

## 15. References & Resources
- **Technical Documentation**: [ChatSessionService documentation]
- **API References**: [EventBus API, BrowserManager API]
- **Design Patterns**: [DDD Step pattern, Service integration pattern]
- **Best Practices**: [Step development guidelines, Error handling patterns]
- **Similar Implementations**: [ide_send_message.js, confirmation_step.js]

## 16. Implementation Details

### Step Structure:
```javascript
// backend/domain/steps/categories/ide/create_chat_step.js
const config = {
  name: 'CreateChatStep',
  type: 'ide',
  category: 'ide',
  description: 'Create new chat session with IDE integration',
  version: '1.0.0',
  dependencies: ['chatSessionService', 'eventBus', 'browserManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['userId', 'title'],
    optional: ['metadata', 'ideType']
  }
};

class CreateChatStep {
  async execute(context = {}) {
    // 1. Validate context
    this.validateContext(context);
    
    // 2. Get services
    const chatSessionService = context.getService('ChatSessionService');
    const eventBus = context.getService('EventBus');
    const browserManager = context.getService('BrowserManager');
    
    // 3. Create session
    const session = await chatSessionService.createSession(
      context.userId,
      context.title,
      context.metadata
    );
    
    // 4. Publish event
    await eventBus.publish('chat.created', {
      sessionId: session.id,
      userId: context.userId,
      title: context.title
    });
    
    // 5. Return result
    return {
      success: true,
      session: session,
      message: 'Chat session created successfully'
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
        "name": "create-chat",
        "step": "CreateChatStep",
        "options": {
          "title": "New Analysis Session"
        }
      }
    ]
  }
}
```

---

**Note**: This implementation converts the CreateChatHandler to a Step following DDD principles with 2-layer architecture (Steps → Services), removing the redundant Command/Handler layer for better performance and maintainability. 