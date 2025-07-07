# Task 1: ExecuteTaskCommand Implementation (KRITISCH)

## Goal
Create missing ExecuteTaskCommand and ExecuteDocsTaskCommand to fix critical system functionality.

## Priority
🔥 **CRITICAL** - System breaks without these commands

## Estimated Time
4-6 hours

## Dependencies
- None (can be implemented immediately)

## Current Problem
- ExecuteTaskCommand.js does not exist
- Referenced in 5+ places but missing
- TaskExecutionController cannot function
- CLI commands fail
- Tests fail

## Files to Create

### 1. ExecuteTaskCommand.js
**Path**: `backend/application/commands/ExecuteTaskCommand.js`
**Purpose**: Command pattern implementation for task execution
**Integration**: WorkflowOrchestrationService

### 2. ExecuteDocsTaskCommand.js
**Path**: `backend/application/commands/ExecuteDocsTaskCommand.js`
**Purpose**: Command pattern implementation for docs task execution
**Integration**: WorkflowOrchestrationService

## Implementation Details

### ExecuteTaskCommand.js
```javascript
const WorkflowOrchestrationService = require('../../domain/services/WorkflowOrchestrationService');

class ExecuteTaskCommand {
  constructor(workflowOrchestrationService, taskRepository) {
    this.workflowOrchestrationService = workflowOrchestrationService;
    this.taskRepository = taskRepository;
  }

  async execute(taskId, options = {}) {
    // Validate task exists
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Execute workflow using WorkflowOrchestrationService
    return await this.workflowOrchestrationService.executeWorkflow(task, options);
  }
}

module.exports = ExecuteTaskCommand;
```

### ExecuteDocsTaskCommand.js
```javascript
const WorkflowOrchestrationService = require('../../domain/services/WorkflowOrchestrationService');
const path = require('path');
const fs = require('fs').promises;

class ExecuteDocsTaskCommand {
  constructor(workflowOrchestrationService, docsTasksHandler) {
    this.workflowOrchestrationService = workflowOrchestrationService;
    this.docsTasksHandler = docsTasksHandler;
  }

  async execute(filename, options = {}) {
    // Validate docs task file exists
    const docsTask = await this.docsTasksHandler.getDocsTaskDetails({ params: { filename } });
    if (!docsTask) {
      throw new Error(`Docs task not found: ${filename}`);
    }

    // Create task object from markdown file
    const task = {
      id: `docs-${filename}`,
      title: docsTask.title,
      description: docsTask.description,
      type: { value: 'documentation' },
      metadata: {
        filename,
        filePath: docsTask.filePath,
        projectPath: docsTask.projectPath
      }
    };

    // Execute workflow using WorkflowOrchestrationService
    return await this.workflowOrchestrationService.executeWorkflow(task, options);
  }
}

module.exports = ExecuteDocsTaskCommand;
```

## Integration Points

### 1. TaskExecutionController.js
**Update**: Line 45 - Import and use ExecuteTaskCommand
```javascript
const ExecuteTaskCommand = require('../../application/commands/ExecuteTaskCommand');

// In executeTask method:
const command = new ExecuteTaskCommand(this.workflowOrchestrationService, this.taskRepository);
const result = await command.execute(taskId, options);
```

### 2. CLI/TaskCommands.js
**Update**: Line 165 - Import and use ExecuteTaskCommand
```javascript
const ExecuteTaskCommand = require('../../application/commands/ExecuteTaskCommand');

// In execute command:
const command = new ExecuteTaskCommand(workflowOrchestrationService, taskRepository);
const result = await command.execute(taskId, options);
```

### 3. CLI/TaskInteractiveCLI.js
**Update**: Line 267 - Import and use ExecuteTaskCommand
```javascript
const ExecuteTaskCommand = require('../../application/commands/ExecuteTaskCommand');

// In interactive execute:
const command = new ExecuteTaskCommand(workflowOrchestrationService, taskRepository);
const result = await command.execute(taskId, options);
```

## Testing Requirements

### Unit Tests
- [ ] ExecuteTaskCommand.test.js
  - Test task not found scenario
  - Test successful execution
  - Test error handling
  - Test options passing

- [ ] ExecuteDocsTaskCommand.test.js
  - Test docs task not found scenario
  - Test successful docs task execution
  - Test markdown file parsing
  - Test workflow integration

### Integration Tests
- [ ] TaskExecutionController integration
- [ ] CLI integration
- [ ] WorkflowOrchestrationService integration

## Success Criteria
- [ ] ExecuteTaskCommand.js exists and works
- [ ] ExecuteDocsTaskCommand.js exists and works
- [ ] TaskExecutionController can execute tasks
- [ ] CLI commands work
- [ ] All tests pass
- [ ] Proper error handling implemented
- [ ] Command pattern properly implemented

## Risk Assessment
- **LOW RISK**: Creating new files, no existing functionality to break
- **MEDIUM RISK**: Integration with existing systems
- **HIGH RISK**: If not implemented, system breaks

## Next Steps
1. Create ExecuteTaskCommand.js
2. Create ExecuteDocsTaskCommand.js
3. Update integration points
4. Write tests
5. Test integration

---

**Status**: Ready for Implementation
**Priority**: CRITICAL
**Blocked By**: Nothing
**Blocks**: Task 2 (WorkflowOrchestrationService Integration) 