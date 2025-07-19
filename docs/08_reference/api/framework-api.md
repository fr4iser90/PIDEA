# Framework System API Reference

## Overview

The Framework System API provides a comprehensive interface for managing modular frameworks, steps, and their integration with the core PIDEA system. This document covers all public APIs, interfaces, and usage patterns.

## Core Classes

### FrameworkRegistry

Manages framework registration, discovery, and lifecycle.

```javascript
const FrameworkRegistry = require('@/infrastructure/framework/FrameworkRegistry');
```

#### Constructor
```javascript
new FrameworkRegistry(config = {})
```

**Parameters:**
- `config` (Object): Configuration options
  - `basePath` (string): Base path for framework discovery
  - `autoDiscover` (boolean): Enable automatic discovery
  - `validateOnLoad` (boolean): Validate frameworks on load

#### Methods

##### `register(framework)`
Registers a framework instance.

**Parameters:**
- `framework` (Framework): Framework instance to register

**Returns:** `boolean` - Success status

**Example:**
```javascript
const framework = new Framework({
  id: 'refactoring',
  name: 'Refactoring Framework',
  version: '1.0.0'
});
registry.register(framework);
```

##### `get(id)`
Retrieves a framework by ID.

**Parameters:**
- `id` (string): Framework ID

**Returns:** `Framework|null` - Framework instance or null

**Example:**
```javascript
const framework = registry.get('refactoring');
if (framework) {
  console.log(framework.name);
}
```

##### `getAll()`
Retrieves all registered frameworks.

**Returns:** `Array<Framework>` - Array of framework instances

**Example:**
```javascript
const frameworks = registry.getAll();
frameworks.forEach(fw => console.log(fw.id, fw.name));
```

##### `discover()`
Discovers frameworks in the configured base path.

**Returns:** `Promise<Array<string>>` - Array of discovered framework IDs

**Example:**
```javascript
const discovered = await registry.discover();
console.log('Discovered frameworks:', discovered);
```

##### `load(id)`
Loads a framework by ID.

**Parameters:**
- `id` (string): Framework ID to load

**Returns:** `Promise<Framework>` - Loaded framework instance

**Example:**
```javascript
try {
  const framework = await registry.load('refactoring');
  console.log('Framework loaded:', framework.name);
} catch (error) {
  console.error('Failed to load framework:', error.message);
}
```

##### `unregister(id)`
Unregisters a framework.

**Parameters:**
- `id` (string): Framework ID to unregister

**Returns:** `boolean` - Success status

**Example:**
```javascript
const success = registry.unregister('refactoring');
if (success) {
  console.log('Framework unregistered');
}
```

##### `getStatistics()`
Gets registry statistics.

**Returns:** `Object` - Statistics object

**Example:**
```javascript
const stats = registry.getStatistics();
console.log('Total frameworks:', stats.total);
console.log('Active frameworks:', stats.active);
```

### FrameworkManager

Manages framework lifecycle, activation, and coordination.

```javascript
const FrameworkManager = require('@/infrastructure/framework/FrameworkManager');
```

#### Constructor
```javascript
new FrameworkManager(registry, config = {})
```

**Parameters:**
- `registry` (FrameworkRegistry): Framework registry instance
- `config` (Object): Configuration options
  - `autoActivate` (boolean): Auto-activate frameworks
  - `dependencyCheck` (boolean): Check dependencies on activation

#### Methods

##### `activate(id)`
Activates a framework.

**Parameters:**
- `id` (string): Framework ID to activate

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
try {
  const activated = await manager.activate('refactoring');
  if (activated) {
    console.log('Framework activated successfully');
  }
} catch (error) {
  console.error('Activation failed:', error.message);
}
```

##### `deactivate(id)`
Deactivates a framework.

**Parameters:**
- `id` (string): Framework ID to deactivate

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
const deactivated = await manager.deactivate('refactoring');
if (deactivated) {
  console.log('Framework deactivated');
}
```

