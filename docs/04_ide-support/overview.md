# Multi-IDE Support Overview

## Architecture Overview

PIDEA provides unified support for multiple Integrated Development Environments (IDEs) through a factory-based abstraction layer. This architecture enables seamless switching between different IDEs while maintaining consistent functionality across all supported platforms.

## Supported IDEs

### 1. **Cursor IDE**
- **Type**: AI-first code editor
- **Port Range**: 9222-9231
- **Key Features**: AI chat, code completion, refactoring, terminal, git
- **Status**: ✅ Fully Supported

### 2. **Visual Studio Code**
- **Type**: Microsoft code editor
- **Port Range**: 9232-9241
- **Key Features**: Extension ecosystem, integrated terminal, git, debugging
- **Status**: ✅ Fully Supported

### 3. **Windsurf IDE**
- **Type**: AI-powered development environment
- **Port Range**: 9242-9251
- **Key Features**: AI assistant, task management, auto mode, refactoring
- **Status**: ✅ Fully Supported

## Architecture Components

### Core Abstraction Layer
- **IDEInterface**: Common interface for all IDE implementations
- **IDEFactory**: Factory pattern for creating IDE instances
- **BaseIDE**: Shared functionality across all IDEs
- **IDETypes**: Standardized IDE type definitions

### Infrastructure Layer
- **IDEDetectorFactory**: Unified IDE detection
- **IDEStarterFactory**: Unified IDE startup
- **IDEManager**: High-level IDE management
- **IDEConfigManager**: Configuration management
- **IDEHealthMonitor**: Health monitoring

### API Layer
- **IDEController**: Unified IDE API endpoints
- **IDESelectionController**: IDE selection management
- **IDEMirrorController**: IDE mirror functionality
- **IDEFeatureController**: IDE feature management

### Frontend Layer
- **IDESelector**: IDE selection UI component
- **IDESwitch**: IDE switching component
- **IDEMirror**: Unified IDE mirror interface
- **IDEFeatures**: IDE feature display
- **IDEContext**: Centralized IDE state management

## Common Features

All supported IDEs provide the following core functionality:

### Core Operations
- **Detection**: Automatic IDE detection and status monitoring
- **Startup**: IDE startup with configurable options
- **Shutdown**: Graceful IDE shutdown and cleanup
- **Switching**: Seamless switching between IDE instances

### Development Features
- **Chat Integration**: AI-powered chat functionality
- **Code Refactoring**: Automated code refactoring tools
- **Terminal Access**: Integrated terminal support
- **Git Integration**: Version control integration
- **File Management**: File explorer and workspace management

### Advanced Features
- **DOM Interaction**: Programmatic UI interaction
- **Task Management**: Automated task execution
- **Health Monitoring**: Real-time health status
- **Configuration Management**: IDE-specific settings

## IDE-Specific Features

### Cursor IDE
- **AI Chat**: Native AI chat panel integration
- **Code Completion**: AI-powered code suggestions
- **Refactoring**: Intelligent code refactoring

### Visual Studio Code
- **Extensions**: Rich extension ecosystem
- **Debugging**: Advanced debugging capabilities
- **Customization**: Highly customizable interface

### Windsurf IDE
- **AI Assistant**: Built-in AI assistant
- **Task Management**: Automated task execution
- **Auto Mode**: Intelligent automation features

## Configuration

### IDE Configuration
Each IDE can be configured independently through the `ide-config.json` file:

```json
{
  "ideTypes": {
    "cursor": {
      "enabled": true,
      "portRange": { "start": 9222, "end": 9231 },
      "startupTimeout": 3000
    },
    "vscode": {
      "enabled": true,
      "portRange": { "start": 9232, "end": 9241 },
      "startupTimeout": 5000
    },
    "windsurf": {
      "enabled": true,
      "portRange": { "start": 9242, "end": 9251 },
      "startupTimeout": 4000
    }
  }
}
```

### Global Configuration
- **Default IDE**: Set the default IDE type
- **Auto Detection**: Enable automatic IDE detection
- **Health Monitoring**: Configure health check intervals
- **Concurrent Limits**: Set maximum concurrent IDE instances

## Usage Examples

### Basic IDE Operations
```javascript
// Get IDE factory
const factory = getIDEFactory();

// Create IDE instance
const result = factory.createIDE('cursor', { browserManager, ideManager });

// Use IDE
const ide = result.ide;
await ide.detect();
await ide.start();
```

### IDE Switching
```javascript
// Switch between IDEs
await ideManager.switchToIDE('vscode', 9232);
await ideManager.switchToIDE('windsurf', 9242);
```

### Feature Detection
```javascript
// Get IDE features
const features = await ide.getFeatures();
console.log('Available features:', features);
```

## Migration Guide

### From Legacy Services
The new abstraction layer maintains backward compatibility with existing services:

1. **Automatic Migration**: Existing code continues to work
2. **Gradual Migration**: Migrate components incrementally
3. **Factory Pattern**: Use factory for new implementations
4. **Unified API**: Use unified API endpoints

### Migration Steps
1. Update service dependencies to use IDE factory
2. Replace direct service instantiation with factory calls
3. Use unified API endpoints instead of IDE-specific ones
4. Update frontend components to use unified interface

## Performance Considerations

### Resource Management
- **Port Allocation**: Efficient port range management
- **Process Management**: Proper process cleanup
- **Memory Usage**: Optimized memory consumption
- **Startup Time**: Fast IDE startup times

### Scalability
- **Concurrent IDEs**: Support for multiple concurrent instances
- **Load Balancing**: Intelligent load distribution
- **Resource Pooling**: Shared resource management
- **Caching**: Intelligent caching strategies

## Troubleshooting

### Common Issues
1. **IDE Not Detected**: Check IDE installation and configuration
2. **Port Conflicts**: Verify port availability and ranges
3. **Startup Failures**: Check IDE executable paths and permissions
4. **Feature Unavailable**: Verify IDE-specific feature support

### Debugging
- **Logging**: Comprehensive logging for all operations
- **Health Checks**: Real-time health monitoring
- **Error Handling**: Detailed error messages and recovery
- **Diagnostics**: Built-in diagnostic tools

## Future Enhancements

### Planned Features
- **JetBrains Support**: IntelliJ IDEA, WebStorm, PyCharm
- **Sublime Text Support**: Sublime Text editor integration
- **Advanced AI**: Enhanced AI-powered features
- **Cloud Integration**: Cloud-based IDE management

### Extensibility
- **Plugin System**: IDE-specific plugin support
- **Custom IDEs**: Framework for custom IDE integration
- **API Extensions**: Extensible API endpoints
- **UI Customization**: Advanced UI customization options
