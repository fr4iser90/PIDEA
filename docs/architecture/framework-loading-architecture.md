# Framework Loading System Architecture

## Overview

The Framework Loading System implements Clean Architecture principles with clear separation between domain and infrastructure layers. This document describes the refactored architecture that eliminates domain layer violations and ensures proper separation of concerns.

## Architecture Principles

### Clean Architecture Compliance

- **Domain Layer**: Contains only business logic and framework metadata
- **Infrastructure Layer**: Handles all technical concerns (file operations, step validation, etc.)
- **Dependency Direction**: Infrastructure depends on Domain, never the reverse
- **Separation of Concerns**: Each layer has distinct responsibilities

### Domain-Driven Design

- **Framework Registry**: Manages framework metadata and business rules
- **Framework Builder**: Constructs framework instances from configurations
- **Value Objects**: Framework metadata as immutable objects
- **Domain Services**: Business logic for framework management

## Layer Responsibilities

### Domain Layer (`backend/domain/frameworks/`)

#### FrameworkRegistry
- **Purpose**: Manages framework metadata and business rules
- **Responsibilities**:
  - Framework registration and retrieval
  - Metadata validation (name, version, description, category)
  - Framework categorization and filtering
  - Business rule enforcement
- **What it DOES NOT do**:
  - File system operations
  - Step validation (infrastructure concern)
  - File path handling
  - Step file loading

#### FrameworkBuilder
- **Purpose**: Constructs framework instances from configurations
- **Responsibilities**:
  - Framework instance creation
  - Configuration validation
  - Instance caching
  - Build option validation

#### Domain Services
- **Purpose**: Business logic for framework operations
- **Responsibilities**:
  - Framework lifecycle management
  - Business rule enforcement
  - Domain event handling

### Infrastructure Layer (`backend/infrastructure/framework/`)

#### FrameworkLoader
- **Purpose**: Handles all file system operations and framework loading
- **Responsibilities**:
  - Framework directory discovery
  - Configuration file loading
  - File system operations
  - Domain layer initialization with collected configurations
- **Integration**: Collects configurations and passes them to domain layer

#### FrameworkValidator
- **Purpose**: Validates infrastructure-specific concerns
- **Responsibilities**:
  - Steps configuration validation
  - Workflows validation
  - File path validation
  - Security validation
  - File system access validation

#### FrameworkStepRegistry
- **Purpose**: Integrates framework steps with main step registry
- **Responsibilities**:
  - Step file loading and validation
  - Step registration with main registry
  - Framework step management
  - Domain integration validation

#### FrameworkManager
- **Purpose**: Manages framework activation and lifecycle
- **Responsibilities**:
  - Framework activation/deactivation
  - Dependency management
  - Framework state tracking

## Data Flow

### Framework Loading Process

1. **Infrastructure Discovery** (`FrameworkLoader`)
   - Discovers framework directories
   - Loads configuration files
   - Validates file system access

2. **Configuration Collection** (`FrameworkLoader`)
   - Collects all framework configurations
   - Stores configurations for domain layer

3. **Domain Initialization** (`FrameworkLoader` → `Domain`)
   - Passes configurations to domain layer
   - Domain layer registers frameworks with metadata only

4. **Step Registration** (`FrameworkStepRegistry`)
   - Loads step files from framework directories
   - Validates step modules
   - Registers steps with main step registry

5. **Validation** (`FrameworkValidator`)
   - Validates infrastructure concerns (steps, workflows, paths)
   - Performs security checks
   - Validates file system access

### Framework Usage Process

1. **Framework Retrieval** (`Domain`)
   - Applications request frameworks from domain layer
   - Domain layer returns framework metadata

2. **Step Execution** (`Infrastructure`)
   - Step registry executes framework steps
   - Infrastructure handles step loading and execution

3. **Framework Building** (`Domain`)
   - Framework builder creates instances from configurations
   - Domain layer manages instance lifecycle

## Key Architectural Changes

### Before Refactoring (Domain Violations)

```javascript
// Domain layer had infrastructure concerns
class FrameworkRegistry {
  async loadFrameworkConfigs() {
    const configsDir = path.join(__dirname, 'configs'); // ❌ File system
    const files = await fs.readdir(configsDir); // ❌ File operations
    // ... file operations in domain layer
  }
  
  validateFrameworkConfig(config) {
    // ❌ Steps validation in domain layer
    if (config.steps !== undefined) {
      if (!Array.isArray(config.steps) && typeof config.steps !== 'object') {
        throw new Error('Framework configuration "steps" must be an array or object');
      }
    }
  }
}
```

### After Refactoring (Clean Architecture)