##### `isActive(id)`
Checks if a framework is active.

**Parameters:**
- `id` (string): Framework ID to check

**Returns:** `boolean` - Active status

**Example:**
```javascript
if (manager.isActive('refactoring')) {
  console.log('Refactoring framework is active');
}
```

##### `getActiveFrameworks()`
Gets all active frameworks.

**Returns:** `Array<Framework>` - Array of active frameworks

**Example:**
```javascript
const active = manager.getActiveFrameworks();
active.forEach(fw => console.log(fw.name, 'is active'));
```

##### `getDependencies(id)`
Gets framework dependencies.

**Parameters:**
- `id` (string): Framework ID

**Returns:** `Array<string>` - Array of dependency IDs

**Example:**
```javascript
const deps = manager.getDependencies('refactoring');
console.log('Dependencies:', deps);
```

##### `resolveConflicts()`
Resolves framework conflicts.

**Returns:** `Promise<Object>` - Resolution results

**Example:**
```javascript
const resolution = await manager.resolveConflicts();
console.log('Conflicts resolved:', resolution.resolved);
```

##### `getStatistics()`
Gets manager statistics.

**Returns:** `Object` - Statistics object

**Example:**
```javascript
const stats = manager.getStatistics();
console.log('Active frameworks:', stats.active);
console.log('Total conflicts:', stats.conflicts);
```

### FrameworkStepRegistry

Manages framework-specific steps and their registration.

```javascript
const FrameworkStepRegistry = require('@/infrastructure/framework/FrameworkStepRegistry');
```

#### Constructor
```javascript
new FrameworkStepRegistry(config = {})
```

**Parameters:**
- `config` (Object): Configuration options
  - `autoDiscover` (boolean): Auto-discover steps
  - `validateSteps` (boolean): Validate steps on registration

#### Methods

##### `registerStep(frameworkId, step)`
Registers a step for a framework.

**Parameters:**
- `frameworkId` (string): Framework ID
- `step` (Object): Step definition

**Returns:** `boolean` - Success status

**Example:**
```javascript
const step = {
  id: 'extract-method',
  name: 'Extract Method',
  category: 'refactoring',
  execute: async (context) => { /* step logic */ }
};

const registered = registry.registerStep('refactoring', step);
```

##### `getStep(frameworkId, stepId)`
Gets a step by ID.

**Parameters:**
- `frameworkId` (string): Framework ID
- `stepId` (string): Step ID

**Returns:** `Object|null` - Step definition or null

**Example:**
```javascript
const step = registry.getStep('refactoring', 'extract-method');
if (step) {
  console.log('Step found:', step.name);
}
```

##### `getFrameworkSteps(frameworkId)`
Gets all steps for a framework.

**Parameters:**
- `frameworkId` (string): Framework ID

**Returns:** `Array<Object>` - Array of step definitions

**Example:**
```javascript
const steps = registry.getFrameworkSteps('refactoring');
steps.forEach(step => console.log(step.name));
```

##### `discoverSteps(frameworkId)`
Discovers steps for a framework.

**Parameters:**
- `frameworkId` (string): Framework ID

**Returns:** `Promise<Array<string>>` - Array of discovered step IDs

**Example:**
```javascript
const discovered = await registry.discoverSteps('refactoring');
console.log('Discovered steps:', discovered);
```

##### `reloadSteps(frameworkId)`
Reloads steps for a framework.

