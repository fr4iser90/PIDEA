# Framework System

## 📋 Overview

The Framework System provides a modular, extensible way to organize and manage additional functionality in the PIDEA backend. This guide explains how to use the framework system, including framework activation, step usage, and configuration management.

## 🚀 Getting Started

### Prerequisites
- PIDEA backend system installed and running
- Basic understanding of the step system
- Access to framework configuration

### Quick Start
1. **Check Available Frameworks**
   ```javascript
   const frameworks = app.frameworkLoader.getFrameworks();
   console.log('Available frameworks:', frameworks.map(f => f.name));
   ```

2. **Activate a Framework**
   ```javascript
   const result = await app.frameworkManager.activateFramework('refactoring_management');
   if (result.success) {
     console.log('Framework activated successfully');
   }
   ```

3. **Execute a Framework Step**
   ```javascript
   const stepResult = await app.stepRegistry.executeStep('refactoring_management.refactor_step', {
     projectPath: '/path/to/project',
     filePath: '/path/to/file.js'
   });
   ```

## 🏗️ Framework Categories

### 1. Refactoring Management
**Purpose**: Advanced refactoring operations and code restructuring

**Key Features**:
- Code analysis for refactoring opportunities
- Automated refactoring suggestions
- Large file refactoring support
- Refactoring task generation

**Available Steps**:
- `refactor_step` - Main refactoring orchestration
- `refactor_analyze` - Code analysis for refactoring
- `refactor_generate_task` - Task generation for large files

**Usage Example**:
```javascript
// Execute complete refactoring workflow
const workflow = app.frameworkLoader.getFramework('refactoring_management')
  .config.workflows.complete_refactoring;

for (const stepName of workflow.steps) {
  const stepKey = `refactoring_management.${stepName}`;
  await app.stepRegistry.executeStep(stepKey, {
    projectPath: '/path/to/project',
    context: 'refactoring'
  });
}
```

### 2. Testing Management
**Purpose**: Comprehensive testing operations and test automation

**Key Features**:
- Unit test execution and coverage
- Integration test management
- Test result analysis
- Test automation workflows

**Available Steps**:
- `testing_step` - Comprehensive testing workflow
- `run_unit_tests` - Unit test execution

**Usage Example**:
```javascript
// Run comprehensive testing
const result = await app.stepRegistry.executeStep('testing_management.testing_step', {
  projectPath: '/path/to/project',
  testTypes: ['unit', 'integration'],
  coverage: true
});
```

### 3. Documentation Management
**Purpose**: Automated documentation generation and management

**Key Features**:
- API documentation generation
- Code documentation updates
- README file management
- Documentation quality checks

**Available Steps**:
- `generate_api_docs` - API documentation generation
- `update_readme` - README file updates
- `validate_docs` - Documentation validation

### 4. Deployment Management
**Purpose**: Deployment and infrastructure management

**Key Features**:
- Deployment automation
- Environment management
- Infrastructure provisioning
- Rollback procedures

**Available Steps**:
- `deploy_application` - Application deployment
- `provision_infrastructure` - Infrastructure provisioning
- `manage_environment` - Environment management

### 5. Security Management
**Purpose**: Security auditing and vulnerability management

**Key Features**:
- Security scanning
- Vulnerability assessment
- Security compliance checks
- Security policy enforcement

**Available Steps**:
- `security_scan` - Security scanning
- `vulnerability_assessment` - Vulnerability assessment
- `compliance_check` - Compliance checking

### 6. Performance Management
**Purpose**: Performance optimization and monitoring

**Key Features**:
- Performance profiling
- Optimization suggestions
- Performance monitoring
- Load testing

**Available Steps**:
- `performance_profile` - Performance profiling
- `optimize_code` - Code optimization
- `load_test` - Load testing

## 🔧 Framework Configuration

### Configuration Structure
Each framework has a `framework.json` configuration file:

