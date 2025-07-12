# Unified Workflow Foundation 1B: Builder Pattern & Common Steps

## Overview

The Unified Workflow Foundation 1B feature provides a comprehensive builder pattern implementation for creating and managing workflows in PIDEA. This feature includes:

- **Builder Pattern**: Fluent interface for building composed workflows
- **Common Workflow Steps**: 8 predefined workflow step types
- **Step Registry**: Centralized management of workflow steps and templates
- **Workflow Composer**: Advanced workflow composition patterns
- **Template Registry**: Predefined workflow templates

## Architecture

### Core Components

```
Unified Workflow Foundation 1B
├── Builder Pattern
│   ├── WorkflowBuilder
│   ├── WorkflowStepBuilder
│   └── ComposedWorkflow
├── Common Steps
│   ├── AnalysisStep
│   ├── RefactoringStep
│   ├── TestingStep
│   ├── DocumentationStep
│   ├── ValidationStep
│   ├── DeploymentStep
│   ├── SecurityStep
│   └── OptimizationStep
├── Registry System
│   ├── StepRegistry
│   └── WorkflowTemplateRegistry
└── Composition
    └── WorkflowComposer
```

## Builder Pattern

### WorkflowBuilder

The `WorkflowBuilder` provides a fluent interface for creating composed workflows:

```javascript
const { WorkflowBuilder, WorkflowStepBuilder } = require('../domain/workflows');

const workflow = new WorkflowBuilder()
  .setMetadata({
    name: 'My Workflow',
    description: 'Custom workflow',
    type: 'custom',
    version: '1.0.0'
  })
  .addStep(
    WorkflowStepBuilder.analysis({
      type: 'comprehensive',
      includeMetrics: true
    }).build()
  )
  .addStep(
    WorkflowStepBuilder.refactoring({
      type: '',
      improveQuality: true
    }).build()
  )
  .build();
```

### WorkflowStepBuilder

The `WorkflowStepBuilder` provides a fluent interface for creating workflow steps:

```javascript
const step = WorkflowStepBuilder
  .analysis({
    type: 'code-analysis',
    includeMetrics: true,
    includeArchitecture: true
  })
  .setMetadata({
    name: 'Custom Analysis',
    description: 'Custom analysis step'
  })
  .build();
```

### ComposedWorkflow

The `ComposedWorkflow` class implements the `IWorkflow` interface and manages the execution of multiple workflow steps:

```javascript
const workflow = new ComposedWorkflow(
  steps,
  metadata,
  validationRules,
  rollbackStrategy
);

const result = await workflow.execute(context);
```

## Common Workflow Steps

### 1. AnalysisStep

Performs various types of analysis:

```javascript
const analysisStep = new AnalysisStep('comprehensive', {
  includeMetrics: true,
  includeArchitecture: true,
  includeSecurity: true,
  includePerformance: true
});
```

**Supported Analysis Types:**
- `comprehensive` - Full project analysis
- `code-analysis` - Code structure analysis
- `architecture-analysis` - Architecture analysis
- `security-analysis` - Security analysis
- `performance-analysis` - Performance analysis
- `requirements-analysis` - Requirements analysis
- `test-analysis` - Test analysis

### 2. RefactoringStep

Handles code refactoring and generation:

```javascript
const refactoringStep = new RefactoringStep('', {
  generateCode: true,
  improveQuality: true,
  maintainTests: true
});
```

**Supported Refactoring Types:**
- `` -  code refactoring
- `code-generation` - Code generation
- `feature-implementation` - Feature implementation

### 3. TestingStep

Manages testing operations:

```javascript
const testingStep = new TestingStep('run-tests', {
  runTests: true,
  generateTests: true,
  validateCoverage: true,
  fixFailingTests: true
});
```

**Supported Testing Types:**
- `run-tests` - Execute existing tests
- `generate-tests` - Generate new tests
- `validate-coverage` - Validate test coverage

### 4. DocumentationStep

Handles documentation generation:

```javascript
const documentationStep = new DocumentationStep('generate-docs', {
  generateDocs: true,
  includeAPI: true,
  format: 'markdown'
});
```

**Supported Documentation Types:**
- `generate-docs` - Generate documentation
- `generate-report` - Generate reports
- `update-readme` - Update README files