**Parameters:**
- `frameworkId` (string): Framework ID

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
const reloaded = await registry.reloadSteps('refactoring');
if (reloaded) {
  console.log('Steps reloaded successfully');
}
```

### FrameworkLoader

Handles framework loading and initialization.

```javascript
const FrameworkLoader = require('@/infrastructure/framework/FrameworkLoader');
```

#### Constructor
```javascript
new FrameworkLoader(config = {})
```

**Parameters:**
- `config` (Object): Configuration options
  - `basePath` (string): Base path for framework files
  - `validateOnLoad` (boolean): Validate frameworks on load

#### Methods

##### `loadFramework(id)`
Loads a framework by ID.

**Parameters:**
- `id` (string): Framework ID to load

**Returns:** `Promise<Framework>` - Loaded framework instance

**Example:**
```javascript
try {
  const framework = await loader.loadFramework('refactoring');
  console.log('Framework loaded:', framework.name);
} catch (error) {
  console.error('Load failed:', error.message);
}
```

##### `loadAllFrameworks()`
Loads all available frameworks.

**Returns:** `Promise<Array<Framework>>` - Array of loaded frameworks

**Example:**
```javascript
const frameworks = await loader.loadAllFrameworks();
console.log('Loaded frameworks:', frameworks.length);
```

##### `discoverFrameworks()`
Discovers available frameworks.

**Returns:** `Promise<Array<string>>` - Array of framework IDs

**Example:**
```javascript
const discovered = await loader.discoverFrameworks();
console.log('Available frameworks:', discovered);
```

### FrameworkValidator

Validates framework configurations and dependencies.

```javascript
const FrameworkValidator = require('@/infrastructure/framework/FrameworkValidator');
```

#### Constructor
```javascript
new FrameworkValidator(config = {})
```

**Parameters:**
- `config` (Object): Configuration options
  - `strictMode` (boolean): Enable strict validation
  - `customRules` (Array): Custom validation rules

#### Methods

##### `validateFramework(framework)`
Validates a framework instance.

**Parameters:**
- `framework` (Framework): Framework to validate

**Returns:** `Promise<ValidationResult>` - Validation result

**Example:**
```javascript
const result = await validator.validateFramework(framework);
if (result.isValid) {
  console.log('Framework is valid');
} else {
  console.log('Validation errors:', result.errors);
}
```

##### `validateDependencies(framework)`
Validates framework dependencies.

**Parameters:**
- `framework` (Framework): Framework to validate

**Returns:** `Promise<ValidationResult>` - Validation result

**Example:**
```javascript
const result = await validator.validateDependencies(framework);
if (result.isValid) {
  console.log('Dependencies are valid');
}
```

##### `validateActivation(framework)`
Validates framework activation requirements.

**Parameters:**
- `framework` (Framework): Framework to validate

**Returns:** `Promise<ValidationResult>` - Validation result

**Example:**
```javascript
const result = await validator.validateActivation(framework);
if (result.isValid) {
  console.log('Framework can be activated');
}
```

### FrameworkConfig

Manages framework configuration and settings.

```javascript
const FrameworkConfig = require('@/infrastructure/framework/FrameworkConfig');
```

#### Constructor
```javascript
new FrameworkConfig(config = {})
```

**Parameters:**
- `config` (Object): Configuration options
  - `configPath` (string): Path to configuration file
  - `autoSave` (boolean): Auto-save configuration changes

#### Methods

##### `get(key, defaultValue = null)`
Gets a configuration value.

**Parameters:**
- `key` (string): Configuration key
- `defaultValue` (any): Default value if key not found

**Returns:** `any` - Configuration value

**Example:**
```javascript
const basePath = config.get('framework.basePath', './frameworks');
const autoDiscover = config.get('framework.autoDiscover', true);
```

##### `set(key, value)`
Sets a configuration value.

**Parameters:**
- `key` (string): Configuration key
- `value` (any): Value to set

**Returns:** `boolean` - Success status

**Example:**
```javascript
config.set('framework.basePath', './custom-frameworks');
config.set('framework.autoDiscover', false);
```

##### `has(key)`
Checks if a configuration key exists.

**Parameters:**
- `key` (string): Configuration key

**Returns:** `boolean` - Existence status

**Example:**
```javascript
if (config.has('framework.basePath')) {
  console.log('Base path is configured');
}
```

##### `delete(key)`
Deletes a configuration key.

**Parameters:**
- `key` (string): Configuration key

**Returns:** `boolean` - Success status

**Example:**
```javascript
const deleted = config.delete('framework.basePath');
if (deleted) {
  console.log('Configuration key deleted');
}
```

##### `save()`
Saves configuration to file.

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
const saved = await config.save();
if (saved) {
  console.log('Configuration saved');
}
```

