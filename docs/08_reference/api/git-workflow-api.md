# Git Workflow API Reference

## Overview

The Enhanced Git Workflow API provides comprehensive git workflow automation capabilities for PIDEA. This API integrates with existing services and provides enhanced branch management, pull request creation, and workflow orchestration.

## Core Components

### GitWorkflowManager

The central orchestrator for all git-related workflow operations.

#### Constructor

```javascript
const GitWorkflowManager = require('@/domain/workflows/git/GitWorkflowManager');

const manager = new GitWorkflowManager({
  gitService: GitService,
  logger: Logger,
  eventBus: EventBus
});
```

#### Methods

##### createBranch(context)

Creates a new branch based on the task type and strategy.

**Parameters:**
- `context` (GitWorkflowContext): Workflow context containing project path, task, and options

**Returns:** Promise<GitWorkflowResult>

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: {
    id: 'task-1',
    title: 'Add user authentication',
    type: { value: 'feature' }
  },
  options: { autoMerge: false },
  workflowType: 'branch-creation'
});

const result = await manager.createBranch(context);
// Returns: { success: true, branchName: 'feature/add-user-authentication', ... }
```

##### executeWorkflow(context)

Executes a complete workflow including branch creation, task execution, and completion.

**Parameters:**
- `context` (GitWorkflowContext): Workflow context

**Returns:** Promise<GitWorkflowResult>

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: {
    id: 'task-1',
    title: 'Add user authentication',
    type: { value: 'feature' }
  },
  options: { autoMerge: true },
  workflowType: 'workflow-execution'
});

const result = await manager.executeWorkflow(context);
// Returns: { success: true, workflowType: 'workflow-execution', ... }
```

##### completeWorkflow(context)

Completes a workflow by committing changes and optionally merging.

**Parameters:**
- `context` (GitWorkflowContext): Workflow context with branch name

**Returns:** Promise<GitWorkflowResult>

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: { id: 'task-1', title: 'Add user authentication' },
  options: { autoMerge: true },
  workflowType: 'workflow-completion',
  branchName: 'feature/add-user-authentication'
});

const result = await manager.completeWorkflow(context);
// Returns: { success: true, status: 'completed', ... }
```

##### createPullRequest(context)

Creates a pull request for the specified branch.

**Parameters:**
- `context` (GitWorkflowContext): Workflow context with branch name

**Returns:** Promise<GitWorkflowResult>

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: { id: 'task-1', title: 'Add user authentication' },
  options: {},
  workflowType: 'pull-request-creation',
  branchName: 'feature/add-user-authentication'
});

const result = await manager.createPullRequest(context);
// Returns: { success: true, prUrl: 'https://github.com/...', ... }
```

### GitWorkflowContext

Context object containing all information needed for workflow execution.

#### Constructor

```javascript
const GitWorkflowContext = require('@/domain/workflows/git/GitWorkflowContext');

const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: TaskObject,
  options: WorkflowOptions,
  workflowType: 'workflow-execution',
  branchName: 'optional-branch-name'
});
```

#### Properties

- `projectPath` (string): Path to the git repository
- `task` (Object): Task object with id, title, type, and metadata
- `options` (Object): Workflow options (autoMerge, createPullRequest, etc.)
- `workflowType` (string): Type of workflow ('branch-creation', 'workflow-execution', etc.)
- `branchName` (string, optional): Existing branch name for operations

### GitWorkflowResult

Result object returned by all workflow operations.

#### Properties

- `success` (boolean): Whether the operation was successful
- `error` (string, optional): Error message if operation failed
- `branchName` (string, optional): Created or used branch name
- `workflowType` (string): Type of workflow executed
- `status` (string): Status of the operation
- `prUrl` (string, optional): Pull request URL if created
- `metadata` (Object): Additional metadata about the operation

## Service Integration

### WorkflowGitService Integration

The enhanced WorkflowGitService now uses GitWorkflowManager internally while maintaining backward compatibility.

#### Enhanced Methods

##### createWorkflowBranch(projectPath, task, options)

Creates a workflow branch using the enhanced git workflow manager.

**Parameters:**
- `projectPath` (string): Project path
- `task` (Object): Task object
- `options` (Object): Workflow options

