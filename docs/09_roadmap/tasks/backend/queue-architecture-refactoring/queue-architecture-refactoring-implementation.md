# Queue Architecture Refactoring Implementation

## 1. Project Overview
- **Feature/Component Name**: Queue Architecture Refactoring
- **Priority**: High
- **Category**: backend
- **Estimated Time**: 8 hours
- **Dependencies**: None
- **Related Issues**: Queue progress not showing, step tracking issues, direct task execution bypassing queue
- **Created**: 2025-01-28T19:18:51.000Z

## 2. Technical Requirements
- **Tech Stack**: Node.js, React, WebSocket, Event-driven architecture
- **Architecture Pattern**: Event-driven, Queue-based execution
- **Database Changes**: None (uses existing queue tables)
- **API Changes**: TaskService.executeTask() refactoring, remove direct execution endpoints
- **Frontend Changes**: Event listener unification, remove task:step:* event listeners
- **Backend Changes**: TaskService refactoring, StepProgressService removal, QueueMonitoringService enhancement

## 3. File Impact Analysis
#### Files to Modify:
- [ ] `backend/domain/services/task/TaskService.js` - Refactor executeTask() to use queue system
- [ ] `backend/application/services/TaskApplicationService.js` - Update to use queue-based execution
- [ ] `backend/presentation/api/TaskController.js` - Update executeTask endpoint
- [ ] `backend/presentation/api/WorkflowController.js` - Ensure task execution goes through queue
- [ ] `frontend/src/presentation/components/queue/QueueManagementPanel.jsx` - Remove task:step:* event listeners
- [ ] `frontend/src/presentation/components/TaskProgressComponent.jsx` - Remove task:step:* event listeners
- [ ] `frontend/src/infrastructure/repositories/QueueRepository.jsx` - Ensure proper step progress handling

#### Files to Create:
- [ ] `backend/domain/services/queue/QueueTaskExecutionService.js` - New service for queue-based task execution
- [ ] `backend/tests/unit/QueueTaskExecutionService.test.js` - Unit tests for new service
- [ ] `backend/tests/integration/QueueTaskExecution.test.js` - Integration tests

#### Files to Delete:
- [ ] `backend/domain/services/queue/StepProgressService.js` - Remove (functionality moved to QueueMonitoringService)

## 4. Implementation Phases

#### Phase 1: TaskService Refactoring (3 hours)
- [ ] Create QueueTaskExecutionService
- [ ] Refactor TaskService.executeTask() to use queue system
- [ ] Update TaskApplicationService
- [ ] Update TaskController
- [ ] Write unit tests for new service

#### Phase 2: StepProgressService Removal (3 hours)
- [ ] Remove StepProgressService
- [ ] Enhance QueueMonitoringService with step progress functionality
- [ ] Update all task:step:* event emitters to workflow:step:*
- [ ] Update event listeners in backend services
- [ ] Write integration tests

#### Phase 3: Frontend Event Unification (2 hours)
- [ ] Remove task:step:* event listeners from frontend
- [ ] Update QueueManagementPanel to only use workflow:step:* events
- [ ] Update TaskProgressComponent
- [ ] Test queue progress display
- [ ] Validate 24/7 automation functionality

## 5. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 6. Security Considerations
- [ ] Maintain existing authentication and authorization
- [ ] Ensure queue items are properly scoped to projects/users
- [ ] Validate task execution permissions
- [ ] Audit logging for all queue operations
- [ ] Protection against queue manipulation

## 7. Performance Requirements
- **Response Time**: < 100ms for queue operations
- **Throughput**: Support 100+ concurrent tasks
- **Memory Usage**: < 50MB for queue monitoring
- **Database Queries**: Optimized queue queries with proper indexing
- **Caching Strategy**: Cache queue status for 5 seconds

## 8. Testing Strategy

#### Unit Tests:
- [ ] Test file: `backend/tests/unit/QueueTaskExecutionService.test.js`
- [ ] Test cases: Queue-based task execution, event emission, error handling
- [ ] Mock requirements: QueueMonitoringService, EventBus, TaskRepository

#### Integration Tests:
- [ ] Test file: `backend/tests/integration/QueueTaskExecution.test.js`
- [ ] Test scenarios: End-to-end task execution through queue, step progress tracking
- [ ] Test data: Sample tasks, workflow configurations

#### E2E Tests:
- [ ] Test file: `frontend/tests/e2e/QueueTaskExecution.test.jsx`
- [ ] User flows: Task execution, progress monitoring, queue management
- [ ] Browser compatibility: Chrome, Firefox compatibility

## 9. Documentation Requirements