### 5. ValidationStep

Performs various validation tasks:

```javascript
const validationStep = new ValidationStep('code-validation', {
  validateCode: true,
  checkQuality: true,
  validateResults: true
});
```

**Supported Validation Types:**
- `code-validation` - Code validation
- `quality-check` - Quality checks
- `validate-results` - Result validation

### 6. DeploymentStep

Handles deployment operations:

```javascript
const deploymentStep = new DeploymentStep('application-deployment', {
  type: 'application',
  environment: 'production',
  rollbackEnabled: true
});
```

**Supported Deployment Types:**
- `application-deployment` - Application deployment
- `docker-deployment` - Docker deployment
- `kubernetes-deployment` - Kubernetes deployment

### 7. SecurityStep

Performs security-related tasks:

```javascript
const securityStep = new SecurityStep('security-scan', {
  securityScan: true,
  vulnerabilityCheck: true,
  complianceCheck: true
});
```

**Supported Security Types:**
- `security-scan` - Security scanning
- `vulnerability-check` - Vulnerability checking
- `compliance-check` - Compliance checking

### 8. OptimizationStep

Handles optimization tasks:

```javascript
const optimizationStep = new OptimizationStep('performance-optimization', {
  improveSpeed: true,
  reduceMemory: true,
  optimizeCode: true
});
```

**Supported Optimization Types:**
- `performance-optimization` - Performance optimization
- `test-optimization` - Test optimization
- `code-optimization` - Code optimization

## Registry System

### StepRegistry

The `StepRegistry` manages workflow steps and provides step lookup functionality:

```javascript
const { StepRegistry } = require('../domain/workflows');

// Register a custom step
StepRegistry.registerStep('custom-step', CustomStepClass);

// Create a step instance
const step = StepRegistry.createStep('analysis', {
  type: 'comprehensive'
});

// Get available steps
const availableSteps = StepRegistry.listSteps();
```

### WorkflowTemplateRegistry

The `WorkflowTemplateRegistry` manages workflow templates:

```javascript
const { WorkflowTemplateRegistry } = require('../domain/workflows');

// Get available templates
const templates = WorkflowTemplateRegistry.listTemplates();

// Create workflow from template
const template = WorkflowTemplateRegistry.getTemplate('analysis');
const workflow = template(new WorkflowBuilder(), options);
```

## Workflow Composer

The `WorkflowComposer` provides advanced workflow composition patterns:

```javascript
const { WorkflowComposer } = require('../domain/workflows');

const composer = new WorkflowComposer();

// Compose predefined workflows
const analysisWorkflow = composer.composeAnalysisWorkflow({
  includeValidation: true,
  includeDocumentation: true
});

const refactoringWorkflow = composer.composeRefactoringWorkflow({
  includeTesting: true,
  includeValidation: true
});

const featureWorkflow = composer.composeFeatureWorkflow({
  includeTesting: true,
  includeDocumentation: true
});
```

## Integration Service

### UnifiedWorkflowService

The `UnifiedWorkflowService` provides easy access to all Unified Workflow Foundation features:

```javascript
const UnifiedWorkflowService = require('../domain/services/UnifiedWorkflowService');

const service = new UnifiedWorkflowService({
  logger: console,
  eventBus: eventBus
});

// Create workflows using the service
const analysisWorkflow = service.createAnalysisWorkflow({
  analysisType: 'comprehensive',
  includeMetrics: true
});

const refactoringWorkflow = service.createRefactoringWorkflow({
  refactoringType: '',
  generateCode: true
});

// Execute workflows
const result = await service.executeWorkflow(workflow, {
  metadata: { projectPath: '/path/to/project' },
  data: { targetFiles: ['src/**/*.js'] }
});
```

## Usage Examples

### Example 1: Simple Analysis Workflow

```javascript
const { UnifiedWorkflowService } = require('../domain/services');

const service = new UnifiedWorkflowService();

const workflow = service.createAnalysisWorkflow({
  analysisType: 'comprehensive',
  includeMetrics: true,
  includeArchitecture: true,
  reportFormat: 'markdown'
});

const result = await service.executeWorkflow(workflow, {
  metadata: { projectPath: '/path/to/project' },
  data: { files: ['src/**/*.js'] }
});
```

