# IDE Infrastructure

This directory contains the unified IDE infrastructure implementation for the PIDEA project. The infrastructure provides a factory-based approach to IDE detection, startup, and management with support for multiple IDE types.

## Architecture Overview

The IDE infrastructure follows a factory pattern design with the following key components:

### Core Components

- **IDEDetectorFactory**: Manages IDE-specific detectors using the factory pattern
- **IDEStarterFactory**: Manages IDE-specific starters using the factory pattern
- **IDEManager**: High-level IDE management interface that integrates all components
- **IDEConfigManager**: Manages IDE configurations, settings, and preferences
- **IDEHealthMonitor**: Monitors IDE health, status, and performance

### IDE-Specific Implementations

#### Detectors
- **CursorDetector**: Detects Cursor IDE instances
- **VSCodeDetector**: Detects VSCode IDE instances
- **WindsurfDetector**: Detects Windsurf IDE instances

#### Starters
- **CursorStarter**: Starts Cursor IDE instances
- **VSCodeStarter**: Starts VSCode IDE instances
- **WindsurfStarter**: Starts Windsurf IDE instances

## Directory Structure

```
ide/
├── README.md                           # This file
├── IDEDetectorFactory.js              # IDE detector factory
├── IDEStarterFactory.js               # IDE starter factory
├── IDEManager.js                      # Main IDE manager
├── IDEConfigManager.js                # Configuration management
├── IDEHealthMonitor.js                # Health monitoring
├── detectors/                         # IDE-specific detectors
│   ├── CursorDetector.js
│   ├── VSCodeDetector.js
│   └── WindsurfDetector.js
└── starters/                          # IDE-specific starters
    ├── CursorStarter.js
    ├── VSCodeStarter.js
    └── WindsurfStarter.js
```

## Usage

### Basic Usage

```javascript
const IDEManager = require('./infrastructure/external/ide/IDEManager');

// Create IDE manager instance
const ideManager = new IDEManager(browserManager);

// Initialize the manager
await ideManager.initialize();

// Get all available IDEs
const availableIDEs = await ideManager.getAvailableIDEs();

// Start a new IDE
const ideInfo = await ideManager.startNewIDE('/path/to/workspace', 'cursor');

// Switch to a different IDE
await ideManager.switchToIDE(9222);

// Stop an IDE
await ideManager.stopIDE(9222);
```

### Factory Usage

```javascript
const IDEDetectorFactory = require('./infrastructure/external/ide/IDEDetectorFactory');
const IDEStarterFactory = require('./infrastructure/external/ide/IDEStarterFactory');

// Create factories
const detectorFactory = new IDEDetectorFactory();
const starterFactory = new IDEStarterFactory();

// Detect all IDEs
const allIDEs = await detectorFactory.detectAll();

// Start a specific IDE
const ideInfo = await starterFactory.startIDE('cursor', 9222, '/workspace');
```

### Configuration Management

```javascript
const IDEConfigManager = require('./infrastructure/external/ide/IDEConfigManager');

const configManager = new IDEConfigManager();
await configManager.loadConfig();

// Get IDE configuration
const cursorConfig = configManager.getIDEConfig('cursor');

// Update configuration
await configManager.updateIDEConfig('cursor', { enabled: false });
```

### Health Monitoring

```javascript
const IDEHealthMonitor = require('./infrastructure/external/ide/IDEHealthMonitor');

const healthMonitor = new IDEHealthMonitor(configManager);

// Start monitoring
await healthMonitor.startMonitoring();

// Register IDE for monitoring
healthMonitor.registerIDE(9222, 'cursor');

// Get health status
const healthStatus = healthMonitor.getHealthStatus();
```

## Configuration

The IDE infrastructure uses a JSON configuration file located at `config/ide-config.json`. The configuration includes:

### IDE Types Configuration

```json
{
  "ideTypes": {
    "cursor": {
      "enabled": true,
      "portRange": { "start": 9222, "end": 9231 },
      "defaultOptions": {
        "userDataDir": null,
        "extensionsDir": null,
        "disableExtensions": false,
        "verbose": false
      },
      "startupTimeout": 3000,
      "autoStart": false
    }
  }
}
```

### Global Configuration

```json
{
  "global": {
    "defaultIDE": "cursor",
    "autoDetect": true,
    "healthCheckInterval": 30000,
    "maxConcurrentIDEs": 5,
    "logLevel": "info"
  }
}
```

## Port Ranges

Each IDE type uses a specific port range to avoid conflicts:

- **Cursor**: 9222-9231
- **VSCode**: 9232-9241
- **Windsurf**: 9242-9251

## Adding New IDE Support

To add support for a new IDE type:

1. **Create Detector**: Implement a detector class in `detectors/` directory
2. **Create Starter**: Implement a starter class in `starters/` directory
3. **Register in Factories**: Add the new implementations to the factory constructors
4. **Update Configuration**: Add configuration for the new IDE type
5. **Add Tests**: Create unit and integration tests

### Example Detector Implementation

```javascript
class NewIDEDetector {
  constructor() {
    this.portRange = { start: 9252, end: 9261 };
    this.scanTimeout = 1000;
  }

  async scanForIDEs() {
    // Implementation for detecting IDE instances
  }

  async checkPort(port) {
    // Implementation for checking if IDE is running on port
  }

  async findAvailablePort() {
    // Implementation for finding available port
  }
}
```

### Example Starter Implementation

```javascript
class NewIDEStarter {
  constructor() {
    this.config = {
      name: 'NewIDE',
      executable: 'newide',
      portRange: { start: 9252, end: 9261 }
    };
  }

  async startIDE(port, workspacePath, options) {
    // Implementation for starting IDE
  }

  async stopIDE(port) {
    // Implementation for stopping IDE
  }
}
```

## Testing

The infrastructure includes comprehensive testing:

### Unit Tests

```bash
# Run unit tests
npm test -- --testPathPattern="unit/infrastructure/ide"
```

### Integration Tests

```bash
# Run integration tests
npm test -- --testPathPattern="integration/ide"
```

## Error Handling

The infrastructure includes comprehensive error handling:

- **IDE Not Found**: Throws descriptive errors when IDE is not available
- **Port Conflicts**: Handles port conflicts gracefully
- **Configuration Errors**: Validates configuration and provides helpful error messages
- **Health Monitoring**: Monitors IDE health and reports issues

## Performance Considerations

- **Lazy Loading**: Components are loaded only when needed
- **Caching**: Detection results are cached to improve performance
- **Async Operations**: All operations are asynchronous to avoid blocking
- **Resource Management**: Proper cleanup of resources and processes

## Security

- **Port Validation**: Validates port ranges to prevent conflicts
- **Process Management**: Proper process lifecycle management
- **Configuration Validation**: Validates all configuration inputs
- **Error Logging**: Comprehensive error logging without exposing sensitive information

## Dependencies

- **Node.js**: Core runtime
- **Child Process**: For process management
- **HTTP/HTTPS**: For IDE communication
- **File System**: For configuration management
- **Events**: For health monitoring

## Contributing

When contributing to the IDE infrastructure:

1. Follow the existing code patterns and conventions
2. Add comprehensive tests for new functionality
3. Update documentation for any API changes
4. Ensure backward compatibility when possible
5. Follow the error handling patterns established in the codebase

## License

This infrastructure is part of the PIDEA project and follows the same licensing terms. 