**Returns:** Promise<Object>

**Example:**
```javascript
const workflowGitService = new WorkflowGitService({
  gitService: gitService,
  logger: logger,
  eventBus: eventBus
});

const result = await workflowGitService.createWorkflowBranch(
  '/path/to/project',
  {
    id: 'task-1',
    title: 'Add user authentication',
    type: { value: 'feature' }
  },
  { autoMerge: false }
);
```

##### completeWorkflow(projectPath, branchName, task, options)

Completes a workflow using the enhanced git workflow manager.

**Parameters:**
- `projectPath` (string): Project path
- `branchName` (string): Branch name
- `task` (Object): Task object
- `options` (Object): Workflow options

**Returns:** Promise<Object>

##### createPullRequest(projectPath, branchName, task, options)

Creates a pull request using the enhanced git workflow manager.

**Parameters:**
- `projectPath` (string): Project path
- `branchName` (string): Branch name
- `task` (Object): Task object
- `options` (Object): Pull request options

**Returns:** Promise<Object>

### WorkflowOrchestrationService Integration

The WorkflowOrchestrationService now uses the enhanced git workflow system.

#### Enhanced Methods

##### executeWorkflow(task, options)

Executes a workflow using the enhanced git workflow manager.

**Parameters:**
- `task` (Object): Task object
- `options` (Object): Workflow options

**Returns:** Promise<Object>

**Example:**
```javascript
const orchestrationService = new WorkflowOrchestrationService({
  workflowGitService: workflowGitService,
  logger: logger,
  eventBus: eventBus
});

const result = await orchestrationService.executeWorkflow(
  {
    id: 'task-1',
    title: 'Add user authentication',
    type: { value: 'feature' },
    metadata: { projectPath: '/path/to/project' }
  },
  { autoMerge: true, createPullRequest: true }
);
```

### TaskService Integration

The TaskService now integrates with the enhanced git workflow system.

#### Enhanced Methods

##### executeTask(taskId, userId)

Executes a task using the enhanced git workflow manager.

**Parameters:**
- `taskId` (string): Task ID
- `userId` (Object): User information with project path

**Returns:** Promise<Object>

**Example:**
```javascript
const taskService = new TaskService(
  taskRepository,
  aiService,
  projectAnalyzer,
  cursorIDEService,
  autoFinishSystem,
  workflowGitService
);

const result = await taskService.executeTask('task-1', {
  projectPath: '/path/to/project'
});
```

### AutoFinishSystem Integration

The AutoFinishSystem now uses the enhanced git workflow system for task processing.

#### Enhanced Methods

##### processTask(task, sessionId, options)

Processes a task using the enhanced git workflow manager.

**Parameters:**
- `task` (Object): Task object
- `sessionId` (string): Session ID
- `options` (Object): Processing options

**Returns:** Promise<Object>

**Example:**
```javascript
const autoFinishSystem = new AutoFinishSystem(
  cursorIDE,
  browserManager,
  ideManager,
  webSocketManager
);

const result = await autoFinishSystem.processTask(
  {
    id: 'task-1',
    description: 'Add user authentication',
    metadata: { projectPath: '/path/to/project' }
  },
  'session-1',
  { autoMerge: true }
);
```

## Branch Strategies

### Feature Branch Strategy

Creates feature branches from the `pidea-features` branch.

**Branch Pattern:** `feature/{task-title-kebab-case}`

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: {
    id: 'task-1',
    title: 'Add user authentication',
    type: { value: 'feature' }
  },
  options: {},
  workflowType: 'branch-creation'
});

const result = await manager.createBranch(context);
// Creates branch: feature/add-user-authentication
```

### Bug Fix Strategy

Creates hotfix branches from the `main` branch.

**Branch Pattern:** `hotfix/{task-title-kebab-case}`

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: {
    id: 'task-1',
    title: 'Fix login bug',
    type: { value: 'bug' }
  },
  options: {},
  workflowType: 'branch-creation'
});

const result = await manager.createBranch(context);
// Creates branch: hotfix/fix-login-bug
```

### Refactoring Strategy

Creates refactoring branches from the `main` branch.