### Example 2: Custom Workflow from Step Types

```javascript
const workflow = service.createCustomWorkflow(
  ['analysis', 'refactoring', 'testing', 'documentation'],
  {
    name: 'Custom Code Improvement Workflow',
    analysis: { type: 'code-analysis' },
    refactoring: { type: '' },
    testing: { runTests: true },
    documentation: { generateDocs: true }
  }
);
```

### Example 3: Workflow from Template

```javascript
const workflow = service.createFromTemplate('testing', {
  runTests: true,
  generateTests: true,
  validateCoverage: true
});
```

### Example 4: Direct Builder Usage

```javascript
const { WorkflowBuilder, WorkflowStepBuilder } = require('../domain/workflows');

const workflow = new WorkflowBuilder()
  .setMetadata({
    name: 'Direct Builder Example',
    type: 'custom',
    version: '1.0.0'
  })
  .addStep(
    WorkflowStepBuilder.analysis({
      type: 'performance-analysis'
    }).build()
  )
  .addStep(
    WorkflowStepBuilder.optimization({
      type: 'performance-optimization'
    }).build()
  )
  .build();
```

## Configuration

### Workflow Options

Each workflow step accepts specific options:

```javascript
// Analysis options
const analysisOptions = {
  type: 'comprehensive',
  includeMetrics: true,
  includeArchitecture: true,
  includeSecurity: true,
  includePerformance: true
};

// Refactoring options
const refactoringOptions = {
  type: '',
  generateCode: true,
  improveQuality: true,
  maintainTests: true
};

// Testing options
const testingOptions = {
  runTests: true,
  generateTests: true,
  validateCoverage: true,
  fixFailingTests: true
};
```

### Context Data

Workflow execution accepts context data:

```javascript
const contextData = {
  metadata: {
    projectPath: '/path/to/project',
    analysisScope: 'full'
  },
  data: {
    files: ['src/**/*.js'],
    excludePatterns: ['node_modules/**'],
    refactoringGoals: ['improve readability'],
    preserveBehavior: true
  }
};
```

## Error Handling

The Unified Workflow Foundation includes comprehensive error handling:

```javascript
try {
  const result = await service.executeWorkflow(workflow, contextData);
  console.log('Workflow completed:', result.success);
} catch (error) {
  console.error('Workflow failed:', error.message);
  
  // Check if rollback is available
  if (workflow.hasRollbackStrategy()) {
    await workflow.rollback(context, stepId);
  }
}
```

## Event System

The system supports event-driven architecture:

```javascript
const service = new UnifiedWorkflowService({
  eventBus: {
    emit: (event, data) => {
      switch (event) {
        case 'workflow.executed':
          console.log('Workflow executed:', data);
          break;
        case 'workflow.error':
          console.error('Workflow error:', data);
          break;
      }
    }
  }
});
```

## Best Practices

### 1. Use Service Layer

Prefer using `UnifiedWorkflowService` for most use cases:

```javascript
// Good
const service = new UnifiedWorkflowService();
const workflow = service.createAnalysisWorkflow(options);

// Avoid direct builder usage unless needed
const workflow = new WorkflowBuilder()...
```

### 2. Leverage Templates

Use predefined templates when possible:

```javascript
// Good
const workflow = service.createFromTemplate('analysis', options);

// Avoid recreating common patterns
const workflow = service.createAnalysisWorkflow(options);
```

### 3. Validate Before Execution

Always validate workflows before execution:

```javascript
const context = service.createContext(contextData);
const validationResult = await workflow.validate(context);

if (!validationResult.isValid) {
  console.error('Workflow validation failed:', validationResult.errors);
  return;
}
```

### 4. Handle Errors Gracefully

Implement proper error handling:

```javascript
try {
  const result = await service.executeWorkflow(workflow, contextData);
  return result;
} catch (error) {
  logger.error('Workflow execution failed', {
    workflowType: workflow.getMetadata().type,
    error: error.message
  });
  throw error;
}
```

### 5. Use Appropriate Step Types

Choose the right step type for your use case:

