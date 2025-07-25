# Enhanced Git Workflow Guide

## Overview

The Enhanced Git Workflow System in PIDEA provides automated git operations for development tasks. This system integrates seamlessly with existing workflows while providing advanced features like automated branch creation, pull request generation, and intelligent merge strategies.

## Branch Strategy Overview

### Base Branches
- **`pidea-agent`**: Development branch - all tasks start from here
- **`pidea-ai-main`**: AI-generated code branch - where AI tasks are merged
- **`main`**: Production branch - only critical bug fixes and security patches

### Branch Flow
```
pidea-agent (dev) → feature/test/refactor branches → pidea-ai-main (AI code)
                                    ↓
                              main (production)
```

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
1. Create a branch named `feature/add-user-authentication` from `pidea-agent`
2. Checkout the new branch
3. Execute the task
4. Create a pull request for review to `pidea-ai-main`

## Workflow Types

### AI-Generated Tasks (merge to pidea-ai-main)

**Use Case**: New features, optimizations, refactoring, analysis, documentation

**Branch Strategy**: Creates branches from `pidea-agent`, merges to `pidea-ai-main`
**Branch Pattern**: `{task-type}/{task-title-kebab-case}`

**Examples**:
```javascript
// Feature implementation
const featureTask = {
  title: 'Add payment processing',
  type: { value: 'feature' },
  metadata: { projectPath: '/path/to/project' }
};
// Creates branch: feature/add-payment-processing → merges to pidea-ai-main

// Code refactoring
const refactorTask = {
  title: 'Refactor database access layer',
  type: { value: 'refactor' },
  metadata: { projectPath: '/path/to/project' }
};
// Creates branch: refactor/refactor-database-access-layer → merges to pidea-ai-main

// Performance optimization
const optimizationTask = {
  title: 'Optimize API response times',
  type: { value: 'optimization' },
  metadata: { projectPath: '/path/to/project' }
};
// Creates branch: enhance/optimize-api-response-times → merges to pidea-ai-main
```

### Critical Bug Fixes (merge to main)

**Use Case**: Critical bug fixes and security patches

**Branch Strategy**: Creates branches from `pidea-agent`, merges to `main`
**Branch Pattern**: `fix/{task-title-kebab-case}` or `hotfix/{task-title-kebab-case}`

**Example**:
```javascript
const bugTask = {
  title: 'Fix login authentication bug',
  type: { value: 'bug' },
  metadata: { projectPath: '/path/to/project' }
};
// Creates branch: fix/fix-login-authentication-bug → merges to main
```

### Testing Tasks (merge to pidea-agent)

**Use Case**: All testing activities

**Branch Strategy**: Creates branches from `pidea-agent`, merges back to `pidea-agent`
**Branch Pattern**: `test/{task-title-kebab-case}`

**Examples**:
```javascript
// Unit testing
const unitTestTask = {
  title: 'Add unit tests for user service',
  type: { value: 'test_unit' },
  metadata: { projectPath: '/path/to/project' }
};
// Creates branch: test-unit/add-unit-tests-for-user-service → merges to pidea-agent

// Integration testing
const integrationTestTask = {
  title: 'Integration tests for payment API',
  type: { value: 'test_integration' },
  metadata: { projectPath: '/path/to/project' }
};
// Creates branch: test-integration/integration-tests-for-payment-api → merges to pidea-agent
```

## Task Type Branch Strategies

### AI-Generated Tasks (→ pidea-ai-main)
- **Feature**: `feature/` - New feature implementation
- **Optimization**: `enhance/` - Performance and code optimization
- **Refactor**: `refactor/` - Code refactoring
- **Analysis**: `analyze/` - Code analysis
- **Documentation**: `docs/` - Documentation generation
- **Technology-specific refactoring**: `refactor-{tech}/` (e.g., `refactor-react/`, `refactor-node/`)

