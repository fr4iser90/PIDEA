# Phase 3: Backend Review Workflow

## Goal
Use existing WorkflowController.executeWorkflow() with StepRegistry system for IDE communication and task-check-state.md workflow execution.

## Estimated Time
2 hours

## Tasks
- [ ] Use existing WorkflowController.executeWorkflow() endpoint
- [ ] Add task-review mode mapping in WorkflowController
- [ ] Implement StepRegistry-based workflow execution
- [ ] Integrate IDE communication via IDESendMessageStep
- [ ] Add multi-task processing with workflow execution

## Implementation Details

### WorkflowController Integration
```javascript
// Use existing WorkflowController.executeWorkflow()
// Route: POST /api/projects/:projectId/workflow/execute
// Body: {
//   mode: 'task-review',
//   tasks: selectedTasks,
//   options: {
//     workflowPrompt: 'task-check-state.md',
//     autoExecute: true
//   }
// }

// In WorkflowController.js - Add task-review mode mapping
const stepMappings = {
  'task-review': 'IDESendMessageStep',
  'analysis': 'AnalysisStep',
  'generation': 'GenerationStep'
};
```

### StepRegistry Implementation
```javascript
// WorkflowController.executeWorkflow() implementation
async executeWorkflow(req, res) {
  const { mode, tasks, options } = req.body;
  
  if (mode === 'task-review') {
    // Process each task with step execution
    for (const task of tasks) {
      const stepOptions = {
        projectId,
        workspacePath,
        message: task.content, // task-check-state.md content
        userId,
        requestedBy: userId,
        sessionId: `review_${task.id}_${Date.now()}`
      };
      
      // Execute step via StepRegistry
      const result = await stepRegistry.executeStep('IDESendMessageStep', stepOptions);
      
      // IDE communication via SendMessageHandler + BrowserManager
    }
  }
}
```

### IDE Communication Flow
```javascript
// IDESendMessageStep → SendMessageHandler → BrowserManager → IDE
// 1. IDESendMessageStep.execute() is called
// 2. SendMessageHandler.handle() performs Business Logic + Browser Automation
// 3. BrowserManager.sendMessage() sends prompts to IDE
// 4. BrowserManager.getLatestResponse() gets responses
// 5. task-check-state.md is sent as prompt
```

### Files to Modify
- `backend/presentation/api/WorkflowController.js` - Add task-review mode mapping

### Success Criteria
- [ ] WorkflowController recognizes task-review mode
- [ ] StepRegistry executes IDESendMessageStep for each task
- [ ] IDE communication via SendMessageHandler + BrowserManager
- [ ] task-check-state.md content sent as prompts to IDE
- [ ] Multi-task processing with workflow execution
- [ ] Progress tracking works for each task
- [ ] Error handling prevents batch failure
- [ ] Results are properly aggregated and returned

## Dependencies
- Existing WorkflowController and StepRegistry system
- IDESendMessageStep and SendMessageHandler
- BrowserManager for IDE communication
- task-check-state.md workflow content

## Testing
- Integration tests for WorkflowController task-review mode
- StepRegistry execution testing
- IDE communication testing
- Multi-task processing testing
- Error handling testing