```json
{
  "name": "refactoring_management",
  "version": "1.0.0",
  "description": "Advanced refactoring operations",
  "category": "refactoring",
  "author": "PIDEA Team",
  "dependencies": ["core"],
  "steps": {
    "refactor_step": {
      "name": "refactor_step",
      "type": "refactoring",
      "category": "orchestration",
      "description": "Main refactoring orchestration step",
      "dependencies": ["stepRegistry", "projectPath"],
      "file": "steps/refactor_step.js"
    }
  },
  "workflows": {
    "complete_refactoring": {
      "name": "complete_refactoring",
      "steps": ["refactor_analyze", "refactor_generate_task", "refactor_step"],
      "description": "Complete refactoring workflow"
    }
  },
  "activation": {
    "auto_load": false,
    "requires_confirmation": true,
    "fallback_to_core": true
  },
  "settings": {
    "max_file_size": 1000000,
    "backup_enabled": true,
    "validation_enabled": true,
    "undo_enabled": true
  }
}
```

### Configuration Options

#### Activation Settings
- `auto_load`: Automatically load framework on startup
- `requires_confirmation`: Require user confirmation before activation
- `fallback_to_core`: Fallback to core system if framework fails

#### Framework Settings
- `max_file_size`: Maximum file size for processing
- `backup_enabled`: Enable automatic backups
- `validation_enabled`: Enable validation checks
- `undo_enabled`: Enable undo functionality

### Environment Variables
You can override configuration using environment variables:

```bash
# Framework base path
export FRAMEWORK_BASE_PATH="/custom/framework/path"

# Auto-load frameworks
export FRAMEWORK_AUTO_LOAD="true"

# Require confirmation
export FRAMEWORK_REQUIRE_CONFIRMATION="false"

# Fallback to core
export FRAMEWORK_FALLBACK_TO_CORE="true"
```

## 🔄 Framework Lifecycle

### 1. Discovery
Frameworks are automatically discovered during system startup:

```javascript
// Get all discovered frameworks
const frameworks = app.frameworkLoader.getFrameworks();
console.log('Discovered frameworks:', frameworks.map(f => f.name));
```

### 2. Loading
Framework configurations are loaded and validated:

```javascript
// Check if framework is loaded
const framework = app.frameworkLoader.getFramework('refactoring_management');
if (framework) {
  console.log('Framework loaded:', framework.config.name);
}
```

### 3. Activation
Frameworks are activated when needed:

```javascript
// Activate framework
const result = await app.frameworkManager.activateFramework('refactoring_management');
if (result.success) {
  console.log('Framework activated');
} else {
  console.error('Activation failed:', result.error);
}
```

### 4. Execution
Framework steps are executed through the main StepRegistry:

```javascript
// Execute framework step
const stepResult = await app.stepRegistry.executeStep('refactoring_management.refactor_step', {
  projectPath: '/path/to/project',
  filePath: '/path/to/file.js',
  context: 'refactoring'
});
```

### 5. Deactivation
Frameworks can be deactivated when no longer needed:

```javascript
// Deactivate framework
const result = await app.frameworkManager.deactivateFramework('refactoring_management');
if (result.success) {
  console.log('Framework deactivated');
}
```

## 📊 Framework Management

### Listing Frameworks
```javascript
// Get all frameworks
const allFrameworks = app.frameworkLoader.getFrameworks();

// Get frameworks by category
const refactoringFrameworks = app.frameworkLoader.getFrameworksByCategory('refactoring');

// Get active frameworks
const activeFrameworks = app.frameworkManager.getAllActiveFrameworks();
```

### Framework Information
```javascript
// Get framework details
const framework = app.frameworkLoader.getFramework('refactoring_management');
console.log('Framework name:', framework.config.name);
console.log('Framework version:', framework.config.version);
console.log('Framework description:', framework.config.description);
console.log('Framework steps:', Object.keys(framework.config.steps));
console.log('Framework workflows:', Object.keys(framework.config.workflows));
```

