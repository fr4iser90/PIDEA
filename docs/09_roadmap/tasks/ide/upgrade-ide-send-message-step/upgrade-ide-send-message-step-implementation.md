# Upgrade IDE Send Message Step Implementation

## 1. Project Overview
- **Feature/Component Name**: Upgrade IDE Send Message Step
- **Priority**: High
- **Category**: ide
- **Estimated Time**: 4 hours
- **Dependencies**: ChatMessageHandlerRefactored, AITextDetector, BrowserManager
- **Related Issues**: Enhance existing ide_send_message.js with intelligent chat functionality

## 2. Technical Requirements
- **Tech Stack**: Node.js, StepRegistry, ChatMessageHandlerRefactored, AITextDetector, BrowserManager
- **Architecture Pattern**: DDD (Domain-Driven Design) - 2-layer (Steps → Services)
- **Database Changes**: None (existing services)
- **API Changes**: None (Step internal)
- **Backend Changes**: Enhance existing Step, integrate intelligent chat services
- **Frontend Changes**: None
- **Infrastructure Changes**: None

## 3. File Impact Analysis
#### Files to Modify:
- [ ] `backend/domain/steps/categories/ide/ide_send_message.js` - Enhance existing Step with intelligent functionality
- [ ] `docs/09_roadmap/tasks/ide/upgrade-ide-send-message-step/upgrade-ide-send-message-step-index.md` - Master index file

#### Files to Create:
- [ ] `docs/09_roadmap/tasks/ide/upgrade-ide-send-message-step/upgrade-ide-send-message-step-index.md` - Master index file

#### Files to Delete:
- None (enhancing existing file)

## 4. Implementation Phases

#### Phase 1: Foundation Setup (1 hour)
- [ ] Analyze existing ide_send_message.js implementation
- [ ] Plan integration with ChatMessageHandlerRefactored
- [ ] Set up enhanced Step configuration
- [ ] Create master index file

#### Phase 2: Core Implementation (2 hours)
- [ ] Enhance execute() method with intelligent chat functionality
- [ ] Add waitForResponse option support
- [ ] Integrate ChatMessageHandlerRefactored for message processing
- [ ] Add AITextDetector for response analysis
- [ ] Implement timeout and completion detection
- [ ] Add proper error handling and logging

#### Phase 3: Integration (0.5 hours)
- [ ] Test enhanced Step execution via WorkflowController
- [ ] Verify Step appears in StepRegistry with new functionality
- [ ] Update task-workflows.json examples
- [ ] Test both simple and intelligent modes

#### Phase 4: Testing & Documentation (0.5 hours)
- [ ] Write unit tests for enhanced functionality
- [ ] Update documentation and examples
- [ ] Create usage examples for both modes
- [ ] Verify backward compatibility

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Input validation and sanitization for messages
- [ ] User authentication verification (userId must be valid)
- [ ] Message content security (no sensitive data exposure)
- [ ] Timeout limits to prevent hanging
- [ ] Error message security (no sensitive data in errors)

## 7. Performance Requirements
- **Response Time**: < 1000ms for simple send, < 60000ms for intelligent mode
- **Throughput**: 100+ message sends per minute
- **Memory Usage**: < 100MB per step execution (intelligent mode)
- **Database Queries**: Optimize service calls
- **Caching Strategy**: No caching needed for message sending

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `tests/unit/IDESendMessageStep.test.js`
- [ ] Test cases: 
  - Simple message sending (existing functionality)
  - Intelligent message sending with waitForResponse
  - Timeout handling
  - Completion detection
  - Service failure handling
  - Both modes (simple vs intelligent)
- [ ] Mock requirements: ChatMessageHandlerRefactored, AITextDetector, BrowserManager

#### Integration Tests:
- [ ] Test file: `tests/integration/IDESendMessageStep.test.js`
- [ ] Test scenarios: 
  - Step execution via StepRegistry
  - Workflow integration
  - Service integration
  - Response analysis integration
- [ ] Test data: Various message types, timeout scenarios

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for enhanced IDESendMessageStep class and execute method
- [ ] README updates with new intelligent functionality
- [ ] Step configuration documentation
- [ ] Integration examples with workflows

#### User Documentation:
- [ ] Step usage guide for developers
- [ ] Workflow integration examples
- [ ] Troubleshooting guide for common issues
- [ ] Comparison of simple vs intelligent modes

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks met

#### Deployment:
- [ ] Enhanced Step file deployed to correct location
- [ ] StepRegistry automatically loads enhanced step
- [ ] Workflow configurations updated with new options
- [ ] Backward compatibility verified

#### Post-deployment:
- [ ] Monitor logs for step execution
- [ ] Verify step appears in StepRegistry with new functionality
- [ ] Test workflow execution with enhanced step
- [ ] Verify both simple and intelligent modes work

## 11. Rollback Plan
- [ ] Keep backup of original ide_send_message.js
- [ ] Database rollback not needed (no schema changes)
- [ ] Step file rollback procedure documented
- [ ] Workflow configuration rollback procedure