##### `load()`
Loads configuration from file.

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
const loaded = await config.load();
if (loaded) {
  console.log('Configuration loaded');
}
```

## Framework Categories

### Refactoring Framework

**ID:** `refactoring`

**Description:** Provides refactoring tools and patterns for code improvement.

**Steps:**
- `extract-method`: Extract method refactoring
- `extract-class`: Extract class refactoring
- `rename-symbol`: Rename symbol refactoring
- `move-method`: Move method refactoring

**Configuration:**
```json
{
  "refactoring": {
    "enabled": true,
    "autoApply": false,
    "validationLevel": "strict"
  }
}
```

### Testing Framework

**ID:** `testing`

**Description:** Provides testing utilities and test generation.

**Steps:**
- `generate-unit-tests`: Generate unit tests
- `generate-integration-tests`: Generate integration tests
- `test-coverage`: Analyze test coverage
- `test-refactoring`: Refactor tests

**Configuration:**
```json
{
  "testing": {
    "enabled": true,
    "testFramework": "jest",
    "coverageThreshold": 80
  }
}
```

### Documentation Framework

**ID:** `documentation`

**Description:** Provides documentation generation and management.

**Steps:**
- `generate-api-docs`: Generate API documentation
- `generate-readme`: Generate README files
- `update-changelog`: Update changelog
- `validate-docs`: Validate documentation

**Configuration:**
```json
{
  "documentation": {
    "enabled": true,
    "outputFormat": "markdown",
    "autoUpdate": true
  }
}
```

### Deployment Framework

**ID:** `deployment`

**Description:** Provides deployment automation and configuration.

**Steps:**
- `build-project`: Build project for deployment
- `deploy-staging`: Deploy to staging environment
- `deploy-production`: Deploy to production
- `rollback`: Rollback deployment

**Configuration:**
```json
{
  "deployment": {
    "enabled": true,
    "environments": ["staging", "production"],
    "autoRollback": true
  }
}
```

### Security Framework

**ID:** `security`

**Description:** Provides security analysis and vulnerability detection.

**Steps:**
- `security-scan`: Perform security scan
- `vulnerability-check`: Check for vulnerabilities
- `code-audit`: Perform code audit
- `security-fix`: Apply security fixes

**Configuration:**
```json
{
  "security": {
    "enabled": true,
    "scanLevel": "comprehensive",
    "autoFix": false
  }
}
```

### Performance Framework

**ID:** `performance`

**Description:** Provides performance analysis and optimization.

**Steps:**
- `performance-analyze`: Analyze performance
- `optimize-code`: Optimize code performance
- `benchmark-tests`: Run benchmark tests
- `performance-report`: Generate performance report

**Configuration:**
```json
{
  "performance": {
    "enabled": true,
    "analysisLevel": "detailed",
    "autoOptimize": false
  }
}
```

## Error Handling

### FrameworkError

Base error class for framework-related errors.

```javascript
const FrameworkError = require('@/infrastructure/framework/FrameworkError');
```

**Properties:**
- `message` (string): Error message
- `code` (string): Error code
- `frameworkId` (string): Related framework ID
- `details` (Object): Additional error details

**Example:**
```javascript
try {
  await registry.load('invalid-framework');
} catch (error) {
  if (error instanceof FrameworkError) {
    console.error('Framework error:', error.message);
    console.error('Framework ID:', error.frameworkId);
    console.error('Error code:', error.code);
  }
}
```

### Common Error Codes

- `FRAMEWORK_NOT_FOUND`: Framework not found
- `FRAMEWORK_LOAD_FAILED`: Framework loading failed
- `FRAMEWORK_VALIDATION_FAILED`: Framework validation failed
- `FRAMEWORK_ACTIVATION_FAILED`: Framework activation failed
- `DEPENDENCY_NOT_FOUND`: Dependency not found
- `CONFLICT_DETECTED`: Framework conflict detected
- `STEP_NOT_FOUND`: Step not found
- `CONFIGURATION_INVALID`: Invalid configuration

## Integration Examples

### Basic Framework Usage

```javascript
const FrameworkRegistry = require('@/infrastructure/framework/FrameworkRegistry');
const FrameworkManager = require('@/infrastructure/framework/FrameworkManager');

