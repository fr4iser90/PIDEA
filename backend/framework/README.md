# PIDEA Framework System

## Overview
The PIDEA Framework System provides modular, extensible functionality that builds upon the core system. Frameworks are optional components that can be activated or deactivated as needed, providing additional capabilities beyond the essential core operations.

## Architecture
```
backend/framework/
├── refactoring_management/     # Advanced refactoring operations
├── testing_management/         # Advanced testing operations
├── documentation_management/   # Documentation generation
├── deployment_management/      # Deployment and infrastructure
├── security_management/        # Security and vulnerability management
└── performance_management/     # Performance optimization
```

## Core vs Framework Separation

### Core System (Always Available)
- **Location**: `backend/domain/`
- **Purpose**: Essential operations required for basic system functionality
- **Examples**: Git operations, IDE integration, basic analysis, file operations

### Framework System (Optional)
- **Location**: `backend/framework/`
- **Purpose**: Advanced operations and specialized functionality
- **Examples**: Advanced refactoring, comprehensive testing, security audits

## Available Frameworks

### 1. Refactoring Management
- **Purpose**: Advanced code restructuring and refactoring operations
- **Steps**: 10 specialized refactoring steps
- **Workflows**: 3 comprehensive refactoring workflows
- **Use Case**: Large-scale code restructuring and maintenance

### 2. Testing Management
- **Purpose**: Comprehensive testing operations and automation
- **Steps**: 10 testing-related steps
- **Workflows**: 3 testing workflows
- **Use Case**: Complete test suite management and automation

### 3. Documentation Management
- **Purpose**: Automated documentation generation and management
- **Steps**: 10 documentation steps
- **Workflows**: 3 documentation workflows
- **Use Case**: Maintaining comprehensive project documentation

### 4. Deployment Management
- **Purpose**: Deployment operations and infrastructure management
- **Steps**: 10 deployment steps
- **Workflows**: 4 deployment workflows
- **Use Case**: Automated deployment and infrastructure management

### 5. Security Management
- **Purpose**: Security auditing and vulnerability management
- **Steps**: 10 security steps
- **Workflows**: 3 security workflows
- **Use Case**: Security compliance and vulnerability management

### 6. Performance Management
- **Purpose**: Performance optimization and monitoring
- **Steps**: 10 performance steps
- **Workflows**: 3 performance workflows
- **Use Case**: Application performance optimization

## Framework Configuration

Each framework includes:
- **framework.json**: Configuration file defining steps, workflows, and settings
- **README.md**: Documentation for the specific framework
- **Steps**: Individual operations that can be executed
- **Workflows**: Predefined sequences of steps
- **Settings**: Framework-specific configuration options

## Activation and Usage

### Framework Activation
Frameworks can be activated through the Framework Manager:
```javascript
const frameworkManager = require('@infrastructure/framework').getFrameworkManager();
await frameworkManager.activateFramework('refactoring_management');
```

### Framework Deactivation
Frameworks can be deactivated when not needed:
```javascript
await frameworkManager.deactivateFramework('refactoring_management');
```

### Step Execution
Execute framework steps through the Step Registry:
```javascript
const stepRegistry = require('@domain/steps').getStepRegistry();
await stepRegistry.executeStep('refactoring_management.extract_method', context);
```

## Framework Dependencies

### Core Dependencies
All frameworks depend on the core system for basic operations:
- IDE integration
- File system operations
- Terminal operations
- Analysis capabilities

### Framework Dependencies
Some frameworks may depend on other frameworks:
- Testing framework may use refactoring framework
- Deployment framework may use testing framework
- Security framework may use analysis capabilities

## Configuration Options

### Global Framework Settings
- **Auto Load**: Whether frameworks load automatically
- **Confirmation Required**: Whether user confirmation is needed
- **Fallback to Core**: Whether to fall back to core operations if framework fails

### Framework-Specific Settings
Each framework has its own configuration options:
- Timeouts and limits
- Feature toggles
- Performance settings
- Security settings

## Integration with Core System

### Step Registry Integration
Framework steps are registered with the existing Step Registry:
- Steps are prefixed with framework name (e.g., `refactoring_management.extract_method`)
- Framework steps can be executed alongside core steps
- Fallback mechanisms ensure system stability

### Workflow Integration
Framework workflows integrate with the existing workflow system:
- Workflows can combine core and framework steps
- Framework workflows can be composed with core workflows
- Workflow execution is managed by the core system

## Development Guidelines

### Creating New Frameworks
1. Create framework directory in `backend/framework/`
2. Create `framework.json` configuration file
3. Define steps and workflows
4. Add documentation (README.md)
5. Test framework integration

### Framework Best Practices
- Keep frameworks focused on specific domains
- Ensure proper dependency management
- Provide comprehensive documentation
- Include validation and error handling
- Follow established naming conventions

## Monitoring and Maintenance

### Framework Health
- Monitor framework loading and activation
- Track step execution success rates
- Monitor performance impact
- Validate framework dependencies

### Framework Updates
- Regular security updates
- Performance optimizations
- Feature enhancements
- Compatibility updates

## Troubleshooting

### Common Issues
1. **Framework Loading Failures**: Check configuration and dependencies
2. **Step Execution Errors**: Verify step dependencies and permissions
3. **Performance Issues**: Monitor resource usage and optimize settings
4. **Integration Problems**: Validate core system compatibility

### Debugging
- Enable framework logging
- Check framework status and health
- Validate configuration files
- Review error logs and reports

## Future Enhancements

### Planned Features
- Framework marketplace
- Dynamic framework loading
- Framework versioning
- Advanced dependency resolution
- Framework performance analytics

### Extension Points
- Custom framework development
- Framework plugin system
- Framework composition
- Advanced workflow orchestration