### Critical Tasks (→ main)
- **Bug**: `fix/` - Critical bug fixes
- **Security**: `hotfix/` - Security hotfixes

### Testing Tasks (→ pidea-agent)
- **Testing**: `test/` - General testing
- **Test Fix**: `test-fix/` - Test fixes
- **Test Coverage**: `test-coverage/` - Coverage improvements
- **Test Refactor**: `test-refactor/` - Test refactoring
- **Test Status**: `test-status/` - Status updates
- **Test Report**: `test-report/` - Report generation
- **Technology-specific testing**: `test-{type}/` (e.g., `test-unit/`, `test-integration/`)

### Roadmap Features (→ pidea-ai-main)
- **Feature Summary**: `feature-summary/` - Summary generation
- **Feature Implementation**: `feature-impl/` - Implementation
- **Feature Phase**: `feature-phase/` - Phase management
- **Feature Index**: `feature-index/` - Indexing

## Workflow Options

### Auto-Merge Configuration

Control whether branches are automatically merged after completion:

```javascript
const options = {
  autoMerge: true,  // Automatically merge after completion
  mergeTarget: 'pidea-ai-main',  // Target branch for merging
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
  // Branch creation
  createBranch: true,
  branchStrategy: 'auto',  // 'auto', 'feature', 'bugfix', 'hotfix'
  
  // Merge configuration
  autoMerge: false,
  mergeTarget: 'pidea-ai-main',  // 'pidea-ai-main', 'main', 'pidea-agent'
  mergeStrategy: 'squash',  // 'squash', 'merge', 'rebase'
  
  // Pull request
  createPullRequest: true,
  requireReview: true,
  autoApprove: false,
  
  // Protection
  branchProtection: 'medium',  // 'low', 'medium', 'high', 'critical'
  
  // Notifications
  notifyOnComplete: true,
  notifyOnError: true
};
```

## Branch Protection Levels

### Low Protection
- **Auto-merge**: Enabled
- **Review required**: No
- **Use cases**: Analysis, documentation, test reports

### Medium Protection
- **Auto-merge**: Disabled
- **Review required**: Yes
- **Use cases**: Features, optimizations, refactoring

### High Protection
- **Auto-merge**: Disabled
- **Review required**: Yes (multiple reviewers)
- **Use cases**: Bug fixes, database refactoring

### Critical Protection
- **Auto-merge**: Disabled
- **Review required**: Yes (senior reviewers)
- **Use cases**: Security patches

## Error Handling

The system includes robust error handling:

```javascript
try {
  const result = await workflowOrchestrationService.executeWorkflow(task, options);
  
  if (result.success) {
    console.log('Workflow completed successfully');
  } else {
    console.error('Workflow failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error.message);
}
```

## Monitoring and Metrics

Track workflow performance and success rates:

```javascript
// Get workflow metrics
const metrics = await workflowOrchestrationService.getMetrics();

console.log('Workflow Statistics:', {
  totalExecutions: metrics.totalExecutions,
  successRate: metrics.successRate,
  averageDuration: metrics.averageDuration,
  branchCreationCount: metrics.branchCreationCount
});
```

## Best Practices

1. **Branch Naming**: Use descriptive branch names that reflect the task
2. **Review Process**: Always review AI-generated code before merging
3. **Testing**: Ensure all changes are tested before merging to main
4. **Documentation**: Update documentation for significant changes
5. **Monitoring**: Monitor workflow performance and adjust as needed

## Troubleshooting

### Common Issues

1. **Branch Creation Fails**
   - Check if `pidea-agent` branch exists
   - Verify git repository permissions
   - Ensure project path is correct

2. **Merge Conflicts**
   - Resolve conflicts manually
   - Use appropriate merge strategy
   - Consider rebasing if needed

3. **Workflow Timeout**
   - Increase timeout settings
   - Check for long-running operations
   - Monitor system resources

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
const options = {
  debug: true,
  logLevel: 'debug',
  verbose: true
};
``` 