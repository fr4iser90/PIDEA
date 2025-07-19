# Framework Architecture

## 📋 Overview

The Framework Modularization system provides a modular, extensible architecture for organizing and managing additional functionality in the PIDEA backend system. This document describes the architecture, components, and integration patterns of the framework system.

## 🏗️ Architecture Overview

### Core Principles
1. **Separation of Concerns**: Core functionality remains in `backend/domain/`, frameworks provide additional features
2. **Modularity**: Each framework is self-contained with its own steps, workflows, and configuration
3. **Extensibility**: New frameworks can be added without modifying core system
4. **Backward Compatibility**: Core system works independently, frameworks are optional
5. **Registry Pattern**: Centralized management of frameworks and steps

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Application   │  │   Framework     │  │   Step       │ │
│  │   Services      │  │   Services      │  │   Services   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Framework      │  │  Framework      │  │  Framework   │ │
│  │  Loader         │  │  Manager        │  │  Validator   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Framework      │  │  Framework      │                   │
│  │  Config         │  │  StepRegistry   │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Framework      │  │  Step           │  │  Core        │ │
│  │  Registry       │  │  Registry       │  │  Services    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Framework Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Refactoring │ │   Testing   │ │Documentation│           │
│  │ Management  │ │ Management  │ │ Management  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Deployment  │ │  Security   │ │Performance  │           │
│  │ Management  │ │ Management  │ │ Management  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### Domain Layer Components

#### FrameworkRegistry
- **Location**: `backend/domain/frameworks/FrameworkRegistry.js`
- **Purpose**: Central registry for managing framework instances
- **Features**:
  - Framework registration and discovery
  - Category-based organization
  - Metadata tracking
  - Validation support

#### StepRegistry
- **Location**: `backend/domain/steps/StepRegistry.js`
- **Purpose**: Central registry for managing step instances
- **Features**:
  - Step registration and discovery
  - Framework step support
  - Category-based organization
  - Execution management

### Infrastructure Layer Components

#### FrameworkLoader
- **Location**: `backend/infrastructure/framework/FrameworkLoader.js`
- **Purpose**: Discovers and loads frameworks from filesystem
- **Features**:
  - Automatic framework discovery
  - Configuration loading
  - Validation during loading
  - Error handling and recovery

#### FrameworkManager
- **Location**: `backend/infrastructure/framework/FrameworkManager.js`
- **Purpose**: Manages framework lifecycle and activation
- **Features**:
  - Framework activation/deactivation
  - Dependency management
  - State tracking
  - Error recovery

#### FrameworkValidator
- **Location**: `backend/infrastructure/framework/FrameworkValidator.js`
- **Purpose**: Validates framework configurations and dependencies
- **Features**:
  - Configuration validation
  - Dependency validation
  - Activation validation
  - Custom validation rules

#### FrameworkConfig
- **Location**: `backend/infrastructure/framework/FrameworkConfig.js`
- **Purpose**: Manages framework system configuration
- **Features**:
  - Configuration persistence
  - Environment variable support
  - Validation and defaults
  - Import/export functionality

#### FrameworkStepRegistry
- **Location**: `backend/infrastructure/framework/FrameworkStepRegistry.js`
- **Purpose**: Integrates framework steps with main StepRegistry
- **Features**:
  - Framework step discovery
  - Step registration with main registry
  - Framework context management
  - Step reloading support

## 📁 Framework Structure

### Framework Directory Structure
```
backend/framework/
├── refactoring_management/
│   ├── framework.json          # Framework configuration
│   ├── README.md               # Framework documentation
│   └── steps/                  # Framework steps
│       ├── refactor_step.js
│       ├── refactor_analyze.js
│       └── refactor_generate_task.js
├── testing_management/
│   ├── framework.json
│   ├── README.md
│   └── steps/
│       ├── testing_step.js
│       └── run_unit_tests.js
├── documentation_management/
│   ├── framework.json
│   ├── README.md
│   └── steps/
├── deployment_management/
│   ├── framework.json
│   ├── README.md
│   └── steps/
├── security_management/
│   ├── framework.json
│   ├── README.md
│   └── steps/
└── performance_management/
    ├── framework.json
    ├── README.md
    └── steps/
```

### Framework Configuration Structure
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

## 🔄 Integration Patterns

### Application Integration
The framework system integrates with the main Application class through the domain services initialization:

```javascript
// In Application.js
async initializeDomainServices() {
  // Initialize core services
  this.stepRegistry = await initializeStepRegistry();
  
  // Initialize framework infrastructure
  const frameworkInfrastructure = await initializeFrameworkInfrastructure(this.stepRegistry);
  this.frameworkManager = frameworkInfrastructure.manager;
  this.frameworkLoader = frameworkInfrastructure.loader;
  this.frameworkValidator = frameworkInfrastructure.validator;
  this.frameworkConfig = frameworkInfrastructure.config;
  this.frameworkStepRegistry = frameworkInfrastructure.stepRegistry;
}
```

### Step Integration
Framework steps are integrated with the main StepRegistry through the FrameworkStepRegistry:

```javascript
// Framework steps are registered with framework prefix
// Example: "refactoring_management.refactor_step"
const stepKey = `${frameworkName}.${stepName}`;
await this.stepRegistry.register(stepKey, {
  name: stepName,
  framework: frameworkName,
  execute: stepModule.execute,
  config: stepModule.config
});
```

### Service Integration
Framework services integrate with core services through dependency injection:

```javascript
// Framework steps can access core services
const step = {
  name: 'refactor_step',
  execute: async (context) => {
    const { stepRegistry, taskService, ideService } = context;
    // Use core services
    const result = await taskService.createTask(/* ... */);
    return result;
  }
};
```

## 🔧 Configuration Management

### System Configuration
The framework system uses a hierarchical configuration approach:

1. **Default Configuration**: Built-in defaults for all settings
2. **File Configuration**: JSON configuration file for custom settings
3. **Environment Variables**: Override settings via environment variables
4. **Runtime Configuration**: Dynamic configuration updates

### Configuration Hierarchy
```
Environment Variables (Highest Priority)
    ↓
File Configuration
    ↓
Default Configuration (Lowest Priority)
```

### Configuration Validation
All configuration is validated against schemas:

```javascript
const validationResult = await frameworkValidator.validateConfig(config);
if (!validationResult.valid) {
  throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
}
```

## 🔒 Security Considerations

### Framework Security
1. **Sandboxed Execution**: Framework steps run in controlled environment
2. **Dependency Validation**: All dependencies are validated before activation
3. **Access Control**: Framework access is controlled through configuration
4. **Error Isolation**: Framework errors don't affect core system

### Configuration Security
1. **Input Validation**: All configuration input is validated
2. **Path Validation**: File paths are validated for security
3. **Permission Checks**: File system permissions are verified
4. **Environment Isolation**: Framework environment is isolated

## 📊 Performance Considerations

### Loading Performance
1. **Lazy Loading**: Frameworks are loaded on-demand
2. **Caching**: Framework configurations are cached
3. **Parallel Loading**: Multiple frameworks can be loaded in parallel
4. **Incremental Loading**: Only required components are loaded

### Runtime Performance
1. **Step Caching**: Step instances are cached for reuse
2. **Dependency Resolution**: Efficient dependency resolution
3. **Memory Management**: Proper cleanup of unused resources
4. **Async Operations**: Non-blocking operations where possible

## 🔄 Lifecycle Management

### Framework Lifecycle
1. **Discovery**: Frameworks are discovered during system startup
2. **Loading**: Framework configurations are loaded and validated
3. **Registration**: Framework steps are registered with main registry
4. **Activation**: Frameworks are activated when requested
5. **Execution**: Framework steps are executed as needed
6. **Deactivation**: Frameworks are deactivated when no longer needed

### Step Lifecycle
1. **Discovery**: Steps are discovered in framework directories
2. **Loading**: Step modules are loaded and validated
3. **Registration**: Steps are registered with main StepRegistry
4. **Execution**: Steps are executed with context and parameters
5. **Cleanup**: Step resources are cleaned up after execution

## 🧪 Testing Strategy

### Test Coverage
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Component interaction testing
3. **End-to-End Tests**: Complete workflow testing
4. **Performance Tests**: Performance and scalability testing

### Test Categories
1. **Framework Loading Tests**: Test framework discovery and loading
2. **Step Execution Tests**: Test step execution and integration
3. **Configuration Tests**: Test configuration management
4. **Error Handling Tests**: Test error scenarios and recovery
5. **Performance Tests**: Test performance under load

## 📈 Monitoring and Observability

### Metrics Collection
1. **Framework Metrics**: Framework loading and activation metrics
2. **Step Metrics**: Step execution and performance metrics
3. **Configuration Metrics**: Configuration changes and validation metrics
4. **Error Metrics**: Error rates and recovery metrics

### Logging Strategy
1. **Structured Logging**: JSON-structured logs for easy parsing
2. **Log Levels**: Appropriate log levels for different scenarios
3. **Context Tracking**: Request context tracking across components
4. **Error Logging**: Comprehensive error logging with stack traces

## 🔮 Future Enhancements

### Planned Features
1. **Plugin System**: Dynamic plugin loading and management
2. **Version Management**: Framework version compatibility
3. **Hot Reloading**: Runtime framework updates
4. **Distributed Frameworks**: Framework distribution and sharing
5. **Advanced Validation**: More sophisticated validation rules

### Architecture Evolution
1. **Microservices**: Framework system as microservice
2. **Event-Driven**: Event-driven framework communication
3. **GraphQL API**: GraphQL API for framework management
4. **Containerization**: Framework containerization support

## 📚 Related Documentation

- [Framework Implementation](./framework-modularization-implementation.md)
- [Framework API Reference](../08_reference/api/framework-api.md)
- [Step Migration Guide](../03_features/step-migration.md)
- [Configuration Guide](../08_reference/config/framework-config.md)
- [Testing Strategy](../10_testing/test-strategy.md) 