#### Code Documentation:
- [ ] JSDoc comments for all new methods
- [ ] README updates with new queue architecture
- [ ] API documentation for updated endpoints
- [ ] Architecture diagrams for queue flow

#### User Documentation:
- [ ] Update queue management documentation
- [ ] Document new task execution flow
- [ ] Troubleshooting guide for queue issues

## 10. Deployment Checklist

#### Pre-deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Documentation updated and reviewed
- [ ] Performance benchmarks met
- [ ] Queue migration tested

#### Deployment:
- [ ] Database migrations (if any)
- [ ] Service restarts for backend changes
- [ ] Frontend deployment
- [ ] Health checks configured
- [ ] Queue monitoring active

#### Post-deployment:
- [ ] Monitor queue performance
- [ ] Verify task execution flow
- [ ] Check step progress tracking
- [ ] Validate 24/7 automation

## 11. Rollback Plan
- [ ] Database rollback script prepared
- [ ] Service rollback procedure documented
- [ ] Frontend rollback procedure
- [ ] Communication plan for stakeholders

## 12. Success Criteria
- [ ] All task execution goes through queue system
- [ ] Only 'workflow:step:*' events are used (no more 'task:step:*' events)
- [ ] Step progress properly displayed in queue UI
- [ ] 24/7 automation works without frontend intervention
- [ ] No direct task execution bypassing queue
- [ ] Unified event architecture across all components
- [ ] All tests pass
- [ ] Performance requirements met

## 13. Risk Assessment

#### High Risk:
- [ ] Breaking existing task execution functionality - Mitigation: Comprehensive testing, gradual rollout
- [ ] Event system conflicts during transition - Mitigation: Parallel testing, rollback plan

#### Medium Risk:
- [ ] Performance impact of queue-based execution - Mitigation: Performance testing, optimization
- [ ] Frontend event listener issues - Mitigation: Thorough testing, fallback mechanisms

#### Low Risk:
- [ ] Documentation updates - Mitigation: Automated documentation generation

## 14. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/tasks/backend/queue-architecture-refactoring/queue-architecture-refactoring-implementation.md'
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
  "git_branch_name": "feature/queue-architecture-refactoring",
  "confirmation_keywords": ["fertig", "done", "complete"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 300
}
```

#### Success Indicators:
- [ ] All checkboxes in phases completed
- [ ] Tests pass
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] Queue progress properly displayed
- [ ] No task:step:* events in codebase

## 15. References & Resources
- **Technical Documentation**: [Queue Management System](../backend/queue-management-system/queue-management-system-implementation.md)
- **API References**: [Queue API Documentation](../../../08_reference/api/queue-api.md)
- **Design Patterns**: Event-driven architecture, Queue-based execution
- **Best Practices**: Microservices patterns, Event sourcing
- **Similar Implementations**: [WorkflowController.js](../../../../backend/presentation/api/WorkflowController.js)

## 16. Detailed Technical Implementation

### Current Problem Analysis
```javascript
// ❌ CURRENT: TaskService bypasses queue
TaskService.executeTask(taskId, userId, options)
  → Direct step execution
  → Emits 'task:step:progress'
  → BYPASS QueueMonitoringService

// ✅ TARGET: All execution through queue
TaskService.executeTask(taskId, userId, options)
  → QueueTaskExecutionService.addToQueue()
  → QueueMonitoringService.processQueue()
  → Emits 'workflow:step:progress'
```

### New Architecture Flow
```javascript
// 1. Task Execution Request
TaskController.executeTask()
  → TaskApplicationService.executeTask()
  → QueueTaskExecutionService.addToQueue()

// 2. Queue Processing
QueueMonitoringService.processQueue()
  → WorkflowController.executeWorkflowSteps()
  → Step execution with progress tracking
  → Emits 'workflow:step:progress'

// 3. Frontend Updates
QueueManagementPanel
  → Listens to 'workflow:step:progress'
  → Updates step progress display
  → Shows current step and percentage
```

### Event System Unification
```javascript
// ❌ REMOVE: Task-specific events
'task:step:progress'
'task:step:started'
'task:step:completed'
'task:step:failed'

// ✅ KEEP: Workflow events (for everything)
'workflow:step:progress'
'workflow:step:started'
'workflow:step:completed'
'workflow:step:failed'
```

### QueueTaskExecutionService Interface
```javascript
class QueueTaskExecutionService {
  async addTaskToQueue(projectId, userId, taskId, options) {
    // Add task to queue with proper metadata
  }
  
  async getTaskExecutionStatus(queueItemId) {
    // Get current execution status
  }
  
  async cancelTaskExecution(queueItemId) {
    // Cancel task execution
  }
}
```

This implementation ensures all task execution goes through the queue system, providing proper progress tracking and enabling 24/7 automation without frontend intervention. 