// Initialize registry and manager
const registry = new FrameworkRegistry({
  basePath: './frameworks',
  autoDiscover: true
});

const manager = new FrameworkManager(registry, {
  autoActivate: false,
  dependencyCheck: true
});

// Load and activate a framework
async function setupFramework() {
  try {
    // Discover available frameworks
    const discovered = await registry.discover();
    console.log('Discovered frameworks:', discovered);

    // Load a specific framework
    const framework = await registry.load('refactoring');
    console.log('Loaded framework:', framework.name);

    // Activate the framework
    const activated = await manager.activate('refactoring');
    if (activated) {
      console.log('Framework activated successfully');
    }
  } catch (error) {
    console.error('Framework setup failed:', error.message);
  }
}

setupFramework();
```

### Framework Step Execution

```javascript
const FrameworkStepRegistry = require('@/infrastructure/framework/FrameworkStepRegistry');

const stepRegistry = new FrameworkStepRegistry();

// Register a custom step
const customStep = {
  id: 'custom-refactor',
  name: 'Custom Refactoring',
  category: 'refactoring',
  execute: async (context) => {
    console.log('Executing custom refactoring...');
    // Step implementation
    return { success: true, changes: [] };
  }
};

stepRegistry.registerStep('refactoring', customStep);

// Execute a step
async function executeStep() {
  const step = stepRegistry.getStep('refactoring', 'custom-refactor');
  if (step) {
    const context = { file: 'example.js', content: '// code here' };
    const result = await step.execute(context);
    console.log('Step result:', result);
  }
}

executeStep();
```

### Configuration Management

```javascript
const FrameworkConfig = require('@/infrastructure/framework/FrameworkConfig');

const config = new FrameworkConfig({
  configPath: './framework-config.json',
  autoSave: true
});

// Set framework configuration
config.set('framework.basePath', './custom-frameworks');
config.set('framework.autoDiscover', true);
config.set('refactoring.enabled', true);
config.set('refactoring.autoApply', false);

// Save configuration
await config.save();

// Load configuration
await config.load();

// Get configuration values
const basePath = config.get('framework.basePath');
const refactoringEnabled = config.get('refactoring.enabled', false);
```

### Error Handling and Validation

```javascript
const FrameworkValidator = require('@/infrastructure/framework/FrameworkValidator');

const validator = new FrameworkValidator({
  strictMode: true,
  customRules: [
    // Custom validation rules
  ]
});

// Validate framework
async function validateFramework(framework) {
  try {
    const result = await validator.validateFramework(framework);
    
    if (result.isValid) {
      console.log('Framework is valid');
    } else {
      console.log('Validation errors:', result.errors);
      console.log('Warnings:', result.warnings);
    }
  } catch (error) {
    console.error('Validation failed:', error.message);
  }
}

// Validate dependencies
async function validateDependencies(framework) {
  const result = await validator.validateDependencies(framework);
  
  if (result.isValid) {
    console.log('Dependencies are valid');
  } else {
    console.log('Dependency issues:', result.errors);
  }
}
```

## Performance Considerations

### Caching

The framework system implements caching for improved performance:

```javascript
// Enable caching for registry
const registry = new FrameworkRegistry({
  basePath: './frameworks',
  autoDiscover: true,
  cacheEnabled: true,
  cacheTTL: 300000 // 5 minutes
});

