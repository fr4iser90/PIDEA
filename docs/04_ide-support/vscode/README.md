# VSCode IDE Support

This document provides comprehensive information about VSCode IDE integration in PIDEA, including setup, configuration, and usage.

## Overview

PIDEA now supports Visual Studio Code (VSCode) in addition to Cursor IDE. The VSCode integration provides:

- **Automatic Detection**: Scans ports 9232-9241 for VSCode instances
- **Extension Management**: Detects and manages VSCode extensions
- **Chat Integration**: Works with GitHub Copilot, ChatGPT, and other AI extensions
- **Workspace Management**: Automatic workspace detection and management
- **Task Integration**: Send tasks directly to VSCode instances

## Architecture

### Port Configuration
- **Cursor IDE**: Ports 9222-9231
- **VSCode**: Ports 9232-9241

### Core Components

#### VSCodeDetector
- Scans for running VSCode instances
- Detects VSCode-specific indicators
- Manages port availability

#### VSCodeStarter
- Launches VSCode instances with remote debugging
- Manages VSCode process lifecycle
- Handles workspace path configuration

#### VSCodeExtensionManager
- Detects installed VSCode extensions
- Manages extension metadata
- Provides extension filtering capabilities

#### VSCodeService
- Main service for VSCode integration
- Handles communication with VSCode instances
- Manages chat integration and task sending

## Setup Instructions

### Prerequisites

1. **VSCode Installation**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install code

   # macOS
   brew install --cask visual-studio-code

   # Windows
   # Download from https://code.visualstudio.com/
   ```

2. **VSCode CLI Access**
   ```bash
   # Verify VSCode CLI is available
   code --version
   ```

3. **Required Extensions** (Optional but recommended)
   - GitHub Copilot
   - ChatGPT Extension
   - CodeGPT Extension

### Configuration

1. **Environment Variables**
   ```bash
   # Add to your .env file
   VSCODE_PORT_RANGE_START=9232
   VSCODE_PORT_RANGE_END=9241
   VSCODE_EXECUTABLE_PATH=/usr/bin/code
   ```

2. **VSCode Remote Debugging**
   ```bash
   # Start VSCode with remote debugging enabled
   code --remote-debugging-port=9232 --disable-web-security /path/to/workspace
   ```

## Usage

### Starting VSCode Instances

#### Via API
```bash
# Start VSCode with specific workspace
curl -X POST http://localhost:3000/api/ide/start-vscode \
  -H "Content-Type: application/json" \
  -d '{"workspacePath": "/path/to/workspace"}'
```

#### Via Code
```javascript
const vscodeService = container.resolve('vscodeService');

// Start new VSCode instance
const ideInfo = await vscodeService.startNewVSCode('/path/to/workspace');
console.log('VSCode started on port:', ideInfo.port);
```

### Detecting VSCode Instances

```javascript
// Get all available IDEs (Cursor + VSCode)
const availableIDEs = await ideManager.getAvailableIDEs();

// Filter for VSCode instances
const vscodeInstances = availableIDEs.filter(ide => ide.ideType === 'vscode');
```

### Extension Management

```javascript
// Get all extensions
const extensions = await vscodeService.getExtensions(9232);

// Get chat extensions only
const chatExtensions = await vscodeService.getChatExtensions(9232);

// Check if specific extension is installed
const hasCopilot = await vscodeService.hasExtension('github.copilot', 9232);
```

### Chat Integration

```javascript
// Send message to GitHub Copilot
const result = await vscodeService.sendMessage('Hello Copilot!', {
  extensionType: 'githubCopilot'
});

// Send message to ChatGPT extension
const result = await vscodeService.sendMessage('Explain this code', {
  extensionType: 'chatgpt'
});
```

### Task Integration

```javascript
// Send single task to VSCode
const task = {
  id: 'task-123',
  title: 'Implement Feature',
  description: 'Add new feature to the application',
  type: 'feature',
  priority: 'high'
};

await vscodeService.sendTaskToVSCode(task, '/path/to/workspace');

// Send auto mode tasks
const tasks = [task1, task2, task3];
const projectAnalysis = {
  projectType: 'React',
  complexity: 'medium'
};

await vscodeService.sendAutoModeTasksToVSCode(tasks, projectAnalysis, '/path/to/workspace');
```

## API Endpoints

### VSCode-Specific Endpoints

#### POST /api/ide/start-vscode
Start a new VSCode instance.

**Request:**
```json
{
  "workspacePath": "/path/to/workspace"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "port": 9232,
    "pid": 12345,
    "status": "starting",
    "ideType": "vscode"
  }
}
```

#### GET /api/ide/vscode/:port/extensions
Get extensions for a VSCode instance.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "github.copilot",
      "displayName": "GitHub Copilot",
      "version": "1.0.0"
    }
  ]
}
```

