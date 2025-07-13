# Categories-Only System Usage Guide

## Overview
This guide explains how to use the Categories-based registry patterns after the unified workflow system has been removed. The system now operates exclusively on Categories-based components for better performance, maintainability, and consistency.

## Core Concepts

### Categories System
The Categories system provides a standardized way to organize and manage components:
- **Steps**: Atomic workflow steps (AnalysisStep, RefactoringStep, etc.)
- **Frameworks**: Strategy definitions for different project types
- **Commands**: Business actions and use cases
- **Handlers**: Request processing and orchestration

### Registry Pattern
All components are managed through registries that support:
- Category-based organization
- Dynamic registration
- Validation and error handling
- Statistics and monitoring

## Usage Examples

### Using Step Registry
```javascript
const StepRegistry = require('@steps/StepRegistry');

// Get step by name
const step = await stepRegistry.getStep('AnalysisStep');

// Execute step
const result = await step.execute({
    task,
    options,
    context: { taskId, userId }
});
```

### Using Framework Registry
```javascript
const FrameworkRegistry = require('@frameworks/FrameworkRegistry');

// Get framework by category
const frameworks = frameworkRegistry.getFrameworksByCategory('analysis');

// Use framework
const framework = frameworks[0];
const result = await framework.execute(projectPath, options);
```

### Using Command/Handler Pattern
```javascript
const { CommandBus } = require('@messaging/CommandBus');

// Execute command
const result = await commandBus.execute('AnalyzeProjectCommand', {
    projectPath,
    analysisType: 'comprehensive'
});
```

## Migration from Unified System

### Before (Unified System)
```javascript
const { UnifiedWorkflowHandler } = require('@application/handlers/workflow');
const handler = new UnifiedWorkflowHandler();
const result = await handler.handle(request, response, options);
```

### After (Categories System)
```javascript
const StepRegistry = require('@steps/StepRegistry');
const stepRegistry = new StepRegistry();
const step = await stepRegistry.getStep('AnalysisStep');
const result = await step.execute({ task, options });
```

## API Usage

### Auto Mode Execution
```javascript
// POST /api/auto/execute
const response = await fetch('/api/auto/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        projectPath: '/path/to/project',
        mode: 'analysis',
        options: {
            includeCodeQuality: true,
            includeArchitecture: true
        }
    })
});

// Response includes execution method
const result = await response.json();
console.log(result.data.executionMethod); // 'categories'
```

### Task Execution
```javascript
// POST /api/projects/:projectId/tasks/:taskId/execute
const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        options: {
            autoExecute: true
        }
    })
});

// Response includes execution method
const result = await response.json();
console.log(result.data.metadata.executionMethod); // 'categories'
```

## Benefits

1. **Simplified Architecture**: Single pattern for all components
2. **Better Performance**: Direct execution without extra orchestration
3. **Easier Maintenance**: Consistent patterns across the system
4. **Reduced Complexity**: No redundant unified workflow layer
5. **Better Testing**: Simpler component testing and validation

## Best Practices

1. **Use Categories**: Always organize components by appropriate categories
2. **Validate Inputs**: Use registry validation for all inputs
3. **Handle Errors**: Implement proper error handling in all components
4. **Monitor Performance**: Use registry statistics for monitoring
5. **Test Components**: Test individual components and integration

## Troubleshooting

### Common Issues
1. **Step Not Found**: Ensure step is registered in correct category
2. **Import Errors**: Check module alias configuration
3. **Validation Failures**: Verify input parameters match expected format
4. **Performance Issues**: Monitor registry statistics and optimize

### Debug Commands
```javascript
// Check available steps
const steps = stepRegistry.getAllSteps();
console.log('Available steps:', steps.map(s => s.name));

// Check step categories
const categories = stepRegistry.getCategories();
console.log('Available categories:', categories);

// Validate step
const validation = stepRegistry.validateStep('AnalysisStep');
console.log('Step validation:', validation);
```

## Component Categories

### Analysis Category
- `AnalysisStep`: Comprehensive project analysis
- `CodeQualityStep`: Code quality assessment
- `ArchitectureStep`: Architecture analysis
- `SecurityStep`: Security vulnerability scanning

### Refactoring Category
- `RefactoringStep`: Code refactoring operations
- `OptimizationStep`: Performance optimization
- `CleanupStep`: Code cleanup and formatting

### Testing Category
- `TestingStep`: Test execution and generation
- `CoverageStep`: Test coverage analysis
- `TestFixStep`: Automated test fixing

### Documentation Category
- `DocumentationStep`: Documentation generation
- `READMEStep`: README file creation
- `APIDocStep`: API documentation

## Registry Configuration

### Step Registry Configuration
```javascript
const StepRegistry = require('@steps/StepRegistry');

const registry = new StepRegistry({
    autoLoad: true,
    validateOnRegister: true,
    enableStatistics: true
});

// Load steps from categories
await registry.loadStepsFromCategories();
```

### Framework Registry Configuration
```javascript
const FrameworkRegistry = require('@frameworks/FrameworkRegistry');

const registry = new FrameworkRegistry({
    autoDiscover: true,
    validateFrameworks: true
});

// Load frameworks
await registry.loadFrameworks();
```

## Performance Monitoring

### Registry Statistics
```javascript
// Get step registry statistics
const stats = stepRegistry.getStatistics();
console.log('Step execution stats:', stats);

// Get framework registry statistics
const frameworkStats = frameworkRegistry.getStatistics();
console.log('Framework usage stats:', frameworkStats);
```

### Performance Metrics
- **Execution Time**: Monitor step execution duration
- **Success Rate**: Track successful vs failed executions
- **Resource Usage**: Monitor memory and CPU usage
- **Error Rates**: Track error frequencies by category

## Security Considerations

1. **Input Validation**: Always validate user inputs
2. **Access Control**: Implement proper authorization
3. **Error Handling**: Don't expose sensitive information in errors
4. **Audit Logging**: Log all operations for security auditing

## Future Enhancements

1. **Plugin System**: Support for custom step plugins
2. **Workflow Composition**: Visual workflow builder
3. **Advanced Analytics**: Detailed performance analytics
4. **Integration APIs**: Third-party service integrations

## Support and Resources

- **Documentation**: Check the main documentation for detailed guides
- **Examples**: Review example implementations in the examples directory
- **Tests**: Run integration tests to verify functionality
- **Community**: Join the community for support and discussions 