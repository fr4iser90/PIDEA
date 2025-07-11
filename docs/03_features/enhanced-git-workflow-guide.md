# Enhanced Git Workflow Guide

## Overview

The Enhanced Git Workflow System in PIDEA provides automated git operations for development tasks. This system integrates seamlessly with existing workflows while providing advanced features like automated branch creation, pull request generation, and intelligent merge strategies.

## Key Features

- **Automated Branch Management**: Creates branches based on task type and naming conventions
- **Smart Pull Request Creation**: Generates pull requests with appropriate templates and reviewers
- **Intelligent Merge Strategies**: Supports multiple merge methods with automation levels
- **Workflow Orchestration**: Coordinates complete development workflows
- **Error Recovery**: Robust error handling with fallback mechanisms
- **Metrics & Auditing**: Comprehensive tracking and reporting
- **Event System**: Real-time notifications for workflow events

## Getting Started

### Prerequisites

1. **Git Repository**: Ensure your project is a git repository
2. **PIDEA Setup**: Have PIDEA properly configured with git service
3. **Project Path**: Know the path to your project directory

### Basic Usage

The enhanced git workflow system is automatically integrated into existing PIDEA services. No additional setup is required for basic usage.

#### Creating a Feature Task

```javascript
// Create a feature task
const task = {
  id: 'feature-1',
  title: 'Add user authentication',
  description: 'Implement user authentication system',
  type: { value: 'feature' },
  metadata: {
    projectPath: '/path/to/your/project'
  }
};

// Execute the workflow
const result = await workflowOrchestrationService.executeWorkflow(task, {
  autoMerge: false,
  createPullRequest: true,
  requireReview: true
});
```

This will automatically:
1. Create a branch named `feature/add-user-authentication`
2. Checkout the new branch
3. Execute the task
4. Create a pull request for review

## Workflow Types

### Feature Development

**Use Case**: New feature implementation

**Branch Strategy**: Creates feature branches from `pidea-features`
**Branch Pattern**: `feature/{task-title-kebab-case}`

**Example**:
```javascript
const featureTask = {
  title: 'Add payment processing',
  type: { value: 'feature' },
  metadata: { projectPath: '/path/to/project' }
};

// Creates branch: feature/add-payment-processing
```

### Bug Fixes

**Use Case**: Critical bug fixes

**Branch Strategy**: Creates hotfix branches from `main`
**Branch Pattern**: `hotfix/{task-title-kebab-case}`

**Example**:
```javascript
const bugTask = {
  title: 'Fix login authentication bug',
  type: { value: 'bug' },
  metadata: { projectPath: '/path/to/project' }
};

// Creates branch: hotfix/fix-login-authentication-bug
```

### Refactoring

**Use Case**: Code refactoring and improvements

**Branch Strategy**: Creates refactoring branches from `main`
**Branch Pattern**: `refactor/{task-title-kebab-case}`

**Example**:
```javascript
const refactorTask = {
  title: 'Refactor database access layer',
  type: { value: 'refactor' },
  metadata: { projectPath: '/path/to/project' }
};

// Creates branch: refactor/refactor-database-access-layer
```

## Workflow Options

### Auto-Merge Configuration

Control whether branches are automatically merged after completion:

```javascript
const options = {
  autoMerge: true,  // Automatically merge after completion
  mergeTarget: 'main',  // Target branch for merging
  mergeStrategy: 'squash'  // Merge strategy (squash, merge, rebase)
};
```

### Pull Request Configuration

Configure pull request creation and review requirements:

```javascript
const options = {
  createPullRequest: true,  // Create pull request
  requireReview: true,  // Require code review
  reviewers: ['user1', 'user2'],  // Specific reviewers
  labels: ['feature', 'enhancement']  // PR labels
};
```

### Advanced Options