**Branch Pattern:** `refactor/{task-title-kebab-case}`

**Example:**
```javascript
const context = new GitWorkflowContext({
  projectPath: '/path/to/project',
  task: {
    id: 'task-1',
    title: 'Refactor database layer',
    type: { value: 'refactor' }
  },
  options: {},
  workflowType: 'branch-creation'
});

const result = await manager.createBranch(context);
// Creates branch: refactor/refactor-database-layer
```

## Workflow Options

### Common Options

- `autoMerge` (boolean): Whether to automatically merge after completion
- `createPullRequest` (boolean): Whether to create a pull request
- `requireReview` (boolean): Whether pull request requires review
- `mergeTarget` (string): Target branch for merging (default: based on strategy)
- `mergeStrategy` (string): Merge strategy ('squash', 'merge', 'rebase')

### Example Configuration

```javascript
const options = {
  autoMerge: false,
  createPullRequest: true,
  requireReview: true,
  mergeTarget: 'develop',
  mergeStrategy: 'squash'
};
```

## Event System

### Published Events

The git workflow system publishes the following events:

#### git.workflow.branch.created

Published when a new branch is created.

**Event Data:**
```javascript
{
  projectPath: '/path/to/project',
  taskId: 'task-1',
  branchName: 'feature/add-user-authentication',
  strategy: 'feature',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### git.workflow.executed

Published when a workflow is executed.

**Event Data:**
```javascript
{
  projectPath: '/path/to/project',
  taskId: 'task-1',
  workflowType: 'workflow-execution',
  branchName: 'feature/add-user-authentication',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### git.workflow.completed

Published when a workflow is completed.

**Event Data:**
```javascript
{
  projectPath: '/path/to/project',
  taskId: 'task-1',
  branchName: 'feature/add-user-authentication',
  status: 'completed',
  autoMerged: false,
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### git.workflow.pull_request.created

Published when a pull request is created.

**Event Data:**
```javascript
{
  projectPath: '/path/to/project',
  taskId: 'task-1',
  branchName: 'feature/add-user-authentication',
  prUrl: 'https://github.com/...',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Error Handling

### GitWorkflowException

Custom exception thrown for git workflow errors.

**Example:**
```javascript
try {
  const result = await manager.createBranch(context);
} catch (error) {
  if (error instanceof GitWorkflowException) {
    console.error('Git workflow error:', error.message);
  }
}
```

### Fallback Mechanisms

All services include fallback mechanisms to legacy methods if the enhanced git workflow manager fails.

**Example:**
```javascript
// WorkflowGitService automatically falls back to legacy method
const result = await workflowGitService.createWorkflowBranch(
  projectPath,
  task,
  options
);
// If enhanced method fails, automatically uses legacy method
```

## Metrics and Auditing

### Metrics Collection

The system automatically collects metrics for all operations:

- Branch creation success/failure rates
- Workflow execution times
- Pull request creation success rates
- Error rates and types

### Audit Logging

All operations are logged for audit purposes:

- Operation type and parameters
- Success/failure status
- Error details if applicable
- Timestamp and user information

## Best Practices

### Configuration

1. Always provide proper project paths
2. Use appropriate task types for correct branch strategies
3. Configure merge strategies based on team preferences
4. Set up proper event handling for monitoring

### Error Handling

1. Always handle GitWorkflowException
2. Implement fallback mechanisms
3. Log errors for debugging
4. Provide user-friendly error messages

### Performance

1. Use concurrent operations for multiple tasks
2. Implement proper cleanup for completed workflows
3. Monitor resource usage
4. Use appropriate timeouts for operations

## Migration Guide

### From Legacy to Enhanced

1. Update service constructors to include GitWorkflowManager
2. Replace direct git operations with workflow manager calls
3. Update event handling for new event types
4. Test fallback mechanisms

### Backward Compatibility

All existing code continues to work with fallback to legacy methods:

```javascript
// Legacy code continues to work
const result = await workflowGitService.createWorkflowBranch(
  projectPath,
  task,
  options
);

// Enhanced code provides additional features
const context = new GitWorkflowContext({...});
const result = await gitWorkflowManager.createBranch(context);
``` 