#### POST /api/ide/vscode/send-message
Send message to VSCode extension.

**Request:**
```json
{
  "message": "Hello AI!",
  "extensionType": "githubCopilot",
  "port": 9232
}
```

#### GET /api/ide/vscode/:port/status
Get VSCode instance status.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "activeIDE": {
      "port": 9232,
      "workspacePath": "/path/to/workspace"
    },
    "userId": "vscode-user",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## DOM Selectors

### Core VSCode Selectors

```javascript
const VSCodeSelectors = {
  // Workbench
  workbench: '.monaco-workbench',
  sidebar: '.monaco-workbench .part.sidebar',
  editor: '.monaco-workbench .part.editor',
  
  // File Explorer
  explorerViewlet: '.explorer-viewlet',
  explorerItems: '.explorer-item',
  explorerItemName: '.explorer-item-label .label-name',
  
  // Editor
  editorContainer: '.monaco-editor',
  editorTabs: '.tabs-container .tab',
  editorTabActive: '.tabs-container .tab.active',
  
  // Extensions
  extensions: {
    copilot: {
      chatContainer: '.copilot-chat-container',
      chatInput: '.copilot-chat-input',
      sendButton: '.copilot-chat-send-button'
    }
  }
};
```

## Testing

### Unit Tests
```bash
# Run VSCode service unit tests
npm test -- VSCodeService.test.js
```

### Integration Tests
```bash
# Run VSCode integration tests
npm test -- VSCodeIntegration.test.js
```

### Manual Testing
```bash
# Start VSCode with debugging
code --remote-debugging-port=9232 --disable-web-security /path/to/workspace

# Test detection
curl http://localhost:3000/api/ide/available

# Test extension detection
curl http://localhost:3000/api/ide/vscode/9232/extensions
```

## Troubleshooting

### Common Issues

#### VSCode Not Detected
1. **Check VSCode Installation**
   ```bash
   code --version
   ```

2. **Verify Remote Debugging**
   ```bash
   # Start VSCode with debugging enabled
   code --remote-debugging-port=9232 --disable-web-security
   ```

3. **Check Port Range**
   - VSCode uses ports 9232-9241
   - Ensure no firewall blocking these ports

#### Extension Detection Issues
1. **Check Extension Installation**
   - Verify extensions are installed in VSCode
   - Check extension marketplace

2. **Extension Permissions**
   - Some extensions require additional permissions
   - Check VSCode extension settings

#### Communication Issues
1. **Browser Connection**
   - Ensure Playwright can connect to VSCode
   - Check CDP connection status

2. **Extension Selectors**
   - Extension DOM structure may change
   - Update selectors in `docs/04_ide-support/vscode/selectors.js`

### Debug Mode

Enable debug logging:
```bash
# Set debug environment variable
export DEBUG=vscode:*

# Start PIDEA with debug logging
npm start
```

### Logs

Check VSCode-related logs:
```bash
# View VSCode service logs
tail -f logs/vscode-service.log

# View VSCode detection logs
tail -f logs/vscode-detector.log
```

## Performance Considerations

### Resource Usage
- Each VSCode instance uses ~100-200MB RAM
- Monitor system resources with multiple instances
- Consider instance limits for production

### Caching
- Extension detection results are cached
- Clear cache if extensions change: `vscodeService.extensionManager.clearCache()`

### Connection Management
- Reuse browser connections when possible
- Implement connection pooling for multiple instances

## Security

### Remote Debugging
- VSCode remote debugging bypasses some security restrictions
- Use only in trusted environments
- Consider network isolation for production

### Extension Security
- Validate extension sources
- Monitor extension permissions
- Implement extension whitelisting if needed

## Future Enhancements

### Planned Features
- [ ] VSCode extension marketplace integration
- [ ] Extension installation/uninstallation via API
- [ ] VSCode settings synchronization
- [ ] Multi-workspace support
- [ ] VSCode theme integration

### Extension Support
- [ ] Additional AI extensions (Claude, Bard)
- [ ] Code analysis extensions
- [ ] Testing framework integrations
- [ ] Deployment tool integrations

## References

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [VSCode Remote Development](https://code.visualstudio.com/docs/remote/remote-overview) 