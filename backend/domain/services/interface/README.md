# Interface Management System

## Overview

The Interface Management System provides a generic abstraction layer for managing different types of development interfaces (IDEs, editors, terminals, etc.) through a factory pattern and registry system. This system replaces the hardcoded IDE management approach with a flexible, extensible architecture.

## Architecture

The system implements several design patterns:

- **Factory Pattern**: `InterfaceFactory` creates interface instances based on type detection
- **Registry Pattern**: `InterfaceRegistry` manages interface types and their metadata
- **Abstract Factory**: `BaseInterface` defines the contract for all interface implementations
- **Manager Pattern**: `InterfaceManager` orchestrates interface lifecycle and operations

## Core Components

### BaseInterface

Abstract base class that defines the contract for all interface implementations.

```javascript
const { BaseInterface } = require('@domain/services/interface');

class MyInterface extends BaseInterface {
  async initialize(config) {
    // Initialize interface
  }

  async start() {
    // Start interface
  }

  async stop() {
    // Stop interface
  }

  async destroy() {
    // Clean up resources
  }
}
```

### InterfaceManager

Central service for managing interface instances, including creation, lifecycle management, and discovery.

```javascript
const { InterfaceManager } = require('@domain/services/interface');

const manager = new InterfaceManager({
  logger: logger,
  eventBus: eventBus
});

// Register interface type
manager.registerInterface('ide', IDEInterface, { defaultConfig: 'value' });

// Create interface instance
const interfaceInstance = await manager.createInterface('ide', {
  workspacePath: '/path/to/workspace',
  port: 3000
});

// Manage lifecycle
await manager.startInterface(interfaceInstance.id);
await manager.stopInterface(interfaceInstance.id);
await manager.removeInterface(interfaceInstance.id);
```

### InterfaceFactory

Factory for creating interface instances with automatic type detection and configuration merging.

```javascript
const { InterfaceFactory } = require('@domain/services/interface');

const factory = new InterfaceFactory({
  interfaceManager: manager,
  logger: logger
});

// Register type detector
factory.registerTypeDetector('ide', async (context) => {
  return context.workspacePath && context.port;
});

// Register default configuration
factory.registerDefaultConfig('ide', {
  autoReconnect: true,
  heartbeatInterval: 30000
});

// Create interface with automatic type detection
const interfaceInstance = await factory.createInterface({
  workspacePath: '/path/to/workspace',
  port: 3000
});
```

### InterfaceRegistry

Registry for managing interface types, their metadata, and constraints.

```javascript
const { InterfaceRegistry } = require('@domain/services/interface');

const registry = new InterfaceRegistry({
  logger: logger
});

// Register interface type
registry.registerInterfaceType('ide', {
  name: 'IDE Interface',
  description: 'Interface for development environments',
  version: '1.0.0'
});

// Add to category
registry.addToCategory('ide', 'development');

// Set constraints
registry.setTypeConstraints('ide', {
  supportedFrameworks: ['react', 'vue', 'angular'],
  supportedTypes: ['web', 'mobile']
});

// Search interface types
const results = registry.searchInterfaceTypes({
  category: 'development',
  metadata: { author: 'Team' }
});
```

## Specific Implementations

### IDEInterface

Concrete implementation for IDE interfaces, extending `BaseInterface` with IDE-specific functionality.

```javascript
const { IDEInterface } = require('@domain/services/interface');

const ideInterface = new IDEInterface('ide-1', 'ide', {
  workspacePath: '/path/to/workspace',
  port: 3000,
  ideType: 'cursor',
  autoReconnect: true,
  heartbeatInterval: 30000
}, {
  logger: logger,
  browserManager: browserManager,
  portManager: portManager,
  workspaceService: workspaceService,
  eventBus: eventBus
});

// Initialize and start
await ideInterface.initialize();
await ideInterface.start();

// IDE-specific operations
const workspaceInfo = await ideInterface.getWorkspaceInfo();
const result = await ideInterface.executeCommand('npm install');
const messageResult = await ideInterface.sendMessage('Hello IDE');

// Stop and destroy
await ideInterface.stop();
await ideInterface.destroy();
```

## Usage Examples

### Basic Interface Management

```javascript
const { 
  InterfaceManager, 
  InterfaceFactory, 
  InterfaceRegistry,
  IDEInterface 
} = require('@domain/services/interface');

// Initialize components
const manager = new InterfaceManager({ logger });
const registry = new InterfaceRegistry({ logger });
const factory = new InterfaceFactory({ 
  interfaceManager: manager, 
  interfaceRegistry: registry,
  logger 
});

// Register IDE interface
manager.registerInterface('ide', IDEInterface, {
  defaultConfig: 'value'
});

registry.registerInterfaceType('ide', {
  name: 'IDE Interface',
  description: 'Development environment interface',
  version: '1.0.0'
});

// Create interface
const interfaceInstance = await factory.createInterfaceByType('ide', {
  workspacePath: '/path/to/workspace',
  port: 3000,
  ideType: 'cursor'
});

// Manage lifecycle
await interfaceInstance.initialize();
await manager.startInterface(interfaceInstance.id);

// Get interface information
const metadata = interfaceInstance.getIDEMetadata();
console.log('Interface status:', interfaceInstance.status);
console.log('Is connected:', interfaceInstance.isConnected);

// Clean up
await manager.removeInterface(interfaceInstance.id);
```