```javascript
const options = {
  autoMerge: false,
  createPullRequest: true,
  requireReview: true,
  mergeTarget: 'develop',
  mergeStrategy: 'squash',
  reviewers: ['senior-dev'],
  labels: ['feature'],
  assignees: ['developer'],
  draft: false
};
```

## Service Integration

### WorkflowGitService

The enhanced WorkflowGitService provides backward-compatible methods with enhanced functionality:

```javascript
const workflowGitService = new WorkflowGitService({
  gitService: gitService,
  logger: logger,
  eventBus: eventBus
});

// Enhanced branch creation
const result = await workflowGitService.createWorkflowBranch(
  '/path/to/project',
  task,
  { autoMerge: false }
);

// Enhanced workflow completion
const completion = await workflowGitService.completeWorkflow(
  '/path/to/project',
  'feature/add-user-authentication',
  task,
  { autoMerge: true }
);

// Enhanced pull request creation
const pr = await workflowGitService.createPullRequest(
  '/path/to/project',
  'feature/add-user-authentication',
  task,
  { requireReview: true }
);
```

### WorkflowOrchestrationService

The WorkflowOrchestrationService now uses the enhanced git workflow system:

```javascript
const orchestrationService = new WorkflowOrchestrationService({
  workflowGitService: workflowGitService,
  logger: logger,
  eventBus: eventBus
});

// Execute complete workflow
const result = await orchestrationService.executeWorkflow(task, {
  autoMerge: true,
  createPullRequest: true,
  requireReview: true
});
```

### TaskService

The TaskService integrates with the enhanced git workflow for task execution:

```javascript
const taskService = new TaskService(
  taskRepository,
  aiService,
  projectAnalyzer,
  cursorIDEService,
  autoFinishSystem,
  workflowGitService
);

// Execute task with enhanced git workflow
const result = await taskService.executeTask('task-1', {
  projectPath: '/path/to/project'
});
```

### AutoFinishSystem

The AutoFinishSystem uses the enhanced git workflow for automated task processing:

```javascript
const autoFinishSystem = new AutoFinishSystem(
  cursorIDE,
  browserManager,
  ideManager,
  webSocketManager
);

// Process task with enhanced git workflow
const result = await autoFinishSystem.processTask(task, 'session-1', {
  autoMerge: true,
  createPullRequest: false
});
```

## Event System

### Listening to Events

The git workflow system publishes events that you can listen to:

```javascript
// Listen to branch creation events
eventBus.subscribe('git.workflow.branch.created', (data) => {
  console.log('Branch created:', data.branchName);
  console.log('Task ID:', data.taskId);
  console.log('Project:', data.projectPath);
});

// Listen to workflow execution events
eventBus.subscribe('git.workflow.executed', (data) => {
  console.log('Workflow executed:', data.workflowType);
  console.log('Branch:', data.branchName);
});

// Listen to pull request creation events
eventBus.subscribe('git.workflow.pull_request.created', (data) => {
  console.log('Pull request created:', data.prUrl);
  console.log('Branch:', data.branchName);
});

// Listen to workflow completion events
eventBus.subscribe('git.workflow.completed', (data) => {
  console.log('Workflow completed:', data.status);
  console.log('Auto-merged:', data.autoMerged);
});
```

### Event Data Structure

All events include consistent data structure:

```javascript
{
  projectPath: '/path/to/project',
  taskId: 'task-1',
  branchName: 'feature/add-user-authentication',
  timestamp: '2024-01-01T00:00:00.000Z',
  // Additional event-specific data
}
```

## Error Handling

### Graceful Error Recovery

The system includes robust error handling with fallback mechanisms:

```javascript
try {
  const result = await gitWorkflowManager.executeWorkflow(context);
  console.log('Workflow executed successfully:', result);
} catch (error) {
  if (error instanceof GitWorkflowException) {
    console.error('Git workflow error:', error.message);
    // System automatically falls back to legacy method
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Scenarios

1. **Git Service Unavailable**: System falls back to legacy methods
2. **Invalid Project Path**: Throws GitWorkflowException with clear message
3. **Branch Already Exists**: Handles gracefully with unique naming
4. **Merge Conflicts**: Provides detailed error information
5. **Network Issues**: Implements retry mechanisms

## Best Practices

### Configuration

1. **Project Paths**: Always use absolute paths for project directories
2. **Task Types**: Use appropriate task types for correct branch strategies
3. **Merge Strategies**: Configure based on team preferences and project requirements
4. **Review Process**: Set up proper review requirements for quality control

### Workflow Design

1. **Feature Branches**: Use for new features and enhancements
2. **Hotfix Branches**: Use for critical bug fixes only
3. **Refactoring Branches**: Use for code improvements and restructuring
4. **Pull Requests**: Always create PRs for code review (except hotfixes)

### Performance

1. **Concurrent Operations**: Use for multiple related tasks
2. **Resource Management**: Monitor git operations and cleanup completed workflows
3. **Caching**: Leverage git caching for improved performance
4. **Timeouts**: Set appropriate timeouts for long-running operations

## Monitoring and Metrics

### Metrics Collection

The system automatically collects metrics for:

- Branch creation success/failure rates
- Workflow execution times
- Pull request creation success rates
- Error rates and types
- Merge conflict frequency

### Audit Logging

All operations are logged for audit purposes:

```javascript
// Access audit logs
const auditLogs = await gitWorkflowManager.audit.getLogs({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  operationType: 'branch_creation'
});

// Get metrics
const metrics = await gitWorkflowManager.metrics.getMetrics({
  timeRange: 'last_30_days',
  operationType: 'workflow_execution'
});
```

## Troubleshooting

### Common Issues

1. **Branch Creation Fails**
   - Check if project path is correct
   - Verify git repository is initialized
   - Ensure sufficient permissions

2. **Pull Request Creation Fails**
   - Verify repository has remote configured
   - Check authentication credentials
   - Ensure branch exists and has commits

3. **Merge Conflicts**
   - Resolve conflicts manually
   - Use appropriate merge strategy
   - Consider rebasing before merging

4. **Performance Issues**
   - Monitor concurrent operations
   - Check git repository size
   - Verify network connectivity

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
const manager = new GitWorkflowManager({
  gitService: gitService,
  logger: {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error
  },
  eventBus: eventBus
});
```

## Migration from Legacy System

### Automatic Migration

The enhanced system is backward-compatible. Existing code continues to work:

```javascript
// Legacy code still works
const result = await workflowGitService.createWorkflowBranch(
  projectPath,
  task,
  options
);

// Enhanced code provides additional features
const context = new GitWorkflowContext({
  projectPath,
  task,
  options,
  workflowType: 'workflow-execution'
});
const result = await gitWorkflowManager.executeWorkflow(context);
```

### Gradual Migration

1. **Phase 1**: Update service constructors to include GitWorkflowManager
2. **Phase 2**: Replace direct git operations with workflow manager calls
3. **Phase 3**: Update event handling for new event types
4. **Phase 4**: Test and validate fallback mechanisms

### Testing Migration

```javascript
// Test enhanced functionality
const enhancedResult = await gitWorkflowManager.executeWorkflow(context);

// Verify fallback works
const legacyResult = await workflowGitService.createWorkflowBranch(
  projectPath,
  task,
  options
);

// Both should work correctly
expect(enhancedResult.success).toBe(true);
expect(legacyResult.success).toBe(true);
```

## Support and Resources

### Documentation

- [API Reference](../08_reference/api/git-workflow-api.md)
- [Architecture Overview](../02_architecture/overview.md)
- [Integration Guide](../04_ide-support/ide-integration-guide.md)

### Examples

- [Feature Development Example](../examples/feature-development.md)
- [Bug Fix Workflow Example](../examples/bug-fix-workflow.md)
- [Refactoring Example](../examples/refactoring-workflow.md)

### Community

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share experiences
- Contributing: Submit pull requests and improvements 