```javascript
// Domain layer - only business logic
class FrameworkRegistry {
  async loadFrameworkConfigs(configs = []) {
    // ✅ Only handles business logic
    for (const config of configs) {
      await this.registerFramework(config.name, config, config.category);
    }
  }
  
  validateFrameworkConfig(config) {
    // ✅ Only validates metadata
    if (!config.name) {
      throw new Error('Framework configuration must have a "name" property');
    }
    // Steps validation moved to infrastructure layer
  }
}

// Infrastructure layer - handles technical concerns
class FrameworkLoader {
  async initialize() {
    await this.discoverFrameworks(); // ✅ File operations
    await this.loadFrameworkConfigs(); // ✅ File loading
    this.domainFrameworkSystem = await initializeFrameworks(this.frameworkConfigs); // ✅ Domain integration
  }
}

class FrameworkValidator {
  async validateInfrastructureConcerns(framework) {
    // ✅ Steps validation in infrastructure layer
    if (framework.config.steps) {
      const stepsValidation = this.validateStepsConfiguration(framework.config.steps);
      // ... infrastructure-specific validation
    }
  }
}
```

## Benefits of Refactored Architecture

### Maintainability
- **Clear Separation**: Each layer has distinct responsibilities
- **Easier Testing**: Domain logic can be tested without file system dependencies
- **Reduced Coupling**: Changes in infrastructure don't affect domain logic

### Testability
- **Unit Tests**: Domain layer can be tested with mock configurations
- **Integration Tests**: Full workflow testing with real file system
- **Isolation**: Each layer can be tested independently

### Flexibility
- **Infrastructure Changes**: File system operations can change without affecting domain
- **Different Implementations**: Infrastructure can be swapped (file system → database)
- **Scalability**: Better support for different framework types

### Security
- **Input Validation**: Infrastructure layer validates all external inputs
- **File System Security**: Centralized file access validation
- **Code Execution Security**: Controlled step loading and execution

## Configuration Structure

### Framework Configuration (`framework.json`)

```json
{
  "name": "example-framework",
  "version": "1.0.0",
  "description": "Example framework for demonstration",
  "category": "development",
  "author": "PIDEA Team",
  "dependencies": ["core"],
  "steps": {
    "example-step": {
      "file": "example-step.js",
      "type": "action",
      "category": "development",
      "description": "Example step implementation"
    }
  },
  "workflows": {
    "example-workflow": {
      "name": "example-workflow",
      "steps": ["example-step"],
      "description": "Example workflow"
    }
  },
  "activation": {
    "auto_load": false,
    "requires_confirmation": true,
    "fallback_to_core": true
  }
}
```

### Domain Layer Validation (Metadata Only)

- `name`: Required string, framework identifier
- `version`: Required string, semantic versioning
- `description`: Required string, framework description
- `category`: Required string, framework category
- `author`: Optional string, framework author
- `dependencies`: Optional array, framework dependencies

### Infrastructure Layer Validation (Technical Concerns)

- `steps`: Object with step configurations
- `workflows`: Object with workflow definitions
- `activation`: Object with activation settings
- File paths and step files existence
- Security validation for file access

## Error Handling Strategy

### Domain Layer Errors
- **Business Rule Violations**: Invalid metadata, missing required fields
- **Domain Logic Errors**: Framework registration conflicts, invalid categories
- **Graceful Degradation**: Continue operation with partial data

### Infrastructure Layer Errors
- **File System Errors**: Missing files, permission issues
- **Validation Errors**: Invalid step configurations, security violations
- **Recovery**: Fallback mechanisms, error logging, partial loading

## Performance Considerations

### Loading Performance
- **Target**: Framework loading < 500ms
- **Caching**: Framework configurations cached in memory
- **Lazy Loading**: Steps loaded only when needed
- **Parallel Processing**: Multiple frameworks loaded concurrently

### Memory Usage
- **Target**: < 50MB for framework metadata
- **Efficient Storage**: Map-based storage for fast lookups
- **Garbage Collection**: Proper cleanup of unused resources

### Scalability
- **Multiple Frameworks**: Support for 100+ frameworks simultaneously
- **Dynamic Loading**: Frameworks can be loaded/unloaded at runtime
- **Resource Management**: Efficient memory and file handle usage

## Migration Guide

### For Existing Frameworks
1. **No Changes Required**: Existing framework configurations continue to work
2. **Enhanced Validation**: Better error messages for invalid configurations
3. **Improved Performance**: Faster loading and better error handling

### For Developers
1. **Domain Layer**: Use `FrameworkRegistry` for framework metadata operations
2. **Infrastructure Layer**: Use `FrameworkLoader` for file operations
3. **Step Development**: Follow existing step development patterns
4. **Testing**: Use new test utilities for domain and integration testing

## Future Enhancements

### Planned Improvements
- **Database Storage**: Option to store frameworks in database instead of file system
- **Remote Frameworks**: Support for loading frameworks from remote sources
- **Framework Marketplace**: Centralized framework distribution
- **Advanced Caching**: Redis-based caching for distributed deployments

### Extension Points
- **Custom Validators**: Plugin system for custom validation rules
- **Framework Types**: Support for different framework types (microservices, etc.)
- **Advanced Security**: Enhanced security validation and sandboxing
- **Performance Monitoring**: Detailed performance metrics and monitoring

## Conclusion

The refactored Framework Loading System provides a clean, maintainable, and scalable architecture that follows Clean Architecture principles. The clear separation between domain and infrastructure layers ensures better testability, maintainability, and flexibility while maintaining backward compatibility with existing frameworks.