### Project Integration

```javascript
// In ProjectApplicationService
class ProjectApplicationService {
  constructor({ interfaceManager, interfaceFactory, interfaceRegistry }) {
    this.interfaceManager = interfaceManager;
    this.interfaceFactory = interfaceFactory;
    this.interfaceRegistry = interfaceRegistry;
  }

  async getProjectInterfaces(projectId) {
    const allInterfaces = this.interfaceManager.getAllInterfaces();
    return allInterfaces.filter(interfaceInstance => 
      interfaceInstance.config.projectId === projectId
    );
  }

  async createProjectInterface(projectId, interfaceType, config = {}) {
    const project = await this.projectRepository.findById(projectId);
    
    const interfaceConfig = {
      ...config,
      projectId,
      workspacePath: project.workspacePath,
      frontendPort: project.frontendPort,
      backendPort: project.backendPort
    };

    return await this.interfaceFactory.createInterfaceByType(
      interfaceType,
      interfaceConfig
    );
  }
}
```

### API Integration

```javascript
// In InterfaceController
class InterfaceController {
  constructor({ interfaceManager, projectApplicationService }) {
    this.interfaceManager = interfaceManager;
    this.projectApplicationService = projectApplicationService;
  }

  async getAllInterfaces(req, res) {
    const interfaces = this.interfaceManager.getAllInterfaces();
    const interfaceData = interfaces.map(interfaceInstance => ({
      id: interfaceInstance.id,
      type: interfaceInstance.type,
      status: interfaceInstance.status,
      config: interfaceInstance.config,
      metadata: interfaceInstance.getMetadata()
    }));

    res.json({
      success: true,
      data: interfaceData,
      meta: { total: interfaceData.length }
    });
  }

  async createInterface(req, res) {
    const { interfaceType, config = {} } = req.body;
    
    const interfaceInstance = await this.interfaceManager.createInterface(
      interfaceType,
      config
    );

    res.status(201).json({
      success: true,
      data: {
        id: interfaceInstance.id,
        type: interfaceInstance.type,
        status: interfaceInstance.status,
        config: interfaceInstance.config
      }
    });
  }
}
```

## Configuration

### Interface Configuration Schema

```javascript
{
  // Basic configuration
  name: 'string',
  type: 'string',
  version: 'string',
  
  // IDE-specific configuration
  workspacePath: 'string',
  port: 'number',
  ideType: 'string',
  
  // Lifecycle configuration
  autoReconnect: 'boolean',
  heartbeatInterval: 'number',
  connectionTimeout: 'number',
  maxRetries: 'number',
  
  // Project-specific configuration
  projectId: 'string',
  frontendPort: 'number',
  backendPort: 'number',
  databasePort: 'number'
}
```

### Environment Variables

```bash
# Interface management
INTERFACE_MANAGER_ENABLED=true
INTERFACE_HEARTBEAT_INTERVAL=30000
INTERFACE_CONNECTION_TIMEOUT=10000
INTERFACE_MAX_RETRIES=3

# IDE-specific
IDE_AUTO_RECONNECT=true
IDE_DEFAULT_PORT=3000
IDE_WORKSPACE_PATH=/workspace
```

## Testing

### Unit Tests

```javascript
// Test BaseInterface
describe('BaseInterface', () => {
  test('should enforce abstract method implementation', () => {
    class IncompleteInterface extends BaseInterface {
      // Missing required methods
    }

    const incompleteInterface = new IncompleteInterface('id', 'type');
    
    expect(async () => {
      await incompleteInterface.initialize();
    }).rejects.toThrow('initialize method must be implemented by subclass');
  });
});

// Test InterfaceManager
describe('InterfaceManager', () => {
  test('should register and create interfaces', async () => {
    const manager = new InterfaceManager();
    manager.registerInterface('test', TestInterface);
    
    const interfaceInstance = await manager.createInterface('test');
    expect(interfaceInstance).toBeInstanceOf(TestInterface);
  });
});
```

### Integration Tests

```javascript
describe('InterfaceManager Integration', () => {
  test('should complete full interface lifecycle', async () => {
    const manager = new InterfaceManager();
    manager.registerInterface('test', TestInterface);
    
    const interfaceInstance = await manager.createInterface('test');
    await interfaceInstance.initialize();
    await manager.startInterface(interfaceInstance.id);
    await manager.stopInterface(interfaceInstance.id);
    await manager.removeInterface(interfaceInstance.id);
    
    expect(manager.getInterface(interfaceInstance.id)).toBeNull();
  });
});
```