```javascript
// For code analysis
WorkflowStepBuilder.analysis({ type: 'code-analysis' })

// For performance optimization
WorkflowStepBuilder.optimization({ type: 'performance-optimization' })

// For security scanning
WorkflowStepBuilder.security({ type: 'security-scan' })
```

## Testing

### Unit Testing

```javascript
const { UnifiedWorkflowService } = require('../domain/services');

describe('UnifiedWorkflowService', () => {
  let service;

  beforeEach(() => {
    service = new UnifiedWorkflowService({
      logger: console,
      eventBus: { emit: jest.fn() }
    });
  });

  test('should create analysis workflow', () => {
    const workflow = service.createAnalysisWorkflow({
      analysisType: 'comprehensive'
    });

    expect(workflow.getMetadata().type).toBe('analysis');
    expect(workflow.getSteps()).toHaveLength(3);
  });

  test('should execute workflow successfully', async () => {
    const workflow = service.createAnalysisWorkflow();
    const result = await service.executeWorkflow(workflow, {
      metadata: { projectPath: '/test' }
    });

    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

```javascript
describe('UnifiedWorkflowFoundation Integration', () => {
  test('should complete full workflow lifecycle', async () => {
    const service = new UnifiedWorkflowService();
    
    // Create workflow
    const workflow = service.createRefactoringWorkflow();
    
    // Validate workflow
    const context = service.createContext({
      metadata: { projectPath: '/test' }
    });
    const validationResult = await workflow.validate(context);
    expect(validationResult.isValid).toBe(true);
    
    // Execute workflow
    const result = await service.executeWorkflow(workflow, {
      metadata: { projectPath: '/test' }
    });
    expect(result.success).toBe(true);
  });
});
```

## Migration Guide

### From Legacy Workflows

If you're migrating from legacy workflow implementations:

1. **Replace direct step creation**:
   ```javascript
   // Old
   const step = new AnalysisStep(options);
   
   // New
   const step = WorkflowStepBuilder.analysis(options).build();
   ```

2. **Use builder pattern**:
   ```javascript
   // Old
   const workflow = new LegacyWorkflow(steps);
   
   // New
   const workflow = new WorkflowBuilder()
     .addSteps(steps)
     .build();
   ```

3. **Leverage service layer**:
   ```javascript
   // Old
   const workflow = createCustomWorkflow();
   
   // New
   const service = new UnifiedWorkflowService();
   const workflow = service.createCustomWorkflow(stepTypes, options);
   ```

## Performance Considerations

### Workflow Optimization

1. **Minimize step count**: Only include necessary steps
2. **Use appropriate step types**: Choose specific step types over generic ones
3. **Leverage caching**: Reuse workflow instances when possible
4. **Parallel execution**: Consider parallel step execution for independent steps

### Memory Management

1. **Clean up resources**: Properly dispose of workflow instances
2. **Limit context size**: Keep context data minimal
3. **Use streaming**: For large data processing, use streaming approaches

## Troubleshooting

### Common Issues

1. **Step not found error**:
   ```javascript
   // Ensure step is registered
   StepRegistry.registerStep('custom-step', CustomStepClass);
   ```

2. **Template not found error**:
   ```javascript
   // Check available templates
   const templates = service.getAvailableTemplates();
   console.log(templates.map(t => t.name));
   ```

3. **Validation failures**:
   ```javascript
   // Check validation rules
   const validationResult = await workflow.validate(context);
   console.log(validationResult.errors);
   ```

### Debug Mode

Enable debug logging:

```javascript
const service = new UnifiedWorkflowService({
  logger: {
    info: console.log,
    error: console.error,
    debug: console.log
  }
});
```

## Conclusion

The Unified Workflow Foundation 1B provides a powerful, flexible, and extensible system for creating and managing workflows in PIDEA. By leveraging the builder pattern, common workflow steps, and comprehensive registry system, developers can create complex workflows with minimal code while maintaining flexibility and extensibility.

The system is designed to be:
- **Easy to use**: Fluent builder interfaces
- **Extensible**: Custom steps and templates
- **Reliable**: Comprehensive error handling and validation
- **Performant**: Optimized execution and resource management
- **Maintainable**: Clear separation of concerns and modular design

For more information and examples, see the `UnifiedWorkflowFoundationExample.js` file in the `backend/examples/` directory. 