// Clear cache when needed
registry.clearCache();
```

### Lazy Loading

Frameworks are loaded on-demand to improve startup performance:

```javascript
// Lazy load frameworks
const framework = await registry.load('refactoring'); // Only loads when requested
```

### Batch Operations

Use batch operations for better performance:

```javascript
// Load multiple frameworks at once
const frameworks = await registry.loadMultiple(['refactoring', 'testing', 'documentation']);

// Activate multiple frameworks
const results = await manager.activateMultiple(['refactoring', 'testing']);
```

## Security Considerations

### Framework Validation

Always validate frameworks before loading:

```javascript
const validator = new FrameworkValidator({ strictMode: true });

// Validate before loading
const validation = await validator.validateFramework(frameworkData);
if (!validation.isValid) {
  throw new Error('Framework validation failed');
}

// Load only validated frameworks
const framework = await registry.load('refactoring');
```

### Sandboxed Execution

Execute framework steps in a sandboxed environment:

```javascript
const step = {
  id: 'safe-step',
  name: 'Safe Step',
  execute: async (context) => {
    // Execute in sandbox
    return await sandbox.execute(() => {
      // Step implementation
    });
  }
};
```

### Configuration Security

Secure configuration management:

```javascript
const config = new FrameworkConfig({
  configPath: './secure-config.json',
  encryptSensitive: true,
  allowedKeys: ['framework.basePath', 'framework.autoDiscover']
});

// Only allow specific configuration keys
config.set('framework.basePath', './frameworks'); // Allowed
config.set('sensitive.key', 'value'); // Blocked
```

## Best Practices

### Framework Development

1. **Follow the Framework Interface**: Implement all required methods
2. **Provide Clear Documentation**: Document all steps and configuration options
3. **Handle Errors Gracefully**: Implement proper error handling
4. **Validate Input**: Validate all inputs and parameters
5. **Test Thoroughly**: Write comprehensive tests for your framework

### Framework Usage

1. **Validate Before Use**: Always validate frameworks before activation
2. **Handle Dependencies**: Ensure all dependencies are available
3. **Monitor Performance**: Monitor framework performance and resource usage
4. **Backup Configuration**: Backup configuration before making changes
5. **Test in Isolation**: Test frameworks in isolation before integration

### Configuration Management

1. **Use Environment Variables**: Use environment variables for sensitive data
2. **Validate Configuration**: Validate configuration before applying
3. **Version Control**: Version control configuration files
4. **Document Changes**: Document configuration changes
5. **Test Configuration**: Test configuration in different environments

## Migration Guide

### From Legacy System

If migrating from a legacy framework system:

1. **Export Configuration**: Export existing configuration
2. **Convert Frameworks**: Convert existing frameworks to new format
3. **Update Dependencies**: Update framework dependencies
4. **Test Migration**: Test migration in staging environment
5. **Deploy Gradually**: Deploy migration gradually

### Configuration Migration

```javascript
// Legacy configuration
const legacyConfig = {
  frameworks: {
    refactoring: { enabled: true },
    testing: { enabled: false }
  }
};

// New configuration
const newConfig = {
  'framework.basePath': './frameworks',
  'framework.autoDiscover': true,
  'refactoring.enabled': true,
  'testing.enabled': false
};

// Migration script
function migrateConfig(legacyConfig) {
  const newConfig = {};
  
  Object.entries(legacyConfig.frameworks).forEach(([id, config]) => {
    newConfig[`${id}.enabled`] = config.enabled;
  });
  
  return newConfig;
}
```

This API reference provides comprehensive documentation for all framework system components, usage patterns, and best practices. For additional information, refer to the architecture documentation and user guides. 