## Error Handling

The system provides comprehensive error handling at all levels:

### Interface-Level Errors

```javascript
class MyInterface extends BaseInterface {
  async start() {
    try {
      // Start logic
    } catch (error) {
      this._handleError(error, 'start');
      throw error;
    }
  }
}
```

### Manager-Level Errors

```javascript
const manager = new InterfaceManager();

try {
  await manager.startInterface('non-existent-id');
} catch (error) {
  console.error('Failed to start interface:', error.message);
}
```

### Factory-Level Errors

```javascript
const factory = new InterfaceFactory();

try {
  await factory.createInterfaceByType('unregistered-type');
} catch (error) {
  console.error('Failed to create interface:', error.message);
}
```

## Performance Considerations

### Memory Management

- Interfaces are automatically cleaned up when removed
- Heartbeat monitoring prevents memory leaks
- Event listeners are properly disposed

### Concurrent Operations

- Thread-safe interface operations
- Concurrent interface creation and destruction
- Rate limiting for high-frequency operations

### Caching

- Interface metadata cached for performance
- Configuration validation cached
- Type detection results cached

## Security Considerations

### Access Control

- Interface access validation
- Project-based interface isolation
- User permission checks

### Input Validation

- Configuration validation
- Command injection prevention
- Path traversal protection

### Audit Logging

- All interface operations logged
- Security events tracked
- Compliance reporting

## Migration Guide

### From IDEManager

1. **Replace IDEManager imports**:
   ```javascript
   // Old
   const IDEManager = require('@domain/services/ide/IDEManager');
   
   // New
   const { InterfaceManager, IDEInterface } = require('@domain/services/interface');
   ```

2. **Update interface creation**:
   ```javascript
   // Old
   const ideManager = new IDEManager();
   await ideManager.startIDE(port, workspacePath);
   
   // New
   const manager = new InterfaceManager();
   manager.registerInterface('ide', IDEInterface);
   const interfaceInstance = await manager.createInterface('ide', {
     port,
     workspacePath
   });
   await manager.startInterface(interfaceInstance.id);
   ```

3. **Update configuration**:
   ```javascript
   // Old
   const config = {
     port: 3000,
     workspacePath: '/path'
   };
   
   // New
   const config = {
     port: 3000,
     workspacePath: '/path',
     ideType: 'cursor',
     autoReconnect: true
   };
   ```

## Troubleshooting

### Common Issues

1. **Interface not starting**:
   - Check workspace path exists
   - Verify port is available
   - Check IDE configuration

2. **Connection failures**:
   - Verify network connectivity
   - Check firewall settings
   - Validate IDE installation

3. **Memory leaks**:
   - Ensure interfaces are properly destroyed
   - Check event listener cleanup
   - Monitor heartbeat intervals

### Debug Mode

Enable debug logging:

```javascript
const manager = new InterfaceManager({
  logger: {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error
  }
});
```

### Health Checks

```javascript
// Check interface health
const stats = manager.getStats();
const statusSummary = manager.getStatusSummary();

console.log('Active interfaces:', stats.activeCount);
console.log('Error count:', stats.errorCount);
console.log('Status summary:', statusSummary);
```

## Contributing

### Adding New Interface Types

1. **Create interface class**:
   ```javascript
   class MyCustomInterface extends BaseInterface {
     async initialize(config) {
       // Custom initialization
     }
     
     async start() {
       // Custom start logic
     }
     
     async stop() {
       // Custom stop logic
     }
     
     async destroy() {
       // Custom cleanup
     }
   }
   ```

2. **Register interface type**:
   ```javascript
   manager.registerInterface('my-custom', MyCustomInterface, {
     defaultConfig: 'value'
   });
   
   registry.registerInterfaceType('my-custom', {
     name: 'My Custom Interface',
     description: 'Custom interface implementation',
     version: '1.0.0'
   });
   ```

3. **Add type detector** (optional):
   ```javascript
   factory.registerTypeDetector('my-custom', async (context) => {
     return context.customProperty === 'expected-value';
   });
   ```

### Testing New Interfaces

1. **Unit tests**:
   ```javascript
   describe('MyCustomInterface', () => {
     test('should initialize correctly', async () => {
       const interfaceInstance = new MyCustomInterface('id', 'my-custom');
       await interfaceInstance.initialize({});
       expect(interfaceInstance.status).toBe('initialized');
     });
   });
   ```

2. **Integration tests**:
   ```javascript
   describe('MyCustomInterface Integration', () => {
     test('should work with InterfaceManager', async () => {
       manager.registerInterface('my-custom', MyCustomInterface);
       const interfaceInstance = await manager.createInterface('my-custom');
       expect(interfaceInstance).toBeInstanceOf(MyCustomInterface);
     });
   });
   ```

## License

This interface management system is part of the PIDEA project and follows the same licensing terms.