### Framework Statistics
```javascript
// Get framework statistics
const loaderStats = app.frameworkLoader.getStats();
const managerStats = app.frameworkManager.getStats();

console.log('Total frameworks:', loaderStats.totalFrameworks);
console.log('Active frameworks:', managerStats.totalActiveFrameworks);
console.log('Categories:', loaderStats.categories);
```

## 🔧 Step Management

### Framework Steps
Framework steps are automatically registered with the main StepRegistry:

```javascript
// Get all framework steps
const frameworkSteps = app.frameworkStepRegistry.getFrameworkSteps();

// Get steps for specific framework
const refactoringSteps = app.frameworkStepRegistry.getFrameworkStepsByName('refactoring_management');

// Check if step is a framework step
const isFrameworkStep = app.frameworkStepRegistry.isFrameworkStep('refactoring_management.refactor_step');

// Get step information
const stepInfo = app.frameworkStepRegistry.getFrameworkStepInfo('refactoring_management.refactor_step');
```

### Step Execution
Framework steps are executed like any other step:

```javascript
// Execute framework step
const result = await app.stepRegistry.executeStep('refactoring_management.refactor_step', {
  projectPath: '/path/to/project',
  filePath: '/path/to/file.js',
  context: 'refactoring',
  options: {
    backup: true,
    validation: true
  }
});

if (result.success) {
  console.log('Step executed successfully:', result.result);
} else {
  console.error('Step execution failed:', result.error);
}
```

### Step Context
Framework steps receive context with access to core services:

```javascript
// Step execution context
const context = {
  projectPath: '/path/to/project',
  filePath: '/path/to/file.js',
  stepRegistry: app.stepRegistry,
  taskService: app.taskService,
  ideService: app.ideService,
  cursorService: app.cursorService,
  // ... other core services
};
```

## 🔄 Workflow Management

### Framework Workflows
Frameworks can define workflows that combine multiple steps:

```javascript
// Get framework workflows
const framework = app.frameworkLoader.getFramework('refactoring_management');
const workflows = framework.config.workflows;

// Execute workflow
const workflow = workflows.complete_refactoring;
for (const stepName of workflow.steps) {
  const stepKey = `refactoring_management.${stepName}`;
  const result = await app.stepRegistry.executeStep(stepKey, {
    projectPath: '/path/to/project',
    context: 'workflow'
  });
  
  if (!result.success) {
    console.error(`Workflow step failed: ${stepName}`, result.error);
    break;
  }
}
```

### Custom Workflows
You can create custom workflows by combining framework steps:

```javascript
// Custom workflow
const customWorkflow = [
  'refactoring_management.refactor_analyze',
  'testing_management.testing_step',
  'documentation_management.generate_api_docs'
];

// Execute custom workflow
for (const stepKey of customWorkflow) {
  const result = await app.stepRegistry.executeStep(stepKey, {
    projectPath: '/path/to/project',
    context: 'custom_workflow'
  });
  
  if (!result.success) {
    console.error(`Custom workflow step failed: ${stepKey}`, result.error);
    break;
  }
}
```

## 🔒 Security and Validation

### Framework Validation
All frameworks are validated before activation:

```javascript
// Validate framework
const framework = app.frameworkLoader.getFramework('refactoring_management');
const validationResult = await app.frameworkValidator.validateFramework(framework);

if (validationResult.valid) {
  console.log('Framework validation passed');
} else {
  console.error('Framework validation failed:', validationResult.errors);
}
```

### Dependency Validation
Framework dependencies are validated:

```javascript
// Validate dependencies
const dependencyResult = await app.frameworkValidator.validateDependencies(framework);

if (dependencyResult.valid) {
  console.log('Dependencies validated');
} else {
  console.error('Missing dependencies:', dependencyResult.missingDependencies);
}
```

### Activation Validation
Framework activation is validated:

```javascript
// Validate activation
const activationResult = await app.frameworkValidator.validateActivation(framework);

if (activationResult.valid) {
  console.log('Activation validation passed');
} else {
  console.error('Activation validation failed:', activationResult.errors);
}
```

## 🐛 Troubleshooting

### Common Issues

#### Framework Not Found
```javascript
// Check if framework exists
const framework = app.frameworkLoader.getFramework('non_existent_framework');
if (!framework) {
  console.error('Framework not found');
}
```

#### Framework Activation Failed
```javascript
// Check activation result
const result = await app.frameworkManager.activateFramework('refactoring_management');
if (!result.success) {
  console.error('Activation failed:', result.error);
  
  // Check if framework is already active
  const activeFramework = app.frameworkManager.getActiveFramework('refactoring_management');
  if (activeFramework) {
    console.log('Framework is already active');
  }
}
```

#### Step Execution Failed
```javascript
// Check step availability
const stepInfo = app.frameworkStepRegistry.getFrameworkStepInfo('refactoring_management.refactor_step');
if (!stepInfo) {
  console.error('Step not found');
}

// Check if framework is active
const activeFramework = app.frameworkManager.getActiveFramework('refactoring_management');
if (!activeFramework) {
  console.error('Framework not active');
}
```

#### Configuration Issues
```javascript
// Validate configuration
const config = app.frameworkConfig.getConfig();
const validationResult = app.frameworkConfig.validateConfig(config);

if (!validationResult.valid) {
  console.error('Configuration validation failed:', validationResult.errors);
}
```

### Debug Information
```javascript
// Get debug information
const debugInfo = {
  frameworks: app.frameworkLoader.getStats(),
  activeFrameworks: app.frameworkManager.getStats(),
  configuration: app.frameworkConfig.getConfigStats(),
  stepRegistry: app.frameworkStepRegistry.getLoadedFrameworks()
};

console.log('Debug information:', JSON.stringify(debugInfo, null, 2));
```

## 📚 Best Practices

### Framework Usage
1. **Activate Only When Needed**: Don't activate frameworks unless you need them
2. **Check Dependencies**: Always validate dependencies before activation
3. **Handle Errors**: Always handle activation and execution errors
4. **Use Workflows**: Use predefined workflows when available
5. **Monitor Performance**: Monitor framework performance and resource usage

### Configuration Management
1. **Use Environment Variables**: Use environment variables for deployment-specific settings
2. **Validate Configuration**: Always validate configuration before use
3. **Backup Configuration**: Keep backups of important configurations
4. **Document Changes**: Document configuration changes
5. **Test Configuration**: Test configuration changes in development first

### Step Development
1. **Follow Patterns**: Follow established step patterns
2. **Handle Errors**: Implement proper error handling
3. **Validate Input**: Validate all input parameters
4. **Provide Context**: Provide meaningful context and results
5. **Test Thoroughly**: Test steps thoroughly before deployment

## 🔮 Advanced Features

### Custom Validation Rules
```javascript
// Add custom validation rule
const customRule = {
  name: 'custom_rule',
  validate: (framework) => {
    if (framework.config.version === '0.0.0') {
      return { valid: false, error: 'Version cannot be 0.0.0' };
    }
    return { valid: true };
  }
};

app.frameworkValidator.addValidationRule(customRule);
```

### Framework Reloading
```javascript
// Reload framework
await app.frameworkStepRegistry.reloadFramework('refactoring_management');
```

### Configuration Export/Import
```javascript
// Export configuration
const configExport = app.frameworkConfig.exportConfig('json');

// Import configuration
await app.frameworkConfig.importConfig(configExport, 'json');
```

## 📚 Related Documentation

- [Framework Architecture](../02_architecture/framework-architecture.md)
- [Step Migration Guide](./step-migration.md)
- [Framework API Reference](../08_reference/api/framework-api.md)
- [Configuration Guide](../08_reference/config/framework-config.md)
- [Testing Strategy](../10_testing/test-strategy.md) 