## 12. Success Criteria
- [ ] IDESendMessageStep supports both simple and intelligent modes
- [ ] Step integrates with ChatMessageHandlerRefactored
- [ ] AITextDetector integration works correctly
- [ ] All tests pass (unit, integration)
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Documentation complete and accurate
- [ ] Backward compatibility maintained
- [ ] Step appears in StepRegistry with enhanced functionality
- [ ] Workflow execution works with both modes

## 13. Risk Assessment

#### High Risk:
- [ ] **Service integration failure** - Mitigation: Thorough testing with mocked services
- [ ] **Backward compatibility issues** - Mitigation: Comprehensive testing of existing functionality

#### Medium Risk:
- [ ] **Performance degradation** - Mitigation: Performance testing and optimization
- [ ] **Timeout handling issues** - Mitigation: Robust timeout and error handling

#### Low Risk:
- [ ] **Documentation updates** - Mitigation: Automated documentation generation
- [ ] **Code style issues** - Mitigation: ESLint and Prettier configuration

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/ide/upgrade-ide-send-message-step/upgrade-ide-send-message-step-implementation.md'
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
  "git_branch_name": "feature/upgrade-ide-send-message-step",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300,
  "step_location": "backend/domain/steps/categories/ide/ide_send_message.js",
  "service_dependencies": ["ChatMessageHandlerRefactored", "AITextDetector", "BrowserManager"]
}
```

#### Success Indicators:
- [ ] ide_send_message.js enhanced with intelligent functionality
- [ ] Step supports both simple and intelligent modes
- [ ] All tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Backward compatibility maintained

## 15. References & Resources
- **Technical Documentation**: [ChatMessageHandlerRefactored documentation, AITextDetector documentation]
- **API References**: [BrowserManager API]
- **Design Patterns**: [DDD Step pattern, Service integration pattern]
- **Best Practices**: [Step development guidelines, Error handling patterns]
- **Similar Implementations**: [create_chat_step.js, close_chat_step.js, switch_chat_step.js]

## 16. Implementation Details

### Enhanced Step Structure:
```javascript
// backend/domain/steps/categories/ide/ide_send_message.js (ENHANCED)
const config = {
  name: 'IDESendMessageStep',
  type: 'ide',
  category: 'ide',
  description: 'Send message to IDE with optional intelligent response handling',
  version: '2.0.0',
  dependencies: ['chatMessageHandler', 'aiTextDetector', 'browserManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 60000
  },
  validation: {
    required: ['projectId', 'message'],
    optional: ['workspacePath', 'ideType', 'waitForResponse', 'timeout']
  }
};

class IDESendMessageStep {
  async execute(context = {}) {
    // 1. Validate context
    this.validateContext(context);
    
    const { 
      projectId, 
      message, 
      waitForResponse = false, 
      timeout = 60000 
    } = context;
    
    // 2. Get services
    const chatMessageHandler = context.getService('ChatMessageHandlerRefactored');
    const browserManager = context.getService('BrowserManager');
    
    if (waitForResponse) {
      // 3a. Intelligent mode with response waiting
      return await this.sendMessageAndWait(message, context, timeout);
    } else {
      // 3b. Simple mode (existing functionality)
      return await this.sendMessageOnly(message, context);
    }
  }
  
  async sendMessageAndWait(message, context, timeout) {
    // Use ChatMessageHandlerRefactored for intelligent processing
    const chatHandler = new ChatMessageHandlerRefactored(
      context.browserManager,
      context.ideType,
      context.selectors
    );
    
    const result = await chatHandler.sendMessageAndWait(message, {
      timeout,
      analyzeQuality: true,
      detectCompletion: true
    });
    
    return {
      success: true,
      userMessage: result.userMessage,
      aiResponse: result.aiResponse,
      completion: result.aiResponse.completion,
      quality: result.aiResponse.quality
    };
  }
  
  async sendMessageOnly(message, context) {
    // Existing simple functionality
    const ideService = context.getService('IDEService');
    const result = await ideService.sendMessage(message, {
      timeout: context.timeout || 30000
    });
    
    return {
      success: true,
      message: 'Message sent to IDE',
      data: result
    };
  }
}
```

### Enhanced Workflow Integration:
```json
{
  "simple-chat-workflow": {
    "steps": [
      {
        "name": "send-simple-message",
        "step": "IDESendMessageStep",
        "options": { 
          "message": "Hello AI!",
          "waitForResponse": false
        }
      }
    ]
  },
  "intelligent-chat-workflow": {
    "steps": [
      {
        "name": "send-intelligent-message",
        "step": "IDESendMessageStep",
        "options": { 
          "message": "Analyze this code",
          "waitForResponse": true,
          "timeout": 60000
        }
      }
    ]
  }
}
```

---

**Note**: This implementation enhances the existing ide_send_message.js Step with intelligent chat functionality using ChatMessageHandlerRefactored, while maintaining backward compatibility with the existing simple mode. 